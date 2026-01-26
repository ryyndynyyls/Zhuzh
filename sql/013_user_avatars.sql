-- Migration: Add avatar support to users table
-- Run this in Supabase SQL Editor

-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars (run in Supabase dashboard or via API)
-- Note: This needs to be done via Supabase dashboard:
-- 1. Go to Storage
-- 2. Create new bucket called "avatars"
-- 3. Make it public (for easy access)
-- 4. Set allowed MIME types: image/jpeg, image/png, image/webp, image/avif

-- Add comment
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image stored in Supabase Storage';
