-- Add room_unit_number column to reservations table
-- This stores which specific unit (e.g., Dormitory 1, 2, 3...) within a room type the reservation is assigned to
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS room_unit_number INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN reservations.room_unit_number IS 'The specific unit number (1, 2, 3...) within the room type. Used for tetris-style room assignment.';
