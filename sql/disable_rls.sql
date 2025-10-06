-- Disable Row Level Security for all tables
-- This allows the service to work without RLS policies
-- In production, you should implement proper RLS policies instead

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_fixed_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE supply_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE other_taxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'organizations',
  'user_roles',
  'properties',
  'rooms',
  'reservations'
);
