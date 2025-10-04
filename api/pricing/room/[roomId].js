const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { roomId } = req.query;
  const { startDate, endDate } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const where = { roomId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const pricing = await prisma.pricing.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    res.json(pricing);
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
