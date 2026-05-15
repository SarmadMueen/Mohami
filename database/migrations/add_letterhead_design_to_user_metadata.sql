-- Migration: Add letterhead_design column to user_metadata table
-- This column stores letterhead design configuration as JSONB for template printing

-- Add letterhead_design column to user_metadata table
ALTER TABLE public.user_metadata
ADD COLUMN IF NOT EXISTS letterhead_design JSONB;

-- Add comment to column
COMMENT ON COLUMN public.user_metadata.letterhead_design IS 'Stores letterhead design configuration including layout, colors, fonts, and content for template printing';

-- Create index for faster queries on JSONB column
CREATE INDEX IF NOT EXISTS idx_user_metadata_letterhead_design 
ON public.user_metadata USING GIN (letterhead_design);


