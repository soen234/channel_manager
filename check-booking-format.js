require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

(async () => {
  const { data } = await supabase
    .from('reservations')
    .select('channel, channel_reservation_id, guest_name, check_in')
    .eq('channel', 'BOOKING_COM')
    .order('created_at', { ascending: false })
    .limit(50);

  // Filter to find ones that are just numbers
  const pureBooking = data?.filter(r => /^\d+$/.test(r.channel_reservation_id));

  console.log(`Pure Booking.com reservations (numeric only): ${pureBooking?.length || 0}`);
  pureBooking?.slice(0, 10).forEach(r => {
    console.log(`- ${r.channel_reservation_id}: ${r.guest_name}`);
  });

  const ota = data?.filter(r => !/^\d+$/.test(r.channel_reservation_id));
  console.log(`\nOTA reservations (with prefix): ${ota?.length || 0}`);
  ota?.slice(0, 5).forEach(r => {
    console.log(`- ${r.channel_reservation_id}: ${r.guest_name}`);
  });
})();
