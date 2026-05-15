-- Add is_disabled column to user_metadata table
-- This allows super_admin to disable user accounts from accessing the app

ALTER TABLE user_metadata 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN user_metadata.is_disabled IS 'Flag to disable user account from accessing the app. TRUE = disabled, FALSE = enabled';
