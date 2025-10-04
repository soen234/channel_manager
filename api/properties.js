const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('./_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { id, propertyId, roomId } = req.query;
  const urlPath = req.url.split('?')[0];

  try {
    // GET /api/properties - List all properties
    if (req.method === 'GET' && !id && !propertyId) {
      const properties = await prisma.property.findMany({
        include: {
          rooms: true,
          channelMappings: true
        }
      });
      return res.json(properties);
    }

    // GET /api/properties?id=xxx - Get single property
    if (req.method === 'GET' && id) {
      const property = await prisma.property.findUnique({
        where: { id },
        include: {
          rooms: {
            include: {
              channelRoomMappings: true
            }
          },
          channelMappings: true
        }
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      return res.json(property);
    }

    // POST /api/properties - Create property
    if (req.method === 'POST' && !propertyId) {
      const { name, address, description } = req.body;
      const property = await prisma.property.create({
        data: { name, address, description }
      });
      return res.status(201).json(property);
    }

    // PUT /api/properties?id=xxx - Update property
    if (req.method === 'PUT' && id) {
      const { name, address, description } = req.body;
      const property = await prisma.property.update({
        where: { id },
        data: { name, address, description }
      });
      return res.json(property);
    }

    // DELETE /api/properties?id=xxx - Delete property
    if (req.method === 'DELETE' && id) {
      await prisma.property.delete({ where: { id } });
      return res.status(204).send();
    }

    // GET /api/properties?propertyId=xxx (rooms list)
    if (req.method === 'GET' && propertyId && !roomId) {
      const rooms = await prisma.room.findMany({
        where: { propertyId },
        include: {
          channelRoomMappings: true
        }
      });
      return res.json(rooms);
    }

    // POST /api/properties?propertyId=xxx (create room)
    if (req.method === 'POST' && propertyId) {
      const { name, type, totalRooms, capacity, basePrice } = req.body;
      const room = await prisma.room.create({
        data: {
          propertyId,
          name,
          type,
          totalRooms: totalRooms || 1,
          capacity,
          basePrice
        }
      });
      return res.status(201).json(room);
    }

    // PUT /api/properties?propertyId=xxx&roomId=xxx (update room)
    if (req.method === 'PUT' && propertyId && roomId) {
      const { name, type, totalRooms, capacity, basePrice } = req.body;
      const room = await prisma.room.update({
        where: { id: roomId },
        data: {
          name,
          type,
          ...(totalRooms !== undefined && { totalRooms }),
          capacity,
          basePrice
        }
      });
      return res.json(room);
    }

    // DELETE /api/properties?propertyId=xxx&roomId=xxx (delete room)
    if (req.method === 'DELETE' && propertyId && roomId) {
      await prisma.room.delete({ where: { id: roomId } });
      return res.status(204).send();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Properties API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
