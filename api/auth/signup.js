module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import inside handler to get better error messages
    const { supabase } = require('../_middleware');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Attempting signup for:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Signup successful:', data.user?.id);

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Signup handler error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};
