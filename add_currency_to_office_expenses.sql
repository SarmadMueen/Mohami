-- Add currency column to office_expenses table
ALTER TABLE public.office_expenses
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'IQD';

-- Add check constraint to ensure only valid currencies
ALTER TABLE public.office_expenses
ADD CONSTRAINT office_expenses_currency_check 
CHECK (currency IN ('IQD', 'USD'));

-- Update existing records to have IQD as default currency
UPDATE public.office_expenses
SET currency = 'IQD'
WHERE currency IS NULL;
