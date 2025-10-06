const { requireApproved, supabase, canAccessProperty } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const { propertyId } = req.query;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  // Check if user has access to this property
  const hasAccess = await canAccessProperty(authResult.user.id, propertyId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this property' });
  }

  try {
    // GET - List all staff for this property
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('property_staff')
        .select(`
          *,
          properties:property_id (name)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails from auth.users
      const staffWithEmails = await Promise.all(
        (data || []).map(async (staff) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(staff.user_id);
          return {
            ...staff,
            email: user?.email || 'Unknown'
          };
        })
      );

      return res.json(staffWithEmails);
    }

    // POST - Add staff to property
    if (req.method === 'POST') {
      const { userId, role } = req.body;

      if (!userId || !role || !['ADMIN', 'STAFF'].includes(role)) {
        return res.status(400).json({ error: 'userId and role (ADMIN or STAFF) are required' });
      }

      const { data, error } = await supabase
        .from('property_staff')
        .insert({
          property_id: propertyId,
          user_id: userId,
          role,
          status: 'ACTIVE',
          approved_by: authResult.user.id,
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'User already assigned to this property' });
        }
        throw error;
      }

      return res.status(201).json(data);
    }

    // DELETE - Remove staff from property
    if (req.method === 'DELETE') {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { error } = await supabase
        .from('property_staff')
        .delete()
        .eq('property_id', propertyId)
        .eq('user_id', userId);

      if (error) throw error;

      return res.status(204).send();
    }

    // PUT - Update staff role
    if (req.method === 'PUT') {
      const { userId, role, status } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const updates = {};
      if (role && ['ADMIN', 'STAFF'].includes(role)) {
        updates.role = role;
      }
      if (status && ['ACTIVE', 'DEACTIVATED'].includes(status)) {
        updates.status = status;
      }

      const { data, error } = await supabase
        .from('property_staff')
        .update(updates)
        .eq('property_id', propertyId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Property staff API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
