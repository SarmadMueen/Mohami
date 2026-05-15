-- Migration: Create office_settings table for General Settings
-- This table stores office information and logo/signature images
-- Accessible only by الفئة 1 admin users

CREATE TABLE IF NOT EXISTS public.office_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  office_name_ar text NOT NULL,
  office_address_ar text NOT NULL,
  office_name_en text NOT NULL,
  office_address_en text NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  office_logo_url text,
  signature_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries (if needed)
CREATE INDEX IF NOT EXISTS idx_office_settings_id ON public.office_settings(id);

-- Add comment to table
COMMENT ON TABLE public.office_settings IS 'Stores general office settings including office information, logo, and signature. Accessible only by الفئة 1 admin users.';

