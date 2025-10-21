const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  if (req.method === 'POST') {
    return handleCreateReservation(req, res, organizationId);
  }

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

    // Include reservations that overlap with the date range
    // A reservation overlaps if: check_out > startDate AND check_in <= endDate
    if (startDate) query = query.gte('check_out', startDate);
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

async function handleCreateReservation(req, res, organizationId) {
  try {
    const {
      room_id,
      channel,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      number_of_guests,
      total_price,
      status,
      payment_status
    } = req.body;

    // Validate required fields
    if (!room_id || !guest_name || !check_in || !check_out || !total_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate dates
    if (new Date(check_in) >= new Date(check_out)) {
      return res.status(400).json({ error: 'Check-out must be after check-in' });
    }

    // Insert reservation
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        organization_id: organizationId,
        room_id,
        channel: channel || 'DIRECT',
        channel_reservation_id: `DIRECT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        guest_name,
        guest_email: guest_email || '',
        guest_phone: guest_phone || '',
        check_in,
        check_out,
        number_of_guests: number_of_guests || 1,
        total_price,
        status: status || 'CONFIRMED',
        payment_status: payment_status || 'UNPAID'
      })
      .select()
      .single();

    if (error) {
      console.error('Create reservation error:', error);
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
