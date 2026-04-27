-- ==================================================
-- MIGRATION: EMAIL TO PHONE OTP (ELAVARKUM AI)
-- ==================================================

-- 1. Rename 'email' column to 'phone'
ALTER TABLE public.elavarkum_requests 
RENAME COLUMN email TO phone;

-- 2. Update the type to TEXT for E.164 phone numbers
ALTER TABLE public.elavarkum_requests 
ALTER COLUMN phone TYPE TEXT;

-- 3. Rename 'otp_code' to 'otp_hash' and ensure it's TEXT
ALTER TABLE public.elavarkum_requests 
RENAME COLUMN otp_code TO otp_hash;

ALTER TABLE public.elavarkum_requests 
ALTER COLUMN otp_hash TYPE TEXT;

-- 4. Ensure we have a dedicated column for verified status if needed
-- The existing 'status' column (pending, verified, generated) might suffice.

-- 5. Set tries_left to 5 as requested (brute-force lockout max 5 attempts)
ALTER TABLE public.elavarkum_requests 
ALTER COLUMN tries_left SET DEFAULT 5;

-- 6. Clear existing OTP data
UPDATE public.elavarkum_requests 
SET otp_hash = NULL,
    otp_expires_at = NULL,
    tries_left = 5,
    status = 'pending';

-- 7. Migrate Admin Tables
ALTER TABLE public.admin_users RENAME COLUMN email TO phone;
ALTER TABLE public.admin_otps RENAME COLUMN email TO phone;

-- 8. Add comment
COMMENT ON COLUMN public.elavarkum_requests.phone IS 'User phone number in E.164 format (e.g., +91XXXXXXXXXX)';
COMMENT ON COLUMN public.admin_users.phone IS 'Admin phone number in E.164 format';

