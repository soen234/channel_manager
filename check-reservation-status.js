require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

(async () => {
  const { data } = await supabase
    .from('reservations')
    .select('channel_reservation_id, guest_name, status, check_in, check_out')
    .eq('channel', 'BOOKING_COM')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('Recent Booking.com reservations in DB:\n');
  data?.forEach(r => {
    console.log(`${r.channel_reservation_id}: ${r.guest_name}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Check-in: ${r.check_in}, Check-out: ${r.check_out}\n`);
  });

  // Count by status
  const { data: stats } = await supabase
    .from('reservations')
    .select('status')
    .eq('channel', 'BOOKING_COM');

  const statusCounts = {};
  stats?.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  console.log('\nStatus distribution:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
})();
