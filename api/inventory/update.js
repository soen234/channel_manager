const { requireApproved, supabase } = require('../_middleware');

/**
 * Update inventory for a specific room and date
 * POST /api/inventory/update
 * Body: { room_id, date, available, total }
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
    const { room_id, date, available, total } = req.body;

    if (!room_id || !date) {
      return res.status(400).json({ error: 'room_id and date are required' });
    }

    if (available === undefined || available === null) {
      return res.status(400).json({ error: 'available is required' });
    }

    // Verify room belongs to user's organization
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, properties(organization_id)')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.properties?.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get total rooms if not provided
    let totalRooms = total;
    if (totalRooms === undefined || totalRooms === null) {
      const { data: roomData, error: roomDataError } = await supabase
        .from('rooms')
        .select('total_rooms')
        .eq('id', room_id)
        .single();

      if (roomDataError) throw roomDataError;
      totalRooms = roomData.total_rooms || 1;
    }

    // Upsert inventory
    const { data, error } = await supabase
      .from('inventory')
      .upsert({
        room_id: room_id,
        date: date,
        available: parseInt(available),
        total: parseInt(totalRooms),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'room_id,date',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
