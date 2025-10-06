const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function authMiddleware(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { error: 'Invalid token', status: 401 };
    }

    return { user };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// Get user's role and organization context
async function getUserContext(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, status, organization_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// Backward compatibility
async function getUserRole(userId) {
  const context = await getUserContext(userId);
  return context;
}

async function requireAdmin(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const context = await getUserContext(authResult.user.id);

  if (!context || !['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(context.role) || context.status !== 'ACTIVE') {
    return { error: 'Admin access required', status: 403 };
  }

  return {
    user: authResult.user,
    role: context,
    organizationId: context.organization_id
  };
}

async function requireStaff(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const context = await getUserContext(authResult.user.id);

  if (!context || !['SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF'].includes(context.role) || context.status !== 'ACTIVE') {
    return { error: 'Staff access required', status: 403 };
  }

  return {
    user: authResult.user,
    role: context,
    organizationId: context.organization_id
  };
}

async function requireApproved(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const context = await getUserContext(authResult.user.id);

  if (!context || context.status !== 'ACTIVE') {
    return { error: 'Account not approved or inactive', status: 403 };
  }

  return {
    user: authResult.user,
    role: context,
    organizationId: context.organization_id
  };
}

// Special: Require SUPER_ADMIN role (cross-organization access)
async function requireSuperAdmin(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const context = await getUserContext(authResult.user.id);

  if (!context || context.role !== 'SUPER_ADMIN' || context.status !== 'ACTIVE') {
    return { error: 'Super admin access required', status: 403 };
  }

  return {
    user: authResult.user,
    role: context,
    organizationId: context.organization_id
  };
}

// Check if user has access to a specific property
async function canAccessProperty(userId, propertyId) {
  // Check if OWNER or ADMIN of the organization
  const { data: property } = await supabase
    .from('properties')
    .select('organization_id')
    .eq('id', propertyId)
    .single();

  if (!property) return false;

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, status')
    .eq('user_id', userId)
    .eq('organization_id', property.organization_id)
    .eq('status', 'ACTIVE')
    .single();

  // OWNER and ADMIN have access to all properties in their organization
  if (userRole && (userRole.role === 'OWNER' || userRole.role === 'ADMIN')) {
    return true;
  }

  // Check property_staff for property-level access
  const { data: staffAccess } = await supabase
    .from('property_staff')
    .select('role, status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .eq('status', 'ACTIVE')
    .single();

  return !!staffAccess;
}

// Get all property IDs the user has access to
async function getUserProperties(userId) {
  // Get user's organization
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, organization_id, status')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .single();

  if (!userRole) return [];

  // If OWNER, return all properties in organization
  if (userRole.role === 'OWNER') {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', userRole.organization_id);

    return properties?.map(p => p.id) || [];
  }

  // If ADMIN/STAFF, return only assigned properties
  const { data: staffProperties } = await supabase
    .from('property_staff')
    .select('property_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  return staffProperties?.map(ps => ps.property_id) || [];
}

module.exports = {
  authMiddleware,
  supabase,
  getUserRole,
  getUserContext,
  requireAdmin,
  requireStaff,
  requireApproved,
  requireSuperAdmin,
  canAccessProperty,
  getUserProperties
};
