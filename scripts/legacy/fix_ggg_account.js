const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixAccount() {
  const email = 'ggg0531@gmail.com';
  const orgId = '13566961-0363-415c-b3fb-d706abfa2027'; // The new org that was created

  try {
    // Find user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Check if user_role exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRole) {
      console.log('📝 Updating existing user_role...');
      const { error } = await supabase
        .from('user_roles')
        .update({
          organization_id: orgId,
          role: 'OWNER',
          status: 'ACTIVE',
          approved_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('✅ User role updated');
    } else {
      console.log('📝 Creating new user_role...');
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: orgId,
          email: email,
          role: 'OWNER',
          status: 'ACTIVE',
          approved_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log('✅ User role created');
    }

    // Verify final status
    const { data: finalRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    console.log('\n📊 Final Configuration:');
    console.log(`User: ${finalRole.email}`);
    console.log(`Role: ${finalRole.role}`);
    console.log(`Status: ${finalRole.status}`);
    console.log(`Organization: ${org.name} (${org.id})`);

    console.log('\n✅ All done!');
    console.log('🔄 User needs to logout and login again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

fixAccount();
