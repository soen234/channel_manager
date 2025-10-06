-- Add organization_id to expenses tables if not exists

-- supply_purchases
ALTER TABLE supply_purchases
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- monthly_fixed_expenses
ALTER TABLE monthly_fixed_expenses
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- other_taxes
ALTER TABLE other_taxes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- staff_attendance
ALTER TABLE staff_attendance
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_supply_purchases_organization ON supply_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fixed_expenses_organization ON monthly_fixed_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_other_taxes_organization ON other_taxes(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_organization ON staff_attendance(organization_id);
