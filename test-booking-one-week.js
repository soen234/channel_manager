/**
 * Test one week sync to debug status extraction
 */

require('dotenv').config();
const { fetchBookingReservations } = require('./api/sync/booking-scraper');
const { supabase } = require('./api/_middleware');

async function testOneWeek() {
  console.log('🔍 Testing one week status extraction\n');

  const username = process.env.BOOKING_COM_USERNAME;
  const password = process.env.BOOKING_COM_PASSWORD;
  const hotelId = process.env.BOOKING_COM_HOTEL_ID;

  if (!username || !password) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  // Pre-load room cache
  const roomCache = await loadRoomCache(hotelId);
  console.log(`✅ Loaded ${Object.keys(roomCache.rooms || {}).length} room keywords\n`);

  let allReservations = [];

  await fetchBookingReservations(username, password, {
    headless: false,
    onWeekComplete: async (weekReservations, week, total) => {
      console.log(`\n📦 Week ${week} scraped: ${weekReservations.length} reservations\n`);

      // Show status for first 10
      console.log('Status samples:');
      weekReservations.slice(0, 10).forEach(r => {
        console.log(`  ${r.reservationNumber}: ${r.guestName} - Status: "${r.status}"`);
      });

      allReservations = weekReservations;

      // Stop after first week
      return true; // This will stop the scraping
    }
  });

  // Compare with DB
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Comparing first 5 with DB:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const r of allReservations.slice(0, 5)) {
    // Find in DB
    const { data: candidates } = await supabase
      .from('reservations')
      .select('channel_reservation_id, status')
      .eq('channel', 'BOOKING_COM')
      .eq('guest_name', r.guestName);

    const scrapedNumber = extractReservationNumber(r.reservationNumber);
    const existing = candidates?.find(c => {
      const candidateNumber = extractReservationNumber(c.channel_reservation_id);
      return candidateNumber === scrapedNumber;
    });

    const mappedStatus = mapBookingStatus(r.status);

    if (existing) {
      console.log(`${r.reservationNumber}:`);
      console.log(`  Scraped status: "${r.status}" → Mapped: "${mappedStatus}"`);
      console.log(`  DB status: "${existing.status}"`);
      console.log(`  Match: ${existing.status === mappedStatus ? '✅ Same' : '❌ Different'}\n`);
    } else {
      console.log(`${r.reservationNumber}: Not in DB (would be created)\n`);
    }
  }
}

// Helper functions
async function loadRoomCache(hotelId) {
  const { data: property } = await supabase
    .from('properties')
    .select('id, organization_id')
    .eq('booking_com_hotel_id', hotelId)
    .maybeSingle();

  if (!property) return {};

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('property_id', property.id);

  const cache = {
    propertyId: property.id,
    organizationId: property.organization_id,
    rooms: {}
  };

  if (rooms) {
    rooms.forEach(room => {
      const nameLower = room.name.toLowerCase();
      cache.rooms[nameLower] = { id: room.id, name: room.name };

      const keywords = ['single', 'double', 'twin', 'triple', 'quad', 'dormitory',
                       '싱글', '더블', '트윈', '트리플', '쿼드', '도미토리',
                       'deluxe', 'standard', 'suite', '디럭스', '스탠다드', '스위트'];

      keywords.forEach(keyword => {
        if (nameLower.includes(keyword)) {
          if (!cache.rooms[keyword]) {
            cache.rooms[keyword] = { id: room.id, name: room.name };
          }
        }
      });
    });
  }

  return cache;
}

function extractReservationNumber(reservationId) {
  if (!reservationId) return null;
  const matches = reservationId.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  , '');
}

function mapBookingStatus(status) {
  if (!status) return 'CONFIRMED';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('cancel')) return 'CANCELLED';
  if (statusLower.includes('no')) return 'NO_SHOW';
  return 'CONFIRMED';
}

testOneWeek().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
