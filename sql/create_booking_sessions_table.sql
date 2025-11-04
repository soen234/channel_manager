-- Create table for storing Booking.com session cookies
CREATE TABLE IF NOT EXISTS booking_sessions (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cookies JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_session CHECK (id = 1)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_sessions_updated_at ON booking_sessions(updated_at);

-- Enable RLS (Row Level Security)
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage booking sessions"
  ON booking_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
