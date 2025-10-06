-- Property-based staff system
-- Each property has its own invite code
-- Staff can be assigned to specific properties

-- 1. Add invite_code to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(6);

-- Create unique index for properties invite_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_invite_code
ON properties(invite_code);

-- 2. Create property_staff junction table
CREATE TABLE IF NOT EXISTS property_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- A user can only have one role per property
  UNIQUE(property_id, user_id)
);

-- Create indexes for property_staff
CREATE INDEX IF NOT EXISTS idx_property_staff_property_id ON property_staff(property_id);
CREATE INDEX IF NOT EXISTS idx_property_staff_user_id ON property_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_property_staff_status ON property_staff(status);

-- 3. Add comments
COMMENT ON COLUMN properties.invite_code IS '6-digit invite code for staff to join this property';
COMMENT ON TABLE property_staff IS 'Junction table for property-level staff assignments';
COMMENT ON COLUMN property_staff.role IS 'ADMIN can manage property, STAFF can view only';

-- 4. Keep user_roles for organization-level roles (OWNER stays at org level)
-- OWNER role remains in user_roles (organization level)
-- ADMIN and STAFF roles move to property_staff (property level)

-- Note: Do NOT drop user_roles table - it's still needed for OWNER role
