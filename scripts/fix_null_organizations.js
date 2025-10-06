const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixNullOrganizations() {
  console.log('🔍 Checking for users with null organization_id...\n');

  try {
    // Find all user_roles with null organization_id
    const { data: nullOrgUsers, error: fetchError } = await supabase
      .from('user_roles')
      .select('*')
      .is('organization_id', null);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${nullOrgUsers.length} users with null organization_id\n`);

    if (nullOrgUsers.length === 0) {
      console.log('✅ No users with null organization_id found!');
      return;
    }

    // Show the users
    nullOrgUsers.forEach(user => {
      console.log(`  - ${user.email} (role: ${user.role}, status: ${user.status})`);
    });

    console.log('\n🗑️  Options:');
    console.log('1. Delete PENDING users with null organization_id (recommended)');
    console.log('2. Keep them for manual review');
    console.log('\nDeleting PENDING users with null organization_id...\n');

    // Delete PENDING users with null organization_id
    const { data: deleted, error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .is('organization_id', null)
      .eq('status', 'PENDING')
      .select();

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError);
      return;
    }

    console.log(`✅ Deleted ${deleted?.length || 0} PENDING users with null organization_id`);

    if (deleted && deleted.length > 0) {
      deleted.forEach(user => {
        console.log(`  - Deleted: ${user.email}`);
      });
    }

    // Check if there are any remaining non-PENDING users with null org
    const { data: remaining } = await supabase
      .from('user_roles')
      .select('*')
      .is('organization_id', null);

    if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  WARNING: ${remaining.length} non-PENDING users still have null organization_id`);
      console.log('These need manual review:');
      remaining.forEach(user => {
        console.log(`  - ${user.email} (role: ${user.role}, status: ${user.status})`);
      });
    } else {
      console.log('\n✅ All users now have organization_id assigned!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixNullOrganizations();
