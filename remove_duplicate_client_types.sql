-- SQL script to remove duplicate client_type values from case_options table
-- This will keep only one row for each unique client_type value

-- Step 1: Check for duplicates
SELECT client_type, COUNT(*) as count
FROM public.case_options
WHERE client_type IS NOT NULL
GROUP BY client_type
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Remove duplicates, keeping only the row with the lowest id for each client_type
DELETE FROM public.case_options
WHERE id NOT IN (
    SELECT MIN(id)
    FROM public.case_options
    WHERE client_type IS NOT NULL
    GROUP BY client_type
)
AND client_type IS NOT NULL;

-- Step 3: Verify no duplicates remain
SELECT client_type, COUNT(*) as count
FROM public.case_options
WHERE client_type IS NOT NULL
GROUP BY client_type
HAVING COUNT(*) > 1;

-- Step 4: Show all unique client_type values
SELECT DISTINCT client_type
FROM public.case_options
WHERE client_type IS NOT NULL
ORDER BY client_type;


