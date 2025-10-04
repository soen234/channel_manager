const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { propertyId } = req.query;

  try {
    if (req.method === 'GET') {
      const rooms = await prisma.room.findMany({
        where: { propertyId },
        include: {
          channelRoomMappings: true
        }
      });
      return res.json(rooms);
    }

    if (req.method === 'POST') {
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

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
