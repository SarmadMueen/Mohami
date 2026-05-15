-- SQL script to add personal status law article fields to the cases table
-- This allows linking sharia cases (الشرعية) with articles from the personal status law (قانون الأحوال الشخصية)

-- Add personal status law article reference fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS personal_status_article_id UUID,                    -- ID of the article from personal_status_law table
ADD COLUMN IF NOT EXISTS personal_status_article_number TEXT;                 -- Article number for quick reference

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.personal_status_article_id IS 'معرف المادة من قانون الأحوال الشخصية في جدول personal_status_law';
COMMENT ON COLUMN cases.personal_status_article_number IS 'رقم المادة من قانون الأحوال الشخصية للرجوع السريع';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_personal_status_article_id ON cases(personal_status_article_id);
CREATE INDEX IF NOT EXISTS idx_cases_personal_status_article_number ON cases(personal_status_article_number);

-- Optional: Add foreign key constraint if you want referential integrity
-- ALTER TABLE cases 
-- ADD CONSTRAINT fk_cases_personal_status_article 
-- FOREIGN KEY (personal_status_article_id) 
-- REFERENCES personal_status_law(id) 
-- ON DELETE SET NULL;






