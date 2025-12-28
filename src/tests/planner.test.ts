import { describe, it, expect, beforeEach } from 'vitest';
import { allocateSlots } from '@/lib/planner/slotAllocator';
import { matchSubreddits } from '@/lib/planner/subredditMatcher';
import { assignPersonas } from '@/lib/planner/personaAssigner';
import { checkQuality } from '@/lib/planner/qualityChecker';
import { DEFAULT_CONSTRAINTS } from '@/lib/planner/constraints';
import { 
  TEST_COMPANY, 
  TEST_PERSONAS, 
  TEST_SUBREDDITS, 
  TEST_KEYWORDS 
} from './setup';

describe('Slot Allocator', () => {
  const weekStart = new Date('2024-01-01'); // A Monday
  
  it('allocates correct number of slots', () => {
    const result = allocateSlots({
      count: 3,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    });
    
    expect(result.slots).toHaveLength(3);
  });
  
  it('distributes slots across different days', () => {
    const result = allocateSlots({
      count: 5,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    });
    
    const uniqueDays = new Set(result.slots.map(s => s.dayOfWeek));
    expect(uniqueDays.size).toBeGreaterThan(1);
  });
  
  it('varies posting times', () => {
    const result = allocateSlots({
      count: 5,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    });
    
    const times = result.slots.map(s => s.timeOfDay);
    const uniqueTimes = new Set(times);
    expect(uniqueTimes.size).toBeGreaterThan(1);
  });
  
  it('slots are sorted by date', () => {
    const result = allocateSlots({
      count: 5,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    });
    
    for (let i = 1; i < result.slots.length; i++) {
      expect(result.slots[i].date.getTime())
        .toBeGreaterThanOrEqual(result.slots[i-1].date.getTime());
    }
  });
});

describe('Subreddit Matcher', () => {
  const weekStart = new Date('2024-01-01');
  
  it('matches subreddits to all slots', () => {
    const slots = allocateSlots({
      count: 3,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    }).slots;
    
    const result = matchSubreddits({
      slots,
      subreddits: TEST_SUBREDDITS,
      keywords: TEST_KEYWORDS,
    });
    
    expect(result.slots).toHaveLength(3);
    result.slots.forEach(slot => {
      expect(slot.subreddit).toBeDefined();
      expect(slot.keywords.length).toBeGreaterThan(0);
    });
  });
  
  it('respects subreddit posting limits', () => {
    const slots = allocateSlots({
      count: 5,
      weekStart,
      subreddits: TEST_SUBREDDITS, // Only 2 subreddits
    }).slots;
    
    const result = matchSubreddits({
      slots,
      subreddits: TEST_SUBREDDITS,
      keywords: TEST_KEYWORDS,
    });
    
    // Count posts per subreddit
    const counts: Record<string, number> = {};
    result.slots.forEach(slot => {
      counts[slot.subreddit.name] = (counts[slot.subreddit.name] || 0) + 1;
    });
    
    // No subreddit should exceed the limit
    Object.values(counts).forEach(count => {
      expect(count).toBeLessThanOrEqual(DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek);
    });
  });
  
  it('assigns thread types', () => {
    const slots = allocateSlots({
      count: 3,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    }).slots;
    
    const result = matchSubreddits({
      slots,
      subreddits: TEST_SUBREDDITS,
      keywords: TEST_KEYWORDS,
    });
    
    result.slots.forEach(slot => {
      expect(['question', 'advice', 'story', 'discussion']).toContain(slot.threadType);
    });
  });
});

describe('Persona Assigner', () => {
  const weekStart = new Date('2024-01-01');
  
  function getMatchedSlots(count: number) {
    const slots = allocateSlots({
      count,
      weekStart,
      subreddits: TEST_SUBREDDITS,
    }).slots;
    
    return matchSubreddits({
      slots,
      subreddits: TEST_SUBREDDITS,
      keywords: TEST_KEYWORDS,
    }).slots;
  }
  
  it('assigns OP to each slot', () => {
    const matchedSlots = getMatchedSlots(3);
    
    const result = assignPersonas({
      slots: matchedSlots,
      personas: TEST_PERSONAS,
    });
    
    result.slots.forEach(slot => {
      expect(slot.opPersona).toBeDefined();
      expect(slot.opPersona.id).toBeTruthy();
    });
  });
  
  it('assigns commenters to each slot', () => {
    const matchedSlots = getMatchedSlots(3);
    
    const result = assignPersonas({
      slots: matchedSlots,
      personas: TEST_PERSONAS,
    });
    
    result.slots.forEach(slot => {
      expect(slot.commenterPersonas.length).toBeGreaterThan(0);
      expect(slot.commenterPersonas.length).toBeLessThanOrEqual(
        DEFAULT_CONSTRAINTS.maxPersonasPerThread - 1
      );
    });
  });
  
  it('OP is never a commenter in same thread', () => {
    const matchedSlots = getMatchedSlots(3);
    
    const result = assignPersonas({
      slots: matchedSlots,
      personas: TEST_PERSONAS,
    });
    
    result.slots.forEach(slot => {
      const commenterIds = slot.commenterPersonas.map(p => p.id);
      expect(commenterIds).not.toContain(slot.opPersona.id);
    });
  });
  
  it('respects persona posting limits', () => {
    const matchedSlots = getMatchedSlots(5);
    
    const result = assignPersonas({
      slots: matchedSlots,
      personas: TEST_PERSONAS,
    });
    
    // Count posts per persona
    const postCounts: Record<string, number> = {};
    result.slots.forEach(slot => {
      postCounts[slot.opPersona.id] = (postCounts[slot.opPersona.id] || 0) + 1;
    });
    
    Object.values(postCounts).forEach(count => {
      expect(count).toBeLessThanOrEqual(DEFAULT_CONSTRAINTS.maxPostsPerPersonaPerWeek);
    });
  });
  
  it('throws error with less than 2 personas', () => {
    const matchedSlots = getMatchedSlots(1);
    
    expect(() => assignPersonas({
      slots: matchedSlots,
      personas: [TEST_PERSONAS[0]], // Only 1 persona
    })).toThrow();
  });
});

describe('Quality Checker', () => {
  it('calculates overall score', () => {
    const mockThreads = [
      {
        post: {
          id: 'post-1',
          companyId: 'test',
          weekNumber: 1,
          subredditId: 'sub-1',
          subredditName: 'r/test',
          personaId: 'persona-1',
          personaUsername: 'test_user',
          title: 'Test post title',
          body: 'Test post body',
          scheduledAt: new Date(),
          keywordIds: [],
          threadType: 'question' as const,
          status: 'draft' as const,
        },
        comments: [
          {
            id: 'comment-1',
            postId: 'post-1',
            parentCommentId: null,
            personaId: 'persona-2',
            personaUsername: 'test_user_2',
            content: 'Test comment',
            scheduledAt: new Date(),
            delayMinutes: 30,
            status: 'draft' as const,
          },
        ],
        slot: {} as any,
      },
    ];
    
    const result = checkQuality({
      threads: mockThreads,
      company: TEST_COMPANY,
    });
    
    expect(result.report.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.report.overallScore).toBeLessThanOrEqual(10);
  });
  
  it('detects overposting', () => {
    // Create 5 posts in the same subreddit
    const mockThreads = Array.from({ length: 5 }, (_, i) => ({
      post: {
        id: `post-${i}`,
        companyId: 'test',
        weekNumber: 1,
        subredditId: 'sub-1',
        subredditName: 'r/test', // Same subreddit
        personaId: `persona-${i % 3}`,
        personaUsername: `test_user_${i}`,
        title: `Test post ${i}`,
        body: 'Test body',
        scheduledAt: new Date(),
        keywordIds: [],
        threadType: 'question' as const,
        status: 'draft' as const,
      },
      comments: [],
      slot: {} as any,
    }));
    
    const result = checkQuality({
      threads: mockThreads,
      company: TEST_COMPANY,
    });
    
    const overpostingIssues = result.report.issues.filter(
      i => i.type === 'overposting'
    );
    expect(overpostingIssues.length).toBeGreaterThan(0);
  });
  
  it('detects topic duplication', () => {
    const mockThreads = [
      {
        post: {
          id: 'post-1',
          companyId: 'test',
          weekNumber: 1,
          subredditId: 'sub-1',
          subredditName: 'r/test1',
          personaId: 'persona-1',
          personaUsername: 'test_user_1',
          title: 'Best AI presentation tool recommendation',
          body: 'Looking for AI presentation tool',
          scheduledAt: new Date(),
          keywordIds: [],
          threadType: 'question' as const,
          status: 'draft' as const,
        },
        comments: [],
        slot: {} as any,
      },
      {
        post: {
          id: 'post-2',
          companyId: 'test',
          weekNumber: 1,
          subredditId: 'sub-2',
          subredditName: 'r/test2',
          personaId: 'persona-2',
          personaUsername: 'test_user_2',
          title: 'Best AI presentation tool recommendation needed', // Very similar
          body: 'Need AI presentation tool recommendations',
          scheduledAt: new Date(),
          keywordIds: [],
          threadType: 'question' as const,
          status: 'draft' as const,
        },
        comments: [],
        slot: {} as any,
      },
    ];
    
    const result = checkQuality({
      threads: mockThreads,
      company: TEST_COMPANY,
    });
    
    const duplicationIssues = result.report.issues.filter(
      i => i.type === 'duplication'
    );
    expect(duplicationIssues.length).toBeGreaterThan(0);
  });
});

describe('Constraint Validation', () => {
  it('DEFAULT_CONSTRAINTS has all required fields', () => {
    expect(DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.maxPostsPerPersonaPerWeek).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.maxCommentsPerPersonaPerWeek).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.minDelayAfterPostMinutes).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.maxDelayAfterPostMinutes).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.commentSpacingMinutes).toBeDefined();
    expect(DEFAULT_CONSTRAINTS.maxPersonasPerThread).toBeDefined();
  });
  
  it('constraint values are reasonable', () => {
    expect(DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek).toBeGreaterThan(0);
    expect(DEFAULT_CONSTRAINTS.maxPostsPerSubredditPerWeek).toBeLessThanOrEqual(7);
    
    expect(DEFAULT_CONSTRAINTS.minDelayAfterPostMinutes).toBeLessThan(
      DEFAULT_CONSTRAINTS.maxDelayAfterPostMinutes
    );
    
    expect(DEFAULT_CONSTRAINTS.maxPersonasPerThread).toBeGreaterThanOrEqual(2);
  });
});
