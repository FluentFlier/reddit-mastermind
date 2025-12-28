-- ============================================
-- REDDIT MASTERMIND DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_external_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  positioning TEXT,
  website TEXT,
  icp_segments JSONB,
  constraints JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERSONAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  bio TEXT NOT NULL,
  voice_traits TEXT,
  expertise TEXT[],
  posting_style TEXT CHECK (posting_style IN ('asks_questions', 'gives_answers', 'balanced')),
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personas_company ON personas(company_id);

-- ============================================
-- SUBREDDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subreddits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB,
  best_times TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subreddits_company ON subreddits(company_id);

-- ============================================
-- KEYWORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_keywords_company ON keywords(company_id);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  subreddit_id UUID REFERENCES subreddits(id),
  subreddit_name TEXT NOT NULL,
  persona_id UUID REFERENCES personas(id),
  persona_username TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  keyword_ids TEXT[],
  thread_type TEXT CHECK (thread_type IN ('question', 'advice', 'story', 'discussion')),
  quality_score DECIMAL(3,1),
  quality_breakdown JSONB,
  quality_issues JSONB,
  quality_warnings JSONB,
  review_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'posted', 'failed')),
  reddit_post_id TEXT,
  reddit_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_company_week ON posts(company_id, week_number);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX idx_posts_status ON posts(status);

CREATE INDEX idx_companies_external_user ON companies(user_external_id);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id TEXT REFERENCES comments(id),
  persona_id UUID REFERENCES personas(id),
  persona_username TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  delay_minutes INT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'posted', 'failed')),
  reddit_comment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_scheduled ON comments(scheduled_at);

-- ============================================
-- CALENDAR HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  quality_report JSONB,
  posts_count INT,
  comments_count INT,
  topics_used TEXT[],
  subreddits_used JSONB,
  personas_used JSONB,
  performance_data JSONB
);

CREATE INDEX idx_history_company_week ON calendar_history(company_id, week_number DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================
-- Uncomment if you want to enable RLS

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_history ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (enable after tables have data and you want multi-user isolation)
-- CREATE POLICY "companies: user owns" ON companies
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "personas: user owns via company" ON personas
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = personas.company_id AND c.user_id = auth.uid())
--   ) WITH CHECK (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = personas.company_id AND c.user_id = auth.uid())
--   );
--
-- CREATE POLICY "subreddits: user owns via company" ON subreddits
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = subreddits.company_id AND c.user_id = auth.uid())
--   ) WITH CHECK (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = subreddits.company_id AND c.user_id = auth.uid())
--   );
--
-- CREATE POLICY "keywords: user owns via company" ON keywords
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = keywords.company_id AND c.user_id = auth.uid())
--   ) WITH CHECK (
--     EXISTS (SELECT 1 FROM companies c WHERE c.id = keywords.company_id AND c.user_id = auth.uid())
--   );

-- ============================================
-- SAMPLE DATA (SlideForge Example)
-- ============================================
-- Uncomment to insert sample data

/*
-- Insert company
INSERT INTO companies (id, name, description, website) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Slideforge',
  'Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks.',
  'slideforge.ai'
);

-- Insert personas
INSERT INTO personas (company_id, username, bio, voice_traits, expertise, posting_style) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'riley_ops',
  'I am Riley Hart, the head of operations at a SaaS startup. I grew up in a small town in Colorado. I became the unofficial owner of every deck that mattered - board updates, sales narratives, internal strategies.',
  'practical, slightly frustrated with tools, looking for solutions',
  ARRAY['operations', 'startups', 'presentations'],
  'asks_questions'
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'jordan_consults',
  'I am Jordan Brooks, an independent consultant who works mostly with early stage founders. I grew up in a Black family in Maryland where storytelling was the glue that held everything together.',
  'professional, insightful, shares expertise freely',
  ARRAY['consulting', 'presentations', 'strategy'],
  'gives_answers'
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'emily_econ',
  'I am Emily Chen, a senior majoring in economics at a big state university. I grew up in a Taiwanese American family where school was everything.',
  'relatable, student perspective, time-strapped',
  ARRAY['academics', 'presentations', 'productivity'],
  'balanced'
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'alex_sells',
  'I am Alex Ramirez, the head of sales at a mid-market SaaS company. I grew up in a Colombian household where everyone talked fast and believed in showing up looking sharp.',
  'results-focused, practical, values efficiency',
  ARRAY['sales', 'presentations', 'pitching'],
  'gives_answers'
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'priya_pm',
  'I am Priya Nandakumar, a product manager at a tech company where priorities shift quickly. I grew up in a South Indian family where the rhythm of the day was structured around rituals.',
  'structured thinker, detail-oriented, collaborative',
  ARRAY['product management', 'presentations', 'strategy'],
  'balanced'
);

-- Insert subreddits
INSERT INTO subreddits (company_id, name, description) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'r/PowerPoint', 'Discussion about PowerPoint and presentations'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'r/ClaudeAI', 'Discussion about Claude AI'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'r/Canva', 'Discussion about Canva'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'r/startups', 'Startup discussions'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'r/consulting', 'Consulting industry discussions');

-- Insert keywords
INSERT INTO keywords (company_id, keyword, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'best ai presentation maker', 'discovery'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ai slide deck tool', 'discovery'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'pitch deck generator', 'use-case'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'alternatives to PowerPoint', 'comparison'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'how to make slides faster', 'problem'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Canva alternative for presentations', 'comparison'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Claude vs Slideforge', 'comparison'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'automate my presentations', 'problem');
*/
