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

      let query = supabase
        .from('other_taxes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (year_month) {
        query = query.eq('year_month', year_month);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error('Failed to fetch other taxes:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { year_month, tax_name, amount, notes } = req.body;

      if (!year_month || !tax_name || !amount) {
        return res.status(400).json({ error: 'year_month, tax_name, and amount are required' });
      }

      const { data, error } = await supabase
        .from('other_taxes')
        .insert({
          organization_id: organizationId,
          year_month,
          tax_name,
          amount,
          notes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error('Failed to add tax:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const { error } = await supabase
        .from('other_taxes')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete tax:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
