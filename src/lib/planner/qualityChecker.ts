import { 
  Thread, 
  Post, 
  Comment, 
  Company,
  QualityReport,
  QualityIssue,
  IssueType,
  IssueSeverity,
  Subreddit,
  PlannerConstraints,
} from '@/types';
import { calculateSimilarity, createPairingKey } from '@/lib/utils';
import { DEFAULT_CONSTRAINTS } from './constraints';

// ============================================
// QUALITY CHECKER
// ============================================

export interface QualityCheckConfig {
  threads: Thread[];
  company: Company;
  subreddits?: Subreddit[];
  constraints?: PlannerConstraints;
  allowProductMention?: boolean;
}

export interface QualityCheckResult {
  validatedThreads: Thread[];
  report: QualityReport;
}

/**
 * Performs quality checks on all generated threads
 */
export function checkQuality(config: QualityCheckConfig): QualityCheckResult {
  const { threads, company, subreddits, constraints, allowProductMention } = config;
  
  const issues: QualityIssue[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const promoCheckResult = { issues: [] as QualityIssue[], warnings: [] as string[], warningsByPostId: {} as Record<string, string[]> };
  
  // Run all checks
  issues.push(...checkOverposting(threads));
  issues.push(...checkDuplication(threads));
  issues.push(...checkPersonaCollisions(threads));
  issues.push(...checkTimingIssues(threads));
  issues.push(...checkPersonaBalance(threads, constraints));
  issues.push(...checkSubredditRules(threads, company, subreddits));
  
  if (!allowProductMention) {
    const promoCheck = checkPromotionalContent(threads, company);
    promoCheckResult.issues = promoCheck.issues;
    promoCheckResult.warnings = promoCheck.warnings;
    promoCheckResult.warningsByPostId = promoCheck.warningsByPostId;
    issues.push(...promoCheck.issues);
    warnings.push(...promoCheck.warnings);
  }
  
  const voiceCheck = checkVoiceConsistency(threads);
  issues.push(...voiceCheck.issues);
  suggestions.push(...voiceCheck.suggestions);
  
  // Calculate overall score
  const overallScore = calculateOverallScore(issues, warnings, threads.length);
  
  // Add general suggestions
  if (overallScore < 7) {
    suggestions.push('Consider reviewing threads with low scores before approval');
  }
  
  if (threads.length < 3) {
    suggestions.push('Adding more posts per week could improve visibility');
  }
  
  const issuesByPostId: Record<string, QualityIssue[]> = {};
  for (const issue of issues) {
    for (const postId of issue.affectedPostIds || []) {
      if (!issuesByPostId[postId]) issuesByPostId[postId] = [];
      issuesByPostId[postId].push(issue);
    }
  }

  const warningsByPostId = allowProductMention ? {} : promoCheckResult.warningsByPostId;

  return {
    validatedThreads: threads,
    report: {
      overallScore,
      issues,
      warnings,
      suggestions,
      issuesByPostId,
      warningsByPostId,
    },
  };
}

// ============================================
// INDIVIDUAL CHECKS
// ============================================

/**
 * Checks for overposting in any subreddit
 */
function checkOverposting(threads: Thread[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  // Count posts per subreddit
  const subredditCounts: Record<string, { count: number; postIds: string[] }> = {};
  
  for (const thread of threads) {
    const subName = thread.post.subredditName;
    if (!subredditCounts[subName]) {
      subredditCounts[subName] = { count: 0, postIds: [] };
    }
    subredditCounts[subName].count++;
    subredditCounts[subName].postIds.push(thread.post.id);
  }
  
  // Check limits
  for (const [subreddit, data] of Object.entries(subredditCounts)) {
    if (data.count > DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek) {
      issues.push({
        type: 'overposting',
        severity: 'high',
        message: `${subreddit} has ${data.count} posts this week (max: ${DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek})`,
        affectedPostIds: data.postIds,
      });
    }
  }
  
  return issues;
}

/**
 * Checks for duplicate or very similar topics
 */
function checkDuplication(threads: Thread[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  for (let i = 0; i < threads.length; i++) {
    for (let j = i + 1; j < threads.length; j++) {
      const contentA = `${threads[i].post.title} ${threads[i].post.body}`;
      const contentB = `${threads[j].post.title} ${threads[j].post.body}`;
      
      const similarity = calculateSimilarity(contentA, contentB);
      
      if (similarity >= 0.5) {
        const severity: IssueSeverity = similarity > 0.8 ? 'high' : 'medium';
        
        issues.push({
          type: 'duplication',
          severity,
          message: `Posts "${truncate(threads[i].post.title, 30)}" and "${truncate(threads[j].post.title, 30)}" are ${Math.round(similarity * 100)}% similar`,
          affectedPostIds: [threads[i].post.id, threads[j].post.id],
        });
      }
    }
  }
  
  return issues;
}

/**
 * Checks for persona collision patterns
 */
function checkPersonaCollisions(threads: Thread[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  // Track pairings
  const pairings = new Map<string, { count: number; postIds: string[] }>();
  
  for (const thread of threads) {
    const opId = thread.post.personaId;
    
    for (const comment of thread.comments) {
      if (comment.personaId === opId) continue; // OP commenting is fine
      
      const key = createPairingKey(opId, comment.personaId);
      
      if (!pairings.has(key)) {
        pairings.set(key, { count: 0, postIds: [] });
      }
      
      const data = pairings.get(key)!;
      data.count++;
      if (!data.postIds.includes(thread.post.id)) {
        data.postIds.push(thread.post.id);
      }
    }
  }
  
  // Check for too many interactions
  pairings.forEach((data, key) => {
    if (data.count > 2) {
      issues.push({
        type: 'persona_collision',
        severity: 'medium',
        message: `Personas ${key.replace('+', ' and ')} interact ${data.count} times this week (may look coordinated)`,
        affectedPostIds: data.postIds,
      });
    }
  });
  
  return issues;
}

/**
 * Checks for timing issues
 */
function checkTimingIssues(threads: Thread[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  for (const thread of threads) {
    // Check for comments that are too fast
    for (let i = 0; i < thread.comments.length; i++) {
      const comment = thread.comments[i];
      
      if (i === 0 && comment.delayMinutes < 10) {
        issues.push({
          type: 'timing_issue',
          severity: 'medium',
          message: `First comment on "${truncate(thread.post.title, 30)}" arrives in ${comment.delayMinutes} minutes (suspiciously fast)`,
          affectedPostIds: [thread.post.id],
        });
      }
    }
    
    // Check for comments that are too close together
    for (let i = 1; i < thread.comments.length; i++) {
      const gap = thread.comments[i].delayMinutes;
      
      if (gap < 5) {
        issues.push({
          type: 'timing_issue',
          severity: 'low',
          message: `Comments in "${truncate(thread.post.title, 30)}" are only ${gap} minutes apart`,
          affectedPostIds: [thread.post.id],
        });
      }
    }
  }
  
  return issues;
}

/**
 * Checks for promotional content
 */
function checkPromotionalContent(
  threads: Thread[],
  company: Company
): { issues: QualityIssue[]; warnings: string[]; warningsByPostId: Record<string, string[]> } {
  const issues: QualityIssue[] = [];
  const warnings: string[] = [];
  const warningsByPostId: Record<string, string[]> = {};
  
  const companyNameLower = company.name.toLowerCase();
  const promoKeywords = [
    'best ever',
    'game changer',
    'life changing',
    'you should definitely',
    'highly recommend',
    'check it out',
    'amazing tool',
    'perfect solution',
  ];
  
  for (const thread of threads) {
    let promoScore = 0;
    const flaggedContent: string[] = [];
    
    // Check all content
    const allContent = [
      thread.post.title,
      thread.post.body,
      ...thread.comments.map(c => c.content),
    ];
    
    for (const content of allContent) {
      const contentLower = content.toLowerCase();
      
      // Direct company mention
      if (contentLower.includes(companyNameLower)) {
        promoScore += 4;
        flaggedContent.push(`Direct mention of "${company.name}"`);
      }
      
      // Promotional keywords
      for (const keyword of promoKeywords) {
        if (contentLower.includes(keyword)) {
          promoScore += 1;
          flaggedContent.push(`Uses promotional phrase: "${keyword}"`);
        }
      }
    }
    
    // Check if too many positive comments
    const positiveCount = thread.comments.filter(c => 
      /love|amazing|great|perfect|excellent/i.test(c.content)
    ).length;
    
    if (positiveCount >= 2) {
      promoScore += 2;
      flaggedContent.push('Multiple overly positive comments');
    }
    
    // Check if all comments agree (unrealistic)
    const hasDisagreement = thread.comments.some(c =>
      /but|though|however|not sure|depends|maybe/i.test(c.content)
    );
    
    if (!hasDisagreement && thread.comments.length > 1) {
      promoScore += 1;
      flaggedContent.push('No disagreement or nuance in comments');
    }
    
    // Record issues
    if (promoScore > DEFAULT_CONSTRAINTS.maxPromoScoreAllowed) {
      issues.push({
        type: 'promo_sensitivity',
        severity: promoScore > 8 ? 'high' : 'medium',
        message: `Thread "${truncate(thread.post.title, 30)}" has high promotional score (${promoScore}/10)`,
        affectedPostIds: [thread.post.id],
      });
    } else if (promoScore > 4) {
      const warning = `Thread "${truncate(thread.post.title, 30)}" may seem promotional: ${flaggedContent.join(', ')}`;
      warnings.push(warning);
      if (!warningsByPostId[thread.post.id]) warningsByPostId[thread.post.id] = [];
      warningsByPostId[thread.post.id].push(warning);
    }
  }
  
  return { issues, warnings, warningsByPostId };
}

function checkPersonaBalance(
  threads: Thread[],
  constraints?: PlannerConstraints
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const counts: Record<string, number> = {};
  for (const thread of threads) {
    counts[thread.post.personaId] = (counts[thread.post.personaId] || 0) + 1;
  }
  const values = Object.values(counts);
  if (values.length === 0) return issues;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  for (const [personaId, count] of Object.entries(counts)) {
    const limit = constraints?.maxPostsPerPersonaPerWeek;
    if ((limit && count > limit) || count > avg + 1) {
      issues.push({
        type: 'persona_collision',
        severity: 'low',
        message: `Persona ${personaId} is overused (${count} posts vs avg ${avg.toFixed(1)})`,
        affectedPostIds: threads.filter(t => t.post.personaId === personaId).map(t => t.post.id),
      });
    }
  }
  return issues;
}

function checkSubredditRules(
  threads: Thread[],
  company: Company,
  subreddits?: Subreddit[]
): QualityIssue[] {
  if (!subreddits || subreddits.length === 0) return [];
  const issues: QualityIssue[] = [];
  const bySubreddit: Record<string, Thread[]> = {};
  threads.forEach((t) => {
    bySubreddit[t.post.subredditId] = bySubreddit[t.post.subredditId] || [];
    bySubreddit[t.post.subredditId].push(t);
  });

  for (const sub of subreddits) {
    const rules = sub.rules;
    if (!rules) continue;
    const threadsForSub = bySubreddit[sub.id] || [];
    if (rules.maxPostsPerDay) {
      const byDay: Record<string, Thread[]> = {};
      threadsForSub.forEach((t) => {
        const day = t.post.scheduledAt.toISOString().slice(0, 10);
        byDay[day] = byDay[day] || [];
        byDay[day].push(t);
      });
      for (const [day, list] of Object.entries(byDay)) {
        if (list.length > rules.maxPostsPerDay) {
          issues.push({
            type: 'overposting',
            severity: 'medium',
            message: `${sub.name} exceeds max posts per day (${list.length}/${rules.maxPostsPerDay}) on ${day}`,
            affectedPostIds: list.map((t) => t.post.id),
          });
        }
      }
    }
    if (rules.allowsSelfPromotion === false) {
      threadsForSub.forEach((t) => {
        const content = `${t.post.title} ${t.post.body} ${t.comments.map(c => c.content).join(' ')}`.toLowerCase();
        if (content.includes(company.name.toLowerCase())) {
          issues.push({
            type: 'promo_sensitivity',
            severity: 'medium',
            message: `${sub.name} disallows self-promotion but thread mentions the company`,
            affectedPostIds: [t.post.id],
          });
        }
      });
    }
  }
  return issues;
}

/**
 * Checks for voice consistency across personas
 */
function checkVoiceConsistency(
  threads: Thread[]
): { issues: QualityIssue[]; suggestions: string[] } {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  
  // Group content by persona
  const personaContent = new Map<string, string[]>();
  
  for (const thread of threads) {
    // OP content
    const opId = thread.post.personaId;
    if (!personaContent.has(opId)) {
      personaContent.set(opId, []);
    }
    personaContent.get(opId)!.push(thread.post.title, thread.post.body);
    
    // Comment content
    for (const comment of thread.comments) {
      if (!personaContent.has(comment.personaId)) {
        personaContent.set(comment.personaId, []);
      }
      personaContent.get(comment.personaId)!.push(comment.content);
    }
  }
  
  // Check for content that's too similar across personas
  const personaIds = Array.from(personaContent.keys());
  
  for (let i = 0; i < personaIds.length; i++) {
    for (let j = i + 1; j < personaIds.length; j++) {
      const contentA = personaContent.get(personaIds[i])!.join(' ');
      const contentB = personaContent.get(personaIds[j])!.join(' ');
      
      const similarity = calculateSimilarity(contentA, contentB);
      
      if (similarity > 0.5) {
        issues.push({
          type: 'voice_inconsistency',
          severity: 'medium',
          message: `Two personas have very similar writing styles (${Math.round(similarity * 100)}% overlap)`,
        });
      }
    }
  }
  
  // Check for lack of variety
  if (personaContent.size < 3) {
    suggestions.push('Consider using more personas for variety');
  }
  
  return { issues, suggestions };
}

// ============================================
// SCORING
// ============================================

/**
 * Calculates overall quality score
 */
function calculateOverallScore(
  issues: QualityIssue[],
  warnings: string[],
  threadCount: number
): number {
  // Start with perfect score
  let score = 10;
  
  // Deduct for issues based on severity
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 2;
        break;
      case 'medium':
        score -= 1;
        break;
      case 'low':
        score -= 0.5;
        break;
    }
  }
  
  // Deduct for warnings
  score -= warnings.length * 0.3;
  
  // Bonus for having multiple threads (diversity)
  if (threadCount >= 3) {
    score += 0.5;
  }
  
  // Clamp to 0-10
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * Gets a quality grade from score
 */
export function getQualityGrade(score: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
} {
  if (score >= 9) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 7) return { grade: 'B', label: 'Good', color: '#84cc16' };
  if (score >= 5) return { grade: 'C', label: 'Fair', color: '#eab308' };
  if (score >= 3) return { grade: 'D', label: 'Poor', color: '#f97316' };
  return { grade: 'F', label: 'Needs Work', color: '#ef4444' };
}

// ============================================
// UTILITIES
// ============================================

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================
// THREAD SCORING
// ============================================

/**
 * Scores an individual thread
 */
export function scoreThread(
  thread: Thread,
  company: Company
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    naturalness: 0,
    engagement: 0,
    subtlety: 0,
    timing: 0,
  };
  
  // Naturalness (based on content length and style)
  const postLength = thread.post.body.length;
  if (postLength >= 50 && postLength <= 500) {
    breakdown.naturalness = 2.5;
  } else if (postLength > 10) {
    breakdown.naturalness = 1.5;
  }
  
  // Engagement (based on comment count and variety)
  const commentCount = thread.comments.length;
  if (commentCount >= 2 && commentCount <= 4) {
    breakdown.engagement = 2.5;
  } else if (commentCount >= 1) {
    breakdown.engagement = 1.5;
  }
  
  // Subtlety (based on promotional content)
  const hasDirectMention = (thread.post.body + thread.comments.map(c => c.content).join(' '))
    .toLowerCase()
    .includes(company.name.toLowerCase());
  
  if (!hasDirectMention) {
    breakdown.subtlety = 2.5;
  } else {
    breakdown.subtlety = 1;
  }
  
  // Timing (based on comment delays)
  const avgDelay = thread.comments.reduce((sum, c) => sum + c.delayMinutes, 0) / 
    Math.max(thread.comments.length, 1);
  
  if (avgDelay >= 30 && avgDelay <= 120) {
    breakdown.timing = 2.5;
  } else if (avgDelay >= 15) {
    breakdown.timing = 1.5;
  }
  
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  
  return { score, breakdown };
}
