const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  if (req.method === 'GET') {
    try {
      const { year_month } = req.query;

      if (!year_month) {
        return res.status(400).json({ error: 'year_month is required' });
      }

      const { data, error } = await supabase
        .from('monthly_fixed_expenses')
        .select('*')
        .eq('year_month', year_month)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      res.json(data || null);
    } catch (error) {
      console.error('Failed to fetch fixed expenses:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { year_month, expenses } = req.body;

      if (!year_month || !expenses) {
        return res.status(400).json({ error: 'year_month and expenses are required' });
      }

      // Upsert (insert or update)
      const { data, error } = await supabase
        .from('monthly_fixed_expenses')
        .upsert({
          year_month,
          organization_id: organizationId,
          ...expenses
        }, {
          onConflict: 'organization_id,year_month'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error('Failed to save fixed expenses:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
