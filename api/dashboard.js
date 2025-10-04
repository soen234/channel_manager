const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('./_middleware');

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [
      todayCheckIns,
      todayCheckOuts,
      nextMonthReservations,
      totalProperties,
      recentReservations,
      channelStats
    ] = await Promise.all([
      prisma.reservation.count({
        where: {
          checkIn: { gte: today, lt: tomorrow }
        }
      }),
      prisma.reservation.count({
        where: {
          checkOut: { gte: today, lt: tomorrow }
        }
      }),
      prisma.reservation.count({
        where: {
          checkIn: { gte: today, lt: nextMonth }
        }
      }),
      prisma.property.count(),
      prisma.reservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          room: {
            include: {
              property: true
            }
          }
        }
      }),
      prisma.reservation.groupBy({
        by: ['channel'],
        _count: true
      })
    ]);

    res.json({
      todayCheckIns,
      todayCheckOuts,
      nextMonthReservations,
      totalProperties,
      recentReservations,
      channelStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
