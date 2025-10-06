const { requireAdmin, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;
  const { date } = req.query;

  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const nextDay = new Date(new Date(targetDate).getTime() + 86400000).toISOString().split('T')[0];

    // Get all properties in organization
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId);

    const propertyIds = properties?.map(p => p.id) || [];

    // Get all rooms in those properties
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .in('property_id', propertyIds);

    const roomIds = rooms?.map(r => r.id) || [];

    // Get checkout reservations for the date
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          id,
          name,
          properties (
            id,
            name
          )
        )
      `)
      .in('room_id', roomIds)
      .gte('check_out', targetDate)
      .lt('check_out', nextDay)
      .in('status', ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])
      .order('check_out', { ascending: true });

    if (error) throw error;

    // Get cleaner names
    const cleanerIds = [...new Set(reservations.filter(r => r.cleaned_by).map(r => r.cleaned_by))];

    let cleanerMap = {};
    if (cleanerIds.length > 0) {
      const { data: cleaners } = await supabase
        .from('user_roles')
        .select('user_id, email')
        .in('user_id', cleanerIds);

      if (cleaners) {
        cleaners.forEach(c => { cleanerMap[c.user_id] = c.email; });
      }
    }

    // Enrich with cleaner names
    const enrichedData = reservations.map(res => ({
      ...res,
      cleaner_name: res.cleaned_by ? cleanerMap[res.cleaned_by] : null
    }));

    res.json(enrichedData || []);
  } catch (error) {
    console.error('Failed to fetch cleaning status:', error);
    res.status(500).json({ error: error.message });
  }
};
