const { requireApproved, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, invite_code, contact_email, contact_phone, business_number, status')
      .eq('id', organizationId)
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to fetch organization info:', error);
    res.status(500).json({ error: error.message });
  }
};
