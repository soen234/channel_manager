const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    if (req.method === 'GET') {
      const properties = await prisma.property.findMany({
        include: {
          rooms: true,
          channelMappings: true
        }
      });
      return res.json(properties);
    }

    if (req.method === 'POST') {
      const { name, address, description } = req.body;
      const property = await prisma.property.create({
        data: { name, address, description }
      });
      return res.status(201).json(property);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
