// Helper function to generate unique 6-digit invite code
async function generateUniqueInviteCode(supabase) {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }
  throw new Error('Failed to generate unique invite code');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import inside handler to get better error messages
    const { supabase } = require('../_middleware');
    const { email, password, signupType, organizationName, inviteCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Attempting signup for:', email, 'Type:', signupType);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,  // Disable email confirmation
        data: {
          email_confirm: false
        }
      }
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Signup successful:', data.user?.id);

    if (data.user) {
      // Check if user_roles entry already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (existingRole) {
        console.log('User role already exists:', existingRole);
        // Return existing role info
        return res.json({
          user: data.user,
          session: data.session,
          role: existingRole.role,
          status: existingRole.status,
          organization_id: existingRole.organization_id,
          message: 'Account already exists'
        });
      }

      if (signupType === 'owner') {
        // Create new organization for owner
        const orgName = organizationName || `${email.split('@')[0]}의 숙소`;

        // Generate unique invite code
        const inviteCodeGenerated = await generateUniqueInviteCode(supabase);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            owner_user_id: data.user.id,
            contact_email: email,
            status: 'ACTIVE',
            invite_code: inviteCodeGenerated
          })
          .select()
          .single();

        if (orgError) {
          console.error('Failed to create organization:', orgError);
          return res.status(500).json({ error: 'Failed to create organization' });
        }

        // Create user role as OWNER
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            organization_id: orgData.id,
            email: data.user.email,
            role: 'OWNER',
            status: 'ACTIVE',
            approved_at: new Date().toISOString()
          });

        if (roleError) {
          console.error('Failed to create user role:', roleError);
          return res.status(500).json({ error: 'Failed to create user role' });
        }

        console.log('Created organization:', orgData.id, 'for owner:', data.user.id);

        // Return with session for auto-login
        return res.json({
          user: data.user,
          session: data.session,
          role: 'OWNER',
          status: 'ACTIVE',
          organization_id: orgData.id,
          message: 'Organization created successfully'
        });
      } else {
        // Staff signup - invite code is required
        if (!inviteCode) {
          return res.status(400).json({
            error: '스태프로 가입하려면 초대 코드가 필요합니다.'
          });
        }

        // Verify invite code (6-digit property code)
        const { data: property, error: propError } = await supabase
          .from('properties')
          .select('id, name, organization_id')
          .eq('invite_code', inviteCode)
          .single();

        if (propError || !property) {
          return res.status(400).json({
            error: '유효하지 않은 초대 코드입니다.'
          });
        }

        // Create property_staff entry (auto-approved)
        const { error: staffError } = await supabase
          .from('property_staff')
          .insert({
            property_id: property.id,
            user_id: data.user.id,
            role: 'STAFF',
            status: 'ACTIVE',
            approved_at: new Date().toISOString()
          });

        if (staffError) {
          console.error('Failed to create property_staff:', staffError);
          return res.status(500).json({ error: 'Failed to assign to property' });
        }

        // Also create a basic user_roles entry for authentication
        // (with role 'STAFF' at org level for backward compatibility)
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            organization_id: property.organization_id,
            email: data.user.email,
            role: 'STAFF',
            status: 'ACTIVE',
            approved_at: new Date().toISOString()
          });

        if (roleError && roleError.code !== '23505') { // Ignore duplicate
          console.error('Failed to create user role:', roleError);
        }

        // Return with session for auto-login
        return res.json({
          user: data.user,
          session: data.session,
          role: 'STAFF',
          status: 'ACTIVE',
          organization_id: property.organization_id,
          property_id: property.id,
          message: `${property.name}에 스태프로 가입되었습니다.`
        });
      }
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Signup successful'
    });
  } catch (error) {
    console.error('Signup handler error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};
