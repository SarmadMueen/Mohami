-- Add missing columns to track who inserted the office expenses
ALTER TABLE public.office_expenses
ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS lawyer_id uuid REFERENCES auth.users(id);

-- Optional: If you wish to enable Row Level Security (RLS) policies 
-- to protect the table, you may do so as well, though the API 
-- in AddExpenses.js now strictly filters by admin_id.
--
-- ALTER TABLE public.office_expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own firm expenses" ON public.office_expenses FOR SELECT USING (auth.uid() = admin_id OR auth.uid() = lawyer_id);
-- CREATE POLICY "Users can insert expenses" ON public.office_expenses FOR INSERT WITH CHECK (auth.uid() = lawyer_id OR auth.uid() = admin_id);
