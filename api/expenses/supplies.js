const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  if (req.method === 'GET') {
    try {
      const { start_date, end_date, year_month } = req.query;

      let query = supabase
        .from('supply_purchases')
        .select('*')
        .eq('organization_id', organizationId)
        .order('purchase_date', { ascending: false });

      // Support year_month parameter (YYYY-MM format)
      if (year_month) {
        const [year, month] = year_month.split('-');
        const firstDay = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        query = query.gte('purchase_date', firstDay).lte('purchase_date', lastDayStr);
      } else {
        if (start_date) {
          query = query.gte('purchase_date', start_date);
        }

        if (end_date) {
          query = query.lte('purchase_date', end_date);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error('Failed to fetch supply purchases:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { purchase_date, item_name, store, amount, category, notes } = req.body;

      if (!purchase_date || !item_name || !amount) {
        return res.status(400).json({ error: 'purchase_date, item_name, and amount are required' });
      }

      const { data, error } = await supabase
        .from('supply_purchases')
        .insert({
          organization_id: organizationId,
          purchase_date,
          item_name,
          store,
          amount,
          category,
          notes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error('Failed to add supply purchase:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const { error } = await supabase
        .from('supply_purchases')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete supply purchase:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
