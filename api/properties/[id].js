const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../_middleware');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
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

    if (req.method === 'PUT') {
      const { name, address, description } = req.body;
      const property = await prisma.property.update({
        where: { id },
        data: { name, address, description }
      });
      return res.json(property);
    }

    if (req.method === 'DELETE') {
      await prisma.property.delete({ where: { id } });
      return res.status(204).send();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
