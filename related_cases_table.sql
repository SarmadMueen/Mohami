-- SQL script to create the related_cases table for storing case relationships
-- This table enables many-to-many relationships between cases

CREATE TABLE IF NOT EXISTS related_cases (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    related_case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a case cannot be related to itself
    CONSTRAINT check_no_self_relation CHECK (case_id != related_case_id),
    
    -- Ensure each relationship is stored only once (bidirectional check handled in application logic)
    CONSTRAINT unique_relationship UNIQUE (case_id, related_case_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_related_cases_case_id ON related_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_related_cases_related_case_id ON related_cases(related_case_id);

-- Add comment to the table
COMMENT ON TABLE related_cases IS 'Stores relationships between cases. Each row represents a bidirectional relationship between two cases.';











