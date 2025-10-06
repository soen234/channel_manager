const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function addInviteCodes() {
  console.log('🔧 Adding invite codes to organizations...\n');

  try {
    // Get all organizations (column should already exist from schema)
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching organizations:', fetchError);
      return;
    }

    console.log(`✓ Found ${orgs.length} organizations\n`);

    // Generate unique codes
    const usedCodes = new Set();

    for (const org of orgs) {
      if (org.invite_code) {
        console.log(`  ✓ ${org.name} already has code: ${org.invite_code}`);
        usedCodes.add(org.invite_code);
        continue;
      }

      let newCode;
      let attempts = 0;
      const maxAttempts = 100;

      // Generate unique code
      do {
        newCode = generateInviteCode();
        attempts++;

        if (attempts > maxAttempts) {
          console.error(`❌ Could not generate unique code for ${org.name}`);
          break;
        }
      } while (usedCodes.has(newCode));

      if (attempts <= maxAttempts) {
        usedCodes.add(newCode);

        // Update organization with new code
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ invite_code: newCode })
          .eq('id', org.id);

        if (updateError) {
          console.error(`❌ Error updating ${org.name}:`, updateError);
        } else {
          console.log(`  ✅ ${org.name}: ${newCode}`);
        }
      }
    }

    console.log('\n✅ All organizations now have invite codes!');
    console.log('\n📋 Summary:');

    const { data: finalOrgs } = await supabase
      .from('organizations')
      .select('name, invite_code')
      .order('name');

    finalOrgs?.forEach(org => {
      console.log(`  ${org.name}: ${org.invite_code}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addInviteCodes();
