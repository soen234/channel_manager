const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channel, status, startDate, endDate, limit } = req.query;

    let query = supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          *,
          properties (*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('check_in', startDate);
    if (endDate) query = query.lte('check_in', endDate);
    if (limit) query = query.limit(parseInt(limit));

    const { data: reservations, error } = await query;

    if (error) throw error;
    res.json(reservations || []);
  } catch (error) {
    console.error('Reservations error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
