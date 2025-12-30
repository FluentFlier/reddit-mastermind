import { PlannerConstraints, Subreddit } from '@/types';

// ============================================
// DEFAULT PLANNER CONSTRAINTS
// ============================================
// These rules prevent spam patterns, ensure natural-looking
// interactions, and maximize content quality.

export const DEFAULT_CONSTRAINTS: PlannerConstraints = {
  // ----------------
  // SUBREDDIT CONSTRAINTS
  // ----------------
  // Prevents overposting in any single subreddit
  maxPostsPerSubredditPerWeek: 2,
  
  // Minimum days between posts in the same subreddit
  minDaysBetweenSubredditPosts: 3,
  
  // ----------------
  // PERSONA CONSTRAINTS
  // ----------------
  // Each persona can only be the OP this many times per week
  maxPostsPerPersonaPerWeek: 2,
  
  // Each persona can only comment this many times per week
  maxCommentsPerPersonaPerWeek: 6,
  
  // Minimum hours between posts by the same persona
  minHoursBetweenSamePersonaPosts: 24,
  
  // Maximum personas that can comment on a single thread
  // Keeps threads from looking like a coordinated effort
  maxPersonasPerThread: 3,
  
  // ----------------
  // INTERACTION CONSTRAINTS
  // ----------------
  // If PersonaA and PersonaB interact on Monday, they shouldn't
  // interact again until next week
  noRepeatedPairingsPerWeek: true,
  
  // Prevent PersonaA commenting, then PersonaB, then PersonaA again
  // in the same thread (looks coordinated)
  noBackToBackComments: true,
  
  // ----------------
  // TIMING CONSTRAINTS
  // ----------------
  // First comment should arrive 15-180 minutes after the post
  minDelayAfterPostMinutes: 15,
  maxDelayAfterPostMinutes: 180,
  
  // Subsequent comments should be spaced 10-60 minutes apart
  commentSpacingMinutes: [10, 60],
  
  // OP follow-up comment should be 30-180 minutes after last comment
  opFollowUpDelayMinutes: [30, 180],
  
  // ----------------
  // QUALITY CONSTRAINTS
  // ----------------
  // Threads with promo score above this get flagged
  maxPromoScoreAllowed: 6,
  
  // Minimum quality score required to approve a thread
  minQualityScoreRequired: 6,
};

// ============================================
// CONSTRAINT VALIDATION FUNCTIONS
// ============================================

export function canPersonaPost(
  personaId: string,
  usage: Map<string, { postsThisWeek: number; lastPostDate?: Date }>,
  constraints: PlannerConstraints,
  proposedDate: Date
): { allowed: boolean; reason?: string } {
  const personaUsage = usage.get(personaId);
  
  if (!personaUsage) {
    return { allowed: true };
  }
  
  // Check weekly limit
  if (personaUsage.postsThisWeek >= constraints.maxPostsPerPersonaPerWeek) {
    return {
      allowed: false,
      reason: `Persona has reached max posts per week (${constraints.maxPostsPerPersonaPerWeek})`,
    };
  }
  
  // Check time spacing
  if (personaUsage.lastPostDate) {
    const hoursSinceLastPost = 
      (proposedDate.getTime() - personaUsage.lastPostDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastPost < constraints.minHoursBetweenSamePersonaPosts) {
      return {
        allowed: false,
        reason: `Must wait ${constraints.minHoursBetweenSamePersonaPosts}h between posts`,
      };
    }
  }
  
  return { allowed: true };
}

export function canPostToSubreddit(
  subredditId: string,
  usage: Map<string, { postsThisWeek: number; lastPostDate?: Date }>,
  constraints: PlannerConstraints,
  proposedDate: Date
): { allowed: boolean; reason?: string } {
  const subUsage = usage.get(subredditId);
  
  if (!subUsage) {
    return { allowed: true };
  }
  
  // Check weekly limit
  if (subUsage.postsThisWeek >= constraints.maxPostsPerSubredditPerWeek) {
    return {
      allowed: false,
      reason: `Subreddit has reached max posts per week (${constraints.maxPostsPerSubredditPerWeek})`,
    };
  }
  
  // Check day spacing
  if (subUsage.lastPostDate) {
    const daysSinceLastPost = 
      (proposedDate.getTime() - subUsage.lastPostDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastPost < constraints.minDaysBetweenSubredditPosts) {
      return {
        allowed: false,
        reason: `Must wait ${constraints.minDaysBetweenSubredditPosts} days between posts`,
      };
    }
  }
  
  return { allowed: true };
}

export function canPersonasInteract(
  personaA: string,
  personaB: string,
  pairingsThisWeek: Set<string>,
  constraints: PlannerConstraints
): { allowed: boolean; reason?: string } {
  if (!constraints.noRepeatedPairingsPerWeek) {
    return { allowed: true };
  }
  
  const pairingKey = [personaA, personaB].sort().join('+');
  
  if (pairingsThisWeek.has(pairingKey)) {
    return {
      allowed: false,
      reason: 'These personas have already interacted this week',
    };
  }
  
  return { allowed: true };
}

export function validateThreadStructure(
  opPersonaId: string,
  commentPersonaIds: string[],
  constraints: PlannerConstraints
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check max personas per thread
  const uniqueCommenters = new Set(commentPersonaIds);
  if (uniqueCommenters.size > constraints.maxPersonasPerThread - 1) {
    issues.push(
      `Too many personas in thread (max: ${constraints.maxPersonasPerThread})`
    );
  }
  
  // Check for back-to-back same persona comments
  if (constraints.noBackToBackComments) {
    for (let i = 1; i < commentPersonaIds.length; i++) {
      if (commentPersonaIds[i] === commentPersonaIds[i - 1]) {
        issues.push('Same persona cannot comment back-to-back');
        break;
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================
// TIMING UTILITIES
// ============================================

export function generateCommentDelay(
  index: number,
  isOPFollowUp: boolean,
  constraints: PlannerConstraints
): number {
  if (isOPFollowUp) {
    const [min, max] = constraints.opFollowUpDelayMinutes;
    return min + Math.floor(Math.random() * (max - min));
  }
  
  if (index === 0) {
    // First comment after post
    const range = constraints.maxDelayAfterPostMinutes - constraints.minDelayAfterPostMinutes;
    return constraints.minDelayAfterPostMinutes + Math.floor(Math.random() * range);
  }
  
  // Subsequent comments
  const [min, max] = constraints.commentSpacingMinutes;
  return min + Math.floor(Math.random() * (max - min));
}

// ============================================
// SUBREDDIT-SPECIFIC RULES
// ============================================

export const SUBREDDIT_PRESETS: Record<string, Partial<PlannerConstraints>> = {
  // High-activity subreddits might tolerate more frequent posting
  'r/AskReddit': {
    maxPostsPerSubredditPerWeek: 3,
    minDaysBetweenSubredditPosts: 2,
  },
  // Professional subreddits are more sensitive
  'r/consulting': {
    maxPostsPerSubredditPerWeek: 1,
    minDaysBetweenSubredditPosts: 7,
    maxPromoScoreAllowed: 4,
  },
  // Tech subreddits
  'r/startups': {
    maxPostsPerSubredditPerWeek: 2,
    maxPromoScoreAllowed: 5,
  },
};

export function getSubredditConstraints(
  subreddit: Subreddit,
  baseConstraints: PlannerConstraints
): PlannerConstraints {
  const preset = SUBREDDIT_PRESETS[subreddit.name];
  const sensitivity = subreddit.sensitivity || 'medium';
  const sensitivityAdjustments: Partial<PlannerConstraints> =
    sensitivity === 'high'
      ? {
          maxPostsPerSubredditPerWeek: Math.max(1, baseConstraints.maxPostsPerSubredditPerWeek - 1),
          minDaysBetweenSubredditPosts: baseConstraints.minDaysBetweenSubredditPosts + 2,
          maxPromoScoreAllowed: Math.max(2, baseConstraints.maxPromoScoreAllowed - 1),
        }
      : sensitivity === 'low'
      ? {
          maxPostsPerSubredditPerWeek: baseConstraints.maxPostsPerSubredditPerWeek + 1,
          minDaysBetweenSubredditPosts: Math.max(1, baseConstraints.minDaysBetweenSubredditPosts - 1),
        }
      : {};

  return {
    ...baseConstraints,
    ...preset,
    ...sensitivityAdjustments,
  };
}
