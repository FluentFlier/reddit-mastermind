import { Company, Persona, Subreddit, Keyword } from '@/types';

// ============================================
// SLIDEFORGE SAMPLE DATA
// ============================================
// Based on the provided PDFs

export const sampleCompany: Company = {
  id: 'company_slideforge',
  name: 'Slideforge',
  description: 'Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks. Users can paste content, choose a style, and let the AI generate structured layouts, visuals, and narrative flow that are fully editable.',
  positioning: 'Fast, professional presentations without the design hassle',
  website: 'slideforge.ai',
  icpSegments: [
    {
      segment: 'Startup Operators',
      profile: 'Need investor updates, internal strategy decks, and cross-team docs that look polished without spending hours formatting',
      appeal: 'Slideforge creates structured narratives and clean layouts automatically, saving time and improving clarity',
    },
    {
      segment: 'Consultants / Agencies',
      profile: 'Produce client decks, research summaries, market maps, and proposals under tight deadlines',
      appeal: 'Fast, consistent visuals and reusable storytelling patterns that elevate client deliverables',
    },
    {
      segment: 'Sales Teams',
      profile: 'Need pitch decks tailored to different prospects, with branding and structure intact',
      appeal: 'Ensures consistency across reps while allowing quick personalization',
    },
    {
      segment: 'Educators / Students',
      profile: 'Create teaching materials, lecture slides, group project decks, and academic presentations',
      appeal: 'Helps skip the blank slide problem and generates clean, professional formatting',
    },
  ],
};

export const samplePersonas: Persona[] = [
  {
    id: 'persona_riley',
    companyId: 'company_slideforge',
    username: 'riley_ops',
    displayName: 'Riley Hart',
    bio: `I am Riley Hart, the head of operations at a SaaS startup that has grown faster than anyone expected. I grew up in a small town in Colorado with parents who believed that anything worth doing was worth doing well.

When I joined the company, I expected to focus on operations, hiring pipelines, process design. Instead, I became the unofficial owner of every deck that mattered. Board updates, sales narratives, internal strategy docs.

I still remember one night during our Series A sprint. It was 11pm, and I was sitting alone in the office kitchen with a stale protein bar, staring at a title slide that refused to center. When you are tired enough, those little design frustrations feel personal.

That was when I doubled down on my personal systems. I kept a Miro board inspired by old newspaper comic strips because they helped me think about narrative pacing. I ran every morning before work because movement clears my head better than coffee.

Now Slideforge sits alongside my other rituals. My color-coded folders. My morning runs. My comic-strip Miro board. It doesn't replace my brain. It frees it.`,
    voiceTraits: 'practical, slightly frustrated with tools, time-strapped, looking for solutions that actually work',
    expertise: ['operations', 'startups', 'presentations', 'productivity'],
    postingStyle: 'asks_questions',
    avatarColor: '#FF6B6B',
    accountAgeDays: 520,
    karma: 1450,
  },
  {
    id: 'persona_jordan',
    companyId: 'company_slideforge',
    username: 'jordan_consults',
    displayName: 'Jordan Brooks',
    bio: `I am Jordan Brooks, an independent consultant who works mostly with early stage founders trying to create order out of chaos. I grew up in a Black family in Maryland where storytelling was the glue that held everything together.

My weekdays are a mix of interviews, research, modeling, and long sessions of synthesis. Founders hire me not just for the thinking, but for the way I express the thinking. A strong slide can change the trajectory of a meeting.

There was one client who needed a full competitive landscape for a major investor roadshow. I had nailed the research. The insights were tight. But when I put everything into PowerPoint, the whole deck felt cluttered and hard to follow.

A designer friend mentioned Slideforge in passing one afternoon. I tried it with the same outline that had frustrated me for days. The draft it generated matched the logic in my head almost perfectly. Clean structure, clear hierarchy.

Now my workflow is this ecosystem of rituals. Notion for thinking. My cafe for clarity. My notebook for ideas. And Slideforge for when I need my work to finally look like my work.`,
    voiceTraits: 'professional, insightful, shares expertise freely, values clean communication',
    expertise: ['consulting', 'presentations', 'strategy', 'storytelling'],
    postingStyle: 'gives_answers',
    avatarColor: '#4ECDC4',
    accountAgeDays: 1180,
    karma: 3820,
  },
  {
    id: 'persona_emily',
    companyId: 'company_slideforge',
    username: 'emily_econ',
    displayName: 'Emily Chen',
    bio: `I am Emily Chen, a senior majoring in economics at a big state university where everyone is always overcommitted and under-rested. I grew up in a Taiwanese American family where school wasn't just important, it was everything.

The funny part is I never felt naturally gifted at design. I just couldn't stand seeing good research trapped inside ugly slides. So I became the person who stayed up too late tweaking fonts until the deck looked right.

Last semester was brutal. Three presentations in one week, a midterm on Friday, and my capstone group dumped a chaotic Google Doc on me with the confidence of people who had never opened PowerPoint.

A classmate suggested I try Slideforge. I pasted in our capstone summary, added a few notes about the argument, and watched the whole deck take shape. Clean. Balanced. Actually professional.

When we presented, the professor stopped mid-discussion to say the slides were unusually clear. Now Slideforge sits alongside my other rituals. My Google Doc outlines. My morning library sessions. My folder of charts.`,
    voiceTraits: 'relatable, student perspective, time-strapped, appreciates things that actually work',
    expertise: ['academics', 'presentations', 'productivity', 'economics'],
    postingStyle: 'balanced',
    avatarColor: '#45B7D1',
    accountAgeDays: 320,
    karma: 870,
  },
  {
    id: 'persona_alex',
    companyId: 'company_slideforge',
    username: 'alex_sells',
    displayName: 'Alex Ramirez',
    bio: `I am Alex Ramirez, the head of sales at a mid-market SaaS company. I grew up in a Colombian household where everyone talked fast and loud and believed in showing up looking sharp, even when life was messy.

Every quarter, we push into new verticals, which means we are constantly refreshing our pitch decks. Prospects judge everything in the first few slides. If something is off center or the story meanders, you've already lost.

During one of our biggest enterprise deals last quarter, the pressure was so high I started coming into the office early. I like working before the sun is up. It reminds me of the bakery my aunt ran when I was a kid.

I also built a habit of keeping a small "wins" folder on my desktop. Anytime a pitch landed, I saved the final deck so I could reuse the story arc later.

My breakthrough came when someone on the team shared Slideforge. I dropped our messy outline into it and got back a clean first draft in minutes. The AE said it was the first time he felt like he was presenting a story instead of defending one.`,
    voiceTraits: 'results-focused, practical, values efficiency, competitive but helpful',
    expertise: ['sales', 'presentations', 'pitching', 'business development'],
    postingStyle: 'gives_answers',
    avatarColor: '#96CEB4',
    accountAgeDays: 760,
    karma: 2210,
  },
  {
    id: 'persona_priya',
    companyId: 'company_slideforge',
    username: 'priya_pm',
    displayName: 'Priya Nandakumar',
    bio: `I am Priya Nandakumar, a product manager at a tech company where priorities shift quickly and stories matter more than anyone admits. I grew up in a South Indian family where the rhythm of the day was structured around rituals.

My work is a constant mix of writing specs, clarifying strategy, and translating between engineering, design, and leadership. Decks have become their own kind of artifact. They guide thinking. They anchor alignment.

There was one sprint where everything felt like it was sliding out of my hands. Leadership wanted a roadmap presentation with more clarity. Engineers wanted cleaner problem framing. Design needed better context.

Around that time, I started leaning on rituals that grounded me. I kept a Notion document of daily observations, something my grandmother used to call "small truths."

During one particularly chaotic review cycle, I was running out of time and someone from design mentioned Slideforge. I dropped in my messy notes and watched a coherent structure emerge. The next day, when I presented to our VP, people understood the dependencies faster.`,
    voiceTraits: 'structured thinker, detail-oriented, collaborative, values clarity',
    expertise: ['product management', 'presentations', 'strategy', 'cross-functional communication'],
    postingStyle: 'balanced',
    avatarColor: '#DDA0DD',
    accountAgeDays: 640,
    karma: 1930,
  },
];

export const sampleSubreddits: Subreddit[] = [
  {
    id: 'sub_powerpoint',
    companyId: 'company_slideforge',
    name: 'r/PowerPoint',
    description: 'Discussion about Microsoft PowerPoint and presentation design',
    bestTimes: ['morning', 'afternoon'],
    sensitivity: 'medium',
  },
  {
    id: 'sub_claudeai',
    companyId: 'company_slideforge',
    name: 'r/ClaudeAI',
    description: 'Discussion about Claude AI and its applications',
    bestTimes: ['afternoon', 'evening'],
    sensitivity: 'medium',
  },
  {
    id: 'sub_canva',
    companyId: 'company_slideforge',
    name: 'r/Canva',
    description: 'Discussion about Canva and design tools',
    bestTimes: ['afternoon', 'evening'],
    sensitivity: 'high',
  },
  {
    id: 'sub_startups',
    companyId: 'company_slideforge',
    name: 'r/startups',
    description: 'Startup discussions, advice, and resources',
    bestTimes: ['morning', 'afternoon'],
    sensitivity: 'high',
  },
  {
    id: 'sub_consulting',
    companyId: 'company_slideforge',
    name: 'r/consulting',
    description: 'Consulting industry discussions and career advice',
    bestTimes: ['morning', 'evening'],
    sensitivity: 'high',
  },
  {
    id: 'sub_productivity',
    companyId: 'company_slideforge',
    name: 'r/productivity',
    description: 'Tips and tools for improving productivity',
    bestTimes: ['morning', 'afternoon'],
    sensitivity: 'medium',
  },
  {
    id: 'sub_entrepreneur',
    companyId: 'company_slideforge',
    name: 'r/entrepreneur',
    description: 'Entrepreneurship discussions and advice',
    bestTimes: ['morning', 'afternoon'],
    sensitivity: 'high',
  },
];

export const sampleKeywords: Keyword[] = [
  {
    id: 'kw_1',
    companyId: 'company_slideforge',
    keyword: 'best ai presentation maker',
    category: 'discovery',
    priority: 5,
  },
  {
    id: 'kw_2',
    companyId: 'company_slideforge',
    keyword: 'ai slide deck tool',
    category: 'discovery',
    priority: 4,
  },
  {
    id: 'kw_3',
    companyId: 'company_slideforge',
    keyword: 'pitch deck generator',
    category: 'use-case',
    priority: 4,
  },
  {
    id: 'kw_4',
    companyId: 'company_slideforge',
    keyword: 'alternatives to PowerPoint',
    category: 'comparison',
    priority: 3,
  },
  {
    id: 'kw_5',
    companyId: 'company_slideforge',
    keyword: 'how to make slides faster',
    category: 'problem',
    priority: 4,
  },
  {
    id: 'kw_6',
    companyId: 'company_slideforge',
    keyword: 'design help for slides',
    category: 'problem',
    priority: 3,
  },
  {
    id: 'kw_7',
    companyId: 'company_slideforge',
    keyword: 'Canva alternative for presentations',
    category: 'comparison',
    priority: 3,
  },
  {
    id: 'kw_8',
    companyId: 'company_slideforge',
    keyword: 'Claude vs Slideforge',
    category: 'comparison',
    priority: 2,
  },
  {
    id: 'kw_9',
    companyId: 'company_slideforge',
    keyword: 'best tool for business decks',
    category: 'discovery',
    priority: 4,
  },
  {
    id: 'kw_10',
    companyId: 'company_slideforge',
    keyword: 'automate my presentations',
    category: 'problem',
    priority: 5,
  },
  {
    id: 'kw_11',
    companyId: 'company_slideforge',
    keyword: 'need help with pitch deck',
    category: 'problem',
    priority: 4,
  },
  {
    id: 'kw_12',
    companyId: 'company_slideforge',
    keyword: 'tools for consultants',
    category: 'audience',
    priority: 3,
  },
  {
    id: 'kw_13',
    companyId: 'company_slideforge',
    keyword: 'tools for startups',
    category: 'audience',
    priority: 3,
  },
  {
    id: 'kw_14',
    companyId: 'company_slideforge',
    keyword: 'best ai design tool',
    category: 'discovery',
    priority: 3,
  },
  {
    id: 'kw_15',
    companyId: 'company_slideforge',
    keyword: 'Google Slides alternative',
    category: 'comparison',
    priority: 3,
  },
  {
    id: 'kw_16',
    companyId: 'company_slideforge',
    keyword: 'best storytelling tool',
    category: 'discovery',
    priority: 2,
  },
];

// ============================================
// HELPER FUNCTION
// ============================================

export function getSampleData() {
  return {
    company: sampleCompany,
    personas: samplePersonas,
    subreddits: sampleSubreddits,
    keywords: sampleKeywords,
  };
}

// Export as SAMPLE_DATA for convenience
export const SAMPLE_DATA = {
  company: sampleCompany,
  personas: samplePersonas,
  subreddits: sampleSubreddits,
  keywords: sampleKeywords,
};
