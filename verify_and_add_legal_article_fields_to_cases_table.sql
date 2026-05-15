-- SQL script to verify and add legal article fields to the cases table
-- This script checks if fields exist and adds them if they don't
-- Fields for: قانون العقوبات (Penal Code) and قانون أصول المحاكمات الجزائية (Criminal Procedures Law)

-- ============================================
-- 1. Fields for قانون العقوبات (Penal Code)
-- ============================================

-- Check and add penal_code_article_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'penal_code_article_id'
    ) THEN
        ALTER TABLE cases 
        ADD COLUMN penal_code_article_id UUID;
        
        COMMENT ON COLUMN cases.penal_code_article_id IS 'معرف المادة من قانون العقوبات في جدول legal_codes';
        
        CREATE INDEX idx_cases_penal_code_article_id ON cases(penal_code_article_id);
        
        RAISE NOTICE 'Added column: penal_code_article_id';
    ELSE
        RAISE NOTICE 'Column already exists: penal_code_article_id';
    END IF;
END $$;

-- Check and add penal_code_article_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'penal_code_article_number'
    ) THEN
        ALTER TABLE cases 
        ADD COLUMN penal_code_article_number TEXT;
        
        COMMENT ON COLUMN cases.penal_code_article_number IS 'رقم المادة من قانون العقوبات للرجوع السريع';
        
        CREATE INDEX idx_cases_penal_code_article_number ON cases(penal_code_article_number);
        
        RAISE NOTICE 'Added column: penal_code_article_number';
    ELSE
        RAISE NOTICE 'Column already exists: penal_code_article_number';
    END IF;
END $$;

-- ============================================
-- 2. Fields for قانون أصول المحاكمات الجزائية (Criminal Procedures Law)
-- ============================================

-- Check and add criminal_procedures_article_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'criminal_procedures_article_id'
    ) THEN
        ALTER TABLE cases 
        ADD COLUMN criminal_procedures_article_id UUID;
        
        COMMENT ON COLUMN cases.criminal_procedures_article_id IS 'معرف المادة من قانون أصول المحاكمات الجزائية في جدول criminal_procedures_law';
        
        CREATE INDEX idx_cases_criminal_procedures_article_id ON cases(criminal_procedures_article_id);
        
        RAISE NOTICE 'Added column: criminal_procedures_article_id';
    ELSE
        RAISE NOTICE 'Column already exists: criminal_procedures_article_id';
    END IF;
END $$;

-- Check and add criminal_procedures_article_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'criminal_procedures_article_number'
    ) THEN
        ALTER TABLE cases 
        ADD COLUMN criminal_procedures_article_number TEXT;
        
        COMMENT ON COLUMN cases.criminal_procedures_article_number IS 'رقم المادة من قانون أصول المحاكمات الجزائية للرجوع السريع';
        
        CREATE INDEX idx_cases_criminal_procedures_article_number ON cases(criminal_procedures_article_number);
        
        RAISE NOTICE 'Added column: criminal_procedures_article_number';
    ELSE
        RAISE NOTICE 'Column already exists: criminal_procedures_article_number';
    END IF;
END $$;

-- ============================================
-- 3. Create indexes if they don't exist (using IF NOT EXISTS)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cases_penal_code_article_id ON cases(penal_code_article_id);
CREATE INDEX IF NOT EXISTS idx_cases_penal_code_article_number ON cases(penal_code_article_number);
CREATE INDEX IF NOT EXISTS idx_cases_criminal_procedures_article_id ON cases(criminal_procedures_article_id);
CREATE INDEX IF NOT EXISTS idx_cases_criminal_procedures_article_number ON cases(criminal_procedures_article_number);

-- ============================================
-- 4. Optional: Add foreign key constraints (commented out by default)
-- ============================================

-- Uncomment the following if you want referential integrity:

-- ALTER TABLE cases 
-- ADD CONSTRAINT fk_cases_penal_code_article 
-- FOREIGN KEY (penal_code_article_id) 
-- REFERENCES legal_codes(id) 
-- ON DELETE SET NULL;

-- ALTER TABLE cases 
-- ADD CONSTRAINT fk_cases_criminal_procedures_article 
-- FOREIGN KEY (criminal_procedures_article_id) 
-- REFERENCES criminal_procedures_law(id) 
-- ON DELETE SET NULL;

-- ============================================
-- 5. Verification Query
-- ============================================

-- Run this query to verify all columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'cases' 
-- AND column_name IN (
--     'penal_code_article_id',
--     'penal_code_article_number',
--     'criminal_procedures_article_id',
--     'criminal_procedures_article_number'
-- )
-- ORDER BY column_name;






