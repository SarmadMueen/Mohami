-- Migration: Add function to get auth users with last_sign_in_at
-- This allows querying the auth.users table from the public schema

CREATE OR REPLACE FUNCTION get_auth_users_with_last_login()
RETURNS TABLE (
    id UUID,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        id,
        last_sign_in_at
    FROM auth.users
    WHERE last_sign_in_at IS NOT NULL;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_users_with_last_login() TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_with_last_login() TO service_role;

COMMENT ON FUNCTION get_auth_users_with_last_login() IS 'Returns auth users with their last sign in timestamp for admin purposes';
