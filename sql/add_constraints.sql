-- Add NOT NULL constraint to organization_id in user_roles
-- This ensures all users must belong to an organization
ALTER TABLE user_roles
ALTER COLUMN organization_id SET NOT NULL;

-- Add UNIQUE constraint to prevent duplicate user_roles entries
-- A user can only have one role per organization
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_org_unique;

ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_org_unique
UNIQUE (user_id, organization_id);

-- Add comment for clarity
COMMENT ON CONSTRAINT user_roles_user_org_unique ON user_roles
IS 'Ensures a user can only have one role per organization';

COMMENT ON COLUMN user_roles.organization_id
IS 'Organization this user belongs to - REQUIRED';
