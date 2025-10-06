const { requireStaff, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireStaff(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const userId = authResult.userId;
  const { reservation_id } = req.query;

  if (!reservation_id) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        cleaning_status: 'COMPLETED',
        cleaned_at: new Date().toISOString(),
        cleaned_by: userId
      })
      .eq('id', reservation_id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Failed to mark cleaning complete:', error);
    res.status(500).json({ error: error.message });
  }
};
