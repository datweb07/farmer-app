-- Fix password reset function to properly encrypt passwords
-- This ensures passwords work after reset

-- Drop old function
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT);

-- Recreate with proper password encryption
CREATE OR REPLACE FUNCTION update_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_email TEXT;
    v_encrypted_password TEXT;
BEGIN
    -- Get user email from profiles (username@example.com format)
    SELECT username || '@example.com' INTO v_email
    FROM profiles
    WHERE id = p_user_id;

    IF v_email IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Generate encrypted password using Supabase's auth functions
    -- Use extensions.crypt with proper salt generation
    v_encrypted_password := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

    -- Update the password in auth.users table
    UPDATE auth.users
    SET 
        encrypted_password = v_encrypted_password,
        updated_at = NOW(),
        -- Clear any email confirmation requirements
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmation_token = NULL,
        recovery_token = NULL,
        email_change_token_new = NULL,
        email_change = NULL
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
