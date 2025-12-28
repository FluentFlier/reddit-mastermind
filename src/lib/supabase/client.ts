import { createClient } from '@supabase/supabase-js';

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Database features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================
// DATABASE OPERATIONS
// ============================================

import { 
  Company, 
  Persona, 
  Subreddit, 
  Keyword, 
  Post, 
  Comment,
  CalendarHistory,
  PlannerOutput,
} from '@/types';

/**
 * Saves a generated calendar to the database
 */
export async function saveCalendar(
  companyId: string,
  output: PlannerOutput
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }
  
  try {
    // Save posts
    const { error: postsError } = await supabase
      .from('posts')
      .insert(output.posts.map(post => ({
        id: post.id,
        company_id: companyId,
        week_number: output.weekNumber,
        subreddit_id: post.subredditId,
        subreddit_name: post.subredditName,
        persona_id: post.personaId,
        persona_username: post.personaUsername,
        title: post.title,
        body: post.body,
        scheduled_at: post.scheduledAt.toISOString(),
        keyword_ids: post.keywordIds,
        thread_type: post.threadType,
        quality_score: post.qualityScore,
        quality_breakdown: post.qualityBreakdown,
        quality_issues: post.qualityIssues,
        quality_warnings: post.qualityWarnings,
        review_notes: post.reviewNotes || null,
        status: post.status,
      })));
    
    if (postsError) throw postsError;
    
    // Save comments
    const { error: commentsError } = await supabase
      .from('comments')
      .insert(output.comments.map(comment => ({
        id: comment.id,
        post_id: comment.postId,
        parent_comment_id: comment.parentCommentId,
        persona_id: comment.personaId,
        persona_username: comment.personaUsername,
        content: comment.content,
        scheduled_at: comment.scheduledAt.toISOString(),
        delay_minutes: comment.delayMinutes,
        status: comment.status,
      })));
    
    if (commentsError) throw commentsError;
    
    // Save calendar history
    const { error: historyError } = await supabase
      .from('calendar_history')
      .insert({
        company_id: companyId,
        week_number: output.weekNumber,
        generated_at: output.generatedAt.toISOString(),
        quality_report: output.qualityReport,
        posts_count: output.posts.length,
        comments_count: output.comments.length,
      });
    
    if (historyError) throw historyError;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save calendar:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function saveImportedThreads(
  companyId: string,
  posts: Post[],
  comments: Comment[],
  weekNumber: number
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error: postsError } = await supabase
      .from('posts')
      .upsert(
        posts.map((post) => ({
          id: post.id,
          company_id: companyId,
          week_number: weekNumber,
          subreddit_id: post.subredditId,
          subreddit_name: post.subredditName,
          persona_id: post.personaId,
          persona_username: post.personaUsername,
          title: post.title,
          body: post.body,
          scheduled_at: post.scheduledAt.toISOString(),
          keyword_ids: post.keywordIds,
          thread_type: post.threadType,
          quality_score: post.qualityScore || null,
          quality_breakdown: post.qualityBreakdown || null,
          quality_issues: post.qualityIssues || null,
          quality_warnings: post.qualityWarnings || null,
          review_notes: post.reviewNotes || null,
          status: post.status,
        })),
        { onConflict: 'id' }
      );

    if (postsError) throw postsError;

    const { error: commentsError } = await supabase
      .from('comments')
      .upsert(
        comments.map((comment) => ({
          id: comment.id,
          post_id: comment.postId,
          parent_comment_id: comment.parentCommentId,
          persona_id: comment.personaId,
          persona_username: comment.personaUsername,
          content: comment.content,
          scheduled_at: comment.scheduledAt.toISOString(),
          delay_minutes: comment.delayMinutes,
          status: comment.status,
        })),
        { onConflict: 'id' }
      );

    if (commentsError) throw commentsError;

    const { error: historyError } = await supabase
      .from('calendar_history')
      .insert({
        company_id: companyId,
        week_number: weekNumber,
        generated_at: new Date().toISOString(),
        quality_report: {
          overallScore: 0,
          issues: [],
          warnings: [],
          suggestions: [],
        },
        posts_count: posts.length,
        comments_count: comments.length,
      });

    if (historyError) throw historyError;

    return { success: true };
  } catch (error) {
    console.error('Failed to save imported threads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Loads calendar history for a company
 */
export async function loadCalendarHistory(
  companyId: string,
  limit: number = 4
): Promise<CalendarHistory[]> {
  if (!supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('calendar_history')
      .select('*')
      .eq('company_id', companyId)
      .order('week_number', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Failed to load calendar history:', error);
    return [];
  }
}

/**
 * Loads posts for a specific week
 */
export async function loadWeekPosts(
  companyId: string,
  weekNumber: number
): Promise<Post[]> {
  if (!supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .order('scheduled_at');
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      companyId: row.company_id,
      weekNumber: row.week_number,
      subredditId: row.subreddit_id,
      subredditName: row.subreddit_name,
      personaId: row.persona_id,
      personaUsername: row.persona_username,
      title: row.title,
      body: row.body,
      scheduledAt: new Date(row.scheduled_at),
      keywordIds: row.keyword_ids,
      threadType: row.thread_type,
      qualityScore: row.quality_score,
      qualityBreakdown: row.quality_breakdown || undefined,
      qualityIssues: row.quality_issues || undefined,
      qualityWarnings: row.quality_warnings || undefined,
      reviewNotes: row.review_notes || undefined,
      status: row.status,
    }));
  } catch (error) {
    console.error('Failed to load posts:', error);
    return [];
  }
}

/**
 * Loads comments for a post
 */
export async function loadPostComments(postId: string): Promise<Comment[]> {
  if (!supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('scheduled_at');
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      postId: row.post_id,
      parentCommentId: row.parent_comment_id,
      personaId: row.persona_id,
      personaUsername: row.persona_username,
      content: row.content,
      scheduledAt: new Date(row.scheduled_at),
      delayMinutes: row.delay_minutes,
      status: row.status,
    }));
  } catch (error) {
    console.error('Failed to load comments:', error);
    return [];
  }
}

/**
 * Updates a post's content
 */
export async function updatePost(
  postId: string,
  updates: Partial<Pick<Post, 'title' | 'body' | 'status' | 'reviewNotes'>>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }
  
  try {
    const payload = { ...updates } as any;
    if ('reviewNotes' in updates) {
      payload.review_notes = updates.reviewNotes || null;
      delete payload.reviewNotes;
    }

    const { error } = await supabase
      .from('posts')
      .update(payload)
      .eq('id', postId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Updates a comment's content
 */
export async function updateComment(
  commentId: string,
  updates: Partial<Pick<Comment, 'content' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }
  
  try {
    const { error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
