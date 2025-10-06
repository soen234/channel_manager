-- Multi-tenant Channel Manager Schema
-- This schema supports multiple organizations (숙소 오너들) managing their own properties

-- ============================================
-- 1. Organizations Table (숙소 관리 조직)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_number TEXT, -- 사업자 번호
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, CLOSED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ============================================
-- 2. User Roles (Organization-scoped)
-- ============================================
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PENDING', -- SUPER_ADMIN, OWNER, ADMIN, STAFF, PENDING
  status TEXT NOT NULL DEFAULT 'PENDING', -- ACTIVE, SUSPENDED, DEACTIVATED, PENDING
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- A user can have different roles in different organizations
  UNIQUE(user_id, organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status);

-- ============================================
-- 3. Update Properties Table
-- ============================================
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);

-- ============================================
-- 4. Update Rooms Table
-- ============================================
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rooms_org ON rooms(organization_id);

-- ============================================
-- 5. Update Reservations Table
-- ============================================
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reservations_org ON reservations(organization_id);

-- ============================================
-- 6. Update Guest Requests Table
-- ============================================
ALTER TABLE guest_requests
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guest_requests_org ON guest_requests(organization_id);

-- ============================================
-- 7. Update Monthly Fixed Expenses
-- ============================================
ALTER TABLE monthly_fixed_expenses
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_monthly_fixed_expenses_org ON monthly_fixed_expenses(organization_id);

-- Update unique constraint to be organization-scoped
ALTER TABLE monthly_fixed_expenses
DROP CONSTRAINT IF EXISTS monthly_fixed_expenses_year_month_key;

ALTER TABLE monthly_fixed_expenses
ADD CONSTRAINT monthly_fixed_expenses_org_year_month_key
UNIQUE(organization_id, year_month);

-- ============================================
-- 8. Update Supply Purchases
-- ============================================
ALTER TABLE supply_purchases
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_supply_purchases_org ON supply_purchases(organization_id);

-- ============================================
-- 9. Update Other Taxes
-- ============================================
ALTER TABLE other_taxes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_other_taxes_org ON other_taxes(organization_id);

-- ============================================
-- 10. Update Staff Attendance
-- ============================================
ALTER TABLE staff_attendance
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_org ON staff_attendance(organization_id);

-- ============================================
-- 11. Channel Connections (Organization-scoped)
-- ============================================
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- BOOKING_COM, YANOLJA, AIRBNB
  api_key TEXT,
  api_secret TEXT,
  property_id TEXT, -- Channel's property ID
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, ERROR
  last_sync_at TIMESTAMP WITH TIME ZONE,
  config JSONB, -- Additional channel-specific configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, channel, property_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_org ON channel_connections(organization_id);

-- ============================================
-- 12. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be managed by the API middleware
-- This ensures users can only access data from their organization

-- ============================================
-- 13. Helper Function to Get User's Organization
-- ============================================
CREATE OR REPLACE FUNCTION get_user_organization_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id
  FROM user_roles
  WHERE user_id = p_user_id
    AND status = 'ACTIVE'
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- 14. Updated Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE organizations IS '숙소 관리 조직 - 각 숙소 오너의 비즈니스 단위';
COMMENT ON TABLE user_roles IS '사용자 역할 - 조직별로 다른 역할을 가질 수 있음';
COMMENT ON COLUMN user_roles.role IS 'SUPER_ADMIN: 전체 서비스 관리, OWNER: 조직 소유자, ADMIN: 조직 관리자, STAFF: 조직 스태프, PENDING: 승인 대기';
COMMENT ON TABLE channel_connections IS '채널 연동 정보 - 조직별 OTA 채널 연결 설정';
