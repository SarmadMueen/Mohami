-- Create trial_requests table
CREATE TABLE IF NOT EXISTS trial_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name_en TEXT NOT NULL,
    full_name_ar TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    office_name TEXT,
    bar_id_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE trial_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for public form submission)
CREATE POLICY "Anyone can submit trial request"
ON trial_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Only authenticated admins can view
CREATE POLICY "Admins can view trial requests"
ON trial_requests FOR SELECT
TO authenticated
USING (true);

-- Policy: Only authenticated admins can update (approve/reject)
CREATE POLICY "Admins can update trial requests"
ON trial_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create storage bucket for bar IDs (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bar-ids', 'bar-ids', false);
