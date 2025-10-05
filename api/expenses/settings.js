const { authMiddleware, supabase } = require('../_middleware');

/**
 * GET/PUT expense settings (commission rates, etc.)
 */
module.exports = async (req, res) => {
  const auth = await authMiddleware(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('expense_settings')
        .select('*');

      if (error) throw error;

      // Convert to key-value object
      const settings = {};
      data.forEach(item => {
        settings[item.setting_key] = item.setting_value;
      });

      res.json(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { setting_key, setting_value } = req.body;

      if (!setting_key || !setting_value) {
        return res.status(400).json({ error: 'setting_key and setting_value required' });
      }

      const { data, error } = await supabase
        .from('expense_settings')
        .upsert({
          setting_key,
          setting_value
        }, { onConflict: 'setting_key' })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
