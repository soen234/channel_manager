const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  if (req.method === 'GET') {
    try {
      const { start_date, end_date, staff_name } = req.query;

      let query = supabase
        .from('staff_attendance')
        .select('*')
        .order('work_date', { ascending: false });

      if (start_date) {
        query = query.gte('work_date', start_date);
      }

      if (end_date) {
        query = query.lte('work_date', end_date);
      }

      if (staff_name) {
        query = query.eq('staff_name', staff_name);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error('Failed to fetch staff attendance:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { staff_name, work_date, hours_worked, hourly_rate, notes } = req.body;

      if (!staff_name || !work_date || !hours_worked || !hourly_rate) {
        return res.status(400).json({ error: 'staff_name, work_date, hours_worked, and hourly_rate are required' });
      }

      const { data, error } = await supabase
        .from('staff_attendance')
        .insert({
          staff_name,
          work_date,
          hours_worked,
          hourly_rate,
          notes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error('Failed to add staff attendance:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const { error } = await supabase
        .from('staff_attendance')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete staff attendance:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
