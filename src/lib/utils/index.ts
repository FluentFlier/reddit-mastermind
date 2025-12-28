import { v4 as uuidv4 } from 'uuid';
import { 
  addDays, 
  addMinutes, 
  addHours,
  startOfWeek, 
  format, 
  differenceInDays,
  differenceInHours,
  isSameDay,
  setHours,
  setMinutes,
} from 'date-fns';

// ============================================
// ID GENERATION
// ============================================

export function generateId(): string {
  return uuidv4();
}

export function generatePostId(): string {
  return `post_${uuidv4().slice(0, 8)}`;
}

export function generateCommentId(): string {
  return `comment_${uuidv4().slice(0, 8)}`;
}

// ============================================
// DATE UTILITIES
// ============================================

export function getWeekStartDate(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = differenceInDays(date, startOfYear);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function formatScheduledTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm');
}

export function formatDisplayTime(date: Date): string {
  return format(date, 'EEE, MMM d \'at\' h:mm a');
}

export function setTimeForSlot(
  date: Date, 
  slot: 'morning' | 'afternoon' | 'evening'
): Date {
  const times = {
    morning: { baseHour: 8, variance: 3 },    // 8am - 11am
    afternoon: { baseHour: 12, variance: 4 }, // 12pm - 4pm
    evening: { baseHour: 17, variance: 4 },   // 5pm - 9pm
  };
  
  const config = times[slot];
  const hour = config.baseHour + Math.floor(Math.random() * config.variance);
  const minute = Math.floor(Math.random() * 60);
  
  let result = setHours(date, hour);
  result = setMinutes(result, minute);
  
  return result;
}

export { addDays, addMinutes, addHours, isSameDay, differenceInHours };

// ============================================
// ARRAY UTILITIES
// ============================================

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectRandom<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  return shuffleArray(array).slice(0, count);
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function distributeEvenly(
  available: number[], 
  needed: number
): number[] {
  if (needed >= available.length) return [...available];
  
  const step = available.length / needed;
  const result: number[] = [];
  
  for (let i = 0; i < needed; i++) {
    const index = Math.floor(i * step);
    result.push(available[Math.min(index, available.length - 1)]);
  }
  
  return result;
}

// ============================================
// STRING UTILITIES
// ============================================

export function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity on word tokens
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return intersection.size / union.size;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================
// PERSONA UTILITIES
// ============================================

export function getPersonaColor(personaId: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
  ];
  
  // Use persona ID to deterministically pick a color
  let hash = 0;
  for (let i = 0; i < personaId.length; i++) {
    hash = ((hash << 5) - hash) + personaId.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function getPersonaInitials(username: string): string {
  const parts = username.replace(/[_-]/g, ' ').split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

// ============================================
// TRACKING UTILITIES
// ============================================

export function createPairingKey(personaA: string, personaB: string): string {
  return [personaA, personaB].sort().join('+');
}

export function countOccurrences<T>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return counts;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

export function isValidSubredditName(name: string): boolean {
  // Subreddit names: r/[a-zA-Z0-9_]{3,21}
  return /^r\/[a-zA-Z0-9_]{3,21}$/.test(name);
}

export function normalizeSubredditName(name: string): string {
  let normalized = name.trim().toLowerCase();
  if (!normalized.startsWith('r/')) {
    normalized = 'r/' + normalized;
  }
  return normalized;
}

// ============================================
// RANDOM WITH WEIGHTS
// ============================================

export function weightedRandom<T>(
  items: T[], 
  weights: number[]
): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

// ============================================
// QUALITY SCORE UTILITIES
// ============================================

export function scoreToGrade(score: number): 'high' | 'medium' | 'low' {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export function gradeToColor(grade: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: '#22c55e',   // Green
    medium: '#eab308', // Yellow
    low: '#ef4444',    // Red
  };
  return colors[grade];
}
