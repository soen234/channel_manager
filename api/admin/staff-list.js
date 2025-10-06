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

  try {
    // Get all properties in this organization
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (propError) throw propError;

    const propertyIds = properties.map(p => p.id);
    const propertyMap = {};
    properties.forEach(p => { propertyMap[p.id] = p.name; });

    // Get property_staff for all properties in this organization
    const { data: staffList, error } = await supabase
      .from('property_staff')
      .select(`
        *,
        properties!inner (
          id,
          name,
          organization_id
        )
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user emails from user_roles table
    const userIds = [...new Set(staffList.map(s => s.user_id))];

    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, email')
      .in('user_id', userIds);

    const userMap = {};
    if (userRoles) {
      userRoles.forEach(u => { userMap[u.user_id] = u.email; });
    }

    // Add property name and email to each staff record
    const enrichedStaff = staffList.map(staff => ({
      ...staff,
      property_name: staff.properties.name,
      email: userMap[staff.user_id] || 'Unknown'
    }));

    res.json(enrichedStaff || []);
  } catch (error) {
    console.error('Failed to fetch staff list:', error);
    res.status(500).json({ error: error.message });
  }
};
