-- Add is_manually_placed column to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS is_manually_placed BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN reservations.is_manually_placed IS 'Indicates if the reservation was manually placed by user (prevents auto-reassignment by tetris algorithm)';
