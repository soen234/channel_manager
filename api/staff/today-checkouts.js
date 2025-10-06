const { requireStaff, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireStaff(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          id,
          name,
          properties (
            id,
            name
          )
        )
      `)
      .gte('check_out', today)
      .lt('check_out', tomorrow)
      .in('status', ['CONFIRMED', 'CHECKED_IN'])
      .order('check_out', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch today checkouts:', error);
    res.status(500).json({ error: error.message });
  }
};
