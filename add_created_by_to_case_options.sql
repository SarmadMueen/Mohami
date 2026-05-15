-- إضافة عمود created_by_user_id لربط القيم المضافة بالمحامي
-- قم بتشغيل هذا SQL في Supabase SQL Editor

-- إضافة العمود
ALTER TABLE case_options 
ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_case_options_created_by 
ON case_options(created_by_user_id);

-- إضافة تعليق
COMMENT ON COLUMN case_options.created_by_user_id IS 'معرف المستخدم/المحامي الذي أضاف هذه القيمة. NULL يعني أنها قيمة عامة متاحة للجميع';

-- التحقق من التغييرات
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'case_options' 
AND column_name = 'created_by_user_id';








