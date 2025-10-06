-- ============================================
-- Multi-Tenant Migration Script
-- Execute this AFTER running supabase_multitenant_schema.sql
-- ============================================

-- Step 1: Create a default organization for existing data
-- This will hold all your current data
INSERT INTO organizations (id, name, owner_user_id, contact_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Fixed UUID for default org
  '기본 조직',
  (SELECT user_id FROM user_roles WHERE email = 'ggg0531@gmail.com' LIMIT 1),
  'ggg0531@gmail.com',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update existing user_roles to belong to default organization
UPDATE user_roles
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Set your account as OWNER
UPDATE user_roles
SET role = 'OWNER', status = 'ACTIVE'
WHERE email = 'ggg0531@gmail.com';

-- Step 3: Update all existing properties
UPDATE properties
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 4: Update all existing rooms
UPDATE rooms
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: Update all existing reservations
UPDATE reservations
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 6: Update all existing guest_requests (if exists)
UPDATE guest_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'guest_requests'
              AND column_name = 'organization_id');

-- Step 7: Update all existing monthly_fixed_expenses
UPDATE monthly_fixed_expenses
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'monthly_fixed_expenses'
              AND column_name = 'organization_id');

-- Step 8: Update all existing supply_purchases
UPDATE supply_purchases
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'supply_purchases'
              AND column_name = 'organization_id');

-- Step 9: Update all existing other_taxes
UPDATE other_taxes
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'other_taxes'
              AND column_name = 'organization_id');

-- Step 10: Update all existing staff_attendance
UPDATE staff_attendance
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'staff_attendance'
              AND column_name = 'organization_id');

-- ============================================
-- Verification Queries
-- Run these to verify migration succeeded
-- ============================================

-- Check organizations
SELECT * FROM organizations;

-- Check user roles
SELECT email, role, status, organization_id FROM user_roles;

-- Check properties have organization_id
SELECT id, name, organization_id FROM properties;

-- Check rooms have organization_id
SELECT id, name, organization_id FROM rooms LIMIT 10;

-- Check reservations have organization_id
SELECT id, guest_name, organization_id FROM reservations LIMIT 10;

-- Count records by organization
SELECT
  'properties' as table_name,
  organization_id,
  COUNT(*) as count
FROM properties
GROUP BY organization_id

UNION ALL

SELECT
  'rooms' as table_name,
  organization_id,
  COUNT(*) as count
FROM rooms
GROUP BY organization_id

UNION ALL

SELECT
  'reservations' as table_name,
  organization_id,
  COUNT(*) as count
FROM reservations
GROUP BY organization_id;

-- ============================================
-- Cleanup (Optional)
-- Run this if you need to undo the migration
-- ============================================

/*
-- WARNING: This will delete the default organization
-- Only run if you want to start over

DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- This will cascade delete due to ON DELETE CASCADE
-- All data will remain but organization_id will be NULL
*/
