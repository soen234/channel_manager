const { requireAdmin, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .in('role', ['ADMIN', 'STAFF'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch staff list:', error);
    res.status(500).json({ error: error.message });
  }
};
