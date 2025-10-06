const { requireApproved, supabase, getUserContext } = require('./_middleware');

// Helper function to generate unique 6-digit invite code for property
async function generatePropertyInviteCode() {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }
  throw new Error('Failed to generate unique invite code');
}

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;
  const { id, propertyId, roomId } = req.query;

  try {
    // GET /api/properties - List all properties for this organization
    if (req.method === 'GET' && !id && !propertyId) {
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          *,
          rooms (*),
          channel_mappings (*)
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.json(properties || []);
    }

    // GET /api/properties?id=xxx - Get single property
    if (req.method === 'GET' && id) {
      const { data: property, error } = await supabase
        .from('properties')
        .select(`
          *,
          rooms (
            *,
            channel_room_mappings (*)
          ),
          channel_mappings (*)
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Property not found' });
        }
        throw error;
      }

      return res.json(property);
    }

    // POST /api/properties - Create property
    if (req.method === 'POST' && !propertyId) {
      const { name, address, description } = req.body;

      // Generate unique invite code
      const inviteCode = await generatePropertyInviteCode();

      const { data: property, error } = await supabase
        .from('properties')
        .insert([{
          name,
          address,
          description,
          organization_id: organizationId,
          invite_code: inviteCode
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(property);
    }

    // PUT /api/properties?id=xxx - Update property
    if (req.method === 'PUT' && id) {
      const { name, address, description } = req.body;

      const { data: property, error } = await supabase
        .from('properties')
        .update({ name, address, description })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return res.json(property);
    }

    // DELETE /api/properties?id=xxx - Delete property
    if (req.method === 'DELETE' && id) {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.status(204).send();
    }

    // GET /api/properties?propertyId=xxx (rooms list)
    if (req.method === 'GET' && propertyId && !roomId) {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          channel_room_mappings (*)
        `)
        .eq('property_id', propertyId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.json(rooms || []);
    }

    // POST /api/properties?propertyId=xxx (create room)
    if (req.method === 'POST' && propertyId) {
      const { name, type, totalRooms, capacity, basePrice } = req.body;

      const { data: room, error } = await supabase
        .from('rooms')
        .insert([{
          property_id: propertyId,
          organization_id: organizationId,
          name,
          type,
          total_rooms: totalRooms || 1,
          capacity,
          base_price: basePrice
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(room);
    }

    // PUT /api/properties?propertyId=xxx&roomId=xxx (update room)
    if (req.method === 'PUT' && propertyId && roomId) {
      const { name, type, totalRooms, capacity, basePrice } = req.body;

      const updateData = {
        name,
        type,
        capacity,
        base_price: basePrice
      };

      if (totalRooms !== undefined) {
        updateData.total_rooms = totalRooms;
      }

      const { data: room, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return res.json(room);
    }

    // DELETE /api/properties?propertyId=xxx&roomId=xxx (delete room)
    if (req.method === 'DELETE' && propertyId && roomId) {
      // Check if room has any reservations (including all statuses)
      const { data: reservations, error: checkError } = await supabase
        .from('reservations')
        .select('id, status, guest_name, check_in, check_out')
        .eq('room_id', roomId);

      if (checkError) {
        console.error('Error checking reservations:', checkError);
        throw checkError;
      }

      console.log(`Room ${roomId} has ${reservations?.length || 0} reservations:`, reservations);

      if (reservations && reservations.length > 0) {
        const activeReservations = reservations.filter(r => r.status !== 'CANCELLED');

        return res.status(400).json({
          error: `이 객실에는 ${reservations.length}개의 예약 내역이 있어 삭제할 수 없습니다. 먼저 예약을 삭제하거나 다른 객실로 이동시켜주세요.`,
          reservationCount: reservations.length,
          activeCount: activeReservations.length
        });
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error deleting room:', error);
        if (error.code === '23503') {
          // Foreign key constraint violation
          return res.status(400).json({
            error: '이 객실에는 예약 내역이 있어 삭제할 수 없습니다. 데이터베이스 관계로 인해 삭제가 제한됩니다.'
          });
        }
        throw error;
      }

      return res.status(204).send();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Properties API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
