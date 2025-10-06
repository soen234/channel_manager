const { requireAdmin, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  try {
    const { userId, role } = req.body;

    if (!userId || !role || !['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Invalid request. userId and role (ADMIN or STAFF) required' });
    }

    // Update the pending user and assign to organization
    const { data, error } = await supabase
      .from('user_roles')
      .update({
        organization_id: organizationId,
        role,
        status: 'ACTIVE',
        approved_by: authResult.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to approve staff:', error);
    res.status(500).json({ error: error.message });
  }
};
