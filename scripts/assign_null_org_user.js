const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Assign elehedge@gmail.com to default organization
const USER_EMAIL = 'elehedge@gmail.com';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function assignUser() {
  console.log(`🔧 Assigning ${USER_EMAIL} to default organization...\n`);

  try {
    // Check if default org exists
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', DEFAULT_ORG_ID)
      .single();

    if (!org) {
      console.log('❌ Default organization not found. Available organizations:');
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*');

      orgs?.forEach(o => {
        console.log(`  - ${o.name} (${o.id})`);
      });
      return;
    }

    console.log(`✓ Found organization: ${org.name}`);

    // Update user_roles
    const { data: updated, error } = await supabase
      .from('user_roles')
      .update({
        organization_id: DEFAULT_ORG_ID
      })
      .eq('email', USER_EMAIL)
      .is('organization_id', null)
      .select();

    if (error) {
      console.error('❌ Error updating user:', error);
      return;
    }

    console.log(`✅ Successfully assigned ${USER_EMAIL} to ${org.name}`);
    console.log(`   Updated ${updated?.length || 0} record(s)`);

    // Verify
    const { data: verify } = await supabase
      .from('user_roles')
      .select('*')
      .is('organization_id', null);

    if (verify && verify.length > 0) {
      console.log(`\n⚠️  Still ${verify.length} users with null organization_id`);
    } else {
      console.log('\n✅ All users now have organization_id!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

assignUser();
