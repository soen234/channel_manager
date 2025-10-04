const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../../../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { roomId } = req.query;

  try {
    if (req.method === 'PUT') {
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

    if (req.method === 'DELETE') {
      await prisma.room.delete({ where: { id: roomId } });
      return res.status(204).send();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
