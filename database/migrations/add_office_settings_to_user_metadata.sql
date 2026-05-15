-- Migration: Add office settings columns to user_metadata table
-- These columns store office information, logo, and signature for الفئة 1 admin users

-- Add office settings columns to user_metadata table
ALTER TABLE public.user_metadata
ADD COLUMN IF NOT EXISTS entity_type text,
ADD COLUMN IF NOT EXISTS office_name_ar text,
ADD COLUMN IF NOT EXISTS office_address_ar text,
ADD COLUMN IF NOT EXISTS office_name_en text,
ADD COLUMN IF NOT EXISTS office_address_en text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+44',
ADD COLUMN IF NOT EXISTS office_email text,
ADD COLUMN IF NOT EXISTS office_logo_url text,
ADD COLUMN IF NOT EXISTS signature_url text;

-- Add comments to columns
COMMENT ON COLUMN public.user_metadata.entity_type IS 'نوع الكيان (مكتب محاماة، شركة، مؤسسة، أخرى)';
COMMENT ON COLUMN public.user_metadata.office_name_ar IS 'اسم المكتب بالعربية';
COMMENT ON COLUMN public.user_metadata.office_address_ar IS 'عنوان المكتب بالعربية';
COMMENT ON COLUMN public.user_metadata.office_name_en IS 'اسم المكتب بالإنجليزية';
COMMENT ON COLUMN public.user_metadata.office_address_en IS 'عنوان المكتب بالإنجليزية';
COMMENT ON COLUMN public.user_metadata.phone_number IS 'رقم الهاتف';
COMMENT ON COLUMN public.user_metadata.office_email IS 'البريد الإلكتروني للمكتب';
COMMENT ON COLUMN public.user_metadata.office_logo_url IS 'رابط شعار المكتب';
COMMENT ON COLUMN public.user_metadata.signature_url IS 'رابط ختم المحامي';

