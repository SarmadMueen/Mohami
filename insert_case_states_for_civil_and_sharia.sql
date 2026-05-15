-- SQL script to insert case_state values into case_options table
-- Table: public.case_options
-- Field: case_state (text, nullable)
-- For case types: المدنية (Civil) and الشرعية (Sharia/Personal Status)

-- Step 1: Check existing case_state values
SELECT DISTINCT case_state 
FROM public.case_options 
WHERE case_state IS NOT NULL 
ORDER BY case_state;

-- Step 2: Insert all case_state values (using DO block for better control)
DO $$
DECLARE
    values_to_insert TEXT[] := ARRAY[
        'قيد الدراسة',
        'غير متفق عليها',
        'اقامة الدعوى',
        'قيد المرافعة',
        'موقوفة مؤقتآ',
        'مرحلة التمييز',
        'محسومة'
    ];
    value_item TEXT;
BEGIN
    FOREACH value_item IN ARRAY values_to_insert
    LOOP
        INSERT INTO public.case_options (case_state)
        SELECT value_item
        WHERE NOT EXISTS (
            SELECT 1 FROM public.case_options WHERE case_state = value_item
        );
    END LOOP;
END $$;

-- Step 3: Verify insertions
SELECT id, case_state, created_at
FROM public.case_options 
WHERE case_state IN (
    'قيد الدراسة',
    'غير متفق عليها',
    'اقامة الدعوى',
    'قيد المرافعة',
    'موقوفة مؤقتآ',
    'مرحلة التمييز',
    'محسومة'
)
ORDER BY case_state;

-- Alternative Method: Direct INSERT statements (if DO block doesn't work)
-- Uncomment and use these if the DO block above fails:

/*
INSERT INTO public.case_options (case_state)
SELECT 'قيد الدراسة' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'قيد الدراسة');

INSERT INTO public.case_options (case_state)
SELECT 'غير متفق عليها' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'غير متفق عليها');

INSERT INTO public.case_options (case_state)
SELECT 'اقامة الدعوى' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'اقامة الدعوى');

INSERT INTO public.case_options (case_state)
SELECT 'قيد المرافعة' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'قيد المرافعة');

INSERT INTO public.case_options (case_state)
SELECT 'موقوفة مؤقتآ' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'موقوفة مؤقتآ');

INSERT INTO public.case_options (case_state)
SELECT 'مرحلة التمييز' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'مرحلة التمييز');

INSERT INTO public.case_options (case_state)
SELECT 'محسومة' WHERE NOT EXISTS (SELECT 1 FROM public.case_options WHERE case_state = 'محسومة');
*/

-- Note: If you need to associate these case_state values with specific case types (المدنية, الشرعية),
-- you may need to add a case_type column reference or create a separate relationship table.
-- The current structure of case_options appears to store one value per row in separate columns.






