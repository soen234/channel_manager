const { requireApproved, supabase, updateInventoryForReservation } = require('../_middleware');

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
    // Get existing reservation first for inventory comparison
    const { data: existingReservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      throw fetchError;
    }

    const {
      room_id,
      room_unit_number,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      number_of_guests,
      total_price,
      channel,
      status,
      payment_status,
      payment_method,
      is_manually_placed
    } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (room_id !== undefined) updates.room_id = room_id;
    if (room_unit_number !== undefined) updates.room_unit_number = room_unit_number;
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
    if (payment_method !== undefined) updates.payment_method = payment_method;
    if (is_manually_placed !== undefined) updates.is_manually_placed = is_manually_placed;

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

    // Update inventory based on changes
    try {
      const oldRoomId = existingReservation.room_id;
      const oldCheckIn = existingReservation.check_in;
      const oldCheckOut = existingReservation.check_out;
      const oldStatus = existingReservation.status;

      const newRoomId = room_id !== undefined ? room_id : oldRoomId;
      const newCheckIn = check_in !== undefined ? check_in : oldCheckIn;
      const newCheckOut = check_out !== undefined ? check_out : oldCheckOut;
      const newStatus = status !== undefined ? status : oldStatus;

      const wasActive = oldStatus !== 'CANCELLED';
      const isActive = newStatus !== 'CANCELLED';

      // Case 1: Reservation was active, now cancelled - increase inventory
      if (wasActive && !isActive) {
        await updateInventoryForReservation(oldRoomId, oldCheckIn, oldCheckOut, 1);
      }
      // Case 2: Reservation was cancelled, now active - decrease inventory
      else if (!wasActive && isActive) {
        await updateInventoryForReservation(newRoomId, newCheckIn, newCheckOut, -1);
      }
      // Case 3: Both active, but dates or room changed
      else if (wasActive && isActive) {
        const roomChanged = oldRoomId !== newRoomId;
        const datesChanged = oldCheckIn !== newCheckIn || oldCheckOut !== newCheckOut;

        if (roomChanged || datesChanged) {
          // Restore old inventory
          await updateInventoryForReservation(oldRoomId, oldCheckIn, oldCheckOut, 1);
          // Reserve new inventory
          await updateInventoryForReservation(newRoomId, newCheckIn, newCheckOut, -1);
        }
      }
    } catch (invError) {
      console.error('Inventory update error:', invError);
      // Continue even if inventory update fails
    }

    res.json(data);
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
