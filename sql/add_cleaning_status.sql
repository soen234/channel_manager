-- Add cleaning status fields to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS cleaning_status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS cleaned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cleaned_by UUID;

-- Add comments
COMMENT ON COLUMN reservations.cleaning_status IS '청소 상태: PENDING, COMPLETED';
COMMENT ON COLUMN reservations.cleaned_at IS '청소 완료 시간';
COMMENT ON COLUMN reservations.cleaned_by IS '청소 완료한 스태프 user_id';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_cleaning_status ON reservations(cleaning_status);
