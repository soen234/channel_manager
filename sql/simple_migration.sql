-- ============================================
-- Simple Migration - Just run this!
-- ============================================

-- Step 1: Create organization using ANY existing user
INSERT INTO organizations (id, name, owner_user_id, contact_email, status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  '기본 조직',
  COALESCE(
    (SELECT user_id FROM user_roles LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1)
  ),
  COALESCE(
    (SELECT email FROM user_roles LIMIT 1),
    (SELECT email FROM auth.users LIMIT 1)
  ),
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001');

-- Step 2: Update all user_roles
UPDATE user_roles
SET organization_id = '00000000-0000-0000-0000-000000000001',
    role = CASE WHEN role = 'ADMIN' THEN 'OWNER' ELSE role END,
    status = 'ACTIVE'
WHERE organization_id IS NULL;

-- Step 3: Update all data tables
UPDATE properties SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE rooms SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE reservations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Optional tables (won't error if they don't exist)
UPDATE guest_requests SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_requests');
UPDATE monthly_fixed_expenses SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_fixed_expenses');
UPDATE supply_purchases SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_purchases');
UPDATE other_taxes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'other_taxes');
UPDATE staff_attendance SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_attendance');

-- Done! Check results:
SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Properties', COUNT(*) FROM properties WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Rooms', COUNT(*) FROM rooms WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Reservations', COUNT(*) FROM reservations WHERE organization_id IS NOT NULL;
