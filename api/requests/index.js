const { requireApproved, requireAdmin, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  if (req.method === 'GET') {
    try {
      const { reservation_id, status } = req.query;

      let query = supabase
        .from('guest_requests')
        .select(`
          *,
          reservations (
            id,
            guest_name,
            check_in,
            check_out,
            rooms (
              id,
              name,
              properties (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (reservation_id) {
        query = query.eq('reservation_id', reservation_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    // Only admins can create requests
    const adminResult = await requireAdmin(req, res);
    if (adminResult.error) {
      return res.status(adminResult.status).json({ error: adminResult.error });
    }

    try {
      const { reservation_id, request_type, description, additional_payment } = req.body;

      if (!reservation_id || !request_type) {
        return res.status(400).json({ error: 'reservation_id and request_type are required' });
      }

      const { data, error } = await supabase
        .from('guest_requests')
        .insert({
          reservation_id,
          request_type,
          description,
          additional_payment: additional_payment || 0,
          created_by: authResult.user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error('Failed to create request:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
