# Multi-Tenant Migration Guide

## Overview
This system has been migrated to support multi-tenant architecture where each organization (숙소 오너) has isolated data.

## Database Changes

### 1. Run the Schema Migration
Execute the SQL in `supabase_multitenant_schema.sql` in your Supabase SQL editor.

This will:
- Create `organizations` table
- Update `user_roles` table with `organization_id`
- Add `organization_id` to all data tables
- Create indexes for performance
- Add triggers for updated_at fields

### 2. Migrate Existing Data

Run this SQL to migrate your existing data:

```sql
-- Step 1: Create a default organization for existing data
INSERT INTO organizations (id, name, owner_user_id, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Fixed UUID for default org
  '기본 조직',
  (SELECT user_id FROM user_roles LIMIT 1),  -- Use first user as owner
  'ACTIVE'
);

-- Step 2: Update existing user_roles to belong to default organization
UPDATE user_roles
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

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

-- Step 6: Update all existing guest_requests
UPDATE guest_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 7: Update all existing monthly_fixed_expenses
UPDATE monthly_fixed_expenses
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 8: Update all existing supply_purchases (if table exists)
UPDATE supply_purchases
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 9: Update all existing other_taxes
UPDATE other_taxes
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 10: Update all existing staff_attendance
UPDATE staff_attendance
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
```

### 3. Update Your Current User to OWNER Role

```sql
-- Find your user_id first
SELECT user_id, email FROM user_roles WHERE email = 'ggg0531@gmail.com';

-- Update role to OWNER
UPDATE user_roles
SET role = 'OWNER'
WHERE email = 'ggg0531@gmail.com';
```

## API Changes

All APIs now filter data by `organization_id` automatically:

- `/api/properties` - Only shows properties for your organization
- `/api/reservations` - Only shows reservations for your organization
- `/api/dashboard` - Only shows stats for your organization
- `/api/expenses/*` - Only shows expenses for your organization

## Role Hierarchy

1. **SUPER_ADMIN** - Can access all organizations (for system administration)
2. **OWNER** - Can manage their organization fully
3. **ADMIN** - Can manage staff and most features in their organization
4. **STAFF** - Read-only access to their organization
5. **PENDING** - Awaiting approval

## Creating New Organizations

When a new user signs up:

1. They register normally via `/api/auth/signup`
2. System creates organization automatically
3. They get OWNER role for their organization
4. They can invite staff members
5. Staff members sign up and request access to specific organization

## Frontend Changes

The frontend now:
- Stores `organization_id` in user context
- Shows only data for current user's organization
- Admin panel only shows staff members from same organization

## Testing

1. Create a new account (will auto-create new organization)
2. Verify you only see data for your organization
3. Create a second account
4. Verify the two accounts have isolated data

## Rollback

If needed, you can temporarily make organization_id nullable:

```sql
ALTER TABLE properties ALTER COLUMN organization_id DROP NOT NULL;
-- Repeat for other tables
```

But this defeats the purpose of multi-tenancy.
