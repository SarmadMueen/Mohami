-- SQL script to insert client_type values into case_options table
-- Table: public.case_options
-- Field: client_type (text, nullable)

-- Step 1: Check existing client_type values
SELECT DISTINCT client_type 
FROM public.case_options 
WHERE client_type IS NOT NULL 
ORDER BY client_type;

-- Step 2: Insert all client_type values (using DO block for better control)
DO $$
DECLARE
    values_to_insert TEXT[] := ARRAY[
        'مشتكي عليه',
        'مطعون ضده',
        'مطلوب منهم',
        'ملتمس',
        'ملتمس ضده',
        'منفذ',
        'منفذ ضده',
        'منفذ له',
        'مُتهِم',
        'مُنذر',
        'نيابة'
    ];
    value_item TEXT;
BEGIN
    FOREACH value_item IN ARRAY values_to_insert
    LOOP
        INSERT INTO public.case_options (client_type)
        SELECT value_item
        WHERE NOT EXISTS (
            SELECT 1 FROM public.case_options WHERE client_type = value_item
        );
    END LOOP;
END $$;

-- Step 3: Verify insertions
SELECT id, client_type, created_at
FROM public.case_options 
WHERE client_type IN (
    'مشتكي عليه',
    'مطعون ضده',
    'مطلوب منهم',
    'ملتمس',
    'ملتمس ضده',
    'منفذ',
    'منفذ ضده',
    'منفذ له',
    'مُتهِم',
    'مُنذر',
    'نيابة'
)
ORDER BY client_type;

-- Alternative Method: Direct INSERT statements (if DO block doesn't work)
-- Uncomment and use these if the DO block above fails:

/*
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
*/
