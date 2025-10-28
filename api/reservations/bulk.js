const { requireApproved, supabase, updateInventoryForReservation } = require('../_middleware');

/**
 * Bulk create/update reservations from Excel upload
 * POST /api/reservations/bulk
 * Body: { reservations: Array<ReservationData> }
 */
module.exports = async (req, res) => {
  const authResult = await requireApproved(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const organizationId = authResult.organizationId;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reservations } = req.body;

    if (!Array.isArray(reservations) || reservations.length === 0) {
      return res.status(400).json({ error: 'Reservations array is required' });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];
    const skippedDetails = [];

    for (const reservation of reservations) {
      try {
        // Validate required fields
        if (!reservation.room_id || !reservation.guest_name ||
            !reservation.check_in || !reservation.check_out ||
            !reservation.total_price) {
          errorDetails.push({
            guest_name: reservation.guest_name || 'Unknown',
            error: 'Missing required fields'
          });
          errors++;
          continue;
        }

        // Check for existing reservation
        // Priority 1: By reservation number (channel_reservation_id) and guest name
        // Priority 2: By room, check_in, and guest_name
        let existing = null;
        let findError = null;

        // First try to find by reservation number if provided
        if (reservation.channel_reservation_id) {
          const result = await supabase
            .from('reservations')
            .select('id, status, room_id, check_in, check_out')
            .eq('channel_reservation_id', reservation.channel_reservation_id)
            .eq('guest_name', reservation.guest_name)
            .eq('organization_id', organizationId)
            .maybeSingle();

          existing = result.data;
          findError = result.error;
        }

        // If not found by reservation number, try by room + check_in + guest_name
        if (!existing && !findError) {
          const result = await supabase
            .from('reservations')
            .select('id, status, room_id, check_in, check_out')
            .eq('room_id', reservation.room_id)
            .eq('organization_id', organizationId)
            .eq('check_in', reservation.check_in)
            .eq('guest_name', reservation.guest_name)
            .maybeSingle();

          existing = result.data;
          findError = result.error;
        }

        if (findError) {
          console.error('Find error:', findError);
          errorDetails.push({
            guest_name: reservation.guest_name,
            error: findError.message
          });
          errors++;
          continue;
        }

        if (existing) {
          // Skip update if existing reservation is CANCELLED (not an error, just skipped)
          if (existing.status === 'CANCELLED') {
            skippedDetails.push({
              guest_name: reservation.guest_name,
              reason: 'Already cancelled'
            });
            skipped++;
            continue;
          }

          // Update existing reservation
          const updateData = {
            guest_email: reservation.guest_email || '',
            guest_phone: reservation.guest_phone || '',
            guest_country: reservation.guest_country || '',
            check_out: reservation.check_out,
            number_of_guests: reservation.num_guests || 1,
            total_price: reservation.total_price,
            channel: reservation.channel || 'DIRECT'
          };

          // Update channel_reservation_id if provided
          if (reservation.channel_reservation_id) {
            updateData.channel_reservation_id = reservation.channel_reservation_id;
          }

          // Only update status if explicitly provided in the upload
          if (reservation.status) {
            updateData.status = reservation.status;
          }

          // Update payment_status if provided
          if (reservation.payment_status) {
            updateData.payment_status = reservation.payment_status;
          }

          // Update payment_method if provided
          if (reservation.payment_method !== undefined) {
            updateData.payment_method = reservation.payment_method;
          }

          const { error: updateError } = await supabase
            .from('reservations')
            .update(updateData)
            .eq('id', existing.id)
            .eq('organization_id', organizationId);

          if (updateError) {
            console.error('Update error:', updateError);
            errorDetails.push({
              guest_name: reservation.guest_name,
              error: updateError.message
            });
            errors++;
          } else {
            // Update inventory if dates or room changed
            try {
              const oldRoomId = existing.room_id;
              const oldCheckIn = existing.check_in;
              const oldCheckOut = existing.check_out;
              const oldStatus = existing.status;

              const newRoomId = reservation.room_id;
              const newCheckIn = reservation.check_in;
              const newCheckOut = reservation.check_out;
              const newStatus = reservation.status || oldStatus;

              const wasActive = oldStatus !== 'CANCELLED';
              const isActive = newStatus !== 'CANCELLED';

              // Case 1: Status changed to cancelled
              if (wasActive && !isActive) {
                await updateInventoryForReservation(oldRoomId, oldCheckIn, oldCheckOut, 1);
              }
              // Case 2: Status changed to active from cancelled
              else if (!wasActive && isActive) {
                await updateInventoryForReservation(newRoomId, newCheckIn, newCheckOut, -1);
              }
              // Case 3: Both active, check for room or date changes
              else if (wasActive && isActive) {
                const roomChanged = oldRoomId !== newRoomId;
                const datesChanged = oldCheckIn !== newCheckIn || oldCheckOut !== newCheckOut;

                if (roomChanged || datesChanged) {
                  await updateInventoryForReservation(oldRoomId, oldCheckIn, oldCheckOut, 1);
                  await updateInventoryForReservation(newRoomId, newCheckIn, newCheckOut, -1);
                }
              }
            } catch (invError) {
              console.error('Inventory update error:', invError);
            }
            updated++;
          }
        } else {
          // Create new reservation
          const newStatus = reservation.status || 'CONFIRMED';
          const { error: insertError } = await supabase
            .from('reservations')
            .insert({
              room_id: reservation.room_id,
              organization_id: organizationId,
              channel: reservation.channel || 'DIRECT',
              channel_reservation_id: reservation.channel_reservation_id || reservation.notes || `EXCEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              guest_name: reservation.guest_name,
              guest_email: reservation.guest_email || '',
              guest_phone: reservation.guest_phone || '',
              guest_country: reservation.guest_country || '',
              check_in: reservation.check_in,
              check_out: reservation.check_out,
              number_of_guests: reservation.num_guests || 1,
              total_price: reservation.total_price,
              status: newStatus,
              payment_status: reservation.payment_status || 'UNPAID',
              payment_method: reservation.payment_method || null
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            errorDetails.push({
              guest_name: reservation.guest_name,
              error: insertError.message
            });
            errors++;
          } else {
            // Update inventory: decrease available rooms for active reservations
            if (newStatus !== 'CANCELLED') {
              try {
                await updateInventoryForReservation(
                  reservation.room_id,
                  reservation.check_in,
                  reservation.check_out,
                  -1
                );
              } catch (invError) {
                console.error('Inventory update error:', invError);
              }
            }
            created++;
          }
        }
      } catch (error) {
        console.error('Processing error:', error);
        errorDetails.push({
          guest_name: reservation.guest_name || 'Unknown',
          error: error.message
        });
        errors++;
      }
    }

    res.json({
      success: true,
      created,
      updated,
      skipped,
      errors,
      total: reservations.length,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
      skippedDetails: skippedDetails.slice(0, 10) // Return first 10 skipped
    });

  } catch (error) {
    console.error('Bulk reservations error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
