const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  try {
    console.log('📊 Checking database state...\n');

    // Check organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*');

    console.log('Organizations:');
    orgs?.forEach(org => {
      console.log(`  - ${org.name} (${org.id})`);
    });

    // Check user_roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('email, role, organization_id');

    console.log('\nUser Roles:');
    roles?.forEach(role => {
      console.log(`  - ${role.email}: ${role.role} (org: ${role.organization_id})`);
    });

    // Check properties with org
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, organization_id');

    console.log('\nProperties:');
    properties?.forEach(prop => {
      console.log(`  - ${prop.name} (org: ${prop.organization_id || 'NULL'})`);
    });

    // Check rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, organization_id');

    console.log('\nRooms:');
    console.log(`  Total: ${rooms?.length || 0}`);
    const withOrg = rooms?.filter(r => r.organization_id).length || 0;
    const withoutOrg = rooms?.filter(r => !r.organization_id).length || 0;
    console.log(`  With org_id: ${withOrg}`);
    console.log(`  Without org_id: ${withoutOrg}`);

    // Check reservations
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, organization_id');

    console.log('\nReservations:');
    console.log(`  Total: ${reservations?.length || 0}`);
    const resWithOrg = reservations?.filter(r => r.organization_id).length || 0;
    const resWithoutOrg = reservations?.filter(r => !r.organization_id).length || 0;
    console.log(`  With org_id: ${resWithOrg}`);
    console.log(`  Without org_id: ${resWithoutOrg}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
