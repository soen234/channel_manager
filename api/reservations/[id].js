const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;
  const reservationId = req.query.id;

  if (!reservationId) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  try {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          *,
          properties (*)
        )
      `)
      .eq('id', reservationId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      throw error;
    }

    res.json(reservation);
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
