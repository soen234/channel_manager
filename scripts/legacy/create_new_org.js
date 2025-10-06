const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createNewOrgForUser() {
  const email = 'ggg0531@gmail.com';

  console.log(`🔍 Looking for user: ${email}`);

  try {
    // Find user in auth.users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Create new organization for this user
    console.log('\n📝 Creating new organization...');
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'GGG의 숙소',
        owner_user_id: user.id,
        contact_email: email,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log(`✅ Organization created: ${newOrg.id}`);
    console.log(`   Name: ${newOrg.name}`);

    // Update user role to point to new organization
    console.log('\n📝 Updating user role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({
        organization_id: newOrg.id,
        role: 'OWNER',
        status: 'ACTIVE'
      })
      .eq('user_id', user.id);

    if (roleError) throw roleError;
    console.log('✅ User role updated to OWNER of new organization');

    // Verify
    const { data: finalRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('\n📊 Final status:');
    console.log(`Email: ${finalRole.email}`);
    console.log(`Role: ${finalRole.role}`);
    console.log(`Status: ${finalRole.status}`);
    console.log(`Organization ID: ${finalRole.organization_id}`);
    console.log(`Organization Name: ${newOrg.name}`);

    console.log('\n✅ Done!');
    console.log('⚠️  Note: This user now has their own organization.');
    console.log('   All their data is now isolated from other organizations.');
    console.log('   They need to logout and login again to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

createNewOrgForUser();
