-- Migration: Migrate remaining clinics to users table
-- Date: 2025-09-21
-- Description: Convert all remaining clinic records to admin users in the users table

-- Step 1: Insert all remaining clinics (except clinic_id = 1) as admin users
INSERT INTO users (email, password, first_name, last_name, clinic_id, role, created_at)
SELECT
  c.email,
  c.password, -- Keep the existing hashed password
  COALESCE(SPLIT_PART(c.name, ' ', 1), c.name), -- First name from clinic name
  COALESCE(SPLIT_PART(c.name, ' ', 2), 'Admin'), -- Last name from clinic name or default to 'Admin'
  c.id,
  'admin',
  c.created_at
FROM clinics c
WHERE c.id != 1 -- Skip clinic_id = 1 as it's already migrated
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.clinic_id = c.id AND u.role = 'admin'
  ) -- Only insert if no admin user exists for this clinic
ON CONFLICT (email) DO NOTHING; -- Skip if email already exists

-- Step 2: Verify the migration
-- This will show all admin users created from clinics
SELECT
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.clinic_id,
  u.role,
  c.name as clinic_name
FROM users u
JOIN clinics c ON u.clinic_id = c.id
WHERE u.role = 'admin'
ORDER BY u.clinic_id;