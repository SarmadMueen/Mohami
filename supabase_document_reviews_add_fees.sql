-- Add document_fees column to document_reviews table
-- This column stores the fee amount for document review services

ALTER TABLE document_reviews 
ADD COLUMN IF NOT EXISTS document_fees NUMERIC(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN document_reviews.document_fees IS 'رسوم مراجعة الأوراق القانونية';

-- Create index for better query performance (optional, useful if filtering by fees)
CREATE INDEX IF NOT EXISTS idx_document_reviews_fees ON document_reviews(document_fees);








