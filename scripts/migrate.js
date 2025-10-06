const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('🚀 Starting multi-tenant migration...\n');

  try {
    // Step 1: Get first available user
    console.log('Step 1: Finding user for organization owner...');
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, email')
      .limit(1);

    let ownerId, ownerEmail;

    if (userRoles && userRoles.length > 0) {
      ownerId = userRoles[0].user_id;
      ownerEmail = userRoles[0].email;
      console.log(`✅ Found user in user_roles: ${ownerEmail}`);
    } else {
      // Try auth.users
      const { data: { users } } = await supabase.auth.admin.listUsers();
      if (users && users.length > 0) {
        ownerId = users[0].id;
        ownerEmail = users[0].email;
        console.log(`✅ Found user in auth.users: ${ownerEmail}`);
      } else {
        throw new Error('No users found in database');
      }
    }

    // Step 2: Create default organization
    console.log('\nStep 2: Creating default organization...');
    const orgId = '00000000-0000-0000-0000-000000000001';

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single();

    if (existingOrg) {
      console.log('⚠️  Organization already exists, updating...');
      await supabase
        .from('organizations')
        .update({
          owner_user_id: ownerId,
          contact_email: ownerEmail
        })
        .eq('id', orgId);
    } else {
      const { error } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
          name: '기본 조직',
          owner_user_id: ownerId,
          contact_email: ownerEmail,
          status: 'ACTIVE'
        });

      if (error) throw error;
      console.log('✅ Organization created');
    }

    // Step 3: Update user_roles
    console.log('\nStep 3: Updating user_roles...');
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .update({
        organization_id: orgId,
        status: 'ACTIVE'
      })
      .is('organization_id', null);

    if (userRoleError) throw userRoleError;
    console.log('✅ User roles updated');

    // Set first user as OWNER
    await supabase
      .from('user_roles')
      .update({ role: 'OWNER' })
      .eq('user_id', ownerId);

    // Step 4: Update all data tables
    console.log('\nStep 4: Updating data tables...');

    const tables = [
      'properties',
      'rooms',
      'reservations',
      'guest_requests',
      'monthly_fixed_expenses',
      'supply_purchases',
      'other_taxes',
      'staff_attendance'
    ];

    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .update({ organization_id: orgId })
          .is('organization_id', null)
          .select('*', { count: 'exact', head: true });

        console.log(`✅ ${table}: ${count || 0} records updated`);
      } catch (error) {
        console.log(`⚠️  ${table}: skipped (table may not exist)`);
      }
    }

    // Step 5: Verification
    console.log('\n📊 Verification:');

    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    console.log(`Organizations: ${orgCount}`);

    const { count: roleCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    console.log(`User roles with org: ${roleCount}`);

    const { count: propCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    console.log(`Properties with org: ${propCount}`);

    const { count: roomCount } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    console.log(`Rooms with org: ${roomCount}`);

    const { count: resCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    console.log(`Reservations with org: ${resCount}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔑 Next steps:');
    console.log('1. Logout and login again to refresh your session');
    console.log('2. You should now have OWNER role in your organization');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate();
