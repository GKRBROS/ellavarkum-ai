-- ============================================
-- SUPABASE SETUP FOR AI IMAGE GENERATOR
-- ============================================

-- Optional extension used by gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Storage Bucket for Generated Images
-- Run this in Supabase Dashboard > Storage > Create Bucket
-- OR use the Supabase Dashboard UI to create a bucket named 'generated-images'
-- Make sure to set it as PUBLIC so images can be accessed via URL

-- If using SQL, you can create the bucket policy:
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Policy (Allow public read access)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- 3. Allow authenticated uploads (if you add auth later)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'generated-images' );

-- ============================================
-- 4. Create Table for Storing Generation Metadata
-- ============================================
CREATE TABLE IF NOT EXISTS public.a4_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  image_url TEXT NOT NULL,
  output_format TEXT NOT NULL DEFAULT 'A4',
  output_width INTEGER NOT NULL DEFAULT 2480,
  output_height INTEGER NOT NULL DEFAULT 3508,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.a4_generations ENABLE ROW LEVEL SECURITY;

-- 6. Create Policy for Public Read Access
DROP POLICY IF EXISTS "Allow public read access" ON public.a4_generations;
CREATE POLICY "Allow public read access"
ON public.a4_generations FOR SELECT
USING (true);

-- 7. Create Policy for Insert (Allow anyone to insert for now)
DROP POLICY IF EXISTS "Allow public insert" ON public.a4_generations;
CREATE POLICY "Allow public insert"
ON public.a4_generations FOR INSERT
WITH CHECK (true);

-- ============================================
-- INDEXES for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_a4_generations_created_at ON public.a4_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a4_generations_name ON public.a4_generations(name);

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. Copy your Supabase URL and ANON KEY from Supabase Dashboard > Settings > API
-- 2. Add them to your .env.local file
-- 3. Install Supabase client: npm install @supabase/supabase-js
