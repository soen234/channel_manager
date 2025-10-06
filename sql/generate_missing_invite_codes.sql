-- Generate invite codes for properties that don't have one
-- This uses a PostgreSQL function to generate unique 6-digit codes

DO $$
DECLARE
  prop RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR prop IN
    SELECT id, name FROM properties WHERE invite_code IS NULL
  LOOP
    -- Generate unique code
    LOOP
      -- Generate random 6-digit code
      new_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM properties WHERE invite_code = new_code) INTO code_exists;

      -- Exit loop if code is unique
      EXIT WHEN NOT code_exists;
    END LOOP;

    -- Update property with new invite code
    UPDATE properties SET invite_code = new_code WHERE id = prop.id;

    RAISE NOTICE 'Generated invite code % for property: %', new_code, prop.name;
  END LOOP;
END $$;
