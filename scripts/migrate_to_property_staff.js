const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function migrateToPropertyStaff() {
  console.log('🔧 Migrating to property-based staff system...\n');

  try {
    // 1. Generate invite codes for all properties
    console.log('📝 Step 1: Generating invite codes for properties...');
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError);
      return;
    }

    console.log(`✓ Found ${properties.length} properties\n`);

    const usedCodes = new Set();

    for (const property of properties) {
      if (property.invite_code) {
        console.log(`  ✓ ${property.name} already has code: ${property.invite_code}`);
        usedCodes.add(property.invite_code);
        continue;
      }

      let newCode;
      let attempts = 0;

      do {
        newCode = generateInviteCode();
        attempts++;
      } while (usedCodes.has(newCode) && attempts < 100);

      if (attempts < 100) {
        usedCodes.add(newCode);

        const { error: updateError } = await supabase
          .from('properties')
          .update({ invite_code: newCode })
          .eq('id', property.id);

        if (updateError) {
          console.error(`❌ Error updating ${property.name}:`, updateError);
        } else {
          console.log(`  ✅ ${property.name}: ${newCode}`);
        }
      }
    }

    // 2. Migrate existing ADMIN and STAFF users to property_staff
    console.log('\n📝 Step 2: Migrating ADMIN/STAFF to property_staff...');

    const { data: staffUsers, error: staffError } = await supabase
      .from('user_roles')
      .select('*')
      .in('role', ['ADMIN', 'STAFF'])
      .eq('status', 'ACTIVE');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError);
      return;
    }

    console.log(`✓ Found ${staffUsers?.length || 0} staff/admin users\n`);

    for (const user of staffUsers || []) {
      // Get all properties for this user's organization
      const { data: orgProperties } = await supabase
        .from('properties')
        .select('id, name')
        .eq('organization_id', user.organization_id);

      console.log(`  User: ${user.email} (${user.role})`);
      console.log(`    Organization has ${orgProperties?.length || 0} properties`);

      // Assign to all properties in the organization
      for (const prop of orgProperties || []) {
        const { error: insertError } = await supabase
          .from('property_staff')
          .insert({
            property_id: prop.id,
            user_id: user.user_id,
            role: user.role,
            status: 'ACTIVE',
            approved_by: user.approved_by,
            approved_at: user.approved_at
          });

        if (insertError) {
          // Check if already exists
          if (insertError.code === '23505') {
            console.log(`    ⚠️  Already assigned to ${prop.name}`);
          } else {
            console.error(`    ❌ Error assigning to ${prop.name}:`, insertError);
          }
        } else {
          console.log(`    ✅ Assigned to ${prop.name}`);
        }
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\n📋 Summary:');

    const { data: finalProps } = await supabase
      .from('properties')
      .select('name, invite_code')
      .order('name');

    console.log('\nProperty Invite Codes:');
    finalProps?.forEach(prop => {
      console.log(`  ${prop.name}: ${prop.invite_code}`);
    });

    const { data: staffCount } = await supabase
      .from('property_staff')
      .select('id', { count: 'exact' });

    console.log(`\nTotal property_staff assignments: ${staffCount?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

migrateToPropertyStaff();
