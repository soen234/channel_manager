const { requireAdmin, supabase } = require('../_middleware');

/**
 * Fix reservations with null organization_id
 * POST /api/reservations/fix-organization
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    // Get all reservations with null organization_id
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, room_id')
      .is('organization_id', null);

    if (resError) throw resError;

    if (!reservations || reservations.length === 0) {
      return res.json({
        success: true,
        message: 'No reservations need fixing',
        fixed: 0
      });
    }

    let fixed = 0;
    const errors = [];

    for (const reservation of reservations) {
      try {
        // Get room and its property to find organization_id
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('id, property_id, properties(organization_id)')
          .eq('id', reservation.room_id)
          .single();

        if (roomError || !room) {
          errors.push({
            reservation_id: reservation.id,
            error: 'Room not found'
          });
          continue;
        }

        const organizationId = room.properties?.organization_id;

        if (!organizationId) {
          errors.push({
            reservation_id: reservation.id,
            error: 'Organization not found for room'
          });
          continue;
        }

        // Update reservation with organization_id
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ organization_id: organizationId })
          .eq('id', reservation.id);

        if (updateError) {
          errors.push({
            reservation_id: reservation.id,
            error: updateError.message
          });
        } else {
          fixed++;
        }
      } catch (error) {
        errors.push({
          reservation_id: reservation.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixed} reservations`,
      fixed: fixed,
      total: reservations.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Fix organization error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
