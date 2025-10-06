-- Add invite_code column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(6);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_invite_code
ON organizations(invite_code);

-- Add comment
COMMENT ON COLUMN organizations.invite_code
IS '6-digit invite code for staff signup';
