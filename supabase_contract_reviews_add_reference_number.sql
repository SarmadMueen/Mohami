-- Add reference_number column to contract_reviews table
-- This column stores sequential reference numbers for contract reviews

ALTER TABLE contract_reviews 
ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN contract_reviews.reference_number IS 'الرقم المرجعي لمراجعة العقد (رقم تسلسلي)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_reviews_reference_number ON contract_reviews(reference_number);

-- Update existing contract reviews with reference numbers (optional - can be done manually)
-- This will generate reference numbers for existing records
-- UPDATE contract_reviews SET reference_number = 'CONT-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0') WHERE reference_number IS NULL;








