const { authMiddleware, supabase } = require('./_middleware');

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { id, propertyId, roomId } = req.query;

  try {
    // GET /api/properties - List all properties
    if (req.method === 'GET' && !id && !propertyId) {
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          *,
          rooms (*),
          channel_mappings (*)
        `);

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

      const { data: property, error } = await supabase
        .from('properties')
        .insert([{ name, address, description }])
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
        .eq('id', id);

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
        .eq('property_id', propertyId);

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
        .select()
        .single();

      if (error) throw error;
      return res.json(room);
    }

    // DELETE /api/properties?propertyId=xxx&roomId=xxx (delete room)
    if (req.method === 'DELETE' && propertyId && roomId) {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      return res.status(204).send();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Properties API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
