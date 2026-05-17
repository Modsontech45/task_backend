-- Daily Tracker App — Database Schema (multi-user)

-- Drop in reverse dependency order for clean rebuilds
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS revisions CASCADE;
DROP TABLE IF EXISTS activity_blocks CASCADE;
DROP TABLE IF EXISTS bilingual_progress CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS schedule_templates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule templates: user_id NULL = default templates (copied for new users)
CREATE TABLE schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  category VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  is_fixed BOOLEAN DEFAULT FALSE,
  sort_order SMALLINT DEFAULT 0
);

CREATE INDEX idx_schedule_templates_user ON schedule_templates(user_id);

-- Activity blocks (per user per day)
CREATE TABLE activity_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  actual_start TIME,
  actual_end TIME,
  status VARCHAR(20) DEFAULT 'pending',
  note TEXT,
  energy_after SMALLINT CHECK (energy_after BETWEEN 1 AND 10),
  template_id UUID REFERENCES schedule_templates(id),
  is_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_blocks_user_date ON activity_blocks(user_id, date);
CREATE INDEX idx_activity_blocks_user_category_date ON activity_blocks(user_id, category, date);
CREATE UNIQUE INDEX idx_activity_blocks_user_date_template
  ON activity_blocks(user_id, date, template_id) WHERE template_id IS NOT NULL;

-- Bilingual progress (unique per user per day)
CREATE TABLE bilingual_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vocabulary_score SMALLINT CHECK (vocabulary_score BETWEEN 1 AND 10),
  speaking_score SMALLINT CHECK (speaking_score BETWEEN 1 AND 10),
  listening_score SMALLINT CHECK (listening_score BETWEEN 1 AND 10),
  words_learned INTEGER DEFAULT 0,
  minutes_practiced INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Streaks (unique per user per category)
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Revisions (scoped to user via activity_blocks FK)
CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_block_id UUID REFERENCES activity_blocks(id) ON DELETE CASCADE,
  course_name VARCHAR(200) NOT NULL,
  course_date DATE NOT NULL,
  revised_on DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min INTEGER DEFAULT 30,
  understanding_score SMALLINT CHECK (understanding_score BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revisions_course_date ON revisions(course_date DESC);
CREATE INDEX idx_revisions_block ON revisions(activity_block_id);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
