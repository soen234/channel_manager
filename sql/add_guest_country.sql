-- Add guest_country column to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_country VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN reservations.guest_country IS 'Guest country of origin';
