const { requireApproved, supabase } = require('../_middleware');

/**
 * Update a reservation
 * PUT /api/reservations/update?id=xxx
 */
module.exports = async (req, res) => {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;
  const id = req.query.id || req.body.id;

  if (!id) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  try {
    const {
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      number_of_guests,
      total_price,
      channel,
      status,
      payment_status
    } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (room_id !== undefined) updates.room_id = room_id;
    if (guest_name !== undefined) updates.guest_name = guest_name;
    if (guest_email !== undefined) updates.guest_email = guest_email;
    if (guest_phone !== undefined) updates.guest_phone = guest_phone;
    if (check_in !== undefined) updates.check_in = check_in;
    if (check_out !== undefined) updates.check_out = check_out;
    if (number_of_guests !== undefined) updates.number_of_guests = number_of_guests;
    if (total_price !== undefined) updates.total_price = total_price;
    if (channel !== undefined) updates.channel = channel;
    if (status !== undefined) updates.status = status;
    if (payment_status !== undefined) updates.payment_status = payment_status;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        rooms (
          *,
          properties (*)
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
