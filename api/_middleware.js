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

async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, status')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function requireAdmin(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const userRole = await getUserRole(authResult.user.id);

  if (!userRole || userRole.role !== 'ADMIN' || userRole.status !== 'ACTIVE') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user: authResult.user, role: userRole };
}

async function requireStaff(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const userRole = await getUserRole(authResult.user.id);

  if (!userRole || !['ADMIN', 'STAFF'].includes(userRole.role) || userRole.status !== 'ACTIVE') {
    return { error: 'Staff access required', status: 403 };
  }

  return { user: authResult.user, role: userRole };
}

async function requireApproved(req, res) {
  const authResult = await authMiddleware(req, res);

  if (authResult.error) {
    return authResult;
  }

  const userRole = await getUserRole(authResult.user.id);

  if (!userRole || userRole.status !== 'ACTIVE') {
    return { error: 'Account not approved or inactive', status: 403 };
  }

  return { user: authResult.user, role: userRole };
}

module.exports = {
  authMiddleware,
  supabase,
  getUserRole,
  requireAdmin,
  requireStaff,
  requireApproved
};
