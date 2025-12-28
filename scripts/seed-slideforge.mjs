import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf-8');
  raw.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const company = {
  name: 'Slideforge',
  description:
    'Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks.',
  positioning: 'Fast, professional presentations without the design hassle',
  website: 'slideforge.ai',
  icp_segments: [
    {
      segment: 'Startup Operators',
      profile:
        'Need investor updates, internal strategy decks, and cross-team docs that look polished without spending hours formatting',
      appeal:
        'Slideforge creates structured narratives and clean layouts automatically, saving time and improving clarity',
    },
    {
      segment: 'Consultants / Agencies',
      profile:
        'Produce client decks, research summaries, market maps, and proposals under tight deadlines',
      appeal:
        'Fast, consistent visuals and reusable storytelling patterns that elevate client deliverables',
    },
  ],
};

const personas = [
  {
    username: 'riley_ops',
    display_name: 'Riley Hart',
    bio: 'Ops lead at a SaaS startup; makes every deck; hates design friction.',
    voice_traits: 'practical, time-strapped, seeking real solutions',
    expertise: ['operations', 'startups', 'presentations', 'productivity'],
    posting_style: 'asks_questions',
    avatar_color: '#FF6B6B',
  },
  {
    username: 'jordan_consults',
    display_name: 'Jordan Brooks',
    bio: 'Independent consultant helping founders tell clear stories.',
    voice_traits: 'professional, insightful, helpful',
    expertise: ['consulting', 'presentations', 'strategy', 'storytelling'],
    posting_style: 'gives_answers',
    avatar_color: '#4ECDC4',
  },
  {
    username: 'emily_econ',
    display_name: 'Emily Chen',
    bio: 'Economics senior who hates ugly slides.',
    voice_traits: 'relatable, student perspective',
    expertise: ['academics', 'presentations', 'productivity', 'economics'],
    posting_style: 'balanced',
    avatar_color: '#45B7D1',
  },
];

const subreddits = [
  {
    name: 'r/PowerPoint',
    description: 'Discussion about Microsoft PowerPoint and presentation design',
  },
  { name: 'r/ClaudeAI', description: 'Discussion about Claude AI and its applications' },
  { name: 'r/Canva', description: 'Discussion about Canva and design tools' },
  { name: 'r/startups', description: 'Startup discussions, advice, and resources' },
  { name: 'r/consulting', description: 'Consulting industry discussions and career advice' },
  { name: 'r/productivity', description: 'Tips and tools for improving productivity' },
];

const keywords = [
  { keyword: 'best ai presentation maker', category: 'discovery', priority: 5 },
  { keyword: 'ai slide deck tool', category: 'discovery', priority: 4 },
  { keyword: 'pitch deck generator', category: 'use-case', priority: 4 },
  { keyword: 'alternatives to PowerPoint', category: 'comparison', priority: 3 },
  { keyword: 'how to make slides faster', category: 'problem', priority: 4 },
  { keyword: 'Canva alternative for presentations', category: 'comparison', priority: 3 },
];

async function run() {
  const { data: companyRow, error: companyError } = await supabase
    .from('companies')
    .insert(company)
    .select('*')
    .single();

  if (companyError) {
    console.error('Company insert failed', companyError);
    process.exit(1);
  }

  const companyId = companyRow.id;

  const personasPayload = personas.map((p) => ({ ...p, company_id: companyId }));
  const subredditsPayload = subreddits.map((s) => ({ ...s, company_id: companyId }));
  const keywordsPayload = keywords.map((k) => ({ ...k, company_id: companyId }));

  const { error: personaError } = await supabase
    .from('personas')
    .insert(personasPayload);
  if (personaError) console.error('Personas insert failed', personaError);

  const { error: subError } = await supabase
    .from('subreddits')
    .insert(subredditsPayload);
  if (subError) console.error('Subreddits insert failed', subError);

  const { error: kwError } = await supabase
    .from('keywords')
    .insert(keywordsPayload);
  if (kwError) console.error('Keywords insert failed', kwError);

  console.log('Seed complete', { companyId });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
