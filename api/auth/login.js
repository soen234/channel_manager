const { supabase, getUserRole } = require('../_middleware');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Check user role and approval status
    const userRole = await getUserRole(data.user.id);

    if (!userRole) {
      // User doesn't have a role entry - create one as PENDING
      await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          email: data.user.email,
          role: 'PENDING',
          status: 'PENDING'
        });

      return res.status(403).json({
        error: 'Account pending approval',
        pending: true
      });
    }

    if (userRole.status === 'PENDING') {
      return res.status(403).json({
        error: 'Account pending approval. Please wait for admin approval.',
        pending: true
      });
    }

    if (userRole.status === 'DEACTIVATED' || userRole.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Account has been deactivated. Please contact administrator.',
        deactivated: true
      });
    }

    res.json({
      user: data.user,
      session: data.session,
      role: userRole.role,
      status: userRole.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
