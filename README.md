# Reddit Mastermind 🧠

An AI-powered Reddit content calendar planner that generates authentic multi-persona conversations to drive organic visibility.

![Reddit Mastermind](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)

## 🎯 What It Does

Reddit Mastermind takes your company info, personas, target subreddits, and keywords, then generates a complete weekly content calendar with:

- **Scheduled Posts** - Distributed across the week with optimal timing
- **Simulated Conversations** - Multiple personas interacting naturally
- **Quality Scoring** - Each thread is evaluated for authenticity
- **Constraint Enforcement** - No overposting, no suspicious patterns

## 📸 Sample Output

Based on the SlideForge example:

| Day | Subreddit | Post | OP | Commenters |
|-----|-----------|------|-----|------------|
| Mon | r/PowerPoint | "Best AI Presentation Maker?" | riley_ops | jordan_consults, emily_econ |
| Wed | r/ClaudeAI | "Slideforge VS Claude for slides?" | riley_ops | jordan_consults, alex_sells, priya_pm |
| Thu | r/Canva | "Slideforge vs Canva for slides?" | riley_ops | jordan_consults, emily_econ, alex_sells |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANNING ALGORITHM                            │
├─────────────────────────────────────────────────────────────────┤
│  1. SLOT ALLOCATION     → Distribute posts across the week      │
│  2. SUBREDDIT MATCHING  → Match keywords to subreddits          │
│  3. PERSONA ASSIGNMENT  → Assign OPs and commenters             │
│  4. THREAD GENERATION   → AI-powered content creation           │
│  5. QUALITY ASSURANCE   → Validate and score everything         │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- LLM API key (Cerebras or Gemini; optional when using mock mode)
- Supabase account (optional - works without database)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/reddit-mastermind.git
cd reddit-mastermind

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```

### Environment Variables

```env
# LLM provider
LLM_PROVIDER=cerebras

# Cerebras (OpenAI-compatible)
CEREBRAS_API_KEY=your_cerebras_api_key
CEREBRAS_MODEL=llama-3.3-70b

# Gemini (optional)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Optional: Supabase for persistence
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Enable mock mode (no API calls)
MOCK_AI=true
```

## ✅ Production Deploy Checklist

1. **Do not commit** `.env.local` or any secrets.
2. Configure production environment variables in your host (Vercel/Render/etc.):
   - `LLM_PROVIDER`
   - `CEREBRAS_API_KEY` (if using Cerebras)
   - `CEREBRAS_MODEL`
   - `GEMINI_API_KEY` (if using Gemini)
   - `GEMINI_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Run database migrations in Supabase (`supabase/schema.sql`).
4. Optional: enable RLS + policies before going live.

## 📁 Project Structure

```
reddit-mastermind/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main dashboard
│   │   ├── calendar/           # Calendar view
│   │   └── api/
│   │       └── generate/       # Generation endpoint
│   │
│   ├── lib/
│   │   ├── planner/            # 🧠 CORE ALGORITHM
│   │   │   ├── index.ts        # Main orchestrator
│   │   │   ├── slotAllocator.ts
│   │   │   ├── subredditMatcher.ts
│   │   │   ├── personaAssigner.ts
│   │   │   ├── threadGenerator.ts
│   │   │   ├── qualityChecker.ts
│   │   │   └── constraints.ts
│   │   │
│   │   ├── ai/                 # OpenAI integration
│   │   │   ├── openai.ts
│   │   │   └── prompts.ts
│   │   │
│   │   ├── supabase/           # Database
│   │   └── utils/              # Utilities
│   │
│   ├── components/             # React components
│   ├── types/                  # TypeScript types
│   └── tests/                  # Unit tests
│
└── supabase/
    └── schema.sql              # Database schema
```

## 🔧 Core Algorithm

### Constraint Rules

The planner enforces these rules to ensure natural-looking content:

| Constraint | Default | Purpose |
|------------|---------|---------|
| Max posts per subreddit/week | 2 | Prevent overposting |
| Max posts per persona/week | 2 | Distribute authorship |
| Max personas per thread | 3 | Avoid obvious coordination |
| Min delay before first comment | 15 min | Look organic |
| No repeated pairings/week | ✓ | Prevent pattern detection |

### Thread Types

The system determines thread type based on keywords:

- **Question** - "Best...", "How to...", "What is..."
- **Advice** - "Help with...", "Tips for...", "Recommend..."
- **Story** - "Just discovered...", "My experience with..."
- **Discussion** - "What do you think about...", "Thoughts on..."

### Quality Scoring

Each thread is scored 0-10 based on:

- **Naturalness** - Content length and style
- **Engagement** - Comment count and variety
- **Subtlety** - Promotional content detection
- **Timing** - Realistic comment delays

## 📊 API Reference

### POST /api/generate

Generate a weekly content calendar.

**Request:**
```json
{
  "company": {
    "id": "company-123",
    "name": "Slideforge",
    "description": "AI presentation tool..."
  },
  "personas": [...],
  "subreddits": [...],
  "keywords": [...],
  "postsPerWeek": 3,
  "weekStartDate": "2024-01-08T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "comments": [...],
    "qualityReport": {
      "overallScore": 8.5,
      "issues": [],
      "warnings": [],
      "suggestions": []
    },
    "weekNumber": 2,
    "generatedAt": "2024-01-05T12:00:00Z"
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Categories

- **Slot Allocation** - Verifies time distribution
- **Subreddit Matching** - Verifies keyword-to-subreddit logic
- **Persona Assignment** - Verifies constraint enforcement
- **Quality Checking** - Verifies issue detection

## 🗄 Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema file in SQL Editor:

```sql
-- Run supabase/schema.sql in Supabase SQL Editor
```

3. Add your Supabase credentials to `.env.local`

## 🎨 Customization

### Adding New Constraints

Edit `src/lib/planner/constraints.ts`:

```typescript
export const DEFAULT_CONSTRAINTS: PlannerConstraints = {
  maxPostsPerSubredditPerWeek: 2,  // Change this
  // ... other constraints
};
```

### Custom Subreddit Rules

```typescript
export const SUBREDDIT_PRESETS: Record<string, Partial<PlannerConstraints>> = {
  'r/consulting': {
    maxPostsPerSubredditPerWeek: 1,  // More strict
    maxPromoScoreAllowed: 4,
  },
};
```

### Custom Prompts

Edit `src/lib/ai/prompts.ts` to customize how content is generated.

## 🚨 Important Considerations

### Ethical Guidelines

- This tool is for **content planning**, not automated posting
- Always have humans review content before publishing
- Respect subreddit rules and community norms
- Consider disclosure when appropriate

### Rate Limits

- OpenAI: Respects API rate limits
- Reddit API: Not included (this is a planner only)
- Supabase: Standard free tier limits apply

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

Built with ❤️ for the Reddit marketing community
