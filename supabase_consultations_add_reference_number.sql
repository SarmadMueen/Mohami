-- Add reference_number column to consultations table
-- This column stores sequential reference numbers for consultations

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN consultations.reference_number IS 'الرقم المرجعي للاستشارة (رقم تسلسلي)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_reference_number ON consultations(reference_number);

-- Update existing consultations with reference numbers (optional - can be done manually)
-- This will generate reference numbers for existing records
-- UPDATE consultations SET reference_number = 'CONS-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0') WHERE reference_number IS NULL;








