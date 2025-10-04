const { authMiddleware, supabase } = require('../../_middleware');

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { roomId, startDate, endDate } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let query = supabase
      .from('inventory')
      .select('*')
      .eq('room_id', roomId)
      .order('date', { ascending: true });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: inventory, error } = await query;

    if (error) throw error;
    res.json(inventory || []);
  } catch (error) {
    console.error('Inventory error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
