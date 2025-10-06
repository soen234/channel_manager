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
        ),
        guest_requests!guest_requests_reservation_id_fkey (
          id,
          request_type,
          description,
          additional_payment,
          status
        )
      `)
      .gte('check_in', today)
      .lt('check_in', tomorrow)
      .in('status', ['CONFIRMED', 'CHECKED_IN'])
      .order('check_in', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch today checkins:', error);
    res.status(500).json({ error: error.message });
  }
};
