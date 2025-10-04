const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channel, status, startDate, endDate, limit } = req.query;

    const where = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = new Date(startDate);
      if (endDate) where.checkIn.lte = new Date(endDate);
    }

    const reservations = await prisma.reservation.findMany({
      where,
      ...(limit && { take: parseInt(limit) }),
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          include: {
            property: true
          }
        }
      }
    });

    res.json(reservations);
  } catch (error) {
    console.error('Reservations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
