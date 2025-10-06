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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .update({
        status: 'DEACTIVATED'
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to revoke staff:', error);
    res.status(500).json({ error: error.message });
  }
};
