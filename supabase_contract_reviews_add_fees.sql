-- Add contract_fees column to contract_reviews table
-- This column stores the fee amount for contract review services

ALTER TABLE contract_reviews 
ADD COLUMN IF NOT EXISTS contract_fees NUMERIC(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN contract_reviews.contract_fees IS 'رسوم مراجعة العقد';

-- Create index for better query performance (optional, useful if filtering by fees)
CREATE INDEX IF NOT EXISTS idx_contract_reviews_fees ON contract_reviews(contract_fees);








