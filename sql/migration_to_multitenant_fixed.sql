-- ============================================
-- Multi-Tenant Migration Script (Fixed)
-- Execute this AFTER running supabase_multitenant_schema.sql
-- ============================================

-- Step 0: Check current user_roles data
SELECT user_id, email, role, status FROM user_roles;

-- Step 1: Get the user_id for the owner
-- Replace 'ggg0531@gmail.com' with your actual email if different
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'ggg0531@gmail.com';
BEGIN
  -- Try to find user_id from user_roles
  SELECT user_id INTO v_user_id
  FROM user_roles
  WHERE email = v_email
  LIMIT 1;

  -- If not found in user_roles, try auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email
    LIMIT 1;
  END IF;

  -- If still not found, use the first available user
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM user_roles
    LIMIT 1;
  END IF;

  -- If still no user found, use first from auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    LIMIT 1;
  END IF;

  -- Create default organization
  IF v_user_id IS NOT NULL THEN
    INSERT INTO organizations (id, name, owner_user_id, contact_email, status)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '기본 조직',
      v_user_id,
      v_email,
      'ACTIVE'
    )
    ON CONFLICT (id) DO UPDATE
    SET owner_user_id = v_user_id,
        contact_email = v_email;

    RAISE NOTICE 'Created organization with owner_user_id: %', v_user_id;
  ELSE
    RAISE EXCEPTION 'No user found to assign as organization owner';
  END IF;
END $$;

-- Step 2: Update existing user_roles to belong to default organization
UPDATE user_roles
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Set your account as OWNER if it exists
UPDATE user_roles
SET role = 'OWNER', status = 'ACTIVE'
WHERE email = 'ggg0531@gmail.com'
  AND EXISTS (SELECT 1 FROM user_roles WHERE email = 'ggg0531@gmail.com');

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

-- Step 6: Update all existing guest_requests (if table and column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_requests' AND column_name = 'organization_id'
  ) THEN
    UPDATE guest_requests
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 7: Update all existing monthly_fixed_expenses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_fixed_expenses' AND column_name = 'organization_id'
  ) THEN
    UPDATE monthly_fixed_expenses
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 8: Update all existing supply_purchases
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supply_purchases' AND column_name = 'organization_id'
  ) THEN
    UPDATE supply_purchases
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 9: Update all existing other_taxes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'other_taxes' AND column_name = 'organization_id'
  ) THEN
    UPDATE other_taxes
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 10: Update all existing staff_attendance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_attendance' AND column_name = 'organization_id'
  ) THEN
    UPDATE staff_attendance
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- ============================================
-- Verification Queries
-- ============================================

-- Check organizations
SELECT * FROM organizations;

-- Check user roles
SELECT user_id, email, role, status, organization_id FROM user_roles;

-- Check properties have organization_id
SELECT id, name, organization_id FROM properties LIMIT 10;

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
