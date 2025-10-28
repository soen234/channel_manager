-- Trigger to automatically set organization_id for reservations
-- This runs when a reservation is created with null organization_id

CREATE OR REPLACE FUNCTION auto_set_reservation_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if organization_id is null
  IF NEW.organization_id IS NULL AND NEW.room_id IS NOT NULL THEN
    -- Get organization_id from room's property
    SELECT p.organization_id INTO NEW.organization_id
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_reservation_organization ON reservations;

-- Create trigger
CREATE TRIGGER set_reservation_organization
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_reservation_organization();
