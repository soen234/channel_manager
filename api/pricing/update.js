const { requireApproved, supabase } = require('../_middleware');

/**
 * Update pricing for a specific room and date
 * POST /api/pricing/update
 * Body: { room_id, date, price }
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
    const { room_id, date, price } = req.body;

    if (!room_id || !date) {
      return res.status(400).json({ error: 'room_id and date are required' });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ error: 'price is required' });
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

    // Upsert pricing
    const { data, error } = await supabase
      .from('pricing')
      .upsert({
        room_id: room_id,
        date: date,
        price: parseFloat(price),
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
    console.error('Pricing update error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
