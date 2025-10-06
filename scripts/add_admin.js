const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addAdmin() {
  const email = 'soen234@gmail.com';
  const orgId = '00000000-0000-0000-0000-000000000001';

  console.log(`🔍 Looking for user: ${email}`);

  try {
    // Find user in auth.users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found in auth.users');
      console.log('💡 User needs to sign up first at your app');
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Check if user_role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingRole) {
      // Update existing role
      console.log('📝 Updating existing role...');
      const { error } = await supabase
        .from('user_roles')
        .update({
          organization_id: orgId,
          role: 'ADMIN',
          status: 'ACTIVE',
          approved_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('✅ User role updated to ADMIN');
    } else {
      // Create new role
      console.log('📝 Creating new user role...');
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: orgId,
          email: email,
          role: 'ADMIN',
          status: 'ACTIVE',
          approved_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log('✅ User role created as ADMIN');
    }

    // Verify
    const { data: finalRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('\n📊 Final role status:');
    console.log(`Email: ${finalRole.email}`);
    console.log(`Role: ${finalRole.role}`);
    console.log(`Status: ${finalRole.status}`);
    console.log(`Organization ID: ${finalRole.organization_id}`);

    console.log('\n✅ Done! User can now login as ADMIN');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

addAdmin();
