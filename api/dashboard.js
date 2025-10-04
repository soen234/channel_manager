const { authMiddleware, supabase } = require('./_middleware');

module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [
      { count: todayCheckIns },
      { count: todayCheckOuts },
      { count: nextMonthReservations },
      { count: totalProperties },
      { data: recentReservations },
      { data: channelStats }
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('check_in', today)
        .lt('check_in', tomorrow),

      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('check_out', today)
        .lt('check_out', tomorrow),

      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('check_in', today)
        .lt('check_in', nextMonth),

      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('reservations')
        .select(`
          *,
          rooms (
            *,
            properties (*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('reservations')
        .select('channel')
    ]);

    // Group by channel
    const channelGroups = {};
    if (channelStats) {
      channelStats.forEach(r => {
        channelGroups[r.channel] = (channelGroups[r.channel] || 0) + 1;
      });
    }

    res.json({
      todayCheckIns: todayCheckIns || 0,
      todayCheckOuts: todayCheckOuts || 0,
      nextMonthReservations: nextMonthReservations || 0,
      totalProperties: totalProperties || 0,
      recentReservations: recentReservations || [],
      channelStats: Object.entries(channelGroups).map(([channel, count]) => ({
        channel,
        _count: count
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
