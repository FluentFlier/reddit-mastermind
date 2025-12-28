import { 
  TimeSlot, 
  MatchedSlot, 
  Subreddit, 
  Keyword, 
  ThreadType,
  CalendarHistory,
} from '@/types';
import { 
  shuffleArray, 
  pickRandom,
  calculateSimilarity,
} from '@/lib/utils';
import { 
  DEFAULT_CONSTRAINTS,
  canPostToSubreddit,
} from './constraints';
import { PlannerConstraints } from '@/types';

// ============================================
// SUBREDDIT MATCHER
// ============================================
// Matches subreddits and keywords to each time slot

export interface SubredditMatcherConfig {
  slots: TimeSlot[];
  subreddits: Subreddit[];
  keywords: Keyword[];
  previousWeeks?: CalendarHistory[];
  constraints?: PlannerConstraints;
}

export interface SubredditMatcherResult {
  slots: MatchedSlot[];
  metadata: {
    subredditDistribution: Record<string, number>;
    keywordUsage: Record<string, number>;
    topicsSkipped: string[];
  };
}

/**
 * Matches subreddits and keywords to each time slot
 * 
 * Strategy:
 * 1. Distribute subreddits evenly (no overposting)
 * 2. Match keywords to subreddit relevance
 * 3. Apply freshness penalty to recently used topics
 * 4. Determine thread type based on keyword intent
 */
export function matchSubreddits(
  config: SubredditMatcherConfig
): SubredditMatcherResult {
  const { slots, subreddits, keywords, previousWeeks = [], constraints } = config;
  const effectiveConstraints = constraints || DEFAULT_CONSTRAINTS;
  
  const matchedSlots: MatchedSlot[] = [];
  const subredditUsage = new Map<string, { postsThisWeek: number; lastPostDate?: Date }>();
  const keywordUsage: Record<string, number> = {};
  const topicsSkipped: string[] = [];
  
  // Build freshness penalties from previous weeks
  const freshnessPenalties = buildFreshnessPenalties(previousWeeks);
  
  for (const slot of slots) {
    // Select best subreddit for this slot
    const selectedSubreddit = selectSubreddit(
      subreddits,
      subredditUsage,
      slot.date,
      effectiveConstraints
    );
    
    if (!selectedSubreddit) {
      topicsSkipped.push(`No eligible subreddit for slot at ${slot.date}`);
      continue;
    }
    
    // Select keywords for this subreddit
    const selectedKeywords = selectKeywords(
      keywords,
      selectedSubreddit,
      keywordUsage,
      freshnessPenalties,
      2 // max keywords per post
    );
    
    // Determine thread type
    const threadType = determineThreadType(selectedKeywords);
    
    matchedSlots.push({
      ...slot,
      subreddit: selectedSubreddit,
      keywords: selectedKeywords,
      threadType,
    });
    
    // Update tracking
    const currentUsage = subredditUsage.get(selectedSubreddit.id) || { postsThisWeek: 0 };
    subredditUsage.set(selectedSubreddit.id, {
      postsThisWeek: currentUsage.postsThisWeek + 1,
      lastPostDate: slot.date,
    });
    
    for (const kw of selectedKeywords) {
      keywordUsage[kw.id] = (keywordUsage[kw.id] || 0) + 1;
    }
  }
  
  // Build distribution summary
  const subredditDistribution: Record<string, number> = {};
  subredditUsage.forEach((usage, id) => {
    const sub = subreddits.find(s => s.id === id);
    if (sub) {
      subredditDistribution[sub.name] = usage.postsThisWeek;
    }
  });
  
  return {
    slots: matchedSlots,
    metadata: {
      subredditDistribution,
      keywordUsage,
      topicsSkipped,
    },
  };
}

/**
 * Selects the best subreddit for a slot
 */
function selectSubreddit(
  subreddits: Subreddit[],
  usage: Map<string, { postsThisWeek: number; lastPostDate?: Date }>,
  proposedDate: Date,
  constraints: PlannerConstraints
): Subreddit | null {
  // Filter eligible subreddits
  const eligible = subreddits.filter(sub => {
    const check = canPostToSubreddit(
      sub.id, 
      usage, 
      constraints, 
      proposedDate
    );
    return check.allowed;
  });
  
  if (eligible.length === 0) {
    return null;
  }
  
  // Score subreddits by usage (prefer less-used ones)
  const scored = eligible.map(sub => {
    const subUsage = usage.get(sub.id);
    const usageScore = subUsage ? subUsage.postsThisWeek : 0;
    
    return {
      subreddit: sub,
      score: -usageScore + Math.random() * 0.5, // Lower usage = higher score + randomness
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].subreddit;
}

/**
 * Selects keywords that match a subreddit
 */
function selectKeywords(
  keywords: Keyword[],
  subreddit: Subreddit,
  usage: Record<string, number>,
  freshnessPenalties: Map<string, number>,
  maxKeywords: number
): Keyword[] {
  // Score each keyword
  const scored = keywords.map(kw => {
    let score = 0;
    
    // Relevance to subreddit (basic text matching)
    const relevance = calculateSubredditRelevance(kw, subreddit);
    score += relevance * 3;
    
    // Freshness (penalize recently used)
    const freshnessPenalty = freshnessPenalties.get(kw.id) || 0;
    score -= freshnessPenalty;
    
    // Usage balance (prefer less-used keywords)
    const usageCount = usage[kw.id] || 0;
    score -= usageCount * 2;
    
    // Priority boost
    if (kw.priority) {
      score += kw.priority;
    }
    
    // Add randomness
    score += Math.random() * 0.5;
    
    return { keyword: kw, score };
  });
  
  // Sort by score and take top N
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxKeywords).map(s => s.keyword);
}

/**
 * Calculates relevance of a keyword to a subreddit
 */
function calculateSubredditRelevance(
  keyword: Keyword,
  subreddit: Subreddit
): number {
  const kwLower = keyword.keyword.toLowerCase();
  const subLower = subreddit.name.toLowerCase();
  const subDesc = (subreddit.description || '').toLowerCase();
  
  // Direct match in subreddit name
  if (subLower.includes(kwLower) || kwLower.includes(subLower.replace('r/', ''))) {
    return 1.0;
  }
  
  // Match in description
  if (subDesc && subDesc.includes(kwLower)) {
    return 0.8;
  }
  
  // Category-based matching
  const categoryMatches = matchCategory(keyword, subreddit);
  if (categoryMatches) {
    return 0.6;
  }
  
  // Default relevance
  return 0.3;
}

/**
 * Matches keyword category to subreddit
 */
function matchCategory(keyword: Keyword, subreddit: Subreddit): boolean {
  const category = keyword.category?.toLowerCase() || '';
  const subName = subreddit.name.toLowerCase();
  
  const categoryMappings: Record<string, string[]> = {
    presentations: ['powerpoint', 'slides', 'presentations', 'canva'],
    productivity: ['productivity', 'getdisciplined', 'selfimprovement'],
    business: ['startups', 'entrepreneur', 'smallbusiness', 'business'],
    tech: ['technology', 'programming', 'software', 'chatgpt', 'claudeai'],
    design: ['design', 'canva', 'graphic_design'],
    education: ['askacademia', 'teachers', 'education', 'college'],
  };
  
  for (const [cat, subs] of Object.entries(categoryMappings)) {
    if (category.includes(cat) || keyword.keyword.toLowerCase().includes(cat)) {
      if (subs.some(s => subName.includes(s))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Determines thread type based on keywords
 */
export function determineThreadType(keywords: Keyword[]): ThreadType {
  const keywordText = keywords.map(k => k.keyword.toLowerCase()).join(' ');
  
  // Question indicators
  if (keywordText.includes('best') || 
      keywordText.includes('how to') ||
      keywordText.includes('what is') ||
      keywordText.includes('which') ||
      keywordText.includes('alternatives') ||
      keywordText.includes('vs')) {
    return 'question';
  }
  
  // Advice indicators
  if (keywordText.includes('help') ||
      keywordText.includes('need') ||
      keywordText.includes('recommend') ||
      keywordText.includes('tips')) {
    return 'advice';
  }
  
  // Story indicators
  if (keywordText.includes('experience') ||
      keywordText.includes('tried') ||
      keywordText.includes('review')) {
    return 'story';
  }
  
  // Default to discussion
  return 'discussion';
}

/**
 * Builds freshness penalties from previous weeks
 */
function buildFreshnessPenalties(
  previousWeeks: CalendarHistory[]
): Map<string, number> {
  const penalties = new Map<string, number>();
  
  // More recent = higher penalty
  for (let i = 0; i < previousWeeks.length; i++) {
    const week = previousWeeks[i];
    const weekPenalty = 1 / (i + 1); // Week 1 = 1.0, Week 2 = 0.5, etc.
    
    for (const topic of week.topicsUsed) {
      const current = penalties.get(topic) || 0;
      penalties.set(topic, current + weekPenalty);
    }
  }
  
  return penalties;
}

// ============================================
// VALIDATION
// ============================================

export function validateSubredditMatching(
  slots: MatchedSlot[],
  constraints: { maxPerSubreddit: number }
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Count per subreddit
  const counts: Record<string, number> = {};
  for (const slot of slots) {
    counts[slot.subreddit.name] = (counts[slot.subreddit.name] || 0) + 1;
  }
  
  // Check limits
  for (const [sub, count] of Object.entries(counts)) {
    if (count > constraints.maxPerSubreddit) {
      issues.push(
        `${sub} has ${count} posts (max: ${constraints.maxPerSubreddit})`
      );
    }
  }
  
  // Check for missing keywords
  const slotsWithoutKeywords = slots.filter(s => s.keywords.length === 0);
  if (slotsWithoutKeywords.length > 0) {
    issues.push(`${slotsWithoutKeywords.length} slots have no keywords`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
