/**
 * Fix existing Booking.com reservations by adding organization_id
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixReservations() {
  console.log('🔧 Fixing Booking.com reservations...\n');

  try {
    // Get property with organization_id
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, organization_id, name')
      .eq('booking_com_hotel_id', process.env.BOOKING_COM_HOTEL_ID)
      .single();

    if (propError || !property) {
      console.error('❌ Property not found:', propError);
      return;
    }

    console.log(`✅ Property: ${property.name}`);
    console.log(`   Organization ID: ${property.organization_id}\n`);

    // Find all BOOKING_COM reservations without organization_id
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, channel_reservation_id, guest_name')
      .eq('channel', 'BOOKING_COM')
      .is('organization_id', null);

    if (resError) {
      console.error('❌ Error finding reservations:', resError);
      return;
    }

    console.log(`Found ${reservations.length} reservations to fix\n`);

    // Update each reservation
    let updated = 0;
    for (const res of reservations) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          organization_id: property.organization_id
        })
        .eq('id', res.id);

      if (updateError) {
        console.error(`❌ Error updating ${res.channel_reservation_id}:`, updateError);
      } else {
        updated++;
        process.stdout.write('.');
      }
    }

    console.log(`\n\n✅ Updated ${updated} reservations`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fixReservations();
