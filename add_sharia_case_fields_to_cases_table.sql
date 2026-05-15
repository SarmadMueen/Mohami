-- SQL script to add sharia case (الشرعية) specific fields to the cases table
-- This migration adds fields for marriage, divorce, custody, inheritance, and guardianship matters

-- Add basic sharia case fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS sect TEXT,                          -- المذهب
ADD COLUMN IF NOT EXISTS competent_court TEXT;                -- المحكمة المختصة

-- Add marriage-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS marriage_contract_date DATE,         -- تاريخ عقد الزواج
ADD COLUMN IF NOT EXISTS marriage_contract_number TEXT,      -- رقم عقد الزواج
ADD COLUMN IF NOT EXISTS marriage_contract_location TEXT;   -- مكان عقد الزواج

-- Add divorce and separation fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS divorce_type TEXT,                  -- نوع الطلاق
ADD COLUMN IF NOT EXISTS separation_type TEXT,               -- نوع التفريق
ADD COLUMN IF NOT EXISTS deferred_dowry DECIMAL(15, 2),       -- المهر المؤجل
ADD COLUMN IF NOT EXISTS iddah_period_from_divorce TEXT;     -- فترة العدة (من تاريخ الطلاق)

-- Add alimony-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS alimony_type TEXT,                  -- نوع النفقة
ADD COLUMN IF NOT EXISTS alimony_duration_required TEXT,     -- مدة النفقة المطلوبة
ADD COLUMN IF NOT EXISTS alimony_estimation_basis TEXT;      -- أساس تقدير النفقة

-- Add custody-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS custody_years INTEGER,              -- سنوات حضانة الأولاد
ADD COLUMN IF NOT EXISTS request_visit_custodian TEXT;       -- طلب زيارة المحضون

-- Add birth-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS birth_date DATE,                    -- تاريخ الولادة
ADD COLUMN IF NOT EXISTS birth_location TEXT;                -- مكان الولادة

-- Add guardianship-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS guardianship_type TEXT,              -- نوع الولاية
ADD COLUMN IF NOT EXISTS request_appoint_guardian TEXT,       -- طلب نصب وصي / قيم
ADD COLUMN IF NOT EXISTS current_guardian_status TEXT;        -- حالة الوصي الحالي

-- Add inheritance-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS number_of_heirs INTEGER,            -- عدد الورثة
ADD COLUMN IF NOT EXISTS kinship_degrees TEXT,               -- درجات القرابة
ADD COLUMN IF NOT EXISTS approximate_estate_value DECIMAL(15, 2), -- قيمة التركة التقريبية
ADD COLUMN IF NOT EXISTS will_type TEXT;                     -- نوع الوصية

-- Add dispute details field
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS dispute_details TEXT;               -- تفاصيل النزاع

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.sect IS 'المذهب';
COMMENT ON COLUMN cases.competent_court IS 'المحكمة المختصة';
COMMENT ON COLUMN cases.marriage_contract_date IS 'تاريخ عقد الزواج';
COMMENT ON COLUMN cases.marriage_contract_number IS 'رقم عقد الزواج';
COMMENT ON COLUMN cases.marriage_contract_location IS 'مكان عقد الزواج';
COMMENT ON COLUMN cases.divorce_type IS 'نوع الطلاق';
COMMENT ON COLUMN cases.separation_type IS 'نوع التفريق';
COMMENT ON COLUMN cases.deferred_dowry IS 'المهر المؤجل';
COMMENT ON COLUMN cases.iddah_period_from_divorce IS 'فترة العدة (من تاريخ الطلاق)';
COMMENT ON COLUMN cases.alimony_type IS 'نوع النفقة';
COMMENT ON COLUMN cases.alimony_duration_required IS 'مدة النفقة المطلوبة';
COMMENT ON COLUMN cases.alimony_estimation_basis IS 'أساس تقدير النفقة';
COMMENT ON COLUMN cases.custody_years IS 'سنوات حضانة الأولاد';
COMMENT ON COLUMN cases.request_visit_custodian IS 'طلب زيارة المحضون';
COMMENT ON COLUMN cases.birth_date IS 'تاريخ الولادة';
COMMENT ON COLUMN cases.birth_location IS 'مكان الولادة';
COMMENT ON COLUMN cases.guardianship_type IS 'نوع الولاية';
COMMENT ON COLUMN cases.request_appoint_guardian IS 'طلب نصب وصي / قيم';
COMMENT ON COLUMN cases.current_guardian_status IS 'حالة الوصي الحالي';
COMMENT ON COLUMN cases.number_of_heirs IS 'عدد الورثة';
COMMENT ON COLUMN cases.kinship_degrees IS 'درجات القرابة';
COMMENT ON COLUMN cases.approximate_estate_value IS 'قيمة التركة التقريبية';
COMMENT ON COLUMN cases.will_type IS 'نوع الوصية';
COMMENT ON COLUMN cases.dispute_details IS 'تفاصيل النزاع';

-- Create indexes for better query performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_cases_sect ON cases(sect);
CREATE INDEX IF NOT EXISTS idx_cases_marriage_contract_date ON cases(marriage_contract_date);
CREATE INDEX IF NOT EXISTS idx_cases_divorce_type ON cases(divorce_type);
CREATE INDEX IF NOT EXISTS idx_cases_birth_date ON cases(birth_date);
CREATE INDEX IF NOT EXISTS idx_cases_guardianship_type ON cases(guardianship_type);






