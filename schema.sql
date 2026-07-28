CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  due TEXT NOT NULL,
  notes TEXT DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL
);

-- Seed the default family members (safe to edit/delete afterwards from the site itself)
INSERT OR IGNORE INTO people (id, name, color) VALUES
  ('jordan', 'Jordan', '#34d399'),
  ('julia',  'Julia',  '#a78bfa'),
  ('abi',    'Abi',    '#f59e0b'),
  ('liv',    'Liv',    '#fb7185'),
  ('flynn',  'Flynn',  '#60a5fa'),
  ('lewis',  'Lewis',  '#f472b6');

-- Seed default subjects (colour-code the flightpath)
INSERT OR IGNORE INTO subjects (id, name, color) VALUES
  ('maths',      'Maths',       '#3b82f6'),
  ('science',    'Science',     '#22c55e'),
  ('english',    'English',     '#a78bfa'),
  ('hpe',        'Health & PE', '#f97316'),
  ('humanities', 'Humanities',  '#eab308'),
  ('other',      'Other',       '#64748b');
