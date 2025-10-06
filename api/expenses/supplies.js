const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  if (req.method === 'GET') {
    try {
      const { start_date, end_date } = req.query;

      let query = supabase
        .from('supply_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (start_date) {
        query = query.gte('purchase_date', start_date);
      }

      if (end_date) {
        query = query.lte('purchase_date', end_date);
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
        .eq('id', id);

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
