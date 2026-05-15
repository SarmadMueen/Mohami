-- Create court_decisions table
CREATE TABLE IF NOT EXISTS public.court_decisions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    decision_number text,
    decision_date date,
    category text, -- e.g. 'جنائي', 'مدني', 'أحوال شخصية'
    description text,
    image_urls text[], -- Array of image URLs (scanned pages)
    html_url text, -- HTML version URL (rendered as A4)
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Add RLS (Row Level Security)
ALTER TABLE public.court_decisions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view decisions
CREATE POLICY "Allow all authenticated users to view decisions" 
ON public.court_decisions FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow only super_admin to manage decisions (this assumes a role system in user_metadata)
CREATE POLICY "Allow super_admin to manage decisions" 
ON public.court_decisions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_metadata
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);
