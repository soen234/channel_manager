-- Add payment status to reservations table
-- This allows tracking whether a reservation has been paid or not

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID';
-- PAID, PARTIAL, UNPAID, REFUNDED

COMMENT ON COLUMN reservations.payment_status IS '결제 상태: PAID(결제완료), PARTIAL(부분결제), UNPAID(미결제), REFUNDED(환불)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status);
