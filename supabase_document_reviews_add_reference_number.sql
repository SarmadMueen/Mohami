-- Add reference_number column to document_reviews table
-- This column stores sequential reference numbers for document reviews

ALTER TABLE document_reviews 
ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN document_reviews.reference_number IS 'الرقم المرجعي لمراجعة الأوراق القانونية (رقم تسلسلي)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_document_reviews_reference_number ON document_reviews(reference_number);

-- Update existing document reviews with reference numbers (optional - can be done manually)
-- This will generate reference numbers for existing records
-- UPDATE document_reviews SET reference_number = 'DOC-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0') WHERE reference_number IS NULL;








