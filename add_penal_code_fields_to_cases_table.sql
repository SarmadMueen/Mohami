-- SQL script to add penal code article fields to the cases table
-- This allows linking criminal cases (الجزائية) with articles from the penal code (قانون العقوبات)

-- Add penal code article reference fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS penal_code_article_id UUID,                    -- ID of the article from legal_codes table
ADD COLUMN IF NOT EXISTS penal_code_article_number TEXT;                 -- Article number for quick reference

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.penal_code_article_id IS 'معرف المادة من قانون العقوبات في جدول legal_codes';
COMMENT ON COLUMN cases.penal_code_article_number IS 'رقم المادة من قانون العقوبات للرجوع السريع';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_penal_code_article_id ON cases(penal_code_article_id);
CREATE INDEX IF NOT EXISTS idx_cases_penal_code_article_number ON cases(penal_code_article_number);

-- Optional: Add foreign key constraint if you want referential integrity
-- ALTER TABLE cases 
-- ADD CONSTRAINT fk_cases_penal_code_article 
-- FOREIGN KEY (penal_code_article_id) 
-- REFERENCES legal_codes(id) 
-- ON DELETE SET NULL;






