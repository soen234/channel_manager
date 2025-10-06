const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixGggOrg() {
  try {
    const email = 'ggg0531@gmail.com';
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    console.log('🔧 Moving ggg0531@gmail.com back to default organization...');

    // Update user role
    const { error } = await supabase
      .from('user_roles')
      .update({
        organization_id: defaultOrgId,
        role: 'OWNER'
      })
      .eq('email', email);

    if (error) throw error;

    console.log('✅ User moved to default organization');

    // Delete the empty organization
    const emptyOrgId = '13566961-0363-415c-b3fb-d706abfa2027';
    const { error: delError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', emptyOrgId);

    if (delError) {
      console.log('⚠️  Could not delete empty org (may have references)');
    } else {
      console.log('✅ Empty organization deleted');
    }

    console.log('\n✅ Done! Now both users are in the same organization:');
    console.log('  - soen234@gmail.com: ADMIN');
    console.log('  - ggg0531@gmail.com: OWNER');
    console.log('\nBoth can see all properties, rooms, and reservations.');
    console.log('\n🔄 Please logout and login again!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixGggOrg();
