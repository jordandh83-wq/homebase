-- Run this ONLY if you already deployed homebase-api before subjects existed.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

INSERT OR IGNORE INTO subjects (id, name, color) VALUES
  ('maths',      'Maths',       '#3b82f6'),
  ('science',    'Science',     '#22c55e'),
  ('english',    'English',     '#a78bfa'),
  ('hpe',        'Health & PE', '#f97316'),
  ('humanities', 'Humanities',  '#eab308'),
  ('other',      'Other',       '#64748b');

ALTER TABLE assignments ADD COLUMN subject_id TEXT;
