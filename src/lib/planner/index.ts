import { 
  PlannerInput, 
  PlannerOutput, 
  Post, 
  Comment,
  CalendarHistory,
  Thread,
} from '@/types';
import { getWeekNumber, getWeekStartDate } from '@/lib/utils';
import { allocateSlots } from './slotAllocator';
import { matchSubreddits } from './subredditMatcher';
import { assignPersonas } from './personaAssigner';
import { generateThreads } from './threadGenerator';
import { regenerateThread } from './threadGenerator';
import { checkQuality, scoreThread } from './qualityChecker';
import { DEFAULT_CONSTRAINTS } from './constraints';
import { addLog } from '@/lib/server/logStore';

const shouldDebug = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PLANNER === 'true';
const debug = (...args: Parameters<typeof console.log>) => {
  if (shouldDebug) {
    console.log(...args);
  }
};

// ============================================
// MAIN PLANNER ORCHESTRATOR
// ============================================

/**
 * Generates a complete weekly content calendar
 * 
 * This is the main entry point for the planning algorithm.
 * It orchestrates all phases:
 * 1. Slot Allocation - Distribute posts across the week
 * 2. Subreddit Matching - Match keywords to subreddits
 * 3. Persona Assignment - Assign personas to posts/comments
 * 4. Thread Generation - Generate content with AI
 * 5. Quality Check - Validate and score everything
 */
export async function generateWeeklyCalendar(
  input: PlannerInput
): Promise<PlannerOutput> {
  debug('🚀 Starting calendar generation...');
  addLog('info', 'Starting calendar generation', {
    company: input.company.name,
    postsPerWeek: input.postsPerWeek,
    subreddits: input.subreddits.length,
    personas: input.personas.length,
    keywords: input.keywords.length,
  });
  debug(`   Company: ${input.company.name}`);
  debug(`   Personas: ${input.personas.length}`);
  debug(`   Subreddits: ${input.subreddits.length}`);
  debug(`   Keywords: ${input.keywords.length}`);
  debug(`   Posts per week: ${input.postsPerWeek}`);
  
  // Validate input
  const baseConstraints = input.constraints || DEFAULT_CONSTRAINTS;
  const constraints = applyRiskTolerance(baseConstraints, input.riskTolerance);
  validateInput(input, constraints);
  
  // Calculate week number if not provided
  const weekNumber = input.weekNumber || getWeekNumber(input.weekStartDate);
  
  // ============================================
  // PHASE 1: SLOT ALLOCATION
  // ============================================
  debug('\n📅 Phase 1: Allocating time slots...');
  addLog('info', 'Phase 1: Allocating time slots');
  
  const slotResult = allocateSlots({
    count: input.postsPerWeek,
    weekStart: input.weekStartDate,
    subreddits: input.subreddits,
  });
  
  debug(`   Created ${slotResult.slots.length} slots`);
  debug(`   Days used: ${slotResult.metadata.daysUsed.join(', ')}`);
  
  // ============================================
  // PHASE 2: SUBREDDIT MATCHING
  // ============================================
  debug('\n🎯 Phase 2: Matching subreddits and keywords...');
  addLog('info', 'Phase 2: Matching subreddits and keywords');
  
  const matchResult = matchSubreddits({
    slots: slotResult.slots,
    subreddits: input.subreddits,
    keywords: input.keywords,
    previousWeeks: input.previousWeeks,
    constraints,
  });
  
  debug(`   Matched ${matchResult.slots.length} slots`);
  debug(`   Subreddit distribution:`, matchResult.metadata.subredditDistribution);
  
  if (matchResult.metadata.topicsSkipped.length > 0) {
    debug(`   ⚠️ Skipped: ${matchResult.metadata.topicsSkipped.join(', ')}`);
  }
  
  // ============================================
  // PHASE 3: PERSONA ASSIGNMENT
  // ============================================
  debug('\n👥 Phase 3: Assigning personas...');
  addLog('info', 'Phase 3: Assigning personas');
  
  const assignResult = assignPersonas({
    slots: matchResult.slots,
    personas: input.personas,
    constraints,
    previousWeeks: input.previousWeeks,
  });
  
  debug(`   Assigned personas to ${assignResult.slots.length} slots`);
  debug(`   Persona distribution:`, assignResult.metadata.personaDistribution);
  
  if (assignResult.metadata.warnings.length > 0) {
    debug(`   ⚠️ Warnings: ${assignResult.metadata.warnings.join(', ')}`);
  }
  
  // ============================================
  // PHASE 4: THREAD GENERATION
  // ============================================
  debug('\n✍️ Phase 4: Generating content...');
  addLog('info', 'Phase 4: Generating content');
  
  const threadResult = await generateThreads({
    slots: assignResult.slots,
    company: input.company,
    personas: input.personas,
    weekNumber,
    preferences: input.preferences,
    constraints,
    weeklyGoals: input.weeklyGoals,
    riskTolerance: input.riskTolerance,
  });
  
  debug(`   Generated ${threadResult.metadata.totalPosts} posts`);
  debug(`   Generated ${threadResult.metadata.totalComments} comments`);
  debug(`   Generation time: ${threadResult.metadata.generationTime}ms`);
  
  if (threadResult.metadata.errors.length > 0) {
    debug(`   ❌ Errors: ${threadResult.metadata.errors.join(', ')}`);
    addLog('warn', 'Thread generation errors', {
      errors: threadResult.metadata.errors,
    });
  }
  
  // ============================================
  // PHASE 5: QUALITY CHECK
  // ============================================
  debug('\n✅ Phase 5: Quality check...');
  addLog('info', 'Phase 5: Quality check');
  
  let qualityResult = checkQuality({
    threads: threadResult.threads,
    company: input.company,
    subreddits: input.subreddits,
    constraints,
    previousWeeks: input.previousWeeks,
    antiPromoChecks: input.preferences?.antiPromoChecks ?? true,
  });
  
  debug(`   Overall score: ${qualityResult.report.overallScore}/10`);
  debug(`   Issues: ${qualityResult.report.issues.length}`);
  debug(`   Warnings: ${qualityResult.report.warnings.length}`);
  
  // Auto-repair if needed
  const autoRepair = input.preferences?.autoRepair ?? true;
  if (autoRepair && (qualityResult.report.issues.length > 0 || qualityResult.report.warnings.length > 0)) {
    const repairPasses = input.preferences?.repairPasses ?? 1;
    let threads = threadResult.threads;

    for (let pass = 0; pass < repairPasses; pass++) {
      const targetPostIds = new Set<string>();
      qualityResult.report.issues.forEach((issue) => {
        issue.affectedPostIds?.forEach((id) => targetPostIds.add(id));
      });

      if (qualityResult.report.warningsByPostId) {
        Object.keys(qualityResult.report.warningsByPostId).forEach((id) => targetPostIds.add(id));
      }

      if (targetPostIds.size === 0) break;

      const repaired: typeof threads = [];
      for (const thread of threads) {
        if (!targetPostIds.has(thread.post.id)) {
          repaired.push(thread);
          continue;
        }

        const strictPreferences = {
          ...input.preferences,
          antiPromoChecks: true,
          requireDisagreement: true,
          commentGuidelines: [
            input.preferences?.commentGuidelines,
            'Include at least one mild disagreement or nuance.',
            'Avoid overly promotional language. If you mention the product, keep it subtle and secondary.',
          ].filter(Boolean).join(' '),
          bannedPhrases: Array.from(new Set([
            ...(input.preferences?.bannedPhrases || []),
            ...(input.preferences?.allowProductMention === false ? [input.company.name] : []),
          ])),
        };

        const regenerated = await regenerateThread({
          slot: thread.slot,
          company: input.company,
          weekNumber,
          preferences: strictPreferences,
          constraints,
          weeklyGoals: input.weeklyGoals,
          riskTolerance: input.riskTolerance,
        });

        repaired.push(regenerated);
      }

      threads = repaired;
      qualityResult = checkQuality({
        threads,
        company: input.company,
        subreddits: input.subreddits,
        constraints,
        previousWeeks: input.previousWeeks,
        antiPromoChecks: input.preferences?.antiPromoChecks ?? true,
      });
      if (qualityResult.report.issues.length === 0 && qualityResult.report.warnings.length === 0) {
        break;
      }
    }

    threadResult.threads = threads;
  }

  // Score individual threads
  for (const thread of threadResult.threads) {
    const threadScore = scoreThread(thread, input.company);
    const intent = buildIntentMetadata({
      thread,
      company: input.company,
      weeklyGoals: input.weeklyGoals,
    });
    thread.post.qualityScore = threadScore.score;
    thread.post.qualityBreakdown = threadScore.breakdown;
    thread.post.qualityIssues = qualityResult.report.issuesByPostId?.[thread.post.id]?.map(i => i.message) || [];
    thread.post.qualityWarnings = qualityResult.report.warningsByPostId?.[thread.post.id] || [];
    thread.post.qualitySuggestions = qualityResult.report.suggestionsByPostId?.[thread.post.id] || [];
    thread.post.intent = intent;
  }
  
  // ============================================
  // FLATTEN OUTPUT
  // ============================================
  debug('\n📦 Preparing output...');
  
  const posts = threadResult.threads.map(t => t.post);
  const comments = threadResult.threads.flatMap(t => t.comments);
  
  debug(`\n✨ Calendar generation complete!`);
  addLog('info', 'Calendar generation complete', {
    posts: posts.length,
    comments: comments.length,
    quality: qualityResult.report.overallScore,
  });
  debug(`   ${posts.length} posts ready`);
  debug(`   ${comments.length} comments ready`);
  debug(`   Quality score: ${qualityResult.report.overallScore}/10`);
  
  return {
    posts,
    comments,
    qualityReport: qualityResult.report,
    weekNumber,
    generatedAt: new Date(),
    debug: {
      slotAllocation: {
        slots: slotResult.slots.length,
        daysUsed: slotResult.metadata.daysUsed,
        timesUsed: slotResult.metadata.timesUsed,
      },
      subredditMatching: {
        matchedSlots: matchResult.slots.length,
        subredditDistribution: matchResult.metadata.subredditDistribution,
        keywordUsage: matchResult.metadata.keywordUsage,
        topicsSkipped: matchResult.metadata.topicsSkipped,
      },
      personaAssignment: {
        assignedSlots: assignResult.slots.length,
        personaDistribution: assignResult.metadata.personaDistribution,
        pairingsUsed: assignResult.metadata.pairingsUsed,
        warnings: assignResult.metadata.warnings,
      },
      threadGeneration: {
        totalPosts: threadResult.metadata.totalPosts,
        totalComments: threadResult.metadata.totalComments,
        generationTime: threadResult.metadata.generationTime,
        errors: threadResult.metadata.errors,
      },
      quality: {
        overallScore: qualityResult.report.overallScore,
        issuesCount: qualityResult.report.issues.length,
        warningsCount: qualityResult.report.warnings.length,
      },
    },
  };
}

/**
 * Generates calendar for the next week based on history
 */
export async function generateNextWeek(
  input: Omit<PlannerInput, 'weekNumber' | 'weekStartDate'>,
  currentHistory: CalendarHistory[]
): Promise<PlannerOutput> {
  // Calculate next week's start date
  const lastWeek = currentHistory[0];
  const lastWeekNumber = lastWeek?.weekNumber || getWeekNumber(new Date());
  
  const nextWeekStart = getWeekStartDate(new Date());
  // Add 7 days to get next week
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  
  return generateWeeklyCalendar({
    ...input,
    weekNumber: lastWeekNumber + 1,
    weekStartDate: nextWeekStart,
    previousWeeks: currentHistory.slice(0, 4), // Last 4 weeks for freshness
  });
}

// ============================================
// INPUT VALIDATION
// ============================================

function validateInput(input: PlannerInput, constraints: typeof DEFAULT_CONSTRAINTS): void {
  const errors: string[] = [];
  
  // Check company
  if (!input.company.id || !input.company.name) {
    errors.push('Company must have id and name');
  }
  
  // Check personas
  if (input.personas.length < 2) {
    errors.push('At least 2 personas are required');
  }
  
  for (const persona of input.personas) {
    if (!persona.id || !persona.username || !persona.bio) {
      errors.push(`Persona ${persona.username || 'unknown'} missing required fields`);
    }
  }
  
  // Check subreddits
  if (input.subreddits.length === 0) {
    errors.push('At least 1 subreddit is required');
  }
  
  // Check keywords
  if (input.keywords.length === 0) {
    errors.push('At least 1 keyword is required');
  }
  
  // Check posts per week
  if (input.postsPerWeek < 1) {
    errors.push('Posts per week must be at least 1');
  }
  
  if (input.postsPerWeek > input.subreddits.length * constraints.maxPostsPerSubredditPerWeek) {
    errors.push(
      `Cannot schedule ${input.postsPerWeek} posts with only ${input.subreddits.length} subreddits ` +
      `(max ${constraints.maxPostsPerSubredditPerWeek} per subreddit)`
    );
  }
  
  // Check week start date
  if (!(input.weekStartDate instanceof Date) || isNaN(input.weekStartDate.getTime())) {
    errors.push('Invalid week start date');
  }
  
  if (errors.length > 0) {
    throw new Error(`Invalid planner input:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }
}

function applyRiskTolerance(
  constraints: typeof DEFAULT_CONSTRAINTS,
  riskTolerance?: 'low' | 'medium' | 'high'
): typeof DEFAULT_CONSTRAINTS {
  if (!riskTolerance || riskTolerance === 'medium') {
    return constraints;
  }

  if (riskTolerance === 'low') {
    return {
      ...constraints,
      maxPostsPerSubredditPerWeek: Math.max(1, constraints.maxPostsPerSubredditPerWeek - 1),
      maxPromoScoreAllowed: Math.max(2, constraints.maxPromoScoreAllowed - 1),
      maxCommentsPerPersonaPerWeek: Math.max(1, constraints.maxCommentsPerPersonaPerWeek - 1),
    };
  }

  return {
    ...constraints,
    maxPostsPerSubredditPerWeek: constraints.maxPostsPerSubredditPerWeek + 1,
    maxPromoScoreAllowed: constraints.maxPromoScoreAllowed + 1,
    maxCommentsPerPersonaPerWeek: constraints.maxCommentsPerPersonaPerWeek + 1,
  };
}

function buildIntentMetadata(config: {
  thread: Thread;
  company: { name: string };
  weeklyGoals?: string[];
}): { businessGoal: string; personaRationale: string; subredditFitReasoning: string; expectedReplyPatterns: string; seoIntent: string } {
  const { thread, weeklyGoals } = config;
  const keywordText = thread.slot.keywords.map(k => k.keyword).join(', ');
  const goal = pickBusinessGoal(weeklyGoals, thread.slot.keywords.map(k => k.category || ''));
  const personaRationale = `${thread.slot.opPersona.username} (${thread.slot.opPersona.postingStyle.replace('_', ' ')}) is a strong fit to start a ${thread.slot.threadType} thread and has expertise in ${thread.slot.opPersona.expertise.slice(0, 2).join(' / ') || 'the topic'}.`;
  const subredditFitReasoning = `${thread.slot.subreddit.name} is relevant because it focuses on ${thread.slot.subreddit.description || 'this topic'}, and the keywords (${keywordText}) match common discussions there.`;
  const expectedReplyPatterns = expectedRepliesForThreadType(thread.slot.threadType);
  const seoIntent = seoIntentFromKeywords(thread.slot.keywords);

  return {
    businessGoal: goal,
    personaRationale,
    subredditFitReasoning,
    expectedReplyPatterns,
    seoIntent,
  };
}

function pickBusinessGoal(weeklyGoals: string[] | undefined, categories: string[]): string {
  if (weeklyGoals && weeklyGoals.length > 0) {
    return weeklyGoals[0];
  }

  if (categories.some(cat => cat.toLowerCase().includes('comparison'))) {
    return 'Position the product against alternatives through neutral discussion.';
  }
  if (categories.some(cat => cat.toLowerCase().includes('problem'))) {
    return 'Elicit pain points and language used by the community.';
  }
  if (categories.some(cat => cat.toLowerCase().includes('use-case'))) {
    return 'Highlight practical scenarios and workflows.';
  }
  return 'Increase awareness by participating in authentic community discussions.';
}

function expectedRepliesForThreadType(threadType: string): string {
  switch (threadType) {
    case 'question':
      return 'Replies should include advice, tool recommendations, and a mix of agreement + nuance.';
    case 'advice':
      return 'Expect concrete tips, alternative approaches, and short follow-up questions.';
    case 'story':
      return 'Expect reactions, similar anecdotes, and light debate about the takeaway.';
    case 'discussion':
      return 'Expect multiple perspectives, counterpoints, and clarifying questions.';
    default:
      return 'Expect a mix of advice, anecdotes, and clarifying questions.';
  }
}

function seoIntentFromKeywords(keywords: { keyword: string; category?: string }[]): string {
  if (keywords.length === 0) return 'Informational discovery intent.';
  const category = keywords[0].category?.toLowerCase() || '';
  if (category.includes('comparison')) return 'Comparison intent (alternatives, vs, pros/cons).';
  if (category.includes('problem')) return 'Problem/solution intent (how-to, troubleshooting).';
  if (category.includes('use-case')) return 'Use-case intent (examples, workflows, templates).';
  return `Discovery intent around: ${keywords[0].keyword}`;
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { DEFAULT_CONSTRAINTS } from './constraints';
export { getQualityGrade } from './qualityChecker';
export { setMockMode } from '@/lib/ai/openai';
