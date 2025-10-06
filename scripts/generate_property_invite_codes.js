const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate unique 6-digit invite code
async function generateUniqueInviteCode() {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }
  throw new Error('Failed to generate unique invite code');
}

async function generateInviteCodes() {
  console.log('Fetching properties without invite codes...');

  // Get all properties without invite codes
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, name')
    .is('invite_code', null);

  if (error) {
    console.error('Error fetching properties:', error);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('All properties already have invite codes!');
    process.exit(0);
  }

  console.log(`Found ${properties.length} properties without invite codes.`);

  // Generate and update invite codes
  for (const property of properties) {
    const inviteCode = await generateUniqueInviteCode();

    const { error: updateError } = await supabase
      .from('properties')
      .update({ invite_code: inviteCode })
      .eq('id', property.id);

    if (updateError) {
      console.error(`Failed to update property ${property.id}:`, updateError);
    } else {
      console.log(`✓ Generated invite code ${inviteCode} for "${property.name}"`);
    }
  }

  console.log('Done!');
}

generateInviteCodes().catch(console.error);
