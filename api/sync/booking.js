const { requireSuperAdmin, supabase } = require('../_middleware');
const { fetchBookingReservations } = require('./booking-scraper');

/**
 * Sync Booking.com reservations
 * POST /api/sync/booking
 *
 * This endpoint scrapes Booking.com extranet and syncs reservations to database
 * Can be called manually or by cron job
 *
 * Required env vars:
 * - BOOKING_COM_USERNAME
 * - BOOKING_COM_PASSWORD
 * - BOOKING_COM_HOTEL_ID
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret or super admin
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    // Allow cron job
  } else {
    // Require super admin for manual trigger
    const authResult = await requireSuperAdmin(req, res);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
  }

  try {
    const username = process.env.BOOKING_COM_USERNAME;
    const password = process.env.BOOKING_COM_PASSWORD;
    const hotelId = process.env.BOOKING_COM_HOTEL_ID;

    if (!username || !password) {
      return res.status(500).json({
        error: 'Booking.com credentials not configured',
        message: 'Please set BOOKING_COM_USERNAME and BOOKING_COM_PASSWORD environment variables'
      });
    }

    console.log('Starting Booking.com sync...');

    // Fetch reservations from Booking.com
    const scrapedReservations = await fetchBookingReservations(username, password, {
      headless: true
    });

    console.log(`Scraped ${scrapedReservations.length} reservations from Booking.com`);

    const results = {
      scraped: scrapedReservations.length,
      updated: 0,
      created: 0,
      cancelled: 0,
      errors: 0,
      details: []
    };

    // Process each reservation
    for (const scraped of scrapedReservations) {
      try {
        const result = await syncReservation(scraped, hotelId);

        if (result.action === 'created') results.created++;
        if (result.action === 'updated') results.updated++;
        if (result.action === 'cancelled') results.cancelled++;

        results.details.push({
          reservationNumber: scraped.reservationNumber,
          action: result.action,
          ...result
        });

      } catch (error) {
        console.error(`Error syncing reservation ${scraped.reservationNumber}:`, error);
        results.errors++;
        results.details.push({
          reservationNumber: scraped.reservationNumber,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Synced ${results.scraped} reservations from Booking.com`,
      ...results
    });

  } catch (error) {
    console.error('Booking.com sync error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Sync a single reservation to database
 */
async function syncReservation(scraped, hotelId) {
  const { reservationNumber, guestName, checkIn, checkOut, status, price } = scraped;

  // Find existing reservation by channel_reservation_id
  const { data: existing, error: findError } = await supabase
    .from('reservations')
    .select('*')
    .eq('channel_reservation_id', reservationNumber)
    .eq('channel', 'BOOKING_COM')
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  // Map Booking.com status to our status
  const mappedStatus = mapBookingStatus(status);

  if (existing) {
    // Update existing reservation
    const updates = {};
    let hasChanges = false;

    if (existing.status !== mappedStatus) {
      updates.status = mappedStatus;
      hasChanges = true;
    }

    if (guestName && existing.guest_name !== guestName) {
      updates.guest_name = guestName;
      hasChanges = true;
    }

    if (hasChanges) {
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', existing.id);

      if (updateError) throw updateError;

      return {
        action: mappedStatus === 'CANCELLED' ? 'cancelled' : 'updated',
        reservationId: existing.id,
        changes: updates
      };
    }

    return {
      action: 'unchanged',
      reservationId: existing.id
    };

  } else {
    // Create new reservation
    // Note: This will have incomplete data, marked for review
    const { data: newReservation, error: createError } = await supabase
      .from('reservations')
      .insert({
        channel: 'BOOKING_COM',
        channel_reservation_id: reservationNumber,
        guest_name: guestName || 'Unknown',
        guest_email: '',
        guest_phone: '',
        check_in: parseDate(checkIn) || new Date().toISOString().split('T')[0],
        check_out: parseDate(checkOut) || new Date().toISOString().split('T')[0],
        number_of_guests: 1,
        total_price: parsePrice(price) || 0,
        status: mappedStatus,
        payment_status: 'UNPAID',
        notes: `Auto-synced from Booking.com. Please verify details. Hotel ID: ${hotelId || 'N/A'}`
      })
      .select()
      .single();

    if (createError) throw createError;

    return {
      action: 'created',
      reservationId: newReservation.id
    };
  }
}

/**
 * Map Booking.com status to our status
 */
function mapBookingStatus(bookingStatus) {
  if (!bookingStatus) return 'CONFIRMED';

  const statusLower = bookingStatus.toLowerCase();

  if (statusLower.includes('cancel')) return 'CANCELLED';
  if (statusLower.includes('no-show') || statusLower.includes('noshow')) return 'NO_SHOW';
  if (statusLower.includes('check-out') || statusLower.includes('checked out')) return 'CHECKED_OUT';
  if (statusLower.includes('check-in') || statusLower.includes('checked in')) return 'CHECKED_IN';

  return 'CONFIRMED';
}

/**
 * Parse date from scraped text
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Try to parse various date formats
    // Format: "2025-01-15", "15/01/2025", "Jan 15, 2025", etc.
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (err) {
    console.error('Date parse error:', err);
  }

  return null;
}

/**
 * Parse price from scraped text
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;

  try {
    // Remove currency symbols and parse number
    const cleaned = priceStr.replace(/[^0-9.,-]/g, '');
    const number = parseFloat(cleaned.replace(',', '.'));
    return isNaN(number) ? 0 : number;
  } catch (err) {
    console.error('Price parse error:', err);
    return 0;
  }
}
