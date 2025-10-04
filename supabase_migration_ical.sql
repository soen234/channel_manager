-- Add external_id column to reservations table to store iCal UID
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add index on external_id for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_reservations_external_id ON reservations(external_id);

-- Add last_sync column to channel_mappings table
ALTER TABLE channel_mappings
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ;

-- Add comment to clarify the purpose
COMMENT ON COLUMN reservations.external_id IS 'External reservation ID from channel (e.g., iCal UID)';
COMMENT ON COLUMN channel_mappings.last_sync IS 'Last successful synchronization timestamp';
