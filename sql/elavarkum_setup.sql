-- SQL Setup for Elavarkum AI
-- To be run in the same Supabase project as Frame Forge

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.elavarkum_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    name TEXT,
    photo_url TEXT,
    generated_image_url TEXT,
    otp_code TEXT,
    otp_expires_at TIMESTAMPTZ,
    tries_left INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, generated
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Enable RLS
ALTER TABLE public.elavarkum_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Service role full access" ON public.elavarkum_requests;
DROP POLICY IF EXISTS "Public full access" ON public.elavarkum_requests;

-- 3. Allow service role full access
CREATE POLICY "Service role full access" ON public.elavarkum_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Allow public access for OTP request and verification (Elavarkum AI specific)
CREATE POLICY "Public full access" ON public.elavarkum_requests
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Create a unique index on email to handle "one user, one record" logic if desired, 
-- but since they can try again, maybe we just want to track by email.
-- Actually, the user says "when user enters and try again to enter it should be possible too".
-- And "user can get max of 3 tries".
-- So we should probably keep track of tries_left per email.

CREATE INDEX IF NOT EXISTS idx_elavarkum_email ON public.elavarkum_requests (email);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_elavarkum_updated_at
BEFORE UPDATE ON public.elavarkum_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
