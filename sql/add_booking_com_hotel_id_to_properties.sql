-- Add booking_com_hotel_id column to properties table
-- This will store the Booking.com hotel ID for matching scraped reservations

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS booking_com_hotel_id VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_booking_com_hotel_id
ON properties(booking_com_hotel_id);

-- Update existing property if needed (replace with your actual property ID and Booking.com hotel ID)
-- UPDATE properties SET booking_com_hotel_id = '4036399' WHERE id = 'your-property-id';
