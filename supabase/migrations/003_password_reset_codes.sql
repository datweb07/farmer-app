-- ============================================
-- Password Reset Codes Table Migration
-- ============================================
-- Creates table for storing temporary password reset verification codes
-- Codes expire after 15 minutes and are single-use
-- ============================================

-- Create password_reset_codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_reset_codes_phone ON password_reset_codes(phone_number, expires_at);
CREATE INDEX idx_reset_codes_user ON password_reset_codes(user_id);

-- RLS Policies
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Users can only read their own reset codes
CREATE POLICY "Users can read own reset codes"
    ON password_reset_codes FOR SELECT
    USING (auth.uid() = user_id);

-- Anyone can insert reset codes (for forgot password)
CREATE POLICY "Anyone can request reset codes"
    ON password_reset_codes FOR INSERT
    WITH CHECK (true);

-- Users can update their own codes (mark as used)
CREATE POLICY "Users can update own reset codes"
    ON password_reset_codes FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to clean up expired codes (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_codes
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Password Reset Helper Functions
-- ============================================

-- Function to find user by phone and generate reset code
-- Runs with SECURITY DEFINER to bypass RLS for anonymous users
CREATE OR REPLACE FUNCTION request_password_reset(
    reset_phone_number TEXT
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    code TEXT,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Find user by phone number
    SELECT p.id, p.username INTO v_user_id, v_username
    FROM profiles p
    WHERE p.phone_number = reset_phone_number;

    -- If user not found, return empty result
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Generate 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Set expiration to 15 minutes from now
    v_expires_at := NOW() + INTERVAL '15 minutes';

    -- Insert reset code
    INSERT INTO password_reset_codes (user_id, code, phone_number, expires_at, used)
    VALUES (v_user_id, v_code, reset_phone_number, v_expires_at, FALSE);

    -- Return user info and code
    RETURN QUERY SELECT v_user_id, v_username, v_code, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify reset code
CREATE OR REPLACE FUNCTION verify_password_reset_code(
    reset_phone_number TEXT,
    reset_code TEXT
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    valid BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
    v_code_record RECORD;
BEGIN
    -- Find valid reset code
    SELECT * INTO v_code_record
    FROM password_reset_codes
    WHERE phone_number = reset_phone_number
      AND code = reset_code
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no valid code found, return invalid
    IF v_code_record IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    -- Get username from profiles
    SELECT p.id, p.username INTO v_user_id, v_username
    FROM profiles p
    WHERE p.id = v_code_record.user_id;

    -- Return user info
    RETURN QUERY SELECT v_user_id, v_username, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reset code as used
CREATE OR REPLACE FUNCTION mark_reset_code_used(
    reset_phone_number TEXT,
    reset_code TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE password_reset_codes
    SET used = TRUE
    WHERE phone_number = reset_phone_number
      AND code = reset_code
      AND used = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user password
-- This runs with SECURITY DEFINER to bypass auth restrictions
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
