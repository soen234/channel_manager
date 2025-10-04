const { supabase } = require('../_middleware');

/**
 * Simple iCal parser to extract reservation data
 */
function parseICalData(icalText) {
  const events = [];
  const lines = icalText.split('\n');
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      if (key.startsWith('DTSTART')) {
        currentEvent.dtstart = parseICalDate(value);
      } else if (key.startsWith('DTEND')) {
        currentEvent.dtend = parseICalDate(value);
      } else if (key === 'SUMMARY') {
        currentEvent.summary = value;
      } else if (key === 'DESCRIPTION') {
        currentEvent.description = value;
      } else if (key === 'UID') {
        currentEvent.uid = value;
      }
    }
  }

  return events;
}

/**
 * Parse iCal date format (YYYYMMDD or YYYYMMDDTHHmmss)
 */
function parseICalDate(dateStr) {
  const cleanDate = dateStr.replace(/[TZ]/g, '');

  if (cleanDate.length >= 8) {
    const year = cleanDate.substring(0, 4);
    const month = cleanDate.substring(4, 6);
    const day = cleanDate.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Sync iCal endpoint
 * POST /api/channels/sync-ical
 * Body: { channelMappingId: string }
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelMappingId } = req.body;

    if (!channelMappingId) {
      return res.status(400).json({ error: 'channelMappingId is required' });
    }

    // Get channel mapping with credentials
    const { data: mapping, error: mappingError } = await supabase
      .from('channel_mappings')
      .select('*')
      .eq('id', channelMappingId)
      .single();

    if (mappingError || !mapping) {
      return res.status(404).json({ error: 'Channel mapping not found' });
    }

    const credentials = JSON.parse(mapping.credentials || '{}');
    const icalUrl = credentials.icalUrl;

    if (!icalUrl) {
      return res.status(400).json({ error: 'iCal URL not found in credentials' });
    }

    // Fetch iCal data
    console.log('Fetching iCal from:', icalUrl);
    const icalResponse = await fetch(icalUrl);

    if (!icalResponse.ok) {
      throw new Error(`Failed to fetch iCal: ${icalResponse.statusText}`);
    }

    const icalText = await icalResponse.text();
    console.log('iCal data fetched, parsing...');

    // Parse iCal events
    const events = parseICalData(icalText);
    console.log(`Parsed ${events.length} events`);

    // Get room ID from mapping
    const roomId = mapping.room_id;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID not found in mapping' });
    }

    // Get room details for pricing
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('base_price')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Process each event
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const event of events) {
      try {
        // Extract guest name from summary (usually "Guest: Name" or just "Name")
        let guestName = event.summary || 'Unknown Guest';
        if (guestName.includes(':')) {
          guestName = guestName.split(':')[1].trim();
        }

        // Calculate total nights and price
        const checkIn = new Date(event.dtstart);
        const checkOut = new Date(event.dtend);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = room.base_price * nights;

        // Check if reservation already exists (by UID)
        const { data: existing } = await supabase
          .from('reservations')
          .select('id')
          .eq('room_id', roomId)
          .eq('external_id', event.uid)
          .single();

        if (existing) {
          console.log(`Skipping duplicate reservation: ${event.uid}`);
          skipped++;
          continue;
        }

        // Create reservation
        const { error: insertError } = await supabase
          .from('reservations')
          .insert({
            room_id: roomId,
            guest_name: guestName,
            guest_email: 'imported@ical.sync',
            guest_phone: '',
            check_in: event.dtstart,
            check_out: event.dtend,
            num_guests: 1,
            total_price: totalPrice,
            status: 'CONFIRMED',
            channel: mapping.channel,
            external_id: event.uid,
            notes: event.description || ''
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          errors++;
        } else {
          created++;
        }
      } catch (error) {
        console.error('Error processing event:', error);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('channel_mappings')
      .update({
        last_sync: new Date().toISOString(),
        is_active: true
      })
      .eq('id', channelMappingId);

    res.json({
      success: true,
      created,
      skipped,
      errors,
      totalEvents: events.length
    });
  } catch (error) {
    console.error('iCal sync error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
