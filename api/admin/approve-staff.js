const { requireAdmin, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    const { userId, role } = req.body;

    if (!userId || !role || !['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Invalid request. userId and role (ADMIN or STAFF) required' });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .update({
        role,
        status: 'ACTIVE',
        approved_by: authResult.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('user_id', userId)
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
