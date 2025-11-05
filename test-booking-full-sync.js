/**
 * Full Booking.com sync test
 * 1. Scrape reservations locally (with Puppeteer)
 * 2. Send scraped data to API for DB update
 */

require('dotenv').config();
const { fetchBookingReservations } = require('./api/sync/booking-scraper');

async function fullSync() {
  console.log('🚀 Starting Full Booking.com Sync\n');

  const username = process.env.BOOKING_COM_USERNAME;
  const password = process.env.BOOKING_COM_PASSWORD;
  const hotelId = process.env.BOOKING_COM_HOTEL_ID;

  if (!username || !password) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STARTING WEEK-BY-WEEK SYNC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Now sync with database using local module
  const { supabase } = require('./api/_middleware');

  const results = {
    scraped: 0,
    updated: 0,
    created: 0,
    cancelled: 0,
    unchanged: 0,
    errors: 0,
    unmappedRooms: [],
    details: []
  };

  // Pre-load room cache for performance
  const roomCache = await loadRoomCache(hotelId, supabase);
  console.log(`✅ Loaded ${Object.keys(roomCache.rooms || {}).length} room keywords into cache\n`);

  let weekNumber = 0;

  try {
    // Scrape and process week by week
    await fetchBookingReservations(username, password, {
      headless: false,  // Show browser for debugging
      onWeekComplete: async (weekReservations, week, total) => {
        weekNumber++;
        console.log(`\n📦 Processing Week ${weekNumber}: ${weekReservations.length} reservations`);

        // Process each reservation in this week
        for (const scraped of weekReservations) {
          try {
            const result = await syncReservationLocal(scraped, hotelId, supabase, roomCache);

            if (result.action === 'created') results.created++;
            if (result.action === 'updated') results.updated++;
            if (result.action === 'cancelled') results.cancelled++;
            if (result.action === 'unchanged') results.unchanged++;

            // Track unmapped rooms
            if (!result.roomMatched && scraped.roomType) {
              const existing = results.unmappedRooms.find(r => r.roomType === scraped.roomType);
              if (!existing) {
                results.unmappedRooms.push({
                  roomType: scraped.roomType,
                  keyword: result.roomKeyword,
                  count: 1
                });
              } else {
                existing.count++;
              }
            }

            results.details.push({
              reservationNumber: scraped.reservationNumber,
              roomType: scraped.roomType,
              action: result.action,
              roomMatched: result.roomMatched,
              ...result
            });
            results.scraped++;

            // Show progress
            process.stdout.write('.');

          } catch (error) {
            console.error(`\n❌ Error syncing ${scraped.reservationNumber}:`, error.message);
            results.errors++;
          }
        }

        console.log(`\n✅ Week ${weekNumber} done: ${results.created} created, ${results.updated} updated, ${results.cancelled} cancelled, ${results.unchanged} unchanged`);
      }
    });

  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    process.exit(1);
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SYNC RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📥 Scraped: ${results.scraped} reservations`);
  console.log(`➕ Created: ${results.created} new reservations`);
  console.log(`🔄 Updated: ${results.updated} reservations`);
  console.log(`❌ Cancelled: ${results.cancelled} reservations`);
  console.log(`✓  Unchanged: ${results.unchanged} reservations`);
  console.log(`⚠️  Errors: ${results.errors}`);

  // Show unmapped rooms
  if (results.unmappedRooms.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  UNMAPPED ROOM TYPES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    results.unmappedRooms.forEach(room => {
      console.log(`  📌 "${room.roomType}" (keyword: ${room.keyword})`);
      console.log(`     Count: ${room.count} reservation(s)\n`);
    });
  }

  console.log('\n✅ Full sync completed!\n');
}

// Load room cache
async function loadRoomCache(hotelId, supabase) {
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

      // Add keyword-based entries
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

// Extract numeric part from reservation number
function extractReservationNumber(reservationId) {
  if (!reservationId) return null;
  const matches = reservationId.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  , '');
}

// Copy the syncReservation logic locally
async function syncReservationLocal(scraped, hotelId, supabase, roomCache = null) {
  const { reservationNumber, guestName, checkIn, checkOut, status, price, roomType } = scraped;

  let propertyId, organizationId;

  // Use cache if available
  if (roomCache && roomCache.propertyId) {
    propertyId = roomCache.propertyId;
    organizationId = roomCache.organizationId;
  } else {
    const { data: property } = await supabase
      .from('properties')
      .select('id, organization_id')
      .eq('booking_com_hotel_id', hotelId)
      .maybeSingle();

    propertyId = property?.id;
    organizationId = property?.organization_id;
  }

  // Find room using cache
  let roomId = null;
  let roomKeyword = null;
  let matchedRoomName = null;

  if (roomType && roomCache && roomCache.rooms) {
    const keywordResult = extractRoomKeyword(roomType);
    roomKeyword = keywordResult?.korean;
    const englishKeyword = keywordResult?.english;

    // Try cache lookup
    if (englishKeyword && roomCache.rooms[englishKeyword.toLowerCase()]) {
      const cached = roomCache.rooms[englishKeyword.toLowerCase()];
      roomId = cached.id;
      matchedRoomName = cached.name;
    } else if (roomKeyword && roomCache.rooms[roomKeyword.toLowerCase()]) {
      const cached = roomCache.rooms[roomKeyword.toLowerCase()];
      roomId = cached.id;
      matchedRoomName = cached.name;
    }
  }

  // Find existing reservation by comparing numeric part
  let query = supabase
    .from('reservations')
    .select('*')
    .eq('channel', 'BOOKING_COM')
    .eq('guest_name', guestName);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: candidates, error: findError } = await query;

  if (findError) {
    console.error(`❌ Error finding reservation ${reservationNumber}:`, findError);
    throw findError;
  }

  // Extract numeric part and find match
  const scrapedNumber = extractReservationNumber(reservationNumber);
  let existing = null;
  if (candidates && scrapedNumber) {
    existing = candidates.find(candidate => {
      const candidateNumber = extractReservationNumber(candidate.channel_reservation_id);
      return candidateNumber === scrapedNumber;
    });
  }

  if (existing) {
    console.log(`🔍 Found existing: ${reservationNumber} matches ${existing.channel_reservation_id}`);
  }

  const mappedStatus = mapBookingStatus(status);

  if (existing) {
    // Update logic
    const updates = {};
    let hasChanges = false;

    if (existing.status !== mappedStatus) {
      updates.status = mappedStatus;
      hasChanges = true;
      console.log(`📝 Status change for ${reservationNumber}: ${existing.status} → ${mappedStatus}`);
    }

    if (guestName && existing.guest_name !== guestName) {
      updates.guest_name = guestName;
      hasChanges = true;
      console.log(`📝 Guest name change for ${reservationNumber}: ${existing.guest_name} → ${guestName}`);
    }

    // Only update room if not manually placed
    if (roomId && existing.room_id !== roomId && !existing.is_manually_placed) {
      updates.room_id = roomId;
      hasChanges = true;
      console.log(`📝 Room change for ${reservationNumber}: ${existing.room_id} → ${roomId}`);
    } else if (roomId && existing.is_manually_placed) {
      console.log(`🔒 Skipping room update for ${reservationNumber} (manually placed)`);
    }

    if (hasChanges) {
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', existing.id);

      if (updateError) {
        console.error(`❌ Error updating ${reservationNumber}:`, updateError);
        throw updateError;
      }

      console.log(`✅ Updated: ${reservationNumber}`);

      return {
        action: mappedStatus === 'CANCELLED' ? 'cancelled' : 'updated',
        roomMatched: !!roomId,
        roomKeyword,
        matchedRoomName
      };
    }

    return {
      action: 'unchanged',
      roomMatched: !!roomId,
      roomKeyword,
      matchedRoomName
    };
  } else {
    // Create new
    const reservationData = {
      channel: 'BOOKING_COM',
      channel_reservation_id: reservationNumber,
      guest_name: guestName || 'Unknown',
      guest_email: '',
      guest_phone: '',
      check_in: checkIn,
      check_out: checkOut,
      number_of_guests: 1,
      total_price: parsePrice(price) || 0,
      currency: 'USD',
      status: mappedStatus,
      payment_status: 'UNPAID'
    };

    if (organizationId) reservationData.organization_id = organizationId;
    if (roomId) reservationData.room_id = roomId;

    const { error: createError } = await supabase
      .from('reservations')
      .insert(reservationData);

    if (createError) {
      console.error(`❌ Error creating ${reservationNumber}:`, createError);
      console.error('Data:', JSON.stringify(reservationData, null, 2));
      throw createError;
    }

    console.log(`✅ Created: ${reservationNumber}`);

    return {
      action: 'created',
      roomMatched: !!roomId,
      roomKeyword,
      matchedRoomName
    };
  }
}

// Helper functions
function extractRoomKeyword(roomType) {
  if (!roomType) return null;

  // Clean up the room type string
  const cleanedRoomType = roomType.trim();
  const roomTypeLower = cleanedRoomType.toLowerCase();

  const capacityMappings = [
    { keywords: ['single', '싱글'], korean: '싱글', english: 'single' },
    { keywords: ['double', '더블'], korean: '더블', english: 'double' },
    { keywords: ['twin', '트윈'], korean: '트윈', english: 'twin' },
    { keywords: ['triple', '트리플'], korean: '트리플', english: 'triple' },
    { keywords: ['quad', 'quadruple', '쿼드'], korean: '쿼드', english: 'quad' },
    { keywords: ['dormitory', 'dorm', '도미토리'], korean: '도미토리', english: 'dormitory' }
  ];

  const gradeMappings = [
    { keywords: ['suite', '스위트'], korean: '스위트', english: 'suite' },
    { keywords: ['deluxe', '디럭스'], korean: '디럭스', english: 'deluxe' },
    { keywords: ['standard', '스탠다드'], korean: '스탠다드', english: 'standard' },
    { keywords: ['superior', '슈페리어'], korean: '슈페리어', english: 'superior' },
    { keywords: ['family', '패밀리'], korean: '패밀리', english: 'family' }
  ];

  // First, try to match capacity types (higher priority)
  for (const mapping of capacityMappings) {
    for (const keyword of mapping.keywords) {
      if (roomTypeLower.includes(keyword.toLowerCase())) {
        return { korean: mapping.korean, english: mapping.english };
      }
    }
  }

  // If no capacity type found, try grade types
  for (const mapping of gradeMappings) {
    for (const keyword of mapping.keywords) {
      if (roomTypeLower.includes(keyword.toLowerCase())) {
        return { korean: mapping.korean, english: mapping.english };
      }
    }
  }

  const firstWord = roomType.split(/\s+/)[0];
  return { korean: firstWord, english: firstWord };
}

function mapBookingStatus(status) {
  if (!status) return 'CONFIRMED';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('cancel')) return 'CANCELLED';
  if (statusLower.includes('no')) return 'NO_SHOW';
  return 'CONFIRMED';
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9.,-]/g, '');
  const number = parseFloat(cleaned.replace(',', '.'));
  return isNaN(number) ? 0 : number;
}

fullSync().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
