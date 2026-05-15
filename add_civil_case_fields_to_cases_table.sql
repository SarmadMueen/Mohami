-- SQL script to add civil case (المدنية) specific fields to the cases table
-- This migration adds fields for obligation details, contract information, property details, and financial information

-- Add obligation-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS obligation_type TEXT,                    -- نوع الالتزام
ADD COLUMN IF NOT EXISTS obligation_source TEXT;                  -- مصدر الالتزام

-- Add contract-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS contract_type TEXT,                      -- نوع العقد
ADD COLUMN IF NOT EXISTS contract_date DATE,                      -- تاريخ العقد
ADD COLUMN IF NOT EXISTS contract_duration_from DATE,             -- مدة العقد (من)
ADD COLUMN IF NOT EXISTS contract_duration_to DATE;               -- مدة العقد (إلى)

-- Add property-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS property_type TEXT,                      -- نوع العقار
ADD COLUMN IF NOT EXISTS property_number TEXT,                    -- رقم العقار
ADD COLUMN IF NOT EXISTS property_address TEXT;                   -- عنوان العقار

-- Add registration-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS register_number TEXT,                    -- رقم السجل
ADD COLUMN IF NOT EXISTS register_page TEXT,                     -- الصفحة
ADD COLUMN IF NOT EXISTS document_date DATE,                      -- تاريخ السند
ADD COLUMN IF NOT EXISTS registration_office TEXT;                -- دائرة التسجيل العقاري

-- Add real right and movable property fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS real_right_type TEXT,                    -- نوع الحق العيني
ADD COLUMN IF NOT EXISTS movable_type TEXT,                       -- نوع المنقول
ADD COLUMN IF NOT EXISTS plate_number TEXT,                       -- رقم اللوحة
ADD COLUMN IF NOT EXISTS movable_location TEXT;                   -- مكان المنقول

-- Add financial fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS debt_value DECIMAL(15, 2),               -- قيمة الدين
ADD COLUMN IF NOT EXISTS contractual_penalties DECIMAL(15, 2),   -- الغرامات الاتفاقية
ADD COLUMN IF NOT EXISTS compensation_value DECIMAL(15, 2);       -- قيمة التعويض

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.obligation_type IS 'نوع الالتزام';
COMMENT ON COLUMN cases.obligation_source IS 'مصدر الالتزام';
COMMENT ON COLUMN cases.contract_type IS 'نوع العقد';
COMMENT ON COLUMN cases.contract_date IS 'تاريخ العقد';
COMMENT ON COLUMN cases.contract_duration_from IS 'مدة العقد (من)';
COMMENT ON COLUMN cases.contract_duration_to IS 'مدة العقد (إلى)';
COMMENT ON COLUMN cases.property_type IS 'نوع العقار';
COMMENT ON COLUMN cases.property_number IS 'رقم العقار';
COMMENT ON COLUMN cases.property_address IS 'عنوان العقار';
COMMENT ON COLUMN cases.register_number IS 'رقم السجل';
COMMENT ON COLUMN cases.register_page IS 'الصفحة';
COMMENT ON COLUMN cases.document_date IS 'تاريخ السند';
COMMENT ON COLUMN cases.registration_office IS 'دائرة التسجيل العقاري';
COMMENT ON COLUMN cases.real_right_type IS 'نوع الحق العيني';
COMMENT ON COLUMN cases.movable_type IS 'نوع المنقول';
COMMENT ON COLUMN cases.plate_number IS 'رقم اللوحة';
COMMENT ON COLUMN cases.movable_location IS 'مكان المنقول';
COMMENT ON COLUMN cases.debt_value IS 'قيمة الدين';
COMMENT ON COLUMN cases.contractual_penalties IS 'الغرامات الاتفاقية';
COMMENT ON COLUMN cases.compensation_value IS 'قيمة التعويض';

-- Create indexes for better query performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_cases_obligation_type ON cases(obligation_type);
CREATE INDEX IF NOT EXISTS idx_cases_contract_type ON cases(contract_type);
CREATE INDEX IF NOT EXISTS idx_cases_contract_date ON cases(contract_date);
CREATE INDEX IF NOT EXISTS idx_cases_property_type ON cases(property_type);
CREATE INDEX IF NOT EXISTS idx_cases_debt_value ON cases(debt_value);






