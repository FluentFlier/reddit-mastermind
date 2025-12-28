import { 
  MatchedSlot, 
  AssignedSlot, 
  Persona,
  ThreadType,
} from '@/types';
import { 
  shuffleArray,
  createPairingKey,
} from '@/lib/utils';
import { 
  DEFAULT_CONSTRAINTS,
  canPersonaPost,
  canPersonasInteract,
  validateThreadStructure,
} from './constraints';
import { PlannerConstraints } from '@/types';

// ============================================
// PERSONA ASSIGNER
// ============================================
// Assigns personas to each slot (OP + commenters)

export interface PersonaAssignerConfig {
  slots: MatchedSlot[];
  personas: Persona[];
  constraints?: PlannerConstraints;
}

export interface PersonaAssignerResult {
  slots: AssignedSlot[];
  metadata: {
    personaDistribution: Record<string, { posts: number; comments: number }>;
    pairingsUsed: string[];
    warnings: string[];
  };
}

interface PersonaUsageTracker {
  postsThisWeek: number;
  commentsThisWeek: number;
  lastPostDate?: Date;
  subredditsPostedTo: string[];
}

/**
 * Assigns personas to each slot
 * 
 * Strategy:
 * 1. Select OP based on thread type and persona style
 * 2. Select 1-3 commenters (different from OP)
 * 3. Enforce no repeated pairings within a week
 * 4. Balance persona usage across the week
 */
export function assignPersonas(
  config: PersonaAssignerConfig
): PersonaAssignerResult {
  const { slots, personas, constraints } = config;
  const effectiveConstraints = constraints || DEFAULT_CONSTRAINTS;
  
  if (personas.length < 2) {
    throw new Error('At least 2 personas are required');
  }
  
  const assignedSlots: AssignedSlot[] = [];
  const usage = new Map<string, PersonaUsageTracker>();
  const pairingsThisWeek = new Set<string>();
  const warnings: string[] = [];
  
  // Initialize usage tracking
  for (const persona of personas) {
    usage.set(persona.id, {
      postsThisWeek: 0,
      commentsThisWeek: 0,
      subredditsPostedTo: [],
    });
  }
  
  for (const slot of slots) {
    // Select OP
    const opPersona = selectOP({
      slot,
      personas,
      usage,
      constraints: effectiveConstraints,
    });
    
    if (!opPersona) {
      warnings.push(`Could not find eligible OP for slot at ${slot.date}`);
      continue;
    }
    
    // Determine number of commenters (1-3, based on available personas)
    const maxCommenters = Math.min(
      effectiveConstraints.maxPersonasPerThread - 1,
      personas.length - 1,
      3
    );
    const commenterCount = 1 + Math.floor(Math.random() * maxCommenters);
    
    // Select commenters
    const commenterPersonas = selectCommenters({
      opPersona,
      personas,
      count: commenterCount,
      usage,
      pairingsThisWeek,
      slot,
      constraints: effectiveConstraints,
    });
    
    // Validate thread structure
    const validation = validateThreadStructure(
      opPersona.id,
      commenterPersonas.map(p => p.id),
      effectiveConstraints
    );
    
    if (!validation.valid) {
      warnings.push(...validation.issues);
    }
    
    assignedSlots.push({
      ...slot,
      opPersona,
      commenterPersonas,
    });
    
    // Update tracking
    updateUsage(usage, opPersona, commenterPersonas, slot);
    updatePairings(pairingsThisWeek, opPersona, commenterPersonas);
  }
  
  // Build distribution summary
  const personaDistribution: Record<string, { posts: number; comments: number }> = {};
  usage.forEach((tracker, id) => {
    const persona = personas.find(p => p.id === id);
    if (persona) {
      personaDistribution[persona.username] = {
        posts: tracker.postsThisWeek,
        comments: tracker.commentsThisWeek,
      };
    }
  });
  
  return {
    slots: assignedSlots,
    metadata: {
      personaDistribution,
      pairingsUsed: Array.from(pairingsThisWeek),
      warnings,
    },
  };
}

/**
 * Selects the OP persona for a slot
 */
function selectOP(config: {
  slot: MatchedSlot;
  personas: Persona[];
  usage: Map<string, PersonaUsageTracker>;
  constraints: PlannerConstraints;
}): Persona | null {
  const { slot, personas, usage, constraints } = config;
  
  // Filter eligible personas
  const eligible = personas.filter(persona => {
    // Check constraints
    const usageTracker = usage.get(persona.id);
    const canPost = canPersonaPost(
      persona.id,
      new Map(Array.from(usage.entries()).map(([k, v]) => [k, {
        postsThisWeek: v.postsThisWeek,
        lastPostDate: v.lastPostDate,
      }])),
      constraints,
      slot.date
    );
    
    if (!canPost.allowed) {
      return false;
    }
    
    // Check persona-thread type fit
    if (!isPersonaFitForThreadType(persona, slot.threadType)) {
      return false;
    }
    
    return true;
  });
  
  if (eligible.length === 0) {
    return null;
  }
  
  // Score personas (prefer balanced usage)
  const scored = eligible.map(persona => {
    const tracker = usage.get(persona.id)!;
    
    let score = 0;
    
    // Lower usage = higher score
    score -= tracker.postsThisWeek * 2;
    
    // Thread type fit bonus
    score += getThreadTypeFitScore(persona, slot.threadType);
    
    // Add randomness
    score += Math.random();
    
    return { persona, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].persona;
}

/**
 * Checks if persona style fits the thread type
 */
function isPersonaFitForThreadType(
  persona: Persona,
  threadType: ThreadType
): boolean {
  // Experts shouldn't ask basic questions
  if (persona.postingStyle === 'gives_answers' && threadType === 'question') {
    // Allow some questions from experts (they can ask advanced questions)
    return Math.random() > 0.7;
  }
  
  // Question-askers can do any thread type
  if (persona.postingStyle === 'asks_questions') {
    return true;
  }
  
  // Balanced personas can do anything
  return true;
}

/**
 * Gets a score for how well a persona fits a thread type
 */
function getThreadTypeFitScore(
  persona: Persona,
  threadType: ThreadType
): number {
  const fitMatrix: Record<string, Record<ThreadType, number>> = {
    asks_questions: {
      question: 1.0,
      advice: 0.8,
      story: 0.5,
      discussion: 0.7,
    },
    gives_answers: {
      question: 0.3,
      advice: 0.7,
      story: 0.9,
      discussion: 0.8,
    },
    balanced: {
      question: 0.7,
      advice: 0.7,
      story: 0.7,
      discussion: 0.7,
    },
  };
  
  return fitMatrix[persona.postingStyle]?.[threadType] ?? 0.5;
}

/**
 * Selects commenters for a thread
 */
function selectCommenters(config: {
  opPersona: Persona;
  personas: Persona[];
  count: number;
  usage: Map<string, PersonaUsageTracker>;
  pairingsThisWeek: Set<string>;
  slot: MatchedSlot;
  constraints: PlannerConstraints;
}): Persona[] {
  const { opPersona, personas, count, usage, pairingsThisWeek, slot, constraints } = config;
  
  // Filter eligible commenters
  const eligible = personas.filter(persona => {
    // Can't be the OP
    if (persona.id === opPersona.id) {
      return false;
    }
    
    // Check comment limit
    const tracker = usage.get(persona.id);
    if (tracker && tracker.commentsThisWeek >= constraints.maxCommentsPerPersonaPerWeek) {
      return false;
    }
    
    // Check if pairing already used
    const canInteract = canPersonasInteract(
      opPersona.id,
      persona.id,
      pairingsThisWeek,
      constraints
    );
    
    if (!canInteract.allowed) {
      return false;
    }
    
    return true;
  });

  // Fallback: if no eligible commenters due to pairing limits,
  // relax pairing constraint to ensure at least one response.
  const relaxedEligible = eligible.length === 0
    ? personas.filter(persona => {
        if (persona.id === opPersona.id) return false;
        const tracker = usage.get(persona.id);
        if (tracker && tracker.commentsThisWeek >= constraints.maxCommentsPerPersonaPerWeek) {
          return false;
        }
        return true;
      })
    : eligible;

  if (relaxedEligible.length === 0) {
    return [];
  }
  
  // Score commenters
  const scored = relaxedEligible.map(persona => {
    const tracker = usage.get(persona.id)!;
    
    let score = 0;
    
    // Lower comment usage = higher score
    score -= tracker.commentsThisWeek;
    
    // Prefer personas that complement the OP
    score += getComplementScore(opPersona, persona);
    
    // Add randomness
    score += Math.random();
    
    return { persona, score };
  });
  
  // Sort and select
  scored.sort((a, b) => b.score - a.score);
  
  // Ensure we respect constraints (no back-to-back same persona)
  const selected: Persona[] = [];
  for (const { persona } of scored) {
    if (selected.length >= count) break;
    
    // Check back-to-back rule
    if (selected.length > 0) {
      const lastSelected = selected[selected.length - 1];
      if (lastSelected.id === persona.id) {
        continue; // Skip to avoid back-to-back
      }
    }
    
    selected.push(persona);
  }
  
  return selected;
}

/**
 * Gets a score for how well two personas complement each other
 */
function getComplementScore(op: Persona, commenter: Persona): number {
  // Expert answering a question = great
  if (op.postingStyle === 'asks_questions' && 
      commenter.postingStyle === 'gives_answers') {
    return 1.0;
  }
  
  // Two experts can have good discussions
  if (op.postingStyle === 'gives_answers' && 
      commenter.postingStyle === 'gives_answers') {
    return 0.7;
  }
  
  // Different expertise areas = interesting
  const expertiseOverlap = calculateExpertiseOverlap(op.expertise, commenter.expertise);
  if (expertiseOverlap < 0.5) {
    return 0.8; // Different expertise = diverse perspectives
  }
  
  return 0.5; // Default
}

/**
 * Calculates overlap between expertise arrays
 */
function calculateExpertiseOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  
  const setA = new Set(a.map(e => e.toLowerCase()));
  const setB = new Set(b.map(e => e.toLowerCase()));
  
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);
  
  return intersection.size / union.size;
}

/**
 * Updates usage tracking after assignment
 */
function updateUsage(
  usage: Map<string, PersonaUsageTracker>,
  opPersona: Persona,
  commenters: Persona[],
  slot: MatchedSlot
): void {
  // Update OP
  const opTracker = usage.get(opPersona.id)!;
  opTracker.postsThisWeek++;
  opTracker.lastPostDate = slot.date;
  opTracker.subredditsPostedTo.push(slot.subreddit.id);
  
  // Update commenters
  for (const commenter of commenters) {
    const tracker = usage.get(commenter.id)!;
    tracker.commentsThisWeek++;
  }
}

/**
 * Updates pairing tracking
 */
function updatePairings(
  pairings: Set<string>,
  opPersona: Persona,
  commenters: Persona[]
): void {
  for (const commenter of commenters) {
    const key = createPairingKey(opPersona.id, commenter.id);
    pairings.add(key);
  }
  
  // Also track commenter-to-commenter pairings
  for (let i = 0; i < commenters.length; i++) {
    for (let j = i + 1; j < commenters.length; j++) {
      const key = createPairingKey(commenters[i].id, commenters[j].id);
      pairings.add(key);
    }
  }
}

// ============================================
// VALIDATION
// ============================================

export function validatePersonaAssignment(
  slots: AssignedSlot[],
  personas: Persona[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Count usage
  const postCounts: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  
  for (const slot of slots) {
    postCounts[slot.opPersona.id] = (postCounts[slot.opPersona.id] || 0) + 1;
    
    for (const commenter of slot.commenterPersonas) {
      commentCounts[commenter.id] = (commentCounts[commenter.id] || 0) + 1;
    }
  }
  
  // Check limits
  for (const persona of personas) {
    const posts = postCounts[persona.id] || 0;
    const comments = commentCounts[persona.id] || 0;
    
    if (posts > DEFAULT_CONSTRAINTS.maxPostsPerPersonaPerWeek) {
      issues.push(
        `${persona.username} has ${posts} posts ` +
        `(max: ${DEFAULT_CONSTRAINTS.maxPostsPerPersonaPerWeek})`
      );
    }
    
    if (comments > DEFAULT_CONSTRAINTS.maxCommentsPerPersonaPerWeek) {
      issues.push(
        `${persona.username} has ${comments} comments ` +
        `(max: ${DEFAULT_CONSTRAINTS.maxCommentsPerPersonaPerWeek})`
      );
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
