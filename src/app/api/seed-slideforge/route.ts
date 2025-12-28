import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { Company, Persona, Subreddit, Keyword, Post, Comment } from '@/types';

type SeedPayload = {
  company?: Company;
  personas: Persona[];
  subreddits: Subreddit[];
  keywords: Keyword[];
  posts: Post[];
  comments: Comment[];
};

function parseCompanyInfoCSV(text: string) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = (parsed.data || []).map((r) => r.map((c) => (c || '').trim()));

  const company: Partial<Company> = {};
  const personas: Persona[] = [];
  const subreddits: Subreddit[] = [];
  const keywords: Keyword[] = [];
  let keywordMode = false;

  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0];
    const value = row[1] || '';
    if (!key) continue;

    if (key.toLowerCase() === 'keyword_id') {
      keywordMode = true;
      continue;
    }

    if (keywordMode) {
      if (!key || !value) continue;
      keywords.push({
        id: undefined as any,
        companyId: '',
        keyword: value,
        category: 'discovery',
        priority: 3,
      });
      continue;
    }

    if (key.includes('_') && value.toLowerCase().startsWith('i am')) {
      personas.push({
        id: undefined as any,
        companyId: '',
        username: key,
        bio: value,
        voiceTraits: '',
        expertise: [],
        postingStyle: 'balanced',
      });
      continue;
    }

    switch (key.toLowerCase()) {
      case 'name':
        company.name = value;
        break;
      case 'website':
        company.website = value.replace(/\s*\(.*\)$/, '');
        break;
      case 'description':
        company.description = value;
        break;
      case 'positioning':
        company.positioning = value;
        break;
      case 'subreddits':
        (value.match(/r\/[A-Za-z0-9_]+/g) || [])
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((name) => subreddits.push({ id: undefined as any, companyId: '', name, description: '' }));
        break;
      default:
        break;
    }
  }

  return {
    company: company.name ? (company as Company) : undefined,
    personas,
    subreddits,
    keywords,
  };
}

function getWeekNumberFromDate(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function parseContentCalendarCSV(text: string) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = (parsed.data || []).map((r) => r.map((c) => (c || '').trim()));
  const posts: Post[] = [];
  const comments: Comment[] = [];
  let mode: 'posts' | 'comments' | null = null;
  let headers: string[] = [];

  for (const row of rows) {
    if (row.length === 0) continue;
    if (row[0].toLowerCase() === 'post_id') {
      mode = 'posts';
      headers = row.map((h) => h.toLowerCase());
      continue;
    }
    if (row[0].toLowerCase() === 'comment_id') {
      mode = 'comments';
      headers = row.map((h) => h.toLowerCase());
      continue;
    }

    if (!mode) continue;

    const get = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? row[idx] : '';
    };

    if (mode === 'posts') {
      const id = get('post_id');
      if (!id) continue;
      const scheduledAt = new Date(get('timestamp'));
      posts.push({
        id,
        companyId: '',
        weekNumber: getWeekNumberFromDate(scheduledAt),
        subredditId: '',
        subredditName: get('subreddit') || '',
        personaId: '',
        personaUsername: get('author_username') || '',
        title: get('title') || '',
        body: get('body') || '',
        scheduledAt,
        keywordIds: (get('keyword_ids') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        threadType: 'question',
        status: 'draft',
      });
    }

    if (mode === 'comments') {
      const id = get('comment_id');
      if (!id) continue;
      const scheduledAt = new Date(get('timestamp'));
      comments.push({
        id,
        postId: get('post_id') || '',
        parentCommentId: get('parent_comment_id') || null,
        personaId: '',
        personaUsername: get('username') || '',
        content: get('comment_text') || '',
        scheduledAt,
        delayMinutes: 0,
        status: 'draft',
      });
    }
  }

  return { posts, comments };
}

export async function GET() {
  try {
    const basePath = path.join(process.cwd(), 'imports');
    const [companyText, calendarText] = await Promise.all([
      readFile(path.join(basePath, 'SlideForge - Company Info.csv'), 'utf8'),
      readFile(path.join(basePath, 'SlideForge - Content Calendar.csv'), 'utf8'),
    ]);

    const companyData = parseCompanyInfoCSV(companyText);
    const calendarData = parseContentCalendarCSV(calendarText);

    const payload: SeedPayload = {
      company: companyData.company,
      personas: companyData.personas,
      subreddits: companyData.subreddits,
      keywords: companyData.keywords,
      posts: calendarData.posts,
      comments: calendarData.comments,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to seed' },
      { status: 500 }
    );
  }
}
