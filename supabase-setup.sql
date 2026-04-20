-- ==================================================
-- SUPABASE SETUP FOR EMAIL OTP IMAGE GENERATION FLOW
-- ==================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Storage bucket for uploaded photos and generated images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Main request table used by the backend APIs.
CREATE TABLE IF NOT EXISTS public.image_generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  otp_code_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  organization TEXT,
  gender TEXT NOT NULL DEFAULT 'neutral',
  prompt_used TEXT,
  photo_url TEXT,
  generated_image_url TEXT,
  final_image_url TEXT,
  generation_status TEXT NOT NULL DEFAULT 'otp_pending',
  last_error TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_generation_requests_created_at
  ON public.image_generation_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_generation_requests_status
  ON public.image_generation_requests (generation_status);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_image_generation_requests_updated_at ON public.image_generation_requests;
CREATE TRIGGER trg_image_generation_requests_updated_at
BEFORE UPDATE ON public.image_generation_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.image_generation_requests ENABLE ROW LEVEL SECURITY;

-- The backend should use SUPABASE_SERVICE_ROLE_KEY, so no public policies are required.

-- ==================================================
-- ENVIRONMENT VARIABLES
-- ==================================================
-- SUPABASE_URL=...
-- SUPABASE_ANON_KEY=...
-- SUPABASE_SERVICE_ROLE_KEY=...
-- OTP_SECRET=any-long-random-string
-- OPENROUTER_API_KEY=...
