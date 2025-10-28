const { requireApproved, supabase } = require('../_middleware');

/**
 * Sync inventory with current reservations
 * POST /api/inventory/sync
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get all properties and rooms for this organization
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, rooms(*)')
      .eq('organization_id', organizationId);

    if (propError) throw propError;

    // Get all active reservations in date range
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, room_id, check_in, check_out, status')
      .eq('organization_id', organizationId)
      .neq('status', 'CANCELLED')
      .gte('check_out', startDate)
      .lte('check_in', endDate);

    if (resError) throw resError;

    // Build date range
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Calculate inventory for each room and date
    const inventoryUpdates = [];

    for (const property of properties) {
      if (!property.rooms) continue;

      for (const room of property.rooms) {
        const totalRooms = room.total_rooms || 1;

        for (const date of dates) {
          // Count reservations for this room on this date
          const occupiedCount = reservations.filter(res => {
            if (res.room_id !== room.id) return false;

            const checkIn = new Date(res.check_in).toISOString().split('T')[0];
            const checkOut = new Date(res.check_out).toISOString().split('T')[0];

            // Check if date falls between check-in and check-out (excluding check-out day)
            return date >= checkIn && date < checkOut;
          }).length;

          const available = totalRooms - occupiedCount;

          inventoryUpdates.push({
            room_id: room.id,
            date: date,
            available: available,
            total: totalRooms
          });
        }
      }
    }

    // Upsert inventory records
    const { error: upsertError } = await supabase
      .from('inventory')
      .upsert(inventoryUpdates, {
        onConflict: 'room_id,date',
        ignoreDuplicates: false
      });

    if (upsertError) throw upsertError;

    res.json({
      success: true,
      message: 'Inventory synchronized successfully',
      updated: inventoryUpdates.length
    });

  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
