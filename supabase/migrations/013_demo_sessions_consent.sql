-- Migration: 013_demo_sessions_consent
-- Tracks when a parent/guardian gave consent for demo data collection.

ALTER TABLE public.demo_sessions
  ADD COLUMN IF NOT EXISTS consented_at timestamptz;
