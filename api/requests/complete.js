const { requireStaff, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireStaff(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const { data, error } = await supabase
      .from('guest_requests')
      .update({
        status: 'COMPLETED',
        completed_by: authResult.user.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to complete request:', error);
    res.status(500).json({ error: error.message });
  }
};
