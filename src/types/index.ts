// ============================================
// CORE TYPES FOR REDDIT MASTERMIND
// ============================================

// ----------------
// INPUT TYPES
// ----------------

export interface Company {
  id: string;
  userId?: string;
  userExternalId?: string;
  name: string;
  description: string;
  positioning?: string;
  website?: string;
  icpSegments?: ICPSegment[];
  constraints?: PlannerConstraints;
  createdAt?: Date;
}

export interface ICPSegment {
  segment: string;
  profile: string;
  appeal: string;
}

export interface Persona {
  id: string;
  companyId: string;
  username: string;
  displayName?: string;
  bio: string;
  voiceTraits: string;
  expertise: string[];
  postingStyle: 'asks_questions' | 'gives_answers' | 'balanced';
  avatarColor?: string;
}

export interface Subreddit {
  id: string;
  companyId: string;
  name: string; // e.g., "r/PowerPoint"
  description?: string;
  rules?: SubredditRules;
  bestTimes?: string[];
}

export interface SubredditRules {
  maxPostsPerDay?: number;
  requiresFlair?: boolean;
  allowsLinks?: boolean;
  allowsSelfPromotion?: boolean;
  minKarma?: number;
  minAccountAge?: number; // days
}

export interface Keyword {
  id: string;
  companyId: string;
  keyword: string;
  category?: string;
  priority?: number;
}

// ----------------
// PLANNER TYPES
// ----------------

export interface PlannerInput {
  company: Company;
  personas: Persona[];
  subreddits: Subreddit[];
  keywords: Keyword[];
  postsPerWeek: number;
  weekStartDate: Date;
  weekNumber: number;
  previousWeeks?: CalendarHistory[];
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
}

export interface PlannerOutput {
  posts: Post[];
  comments: Comment[];
  qualityReport: QualityReport;
  weekNumber: number;
  generatedAt: Date;
  debug?: PlannerDebug;
}

export interface PlannerDebug {
  slotAllocation: {
    slots: number;
    daysUsed: number[];
    timesUsed: string[];
  };
  subredditMatching: {
    matchedSlots: number;
    subredditDistribution: Record<string, number>;
    keywordUsage: Record<string, number>;
    topicsSkipped: string[];
  };
  personaAssignment: {
    assignedSlots: number;
    personaDistribution: Record<string, { posts: number; comments: number }>;
    pairingsUsed: string[];
    warnings: string[];
  };
  threadGeneration: {
    totalPosts: number;
    totalComments: number;
    generationTime: number;
    errors: string[];
  };
  quality: {
    overallScore: number;
    issuesCount: number;
    warningsCount: number;
  };
}

// ----------------
// CALENDAR TYPES
// ----------------

export type ThreadType = 'question' | 'advice' | 'story' | 'discussion';

export interface TimeSlot {
  date: Date;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export interface MatchedSlot extends TimeSlot {
  subreddit: Subreddit;
  keywords: Keyword[];
  threadType: ThreadType;
}

export interface AssignedSlot extends MatchedSlot {
  opPersona: Persona;
  commenterPersonas: Persona[];
}

export interface Post {
  id: string;
  companyId: string;
  weekNumber: number;
  subredditId: string;
  subredditName: string;
  personaId: string;
  personaUsername: string;
  title: string;
  body: string;
  scheduledAt: Date;
  keywordIds: string[];
  threadType: ThreadType;
  qualityScore?: number;
  qualityBreakdown?: Record<string, number>;
  qualityIssues?: string[];
  qualityWarnings?: string[];
  reviewNotes?: string;
  status: 'draft' | 'approved' | 'scheduled' | 'posted' | 'failed';
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  personaId: string;
  personaUsername: string;
  content: string;
  scheduledAt: Date;
  delayMinutes: number;
  status: 'draft' | 'approved' | 'scheduled' | 'posted' | 'failed';
}

export interface Thread {
  post: Post;
  comments: Comment[];
  slot: AssignedSlot;
}

// ----------------
// QUALITY TYPES
// ----------------

export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueType = 
  | 'overposting' 
  | 'duplication' 
  | 'persona_collision' 
  | 'timing_issue' 
  | 'promo_sensitivity'
  | 'voice_inconsistency';

export interface QualityIssue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  affectedPostIds?: string[];
}

export interface QualityReport {
  overallScore: number; // 0-10
  issues: QualityIssue[];
  warnings: string[];
  suggestions: string[];
  issuesByPostId?: Record<string, QualityIssue[]>;
  warningsByPostId?: Record<string, string[]>;
}

// ----------------
// HISTORY TYPES
// ----------------

export interface CalendarHistory {
  id: string;
  companyId: string;
  weekNumber: number;
  generatedAt: Date;
  posts: Post[];
  comments: Comment[];
  qualityReport: QualityReport;
  topicsUsed: string[];
  subredditsUsed: Record<string, number>;
  personasUsed: Record<string, number>;
}

// ----------------
// TRACKING TYPES
// ----------------

export interface PersonaUsage {
  personaId: string;
  postsThisWeek: number;
  commentsThisWeek: number;
  lastPostDate?: Date;
  subredditsPostedTo: string[];
}

export interface SubredditUsage {
  subredditId: string;
  postsThisWeek: number;
  lastPostDate?: Date;
  keywordsUsed: string[];
}

// ----------------
// CONSTRAINT CONFIG
// ----------------

export interface PlannerConstraints {
  // Subreddit constraints
  maxPostsPerSubredditPerWeek: number;
  minDaysBetweenSubredditPosts: number;
  
  // Persona constraints
  maxPostsPerPersonaPerWeek: number;
  maxCommentsPerPersonaPerWeek: number;
  minHoursBetweenSamePersonaPosts: number;
  maxPersonasPerThread: number;
  
  // Interaction constraints
  noRepeatedPairingsPerWeek: boolean;
  noBackToBackComments: boolean;
  
  // Timing constraints
  minDelayAfterPostMinutes: number;
  maxDelayAfterPostMinutes: number;
  commentSpacingMinutes: [number, number];
  opFollowUpDelayMinutes: [number, number];
  
  // Quality constraints
  maxPromoScoreAllowed: number;
  minQualityScoreRequired: number;
}

// ----------------
// API TYPES
// ----------------

export interface GenerateCalendarRequest {
  company: Company;
  personas: Persona[];
  subreddits: Subreddit[];
  keywords: Keyword[];
  postsPerWeek: number;
  weekStartDate: string; // ISO date string
  weekNumber?: number;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
}

export interface GenerateCalendarResponse {
  success: boolean;
  data?: PlannerOutput;
  error?: string;
}

export interface GenerationPreferences {
  allowProductMention?: boolean;
  productMentionCount?: number;
  antiPromoChecks?: boolean;
  bannedPhrases?: string[];
  postGuidelines?: string;
  commentGuidelines?: string;
  campaignBrief?: string;
  minCommentLength?: number;
  maxCommentLength?: number;
  minPostLength?: number;
  maxPostLength?: number;
  autoRepair?: boolean;
  requireDisagreement?: boolean;
  repairPasses?: number;
}

// ----------------
// UI STATE TYPES
// ----------------

export interface CalendarViewState {
  selectedWeek: number;
  selectedPost: Post | null;
  viewMode: 'calendar' | 'list' | 'thread';
  filters: {
    subreddits: string[];
    personas: string[];
    status: string[];
  };
}

export interface ThreadPreviewState {
  post: Post;
  comments: Comment[];
  isEditing: boolean;
  editingItemId: string | null;
}
