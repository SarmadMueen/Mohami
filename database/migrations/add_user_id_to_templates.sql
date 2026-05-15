-- Add ownership tracking to templates table for lawyer-uploaded templates
-- This migration allows lawyers to upload their own templates while maintaining
-- separation from admin templates

-- Add user_id column to track which lawyer uploaded the template
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add column to distinguish admin-uploaded vs lawyer-uploaded templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_admin_uploaded BOOLEAN DEFAULT true;

-- Add column to store OCR-extracted text from PDF/images
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ocr_extracted_text TEXT;

-- Add column to track file type (docx, pdf, image)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS file_type VARCHAR(20);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- Create index for filtering by admin/lawyer templates
CREATE INDEX IF NOT EXISTS idx_templates_is_admin_uploaded ON templates(is_admin_uploaded);

-- Create index for file type filtering
CREATE INDEX IF NOT EXISTS idx_templates_file_type ON templates(file_type);

-- Update existing templates to be marked as admin-uploaded
UPDATE templates SET is_admin_uploaded = true WHERE is_admin_uploaded IS NULL;
