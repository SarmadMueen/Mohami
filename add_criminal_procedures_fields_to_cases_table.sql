-- SQL script to add criminal procedures law article fields to the cases table
-- This allows linking criminal cases (الجزائية) with articles from the criminal procedures law (قانون أصول المحاكمات الجزائية)

-- Add criminal procedures law article reference fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS criminal_procedures_article_id UUID,                    -- ID of the article from criminal_procedures_law table
ADD COLUMN IF NOT EXISTS criminal_procedures_article_number TEXT;                 -- Article number for quick reference

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.criminal_procedures_article_id IS 'معرف المادة من قانون أصول المحاكمات الجزائية في جدول criminal_procedures_law';
COMMENT ON COLUMN cases.criminal_procedures_article_number IS 'رقم المادة من قانون أصول المحاكمات الجزائية للرجوع السريع';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_criminal_procedures_article_id ON cases(criminal_procedures_article_id);
CREATE INDEX IF NOT EXISTS idx_cases_criminal_procedures_article_number ON cases(criminal_procedures_article_number);

-- Optional: Add foreign key constraint if you want referential integrity
-- ALTER TABLE cases 
-- ADD CONSTRAINT fk_cases_criminal_procedures_article 
-- FOREIGN KEY (criminal_procedures_article_id) 
-- REFERENCES criminal_procedures_law(id) 
-- ON DELETE SET NULL;






