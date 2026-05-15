-- Add custom_lawyer_limit column to user_metadata table
-- This allows super_admin to set custom lawyer limits per admin, overriding plan-based limits

ALTER TABLE user_metadata 
ADD COLUMN IF NOT EXISTS custom_lawyer_limit INTEGER;

-- Add comment
COMMENT ON COLUMN user_metadata.custom_lawyer_limit IS 'Custom lawyer limit for this admin. If NULL, uses plan-based limit.';
