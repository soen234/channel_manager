-- Add labor cost column to monthly_fixed_expenses table
ALTER TABLE monthly_fixed_expenses
ADD COLUMN IF NOT EXISTS labor DECIMAL DEFAULT 0;

COMMENT ON COLUMN monthly_fixed_expenses.labor IS '인건비';
