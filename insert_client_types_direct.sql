-- Direct INSERT statements for client_type values
-- Copy and paste these into Supabase SQL Editor one by one, or all at once

-- Insert client_type values (only if they don't already exist)
INSERT INTO public.case_options (client_type)
SELECT 'مشتكي عليه' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'مشتكي عليه');

INSERT INTO public.case_options (client_type)
SELECT 'مطعون ضده' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'مطعون ضده');

INSERT INTO public.case_options (client_type)
SELECT 'مطلوب منهم' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'مطلوب منهم');

INSERT INTO public.case_options (client_type)
SELECT 'ملتمس' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'ملتمس');

INSERT INTO public.case_options (client_type)
SELECT 'ملتمس ضده' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'ملتمس ضده');

INSERT INTO public.case_options (client_type)
SELECT 'منفذ' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'منفذ');

INSERT INTO public.case_options (client_type)
SELECT 'منفذ ضده' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'منفذ ضده');

INSERT INTO public.case_options (client_type)
SELECT 'منفذ له' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'منفذ له');

INSERT INTO public.case_options (client_type)
SELECT 'مُتهِم' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'مُتهِم');

INSERT INTO public.case_options (client_type)
SELECT 'مُنذر' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'مُنذر');

INSERT INTO public.case_options (client_type)
SELECT 'نيابة' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE client_type = 'نيابة');

-- Verify the insertions
SELECT id, client_type, created_at
FROM public.case_options 
WHERE client_type IS NOT NULL
ORDER BY client_type;


