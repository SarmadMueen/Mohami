-- Add email column to client_accounts table
ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing records with email from auth.users (if possible)
-- This requires admin access to auth.users, so you may need to run this manually in Supabase SQL Editor
-- UPDATE client_accounts ca
-- SET email = au.email
-- FROM auth.users au
-- WHERE ca.auth_user_id = au.id AND ca.email IS NULL;
