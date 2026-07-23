ALTER TABLE otp_codes RENAME COLUMN code TO code_hash;
ALTER TABLE otp_codes ADD COLUMN ip_address text;
ALTER TABLE otp_codes ADD COLUMN ip_attempts integer DEFAULT 0;
