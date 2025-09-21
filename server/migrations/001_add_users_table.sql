-- Migration: Add users table for multi-user support
-- Date: 2025-09-21
-- Description: Create new users table and migrate existing clinic to admin user

-- Step 1: Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_login TIMESTAMP
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 3: Create admin user for Abror Iskandarov (founder)
-- Note: Password will be hashed by the application
INSERT INTO users (email, password, first_name, last_name, clinic_id, role, created_at)
SELECT
  'abror_iskandarov@yahoo.com',
  '$placeholder_for_hashed_password$', -- This will be updated by the migration script
  'Abror',
  'Iskandarov',
  c.id,
  'admin',
  NOW()
FROM clinics c
WHERE c.id = 1
ON CONFLICT (email) DO NOTHING;

-- Step 4: Add constraint to ensure role is valid
ALTER TABLE users ADD CONSTRAINT check_user_role
CHECK (role IN ('admin', 'doctor', 'receptionist', 'user'));

-- Note: We keep the clinic table unchanged for now to maintain backward compatibility
-- The auth system will be updated to use the users table in Phase 2