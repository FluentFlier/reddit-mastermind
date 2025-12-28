import { TimeSlot, Subreddit } from '@/types';
import { 
  addDays, 
  setTimeForSlot, 
  distributeEvenly,
  shuffleArray,
} from '@/lib/utils';

// ============================================
// SLOT ALLOCATOR
// ============================================
// Distributes posts across the week with optimal timing

export interface SlotAllocationConfig {
  count: number;
  weekStart: Date;
  subreddits: Subreddit[];
  preferWeekdays?: boolean;
}

export interface SlotAllocationResult {
  slots: TimeSlot[];
  metadata: {
    daysUsed: number[];
    timesUsed: string[];
  };
}

/**
 * Allocates time slots for posts across the week
 * 
 * Strategy:
 * 1. Prefer weekdays over weekends (most Reddit activity)
 * 2. Spread posts across different days
 * 3. Vary posting times (morning, afternoon, evening)
 * 4. Add randomness to avoid predictable patterns
 */
export function allocateSlots(config: SlotAllocationConfig): SlotAllocationResult {
  const { count, weekStart, preferWeekdays = true } = config;
  
  // Define available days (0 = Sunday, 1 = Monday, etc.)
  // Prefer weekdays for most engagement
  const weekdaySlots = [1, 2, 3, 4, 5]; // Mon-Fri
  const weekendSlots = [0, 6]; // Sun, Sat
  
  // Determine which days to use
  const availableDays = preferWeekdays 
    ? [...weekdaySlots, ...weekendSlots]
    : shuffleArray([0, 1, 2, 3, 4, 5, 6]);
  
  // Time slots with weights (afternoon generally best for Reddit)
  const timeSlots: Array<'morning' | 'afternoon' | 'evening'> = [
    'morning', 
    'afternoon', 
    'evening'
  ];
  
  // Select which days to use, spread evenly
  const daysToUse = selectDaysForPosts(availableDays, count);
  
  const slots: TimeSlot[] = [];
  const timesUsed: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const dayOffset = daysToUse[i];
    const date = addDays(weekStart, dayOffset);
    
    // Rotate through time slots for variety
    // But add some randomness
    const timeOfDay = selectTimeSlot(timeSlots, i, timesUsed);
    
    const scheduledDate = setTimeForSlot(date, timeOfDay);
    
    slots.push({
      date: scheduledDate,
      dayOfWeek: dayOffset,
      timeOfDay,
    });
    
    timesUsed.push(timeOfDay);
  }
  
  // Sort by date
  slots.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return {
    slots,
    metadata: {
      daysUsed: daysToUse,
      timesUsed,
    },
  };
}

/**
 * Selects which days to use for posting
 * Tries to spread posts evenly across the week
 */
function selectDaysForPosts(
  availableDays: number[], 
  needed: number
): number[] {
  if (needed >= availableDays.length) {
    // Need more posts than days, some days will have multiple
    const result: number[] = [];
    for (let i = 0; i < needed; i++) {
      result.push(availableDays[i % availableDays.length]);
    }
    return result;
  }
  
  // Distribute evenly across available days
  return distributeEvenly(availableDays, needed);
}

/**
 * Selects time of day for a post
 * Balances variety with optimal engagement times
 */
function selectTimeSlot(
  available: Array<'morning' | 'afternoon' | 'evening'>,
  index: number,
  alreadyUsed: string[]
): 'morning' | 'afternoon' | 'evening' {
  // Count usage
  const usageCounts: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  
  for (const time of alreadyUsed) {
    usageCounts[time]++;
  }
  
  // Find least-used time slots
  const minUsage = Math.min(...Object.values(usageCounts));
  const leastUsed = available.filter(t => usageCounts[t] === minUsage);
  
  // Add some randomness but prefer afternoon (best engagement)
  if (leastUsed.includes('afternoon') && Math.random() > 0.3) {
    return 'afternoon';
  }
  
  // Otherwise pick randomly from least used
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}

// ============================================
// OPTIMAL TIME SUGGESTIONS
// ============================================

// Peak times by subreddit category (heuristic)
const PEAK_TIMES: Record<string, Array<'morning' | 'afternoon' | 'evening'>> = {
  business: ['morning', 'afternoon'], // r/startups, r/entrepreneur
  tech: ['afternoon', 'evening'],     // r/programming, r/technology
  creative: ['evening', 'afternoon'], // r/design, r/art
  education: ['morning', 'afternoon'],// r/AskAcademia, r/teachers
  general: ['afternoon', 'evening'],  // Default
};

export function getSuggestedTimes(
  subredditName: string
): Array<'morning' | 'afternoon' | 'evening'> {
  const lowerName = subredditName.toLowerCase();
  
  if (lowerName.includes('startup') || 
      lowerName.includes('business') || 
      lowerName.includes('entrepreneur')) {
    return PEAK_TIMES.business;
  }
  
  if (lowerName.includes('programming') || 
      lowerName.includes('tech') || 
      lowerName.includes('code')) {
    return PEAK_TIMES.tech;
  }
  
  if (lowerName.includes('design') || 
      lowerName.includes('art') || 
      lowerName.includes('creative')) {
    return PEAK_TIMES.creative;
  }
  
  if (lowerName.includes('academ') || 
      lowerName.includes('teacher') || 
      lowerName.includes('education')) {
    return PEAK_TIMES.education;
  }
  
  return PEAK_TIMES.general;
}

// ============================================
// VALIDATION
// ============================================

export function validateSlotAllocation(
  slots: TimeSlot[],
  constraints: { minGapHours: number }
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for slots too close together
  const sortedSlots = [...slots].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  
  for (let i = 1; i < sortedSlots.length; i++) {
    const gap = (sortedSlots[i].date.getTime() - sortedSlots[i-1].date.getTime()) 
      / (1000 * 60 * 60);
    
    if (gap < constraints.minGapHours) {
      issues.push(
        `Slots ${i-1} and ${i} are only ${gap.toFixed(1)} hours apart ` +
        `(minimum: ${constraints.minGapHours}h)`
      );
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
