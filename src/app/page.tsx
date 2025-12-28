'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import { CalendarView } from '@/components/CalendarView';
import { ThreadPreview } from '@/components/ThreadPreview';
import { QualityPanel } from '@/components/QualityPanel';
import { useRouter } from 'next/navigation';
import {
  Company,
  Persona,
  Subreddit,
  Keyword,
  PlannerOutput,
  PlannerConstraints,
  GenerationPreferences,
  Comment,
  Post,
} from '@/types';
import { addMonths, addWeeks } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { useClerk, useUser } from '@clerk/nextjs';
import { sampleCompany, samplePersonas, sampleSubreddits, sampleKeywords } from '@/lib/sampleData';
import {
  listCompanies,
  findCompanyByName,
  upsertCompany,
  upsertCompanyGlobal,
  deleteCompany,
  listPersonas,
  upsertPersona,
  deletePersona,
  listSubreddits,
  upsertSubreddit,
  deleteSubreddit,
  listKeywords,
  upsertKeyword,
  deleteKeyword,
  updateCompanyConstraints,
} from '@/lib/supabase/data';
import {
  updatePost,
  updateComment,
  saveImportedThreads,
  loadCalendarHistory,
  loadWeekPosts,
  loadPostComments,
} from '@/lib/supabase/client';
import { DEFAULT_CONSTRAINTS } from '@/lib/planner';
import {
  BarChart3,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  FileText,
  Globe,
  Hash,
  History,
  MessagesSquare,
  ShieldCheck,
  Settings2,
  Sliders,
  Sparkles,
  Tags,
  Target,
  Trash2,
  Users,
} from 'lucide-react';

type LogEntry = {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
};

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companyDraft, setCompanyDraft] = useState<Partial<Company>>({
    name: '',
    description: '',
    positioning: '',
    website: '',
  });
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [constraints, setConstraints] = useState<PlannerConstraints>({
    ...DEFAULT_CONSTRAINTS,
  });
  const [preferences, setPreferences] = useState<GenerationPreferences>({
    allowProductMention: true,
    productMentionCount: 1,
    bannedPhrases: ['best ever', 'life changing', 'game changer'],
    minCommentLength: 40,
    maxCommentLength: 240,
    minPostLength: 120,
    maxPostLength: 600,
    autoRepair: true,
    requireDisagreement: true,
    repairPasses: 1,
  });
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [weeksToGenerate, setWeeksToGenerate] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<PlannerOutput | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getNextMonday());
  const [showDebug, setShowDebug] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'personas' | 'subreddits' | 'keywords' | 'preferences' | 'constraints' | 'import' | 'history'>('overview');
  const [importPreview, setImportPreview] = useState<{
    company?: Company;
    personas?: Persona[];
    subreddits?: Subreddit[];
    keywords?: Keyword[];
    posts?: Post[];
    comments?: Comment[];
    extractedText?: string;
  }>({});
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importMissing, setImportMissing] = useState<string[]>([]);
  const [importNotes, setImportNotes] = useState<{ companyName?: string; companyWebsite?: string }>(
    {}
  );
  const [importWizard, setImportWizard] = useState<{
    personaUsername?: string;
    personaBio?: string;
    subredditName?: string;
    keyword?: string;
  }>({});
  const [aiStatus, setAiStatus] = useState<{ mode: 'live' | 'error'; model: string; provider?: string } | null>(null);
  const [lastGenerationMode, setLastGenerationMode] = useState<'live' | 'error' | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | Post['status']>('all');
  const [filterPersona, setFilterPersona] = useState('all');
  const [filterSubreddit, setFilterSubreddit] = useState('all');
  const [strictQualityMode, setStrictQualityMode] = useState(false);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState('');
  const [autoGenerated, setAutoGenerated] = useState(false);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);

  const [personaDraft, setPersonaDraft] = useState<Partial<Persona>>({
    username: '',
    bio: '',
    voiceTraits: '',
    expertise: [],
    postingStyle: 'balanced',
  });
  const [subredditDraft, setSubredditDraft] = useState<Partial<Subreddit>>({
    name: '',
    description: '',
  });
  const [keywordDraft, setKeywordDraft] = useState<Partial<Keyword>>({
    keyword: '',
    category: '',
    priority: 0,
  });
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;

  useEffect(() => {
    if (!user?.id) return;
    loadCompanies(user.id).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    });
  }, [user?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCmdkOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setIsCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredPosts = useMemo(() => {
    if (!result) return [] as Post[];
    return result.posts.filter((post) => {
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      if (filterPersona !== 'all' && post.personaId !== filterPersona) return false;
      if (filterSubreddit !== 'all' && post.subredditId !== filterSubreddit) return false;
      return true;
    });
  }, [result, filterStatus, filterPersona, filterSubreddit]);

  const getImportMissingFields = (preview: {
    company?: Company;
    personas?: Array<Partial<Persona> & { postingStyle?: string }>;
    subreddits?: Array<Partial<Subreddit>>;
    keywords?: Array<Partial<Keyword>>;
  }): string[] => {
    const missing: string[] = [];
    if (!preview.company?.name?.trim()) missing.push('Company name');
    if (!preview.personas || preview.personas.length === 0) missing.push('Personas');
    if (!preview.subreddits || preview.subreddits.length === 0) missing.push('Subreddits');
    if (!preview.keywords || preview.keywords.length === 0) missing.push('Keywords');
    return missing;
  };

  const selectedPost = useMemo(() => {
    if (!result || !selectedPostId) return null;
    return result.posts.find((post) => post.id === selectedPostId) || null;
  }, [result, selectedPostId]);

const filteredComments = useMemo(() => {
    if (!result) return [] as Comment[];
    const allowedPostIds = new Set(filteredPosts.map((p) => p.id));
  return result.comments.filter((c) => allowedPostIds.has(c.postId));
  }, [result, filteredPosts]);

  const debugImportPayload = (payload: {
    company?: Company;
    personas?: Array<Partial<Persona>>;
    subreddits?: Array<Partial<Subreddit>>;
    keywords?: Array<Partial<Keyword>>;
    posts?: Post[];
    comments?: Comment[];
  }) => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('[Import payload]', {
      company: payload.company?.name,
      personas: payload.personas?.length,
      subreddits: payload.subreddits?.length,
      keywords: payload.keywords?.length,
      posts: payload.posts?.length,
      comments: payload.comments?.length,
    });
  };

  const cmdkActions = useMemo(() => {
    const base = [
      { label: 'Go to Overview', action: () => setActiveTab('overview') },
      { label: 'Go to Company', action: () => setActiveTab('company') },
      { label: 'Go to Personas', action: () => setActiveTab('personas') },
      { label: 'Go to Subreddits', action: () => setActiveTab('subreddits') },
      { label: 'Go to Keywords', action: () => setActiveTab('keywords') },
      { label: 'Go to Preferences', action: () => setActiveTab('preferences') },
      { label: 'Go to Constraints', action: () => setActiveTab('constraints') },
      { label: 'Go to History', action: () => setActiveTab('history') },
      { label: 'Generate Calendar', action: () => handleGenerate(0) },
      { label: 'Export CSV', action: () => exportCSV(result) },
    ];
    const query = cmdkQuery.trim().toLowerCase();
    if (!query) return base;
    return base.filter((item) => item.label.toLowerCase().includes(query));
  }, [cmdkQuery, result]);

  const auditEntries = useMemo(() => {
    if (!result) return [] as { post: Post; issues: string[]; warnings: string[] }[];
    const issuesByPost = result.qualityReport?.issuesByPostId || {};
    const warningsByPost = result.qualityReport?.warningsByPostId || {};
    return result.posts
      .map((post) => ({
        post,
        issues: (issuesByPost[post.id] || []).map((i) => i.message),
        warnings: warningsByPost[post.id] || [],
      }))
      .filter((entry) => entry.issues.length || entry.warnings.length);
  }, [result]);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadCompanyData(activeCompanyId).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load company data');
    });
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadHistory(activeCompanyId).catch(() => undefined);
  }, [activeCompanyId, result?.generatedAt]);

  useEffect(() => {
    if (!showLogs) return;
    const source = new EventSource('/api/logs');
    source.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        if ((entry as any).type === 'ready') return;
        setLogs((prev) => [...prev.slice(-200), entry]);
      } catch {
        // ignore
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [showLogs]);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (autoGenerated || isGenerating || !shouldAutoGenerate) return;
    if (!activeCompanyId || !activeCompany) return;
    if (personas.length === 0 || subreddits.length === 0 || keywords.length === 0) return;
    if (result) return;

    setAutoGenerated(true);
    handleGenerate(0);
  }, [
    autoGenerated,
    isGenerating,
    activeCompanyId,
    activeCompany,
    personas.length,
    subreddits.length,
    keywords.length,
    result,
    shouldAutoGenerate,
  ]);

  if (!isLoaded) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:border dark:border-white/10 dark:bg-[#18181b]">
        <p className="text-slate-500 dark:text-white/60">Loading authentication…</p>
      </div>
    );
  }

  if (isLoaded && !user) {
    router.replace('/login');
    return null;
  }

  async function persistImportBundle(
    payload: {
      company?: Company;
      personas?: Array<Partial<Persona>>;
      subreddits?: Array<Partial<Subreddit>>;
      keywords?: Array<Partial<Keyword>>;
      posts?: Post[];
      comments?: Comment[];
    },
    userExternalId: string,
    scope: 'user' | 'global' = 'user'
  ) {
    const companyPayload = payload.company;
    if (!companyPayload?.name?.trim()) {
      throw new Error('Company name is required to import.');
    }

    debugImportPayload(payload);
    const saved = scope === 'global'
      ? await upsertCompanyGlobal(companyPayload)
      : await upsertCompany(companyPayload, userExternalId);
    const savedPersonas = payload.personas?.length
      ? await Promise.all(
          payload.personas.map((p) =>
            upsertPersona({
              ...p,
              companyId: saved.id,
              postingStyle: (p.postingStyle as Persona['postingStyle']) || 'balanced',
            } as Persona)
          )
        )
      : [];

    const savedSubreddits = payload.subreddits?.length
      ? await Promise.all(
          payload.subreddits.map((s) =>
            upsertSubreddit({ ...s, companyId: saved.id } as Subreddit)
          )
        )
      : [];

    if (payload.keywords?.length) {
      await Promise.all(
        payload.keywords.map((k) =>
          upsertKeyword({ ...k, companyId: saved.id } as Keyword)
        )
      );
    }

    if (payload.posts?.length) {
      const personaMap = new Map(
        savedPersonas.map((p) => [p.username.toLowerCase(), p])
      );
      const subredditMap = new Map(
        savedSubreddits.map((s) => [s.name.toLowerCase(), s])
      );

      const missingMappings: string[] = [];
      const postsToSave = payload.posts.map((post) => {
        const persona = personaMap.get(post.personaUsername.toLowerCase());
        const subreddit = subredditMap.get(post.subredditName.toLowerCase());
        if (!persona) missingMappings.push(`persona:${post.personaUsername}`);
        if (!subreddit) missingMappings.push(`subreddit:${post.subredditName}`);
        return {
          ...post,
          companyId: saved.id,
          personaId: persona?.id || '',
          subredditId: subreddit?.id || '',
        };
      });

      if (missingMappings.length) {
        throw new Error(`Missing mappings: ${Array.from(new Set(missingMappings)).join(', ')}`);
      }

      const commentsToSave = (payload.comments || []).map((comment) => {
        const persona = personaMap.get(comment.personaUsername.toLowerCase());
        return {
          ...comment,
          personaId: persona?.id || '',
        };
      });

      const weekNumber = postsToSave[0]?.weekNumber || getWeekNumberFromDate(new Date());
      const savedThreads = await saveImportedThreads(saved.id, postsToSave, commentsToSave, weekNumber);
      if (!savedThreads.success) {
        throw new Error(savedThreads.error || 'Failed to save imported threads');
      }
    }

    return saved;
  }

  async function seedSlideforge(userExternalId: string) {
    try {
      const existing = await findCompanyByName('Slideforge');
      if (existing) return existing;
    } catch {
      // ignore lookup errors (RLS)
    }

    const response = await fetch('/api/seed-slideforge');
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to seed Slideforge');
    }
    const saved = await persistImportBundle(data.data, userExternalId, 'user');
    return saved;
  }

  async function loadCompanies(userExternalId: string) {
    const list = await listCompanies(userExternalId);
    if (list.length === 0) {
      try {
        const seeded = await seedSlideforge(userExternalId);
        setCompanies([seeded]);
        setActiveCompanyId(seeded.id);
        setCompanyDraft(seeded);
        setConstraints(seeded.constraints || DEFAULT_CONSTRAINTS);
        setShouldAutoGenerate(true);
        await loadCompanyData(seeded.id);
        return;
      } catch (err) {
        console.warn('Seed failed, falling back to local sample data.', err);
        setCompanies([sampleCompany]);
        setActiveCompanyId(sampleCompany.id);
        setCompanyDraft(sampleCompany);
        setConstraints(sampleCompany.constraints || DEFAULT_CONSTRAINTS);
        setPersonas(samplePersonas);
        setSubreddits(sampleSubreddits);
        setKeywords(sampleKeywords);
        setShouldAutoGenerate(true);
        return;
      }
    }
    setCompanies(list);
    setActiveCompanyId(list[0].id);
    setCompanyDraft(list[0]);
    setConstraints(list[0].constraints || DEFAULT_CONSTRAINTS);
    setShouldAutoGenerate(false);
  }

  async function loadCompanyData(companyId: string) {
    if (companyId === sampleCompany.id) {
      setPersonas(samplePersonas);
      setSubreddits(sampleSubreddits);
      setKeywords(sampleKeywords);
      setCompanyDraft(sampleCompany);
      setConstraints(sampleCompany.constraints || DEFAULT_CONSTRAINTS);
      return;
    }
    const [personasData, subredditsData, keywordsData] = await Promise.all([
      listPersonas(companyId),
      listSubreddits(companyId),
      listKeywords(companyId),
    ]);
    setPersonas(personasData);
    setSubreddits(subredditsData);
    setKeywords(keywordsData);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setCompanyDraft(company);
      setConstraints(company.constraints || DEFAULT_CONSTRAINTS);
    }

    if (!result) {
      const historyItems = await loadCalendarHistory(companyId, 1);
      const latest = historyItems[0];
      if (latest?.weekNumber) {
        const posts = await loadWeekPosts(companyId, latest.weekNumber);
        const commentsNested = await Promise.all(posts.map((post) => loadPostComments(post.id)));
        const comments = commentsNested.flat();
        setResult({
          posts,
          comments,
          qualityReport: latest.qualityReport || {
            overallScore: 0,
            issues: [],
            warnings: [],
            suggestions: [],
          },
          weekNumber: latest.weekNumber,
          generatedAt: latest.generatedAt ? new Date(latest.generatedAt) : new Date(),
        });
      }
    }
  }

  async function loadHistory(companyId: string) {
    const { loadCalendarHistory } = await import('@/lib/supabase/client');
    const items = await loadCalendarHistory(companyId, 6);
    setHistory(items);
  }

  async function handleSaveCompany() {
    if (!companyDraft.name?.trim()) {
      setError('Company name is required');
      return;
    }
    if (!user?.id) return;
    const saved = await upsertCompany(companyDraft as Company, user.id);
    const nextCompanies = companies.filter((c) => c.id !== saved.id).concat(saved);
    setCompanies(nextCompanies);
    setActiveCompanyId(saved.id);
    setCompanyDraft(saved);
  }

  async function handleDeleteCompany(id: string) {
    await deleteCompany(id);
    const next = companies.filter((c) => c.id !== id);
    setCompanies(next);
    setActiveCompanyId(next[0]?.id || null);
    if (next[0]) {
      setCompanyDraft(next[0]);
    }
  }

  async function handleSaveConstraints() {
    if (!activeCompanyId) return;
    await updateCompanyConstraints(activeCompanyId, constraints);
    const nextCompanies = companies.map((c) =>
      c.id === activeCompanyId ? { ...c, constraints } : c
    );
    setCompanies(nextCompanies);
  }

  async function handleSavePersona() {
    if (!activeCompanyId || !personaDraft.username || !personaDraft.bio) return;
    const saved = await upsertPersona({
      ...personaDraft,
      companyId: activeCompanyId,
      expertise: personaDraft.expertise || [],
      postingStyle: personaDraft.postingStyle || 'balanced',
    } as Persona);
    setPersonas((prev) => prev.filter((p) => p.id !== saved.id).concat(saved));
    setPersonaDraft({ username: '', bio: '', voiceTraits: '', expertise: [], postingStyle: 'balanced' });
  }

  async function handleDeletePersona(id: string) {
    await deletePersona(id);
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSaveSubreddit() {
    if (!activeCompanyId || !subredditDraft.name) return;
    const saved = await upsertSubreddit({
      ...subredditDraft,
      companyId: activeCompanyId,
    } as Subreddit);
    setSubreddits((prev) => prev.filter((s) => s.id !== saved.id).concat(saved));
    setSubredditDraft({ name: '', description: '' });
  }

  async function handleDeleteSubreddit(id: string) {
    await deleteSubreddit(id);
    setSubreddits((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSaveKeyword() {
    if (!activeCompanyId || !keywordDraft.keyword) return;
    const saved = await upsertKeyword({
      ...keywordDraft,
      companyId: activeCompanyId,
      priority: Number(keywordDraft.priority || 0),
    } as Keyword);
    setKeywords((prev) => prev.filter((k) => k.id !== saved.id).concat(saved));
    setKeywordDraft({ keyword: '', category: '', priority: 0 });
  }

  async function handleDeleteKeyword(id: string) {
    await deleteKeyword(id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  const handleGenerate = async (weekOffset: number = 0) => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!activeCompany) {
        throw new Error('Select a company before generating.');
      }
      if (personas.length === 0 || subreddits.length === 0 || keywords.length === 0) {
        throw new Error('Add personas, subreddits, and keywords before generating.');
      }
      const requestedWeekStart = getNextMonday(weekOffset);
      setWeekStart(requestedWeekStart);

      const companyPayload = activeCompany;
      const personasPayload = personas;
      const subredditsPayload = subreddits;
      const keywordsPayload = keywords;

      const effectivePreferences: GenerationPreferences = strictQualityMode
        ? {
            ...preferences,
            allowProductMention: false,
            productMentionCount: 0,
            requireDisagreement: true,
            minCommentLength: Math.max(preferences.minCommentLength || 0, 80),
            minPostLength: Math.max(preferences.minPostLength || 0, 180),
          }
        : preferences;

      let firstOutput: PlannerOutput | null = null;

      for (let i = 0; i < Math.max(weeksToGenerate, 1); i += 1) {
        const weekStartDate = addWeeks(requestedWeekStart, i);
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: companyPayload,
            personas: personasPayload,
            subreddits: subredditsPayload,
            keywords: keywordsPayload,
            postsPerWeek,
            weekStartDate: weekStartDate.toISOString(),
            preferences: effectivePreferences,
            constraints,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Generation failed');
        }

        const output: PlannerOutput = {
          ...data.data,
          posts: data.data.posts.map((p: any) => ({
            ...p,
            scheduledAt: new Date(p.scheduledAt),
          })),
          comments: data.data.comments.map((c: any) => ({
            ...c,
            scheduledAt: new Date(c.scheduledAt),
          })),
          generatedAt: new Date(data.data.generatedAt),
          debug: data.data.debug,
        };

        if (!firstOutput) {
          firstOutput = output;
          setResult(output);
          setLastGenerationMode(data.data?.meta?.mode || null);
        }

        if (activeCompanyId) {
          const { saveCalendar } = await import('@/lib/supabase/client');
          await saveCalendar(activeCompanyId, output);
        }
      }

      setActionMessage(
        weeksToGenerate > 1
          ? `Generated ${weeksToGenerate} weeks. Review the current week and check history for the rest.`
          : 'Calendar generated. Review and approve when ready.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!result) return;
    const nextPosts = result.posts.map((p) => ({ ...p, status: 'approved' as const }));
    const nextComments = result.comments.map((c) => ({ ...c, status: 'approved' as const }));
    setResult({ ...result, posts: nextPosts, comments: nextComments });
    if (supabase) {
      const postResults = await Promise.all(nextPosts.map((p) => updatePost(p.id, { status: 'approved' })));
      const commentResults = await Promise.all(nextComments.map((c) => updateComment(c.id, { status: 'approved' })));
      const failures = [...postResults, ...commentResults].filter((r) => !r.success);
      if (failures.length) {
        setError(failures[0]?.error || 'Some approvals failed to save');
      }
    }
    setActionMessage('All posts and comments approved.');
  };

  const handleCsvImports = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let mergedPreview = { ...importPreview } as typeof importPreview;

    for (const file of Array.from(files)) {
      const text = await file.text();
      const hasContentCalendar =
        text.toLowerCase().includes('post_id') || text.toLowerCase().includes('comment_id');
      const preview = hasContentCalendar
        ? parseContentCalendarCSV(text)
        : parseCompanyInfoCSV(text);
      mergedPreview = mergeImportPreview(mergedPreview, preview as any);
    }

    if (!mergedPreview.company) {
      try {
        const seedRes = await fetch('/api/seed-slideforge');
        const seedData = await seedRes.json();
        if (seedData.success) {
          mergedPreview = mergeImportPreview(mergedPreview, seedData.data);
        }
      } catch {
        // ignore seed helper
      }
    }

    if (
      mergedPreview.company?.name?.toLowerCase() === 'slideforge' &&
      (!mergedPreview.keywords || mergedPreview.keywords.length === 0)
    ) {
      try {
        const seedRes = await fetch('/api/seed-slideforge');
        const seedData = await seedRes.json();
        if (seedData.success) {
          mergedPreview = mergeImportPreview(mergedPreview, seedData.data);
        }
      } catch {
        // ignore seed helper
      }
    }

    setImportPreview(() => {
      setImportMissing(getImportMissingFields(mergedPreview));
      return mergedPreview;
    });
    setImportStatus(`Parsed ${files.length} CSV file${files.length > 1 ? 's' : ''}. Review below and apply.`);
  };

  const handleEditContent = async (type: 'post' | 'comment', id: string, content: string) => {
    if (!result) return;
    if (type === 'post') {
      const updated = result.posts.map((p) => (p.id === id ? { ...p, title: content } : p));
      setResult({ ...result, posts: updated });
      const res = await updatePost(id, { title: content });
      if (!res.success) setError(res.error || 'Failed to update post');
    } else {
      const updated = result.comments.map((c) => (c.id === id ? { ...c, content } : c));
      setResult({ ...result, comments: updated });
      const res = await updateComment(id, { content });
      if (!res.success) setError(res.error || 'Failed to update comment');
    }
  };

  const handleUpdatePostStatus = async (postId: string, status: Post['status']) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) => (p.id === postId ? { ...p, status } : p)),
      };
    });
    const res = await updatePost(postId, { status });
    if (!res.success) setError(res.error || 'Failed to update post');
  };

  const handleUpdatePostNotes = async (postId: string, notes: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) => (p.id === postId ? { ...p, reviewNotes: notes } : p)),
      };
    });
    const res = await updatePost(postId, { reviewNotes: notes });
    if (!res.success) {
      setError(res.error || 'Failed to save notes');
      return;
    }
    setActionMessage('Review notes saved.');
  };

  const handleUpdateCommentStatus = async (commentId: string, status: Comment['status']) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.map((c) => (c.id === commentId ? { ...c, status } : c)),
      };
    });
    const res = await updateComment(commentId, { status });
    if (!res.success) setError(res.error || 'Failed to update comment');
  };

  const handleRegenerateLowQuality = async () => {
    if (!result) return;
    const lowQualityPosts = result.posts.filter((p) => (p.qualityScore ?? 0) < 7 || (p.qualityIssues?.length || 0) > 0);
    for (const post of lowQualityPosts) {
      await handleRegeneratePost(post);
    }
    setActionMessage('Regenerated low-quality threads.');
  };

  const handleRegeneratePost = async (post: Post, notes?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      if (!activeCompany) {
        throw new Error('Select a company before regenerating.');
      }
      const companyPayload = activeCompany;
      const personasPayload = personas;
      const subredditsPayload = subreddits;
      const keywordsPayload = keywords;

      const basePreferences: GenerationPreferences = strictQualityMode
        ? {
            ...preferences,
            allowProductMention: false,
            productMentionCount: 0,
            requireDisagreement: true,
            minCommentLength: Math.max(preferences.minCommentLength || 0, 80),
            minPostLength: Math.max(preferences.minPostLength || 0, 180),
          }
        : preferences;

      const regenPreferences: GenerationPreferences = {
        ...basePreferences,
        postGuidelines: [basePreferences.postGuidelines, notes].filter(Boolean).join(' '),
        commentGuidelines: [basePreferences.commentGuidelines, notes].filter(Boolean).join(' '),
      };

      const targetSubreddit = subredditsPayload.find((s) => s.id === post.subredditId) || null;
      const targetKeywords = keywordsPayload.filter((k) => post.keywordIds.includes(k.id));

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyPayload,
          personas: personasPayload,
          subreddits: targetSubreddit ? [targetSubreddit] : subredditsPayload,
          keywords: targetKeywords.length ? targetKeywords : keywordsPayload,
          postsPerWeek: 1,
          weekStartDate: post.scheduledAt.toISOString(),
          preferences: regenPreferences,
          constraints,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Regenerate failed');

      const regenerated = data.data.posts?.[0];
      const regeneratedComments = data.data.comments || [];
      if (!regenerated) throw new Error('No regenerated post returned');

      const scheduledAt = new Date(post.scheduledAt);
      const regenPost = {
        ...post,
        title: regenerated.title,
        body: regenerated.body,
        scheduledAt,
      };

      const delta = scheduledAt.getTime() - new Date(regenerated.scheduledAt).getTime();
      const updatedComments = getCommentsForPost(post.id).map((comment, idx) => {
        const regenComment = regeneratedComments[idx];
        return {
          ...comment,
          content: regenComment?.content || comment.content,
          scheduledAt: new Date(comment.scheduledAt.getTime() + delta),
        };
      });

      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) => (p.id === post.id ? regenPost : p)),
          comments: prev.comments.map((c) => {
            const updated = updatedComments.find((uc) => uc.id === c.id);
            return updated ? updated : c;
          }),
        };
      });

      const postRes = await updatePost(post.id, { title: regenPost.title, body: regenPost.body });
      const commentRes = await Promise.all(
        updatedComments.map((comment) => updateComment(comment.id, { content: comment.content }))
      );
      if (!postRes.success || commentRes.some((r) => !r.success)) {
        setError('Regenerated content saved locally, but failed to persist to DB.');
      }

      setActionMessage('Thread regenerated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regenerate failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setWeekStart((prev) => addMonths(prev, direction === 'prev' ? -1 : 1));
  };

  const getCommentsForPost = (postId: string): Comment[] => {
    if (!result) return [];
    return result.comments.filter((c) => c.postId === postId);
  };

  const cardBase =
    'rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/10 dark:bg-[#18181b]';
  const cardMuted =
    'rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/10 dark:bg-[#18181b]';
  const subCard =
    'rounded-xl bg-white p-4 shadow-sm dark:border dark:border-white/10 dark:bg-[#18181b]';
  const inputBase =
    'w-full h-10 rounded-xl border border-[#e5e5e5] bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white dark:placeholder:text-white/40 dark:focus:ring-orange-500/30';
  const inputPlain =
    'w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white dark:placeholder:text-white/40 dark:focus:ring-orange-500/30';
  const inputIcon =
    'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40';
  const labelClass = 'block min-h-[32px] text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-white/50';
  const titleClass = 'text-lg font-semibold text-slate-900 dark:text-white';

  const sidebarSections = [
    {
      label: 'Overview',
      items: [{ key: 'overview', label: 'Overview', icon: BarChart3 }],
    },
    {
      label: 'Setup',
      items: [
        { key: 'company', label: 'Company', icon: Building2 },
        { key: 'personas', label: 'Personas', icon: Users },
        { key: 'subreddits', label: 'Subreddits', icon: Hash },
        { key: 'keywords', label: 'Keywords', icon: Tags },
        { key: 'import', label: 'Import', icon: FileText },
      ],
    },
    {
      label: 'Configure',
      items: [
        { key: 'preferences', label: 'Preferences', icon: Sliders },
        { key: 'constraints', label: 'Constraints', icon: Settings2 },
      ],
    },
    {
      label: 'History',
      items: [{ key: 'history', label: 'History', icon: History }],
    },
  ];


  return (
    <div className="dashboard-skin space-y-6">
      {isCmdkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#18181b]">
            <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3 dark:border-white/10">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/40">Command</span>
              <input
                autoFocus
                value={cmdkQuery}
                onChange={(e) => setCmdkQuery(e.target.value)}
                placeholder="Search actions…"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/40"
              />
              <kbd className="rounded-full border border-[#e5e5e5] px-2 py-1 text-[10px] text-slate-500 dark:border-white/20 dark:text-white/50">ESC</kbd>
            </div>
            <div className="mt-3 max-h-72 space-y-1 overflow-auto">
              {cmdkActions.length === 0 && (
                <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-[#18181b] dark:text-white/60">
                  No results.
                </div>
              )}
              {cmdkActions.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action();
                    setIsCmdkOpen(false);
                    setCmdkQuery('');
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-[#18181b] dark:text-white/80 dark:hover:bg-white/10"
                >
                  {item.label}
                  <span className="text-xs text-slate-400 dark:text-white/40">↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="rounded-[28px] bg-white p-6 shadow-sm dark:border dark:border-white/10 dark:bg-[#18181b]">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/50">Control Room</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Reddit Mastermind</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-white/60">
              Orchestrate personas, constraints, and cadence. Generate calendars that feel organic to real communities.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportCSV(result)}
              className="rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-[#f5f5f5] dark:border-white/15 dark:bg-[#18181b] dark:text-white/70 dark:hover:bg-white/10"
            >
              Export CSV
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleGenerate(0)}
              disabled={isGenerating}
              className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all ${
                isGenerating
                  ? 'bg-orange-500 btn-shimmer cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-400'
              }`}
            >
              {isGenerating ? 'Generating…' : 'Generate Calendar'}
            </motion.button>
          </div>
        </div>

        {aiStatus && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-[#18181b] dark:text-white/70">
            <div>
              AI Mode:{' '}
              <span className={aiStatus.mode === 'live' ? 'text-orange-500 font-semibold' : 'text-slate-500 font-semibold dark:text-white/60'}>
                {aiStatus.mode.toUpperCase()}
              </span>
              <span className="ml-2 text-slate-400 dark:text-white/50">Model: {aiStatus.model}</span>
              {aiStatus.provider && <span className="ml-2 text-slate-400 dark:text-white/40">Provider: {aiStatus.provider}</span>}
            </div>
            {lastGenerationMode && (
              <div className="text-slate-400 dark:text-white/50">
                Last generation: <span className="font-medium text-slate-800 dark:text-white">{lastGenerationMode.toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="group rounded-2xl bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/10 dark:bg-[#18181b]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-white/50">Posts</p>
              <ClipboardList className="h-4 w-4 text-slate-400 dark:text-white/40" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {result?.posts.length ?? 0}
            </p>
            <p className="text-xs text-slate-400 dark:text-white/50">
              {result?.posts.length ? 'Drafted threads this week' : 'No drafts yet'}
            </p>
          </div>
          <div className="group rounded-2xl bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/10 dark:bg-[#18181b]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-white/50">Comments</p>
              <MessagesSquare className="h-4 w-4 text-slate-400 dark:text-white/40" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {result?.comments.length ?? 0}
            </p>
            <p className="text-xs text-slate-400 dark:text-white/50">
              {result?.comments.length ? 'Conversation depth planned' : 'No replies planned'}
            </p>
          </div>
          <div className="group rounded-2xl bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/10 dark:bg-[#18181b]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-white/50">Quality</p>
              <Sparkles className="h-4 w-4 text-slate-400 dark:text-white/40" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {result?.qualityReport?.overallScore?.toFixed(1) ?? '—'}
            </p>
            <p className="text-xs text-slate-400 dark:text-white/50">
              {result?.qualityReport ? 'Average realism score' : 'Generate to see score'}
            </p>
          </div>
        </div>

      </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-6 rounded-2xl bg-white p-4 dark:border dark:border-white/10 dark:bg-[#0a0a0a] lg:rounded-r-none lg:border-r lg:border-[#e5e5e5] dark:lg:border-white/10">
            {sidebarSections.map((section) => (
              <div key={section.label} className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key as any)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                          activeTab === item.key
                            ? 'border-orange-200/60 bg-orange-50 text-slate-900 shadow-sm dark:border-orange-400/40 dark:bg-orange-500/10 dark:text-white'
                            : 'border-transparent text-slate-500 hover:border-[#e5e5e5] hover:bg-[#f5f5f5] dark:text-white/60 dark:hover:border-white/15 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={() => signOut({ redirectUrl: '/login' })}
              className="flex w-full items-center gap-3 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-[#e5e5e5] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-[#18181b] dark:text-white/70 dark:hover:border-white/30 dark:hover:bg-white/10"
            >
              <CalendarRange className="h-4 w-4" />
              Sign out
            </button>
          </aside>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className={`${cardBase} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={labelClass}>Generation setup</p>
                      <h3 className={titleClass}>Plan the next cycle</h3>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      Tip: Use ⌘K to jump to any section.
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-5 items-start">
                    <div className="flex h-full flex-col">
                      <label className={labelClass}>Company for generation</label>
                      <div className="relative mt-2">
                        <Building2 className={inputIcon} />
                        <select
                          value={activeCompanyId || ''}
                          onChange={(e) => setActiveCompanyId(e.target.value || null)}
                          className={`${inputBase} appearance-none`}
                        >
                          <option value="">Use Slideforge sample</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-1 min-h-[14px] text-[11px] text-transparent">spacer</div>
                    </div>
                    <div className="flex h-full flex-col">
                      <label className={labelClass}>Posts per week</label>
                      <div className="mt-2 rounded-full border border-[#e5e5e5] bg-[#f5f5f5] p-1 dark:border-white/10 dark:bg-[#18181b]">
                        <div className="grid grid-cols-5 gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              onClick={() => setPostsPerWeek(value)}
                              className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                                postsPerWeek === value
                                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                  : 'text-slate-500 hover:bg-white dark:text-white/60 dark:hover:bg-white/10'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 min-h-[14px] text-[11px] text-transparent">spacer</div>
                    </div>
                    <div className="flex h-full flex-col">
                      <label className={labelClass}>Weeks to generate</label>
                      <div className="relative mt-2">
                        <CalendarRange className={inputIcon} />
                        <input
                          type="number"
                          min={1}
                          value={weeksToGenerate}
                          onChange={(e) => setWeeksToGenerate(Math.max(1, Number(e.target.value)))}
                          className={inputBase}
                        />
                      </div>
                      <div className="mt-1 min-h-[14px] text-[11px] text-transparent">spacer</div>
                    </div>
                    <div className="flex h-full flex-col">
                      <label className={labelClass}>Allow product mentions</label>
                      <div className="relative mt-2">
                        <Sparkles className={inputIcon} />
                        <select
                          value={preferences.allowProductMention ? 'yes' : 'no'}
                          onChange={(e) => {
                            const allow = e.target.value === 'yes';
                            setPreferences((prev) => ({
                              ...prev,
                              allowProductMention: allow,
                              productMentionCount: allow
                                ? Math.max(1, prev.productMentionCount ?? 1)
                                : 0,
                            }));
                          }}
                          className={`${inputBase} appearance-none`}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div className="mt-1 min-h-[14px] text-[11px] text-slate-500 dark:text-white/50">
                        {preferences.allowProductMention
                          ? 'Mentions enabled'
                          : 'Mentions disabled'}
                      </div>
                    </div>
                    <div className="flex h-full flex-col">
                      <label className={labelClass}>Mentions per thread</label>
                      <div className="relative mt-2">
                        <Target className={inputIcon} />
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={preferences.productMentionCount ?? 0}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              productMentionCount: Math.max(0, Number(e.target.value)),
                              allowProductMention: Number(e.target.value) > 0,
                            }))
                          }
                          disabled={!preferences.allowProductMention}
                          className={`${inputBase} ${
                            preferences.allowProductMention ? '' : 'opacity-60'
                          }`}
                        />
                      </div>
                      <div className="mt-1 min-h-[14px] text-[11px] text-slate-500 dark:text-white/50">
                        Set to 0 to avoid mentions.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${cardBase} space-y-4`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={labelClass}>Quality guardrails</p>
                      <h3 className={titleClass}>Strict AI quality mode</h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-white/60">
                        Stronger anti-promo, longer comments, and forced disagreement for realism.
                      </p>
                    </div>
                    <button
                      onClick={() => setStrictQualityMode((prev) => !prev)}
                      className={`relative h-7 w-14 rounded-full transition ${
                        strictQualityMode
                          ? 'bg-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                          strictQualityMode ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <details className={`${subCard} group text-sm text-slate-600 dark:text-white/70`}>
                    <summary className="flex cursor-pointer items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-white/50">
                      Advanced settings
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className={labelClass}>Campaign brief (natural language)</label>
                        <textarea
                          value={preferences.campaignBrief || ''}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              campaignBrief: e.target.value,
                            }))
                          }
                          className={`${inputPlain} mt-2 min-h-[120px]`}
                          rows={3}
                          placeholder="Focus on consultants and founders. Emphasize time savings and clarity. Avoid overt promotion."
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Banned phrases (comma separated)</label>
                        <input
                          type="text"
                          value={(preferences.bannedPhrases || []).join(', ')}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              bannedPhrases: e.target.value
                                .split(',')
                                .map((p) => p.trim())
                                .filter(Boolean),
                            }))
                          }
                          className={`${inputPlain} mt-2`}
                        />
                      </div>
                    </div>
                  </details>
                </div>

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                  <div className={cardBase}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={labelClass}>Calendar</p>
                        <h3 className={titleClass}>This week</h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-white/60">
                        {result?.posts.length || 0} posts
                      </div>
                    </div>
                    <div className="mt-4">
                      <CalendarView
                        posts={result?.posts || []}
                        comments={result?.comments || []}
                        personas={personas}
                        weekStart={weekStart}
                        onSelectPost={(post) => setSelectedPostId(post.id)}
                        onWeekChange={handleMonthChange}
                        onToday={() => setWeekStart(getNextMonday(0))}
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    {selectedPost ? (
                      <ThreadPreview
                        post={selectedPost}
                        comments={getCommentsForPost(selectedPost.id)}
                        personas={personas}
                        onEdit={handleEditContent}
                        onRegenerate={handleRegeneratePost}
                        onUpdatePostStatus={handleUpdatePostStatus}
                        onUpdateCommentStatus={handleUpdateCommentStatus}
                        onUpdatePostNotes={handleUpdatePostNotes}
                        onClose={() => setSelectedPostId(null)}
                      />
                    ) : (
                      <div className={cardBase}>
                        <div className="text-sm text-slate-500 dark:text-white/60">
                          Select a post to see the full thread.
                        </div>
                      </div>
                    )}
                    {result?.qualityReport && (
                      <QualityPanel
                        report={result.qualityReport}
                        postsCount={result.posts.length}
                        commentsCount={result.comments.length}
                        weekNumber={result.weekNumber}
                        onApproveAll={handleApproveAll}
                        onRegenerateLowQuality={handleRegenerateLowQuality}
                        onRegenerate={() => handleGenerate(0)}
                        onGenerateNext={() => handleGenerate(1)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}


          {activeTab === 'company' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Setup</p>
                <h3 className={titleClass}>Company</h3>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className={`${subCard} space-y-3`}>
                  <div className="text-xs font-semibold text-slate-500 dark:text-white/60">Existing companies</div>
                  <div className="space-y-2">
                    {companies.length === 0 && (
                      <div className="text-xs text-slate-400 dark:text-white/50">
                        No companies yet. Create or import one.
                      </div>
                    )}
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCompanyId(c.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          activeCompanyId === c.id
                            ? 'border-[#f97316] bg-orange-50 text-slate-900 dark:border-orange-400/40 dark:bg-orange-500/10 dark:text-white'
                            : 'border-[#e5e5e5] bg-white text-slate-700 hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-[#18181b] dark:text-white/70 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-slate-400 dark:text-white/50 truncate">{c.website || '—'}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`${subCard} space-y-3`}>
                  <div className="text-xs font-semibold text-slate-500 dark:text-white/60">Current data</div>
                  <div className="space-y-2 text-xs text-slate-500 dark:text-white/60">
                    <div>Personas: {personas.length}</div>
                    <div>Subreddits: {subreddits.length}</div>
                    <div>Keywords: {keywords.length}</div>
                    <div>Constraints: {constraints ? 'Custom' : 'Default'}</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-500 dark:text-white/60">
                <div className={subCard}>
                  <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-white/60">Personas</div>
                  {personas.length === 0 && <div className="text-slate-400 dark:text-white/50">None</div>}
                  {personas.slice(0, 4).map((p) => (
                    <div key={p.id} className="truncate">{p.username}</div>
                  ))}
                  {personas.length > 4 && <div className="text-slate-400 dark:text-white/50">+{personas.length - 4} more</div>}
                </div>
                <div className={subCard}>
                  <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-white/60">Subreddits</div>
                  {subreddits.length === 0 && <div className="text-slate-400 dark:text-white/50">None</div>}
                  {subreddits.slice(0, 4).map((s) => (
                    <div key={s.id} className="truncate">{s.name}</div>
                  ))}
                  {subreddits.length > 4 && <div className="text-slate-400 dark:text-white/50">+{subreddits.length - 4} more</div>}
                </div>
                <div className={subCard}>
                  <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-white/60">Keywords</div>
                  {keywords.length === 0 && <div className="text-slate-400 dark:text-white/50">None</div>}
                  {keywords.slice(0, 4).map((k) => (
                    <div key={k.id} className="truncate">{k.keyword}</div>
                  ))}
                  {keywords.length > 4 && <div className="text-slate-400 dark:text-white/50">+{keywords.length - 4} more</div>}
                </div>
              </div>
              <select
                value={activeCompanyId || ''}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className={inputPlain}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Company name"
                value={companyDraft.name || ''}
                onChange={(e) => setCompanyDraft((prev) => ({ ...prev, name: e.target.value }))}
                className={inputPlain}
              />
              <textarea
                placeholder="Description"
                value={companyDraft.description || ''}
                onChange={(e) => setCompanyDraft((prev) => ({ ...prev, description: e.target.value }))}
                className={`${inputPlain} min-h-[120px]`}
                rows={3}
              />
              <input
                type="text"
                placeholder="Website"
                value={companyDraft.website || ''}
                onChange={(e) => setCompanyDraft((prev) => ({ ...prev, website: e.target.value }))}
                className={inputPlain}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveCompany}
                  className="flex-1 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                >
                  Save
                </button>
                {activeCompanyId && (
                  <button
                    onClick={() => handleDeleteCompany(activeCompanyId)}
                    className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-sm text-slate-600 transition hover:bg-[#f5f5f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'personas' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Setup</p>
                <h3 className={titleClass}>Personas</h3>
              </div>
              <div className="space-y-2">
                {personas.map((p) => (
                  <div key={p.id} className={subCard}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{p.username}</div>
                        <div className="text-xs text-slate-500 dark:text-white/60">{p.postingStyle}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() =>
                            setPersonaDraft({
                              id: p.id,
                              username: p.username,
                              bio: p.bio,
                              voiceTraits: p.voiceTraits,
                              expertise: p.expertise,
                              postingStyle: p.postingStyle,
                            })
                          }
                          className="text-slate-600 transition hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePersona(p.id)}
                          className="text-slate-500 transition hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Username"
                value={personaDraft.username || ''}
                onChange={(e) => setPersonaDraft((prev) => ({ ...prev, username: e.target.value }))}
                className={inputPlain}
              />
              <textarea
                placeholder="Bio"
                value={personaDraft.bio || ''}
                onChange={(e) => setPersonaDraft((prev) => ({ ...prev, bio: e.target.value }))}
                className={`${inputPlain} min-h-[120px]`}
                rows={3}
              />
              <input
                type="text"
                placeholder="Expertise (comma separated)"
                value={(personaDraft.expertise || []).join(', ')}
                onChange={(e) =>
                  setPersonaDraft((prev) => ({
                    ...prev,
                    expertise: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  }))
                }
                className={inputPlain}
              />
              <select
                value={personaDraft.postingStyle || 'balanced'}
                onChange={(e) =>
                  setPersonaDraft((prev) => ({ ...prev, postingStyle: e.target.value as Persona['postingStyle'] }))
                }
                className={inputPlain}
              >
                <option value="asks_questions">Asks questions</option>
                <option value="gives_answers">Gives answers</option>
                <option value="balanced">Balanced</option>
              </select>
              <button
                onClick={handleSavePersona}
                className="w-full rounded-xl bg-[#f97316] py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                {personaDraft.id ? 'Update Persona' : 'Add Persona'}
              </button>
              <button
                onClick={() =>
                  setPersonaDraft({ username: '', bio: '', voiceTraits: '', expertise: [], postingStyle: 'balanced' })
                }
                className="w-full rounded-xl border border-[#e5e5e5] py-2 text-sm text-slate-600 transition hover:bg-[#f5f5f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === 'subreddits' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Setup</p>
                <h3 className={titleClass}>Subreddits</h3>
              </div>
              <div className="space-y-2">
                {subreddits.map((s) => (
                  <div key={s.id} className={subCard}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-900 dark:text-white">{s.name}</span>
                      <button
                        onClick={() => handleDeleteSubreddit(s.id)}
                        className="text-xs text-slate-500 transition hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="r/YourSubreddit"
                value={subredditDraft.name || ''}
                onChange={(e) => setSubredditDraft((prev) => ({ ...prev, name: e.target.value }))}
                className={inputPlain}
              />
              <textarea
                placeholder="Description"
                value={subredditDraft.description || ''}
                onChange={(e) => setSubredditDraft((prev) => ({ ...prev, description: e.target.value }))}
                className={`${inputPlain} min-h-[96px]`}
                rows={2}
              />
              <button
                onClick={handleSaveSubreddit}
                className="w-full rounded-xl bg-[#f97316] py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                Add Subreddit
              </button>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Setup</p>
                <h3 className={titleClass}>Keywords</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Keyword = target phrase, Category = grouping, Priority (0-5) = selection weight.
              </p>
              <div className="space-y-2">
                {keywords.map((k) => (
                  <div key={k.id} className={subCard}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-900 dark:text-white">{k.keyword}</span>
                      <button
                        onClick={() => handleDeleteKeyword(k.id)}
                        className="text-xs text-slate-500 transition hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Keyword"
                value={keywordDraft.keyword || ''}
                onChange={(e) => setKeywordDraft((prev) => ({ ...prev, keyword: e.target.value }))}
                className={inputPlain}
              />
              <input
                type="text"
                placeholder="Category"
                value={keywordDraft.category || ''}
                onChange={(e) => setKeywordDraft((prev) => ({ ...prev, category: e.target.value }))}
                className={inputPlain}
              />
              <input
                type="number"
                placeholder="Priority"
                value={keywordDraft.priority || 0}
                onChange={(e) => setKeywordDraft((prev) => ({ ...prev, priority: Number(e.target.value) }))}
                className={inputPlain}
              />
              <button
                onClick={handleSaveKeyword}
                className="w-full rounded-xl bg-[#f97316] py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                Add Keyword
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Configure</p>
                <h3 className={titleClass}>Generation Preferences</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <label className={labelClass}>Min comment length</label>
                  <input
                    type="number"
                    value={preferences.minCommentLength || 0}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, minCommentLength: Number(e.target.value) }))}
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max comment length</label>
                  <input
                    type="number"
                    value={preferences.maxCommentLength || 0}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, maxCommentLength: Number(e.target.value) }))}
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Min post length</label>
                  <input
                    type="number"
                    value={preferences.minPostLength || 0}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, minPostLength: Number(e.target.value) }))}
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max post length</label>
                  <input
                    type="number"
                    value={preferences.maxPostLength || 0}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, maxPostLength: Number(e.target.value) }))}
                    className={inputPlain}
                  />
                </div>
              </div>
              <textarea
                placeholder="Post guidelines"
                value={preferences.postGuidelines || ''}
                onChange={(e) => setPreferences((prev) => ({ ...prev, postGuidelines: e.target.value }))}
                className={`${inputPlain} min-h-[96px]`}
                rows={2}
              />
              <textarea
                placeholder="Comment guidelines"
                value={preferences.commentGuidelines || ''}
                onChange={(e) => setPreferences((prev) => ({ ...prev, commentGuidelines: e.target.value }))}
                className={`${inputPlain} min-h-[96px]`}
                rows={2}
              />
            </div>
          )}

          {activeTab === 'constraints' && (
            <div className={`${cardBase} space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={labelClass}>Configure</p>
                  <h3 className={titleClass}>Constraints</h3>
                </div>
                <button
                  onClick={handleSaveConstraints}
                  className="rounded-xl bg-[#f97316] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                >
                  Save Constraints
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <label className={labelClass}>Max posts per subreddit</label>
                  <input
                    type="number"
                    value={constraints.maxPostsPerSubredditPerWeek}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        maxPostsPerSubredditPerWeek: Number(e.target.value),
                      }))
                    }
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max posts per persona</label>
                  <input
                    type="number"
                    value={constraints.maxPostsPerPersonaPerWeek}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        maxPostsPerPersonaPerWeek: Number(e.target.value),
                      }))
                    }
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Min delay after post (min)</label>
                  <input
                    type="number"
                    value={constraints.minDelayAfterPostMinutes}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        minDelayAfterPostMinutes: Number(e.target.value),
                      }))
                    }
                    className={inputPlain}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max delay after post (min)</label>
                  <input
                    type="number"
                    value={constraints.maxDelayAfterPostMinutes}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        maxDelayAfterPostMinutes: Number(e.target.value),
                      }))
                    }
                    className={inputPlain}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>Setup</p>
                <h3 className={titleClass}>Import data</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/60">
                  Upload CSV or PDF to populate company, personas, subreddits, and keywords.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${subCard} space-y-2`}>
                  <label className={labelClass}>CSV file</label>
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={(e) => handleCsvImports(e.target.files)}
                    className="text-xs text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#f5f5f5] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-600 hover:file:bg-[#e5e5e5] dark:text-white/70 dark:file:bg-white/10 dark:file:text-white/70"
                  />
                  <div className="text-xs text-slate-400 dark:text-white/50">
                    Select multiple CSVs (company + content calendar) to import together.
                  </div>
                </div>
                <div className={`${subCard} space-y-2`}>
                  <label className={labelClass}>PDF file</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      const response = await fetch('/api/import', {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await response.json();
                      if (!data.success) {
                        setImportStatus(data.error || 'PDF import failed');
                        return;
                      }
                      const preview = data.data || {};
                      setImportPreview((prev) => {
                        const merged = mergeImportPreview(prev, preview);
                        setImportMissing(getImportMissingFields(merged));
                        return merged;
                      });
                      setImportStatus('PDF parsed locally. Review below and apply.');
                    }}
                    className="text-xs text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#f5f5f5] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-600 hover:file:bg-[#e5e5e5] dark:text-white/70 dark:file:bg-white/10 dark:file:text-white/70"
                  />
                  <div className="text-xs text-slate-400 dark:text-white/50">
                    PDF parsing uses local text extraction (no AI).
                  </div>
                </div>
              </div>
              {importStatus && <div className="text-sm text-slate-600 dark:text-white/70">{importStatus}</div>}
              {(importPreview.company || importPreview.personas?.length || importPreview.subreddits?.length || importPreview.keywords?.length) && (
                <div className={`${subCard} text-sm text-slate-600 dark:text-white/70`}>
                  <div className="font-medium text-slate-900 dark:text-white">Preview</div>
                  <div>Company: {importPreview.company?.name || '—'}</div>
                  <div>Personas: {importPreview.personas?.length || 0}</div>
                  <div>Subreddits: {importPreview.subreddits?.length || 0}</div>
                  <div>Keywords: {importPreview.keywords?.length || 0}</div>
                  {importPreview.posts && <div>Posts: {importPreview.posts.length}</div>}
                  {importPreview.comments && <div>Comments: {importPreview.comments.length}</div>}
                </div>
              )}
              {importPreview.extractedText && (
                <div className={`${subCard} max-h-32 overflow-auto text-xs text-slate-500 dark:text-white/60`}>
                  {importPreview.extractedText}
                </div>
              )}
              {importMissing.length > 0 && (
                <div className="rounded-xl border border-[#f97316]/20 bg-[#fef3eb] p-3 text-xs text-[#ea580c] dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200 space-y-2">
                  <div className="font-semibold">Missing fields</div>
                  <div>{importMissing.join(', ')}</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Company name"
                      value={importNotes.companyName || ''}
                      onChange={(e) =>
                        setImportNotes((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      className={inputPlain}
                    />
                    <input
                      type="text"
                      placeholder="Company website"
                      value={importNotes.companyWebsite || ''}
                      onChange={(e) =>
                        setImportNotes((prev) => ({ ...prev, companyWebsite: e.target.value }))
                      }
                      className={inputPlain}
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Persona username"
                      value={importWizard.personaUsername || ''}
                      onChange={(e) =>
                        setImportWizard((prev) => ({ ...prev, personaUsername: e.target.value }))
                      }
                      className={inputPlain}
                    />
                    <input
                      type="text"
                      placeholder="Persona bio"
                      value={importWizard.personaBio || ''}
                      onChange={(e) =>
                        setImportWizard((prev) => ({ ...prev, personaBio: e.target.value }))
                      }
                      className={inputPlain}
                    />
                    <input
                      type="text"
                      placeholder="Subreddit name (r/...)"
                      value={importWizard.subredditName || ''}
                      onChange={(e) =>
                        setImportWizard((prev) => ({ ...prev, subredditName: e.target.value }))
                      }
                      className={inputPlain}
                    />
                    <input
                      type="text"
                      placeholder="Keyword"
                      value={importWizard.keyword || ''}
                      onChange={(e) =>
                        setImportWizard((prev) => ({ ...prev, keyword: e.target.value }))
                      }
                      className={inputPlain}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!user?.id) return;
                    try {
                      const companyPayload = importPreview.company || {
                        name: importNotes.companyName || '',
                        website: importNotes.companyWebsite || '',
                        description: '',
                        positioning: '',
                      };
                      const fallbackPersona: Array<Partial<Persona>> = importWizard.personaUsername && importWizard.personaBio
                        ? [{
                            id: undefined,
                            companyId: '',
                            username: importWizard.personaUsername,
                            bio: importWizard.personaBio,
                            voiceTraits: '',
                            expertise: [],
                            postingStyle: 'balanced' as Persona['postingStyle'],
                          }]
                        : [];
                      const fallbackSubreddit: Array<Partial<Subreddit>> = importWizard.subredditName
                        ? [{
                            id: undefined,
                            companyId: '',
                            name: importWizard.subredditName,
                            description: '',
                          }]
                        : [];
                      const fallbackKeyword: Array<Partial<Keyword>> = importWizard.keyword
                        ? [{
                            id: undefined,
                            companyId: '',
                            keyword: importWizard.keyword,
                            category: '',
                            priority: 0,
                          }]
                        : [];

                      const personasToSave: Array<Partial<Persona>> =
                        (importPreview.personas?.length ? importPreview.personas : fallbackPersona).map((p) => ({
                          ...p,
                          postingStyle: (p.postingStyle as Persona['postingStyle']) || 'balanced',
                        }));
                      const subredditsToSave: Array<Partial<Subreddit>> =
                        importPreview.subreddits?.length ? importPreview.subreddits : fallbackSubreddit;
                      const keywordsToSave: Array<Partial<Keyword>> =
                        importPreview.keywords?.length ? importPreview.keywords : fallbackKeyword;

                      const stillMissing = getImportMissingFields({
                        company: companyPayload as Company,
                        personas: personasToSave as Array<Partial<Persona>>,
                        subreddits: subredditsToSave as Array<Partial<Subreddit>>,
                        keywords: keywordsToSave as Array<Partial<Keyword>>,
                      });
                      if (stillMissing.length) {
                        setImportMissing(stillMissing);
                        setImportStatus(`Missing fields: ${stillMissing.join(', ')}`);
                        return;
                      }

                      const saved = await persistImportBundle(
                        {
                          company: companyPayload as Company,
                          personas: personasToSave,
                          subreddits: subredditsToSave,
                          keywords: keywordsToSave,
                          posts: importPreview.posts,
                          comments: importPreview.comments,
                        },
                        user.id
                      );

                      setActiveCompanyId(saved.id);
                      setCompanyDraft(saved);
                      await loadCompanyData(saved.id);
                      if (user?.id) {
                        await loadCompanies(user.id);
                      }
                      setImportStatus('Imported and saved to Supabase.');
                    } catch (err) {
                      const msg =
                        err instanceof Error
                          ? err.message
                          : typeof err === 'string'
                          ? err
                          : JSON.stringify(err);
                      setImportStatus(`Import failed: ${msg || 'Unknown error'}`);
                    }
                  }}
                  className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                >
                  Apply Import
                </button>
                <button
                  onClick={() => {
                    setImportPreview({});
                    setImportMissing([]);
                    setImportNotes({});
                    setImportWizard({});
                    setImportStatus(null);
                  }}
                  className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-sm text-slate-600 transition hover:bg-[#f5f5f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                >
                  Clear Import
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className={`${cardBase} space-y-4`}>
              <div>
                <p className={labelClass}>History</p>
                <h3 className={titleClass}>Generation history</h3>
              </div>
              {history.length === 0 && (
                <div className={subCard}>
                  <div className="text-sm text-slate-500 dark:text-white/60">No history yet.</div>
                </div>
              )}
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className={subCard}>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-white/70">
                      <div>
                        Week {h.weekNumber} • {new Date(h.generatedAt).toLocaleDateString()}
                      </div>
                      <div>{h.postsCount} posts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function getNextMonday(weekOffset: number = 0): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday + weekOffset * 7);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

function exportCSV(result: PlannerOutput | null) {
  if (!result) return;
  const rows = [
    ['type', 'post_id', 'subreddit', 'title', 'body', 'persona', 'scheduled_at', 'status', 'comment_id', 'comment_text'],
  ];

  for (const post of result.posts) {
    rows.push([
      'post',
      post.id,
      post.subredditName,
      post.title,
      post.body,
      post.personaUsername,
      post.scheduledAt.toISOString(),
      post.status,
      '',
      '',
    ]);
  }

  for (const comment of result.comments) {
    rows.push([
      'comment',
      comment.postId,
      '',
      '',
      '',
      comment.personaUsername,
      comment.scheduledAt.toISOString(),
      comment.status,
      comment.id,
      comment.content,
    ]);
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reddit-mastermind-export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function getWeekNumberFromDate(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function mergeImportPreview(
  prev: {
    company?: Company;
    personas?: Persona[];
    subreddits?: Subreddit[];
    keywords?: Keyword[];
    posts?: Post[];
    comments?: Comment[];
    extractedText?: string;
  },
  next: {
    company?: Company;
    personas?: Persona[];
    subreddits?: Subreddit[];
    keywords?: Keyword[];
    posts?: Post[];
    comments?: Comment[];
    extractedText?: string;
  }
) {
  return {
    company: next.company || prev.company,
    personas: next.personas?.length ? next.personas : prev.personas || [],
    subreddits: next.subreddits?.length ? next.subreddits : prev.subreddits || [],
    keywords: next.keywords?.length ? next.keywords : prev.keywords || [],
    posts: next.posts?.length ? next.posts : prev.posts || [],
    comments: next.comments?.length ? next.comments : prev.comments || [],
    extractedText: next.extractedText || prev.extractedText,
  };
}

function parseCompanyInfoCSV(text: string) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = (parsed.data || []).map((r) => r.map((c) => (c || '').trim()));
  const company: Partial<Company> = {};
  const personas: Persona[] = [];
  const subreddits: Subreddit[] = [];
  const keywords: Keyword[] = [];
  let personaMode = false;
  let keywordMode = false;

  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0];
    const value = row[1];
    if (!key) continue;

    if (key.toLowerCase() === 'keyword_id') {
      keywordMode = true;
      continue;
    }

    if (key.toLowerCase() === 'username' && value.toLowerCase().includes('info')) {
      personaMode = true;
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

    if (personaMode) {
      if (!key || !value) continue;
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
        (value.match(/r\/[A-Za-z0-9_]+/g) || value.split(/\n|,/))
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((name) => subreddits.push({ id: undefined as any, companyId: '', name, description: '' }));
        break;
      case 'keywords':
        value
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((kw) => keywords.push({ id: undefined as any, companyId: '', keyword: kw, category: '', priority: 0 }));
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

  const postMap = new Map(posts.map((p) => [p.id, p]));
  comments.forEach((comment) => {
    const post = postMap.get(comment.postId);
    if (post && !Number.isNaN(post.scheduledAt.getTime()) && !Number.isNaN(comment.scheduledAt.getTime())) {
      const diff = Math.max(0, Math.round((comment.scheduledAt.getTime() - post.scheduledAt.getTime()) / 60000));
      comment.delayMinutes = diff;
    }
  });

  return { posts, comments };
}
