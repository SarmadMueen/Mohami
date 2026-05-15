-- SQL script to verify cases table structure and check for duplicates
-- This script checks:
-- 1. All new optional fields for المدنية, الجزائية, and الشرعية case types exist
-- 2. No duplicate cases exist in the table

-- ============================================================================
-- PART 1: Check for Duplicate Cases
-- ============================================================================

-- Check for duplicate case numbers
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    'Duplicate Case Numbers' AS check_type,
    case_number,
    COUNT(*) AS duplicate_count,
    STRING_AGG(id::text, ', ' ORDER BY id) AS case_ids
FROM cases
WHERE case_number IS NOT NULL
GROUP BY case_number
HAVING COUNT(*) > 1;

-- Check for duplicate cases with same client name and case date
-- Note: Using quoted identifiers for case-sensitive column names (caseDate is camelCase)
SELECT 
    'Duplicate Cases (Same Client & Date)' AS check_type,
    client_name,
    "caseDate" AS case_date,
    COUNT(*) AS duplicate_count,
    STRING_AGG(id::text, ', ' ORDER BY id) AS case_ids,
    STRING_AGG(case_number, ', ' ORDER BY id) AS case_numbers
FROM cases
WHERE client_name IS NOT NULL AND "caseDate" IS NOT NULL
GROUP BY client_name, "caseDate"
HAVING COUNT(*) > 1;

-- Check for duplicate cases with same case number in court
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    'Duplicate Cases (Same Court Case Number)' AS check_type,
    case_number_in_court,
    COUNT(*) AS duplicate_count,
    STRING_AGG(id::text, ', ' ORDER BY id) AS case_ids,
    STRING_AGG(case_number, ', ' ORDER BY id) AS case_numbers
FROM cases
WHERE case_number_in_court IS NOT NULL AND case_number_in_court != ''
GROUP BY case_number_in_court
HAVING COUNT(*) > 1;

-- ============================================================================
-- PART 2: Verify All Civil Case Fields (المدنية) Exist
-- ============================================================================

DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
    required_civil_fields TEXT[] := ARRAY[
        'obligation_type',           -- نوع الالتزام
        'obligation_source',         -- مصدر الالتزام
        'contract_type',             -- نوع العقد
        'contract_date',             -- تاريخ العقد
        'contract_duration_from',    -- مدة العقد (من)
        'contract_duration_to',      -- مدة العقد (إلى)
        'property_type',             -- نوع العقار
        'property_number',           -- رقم العقار
        'property_address',          -- عنوان العقار
        'register_number',           -- رقم السجل
        'register_page',             -- الصفحة
        'document_date',             -- تاريخ السند
        'registration_office',       -- دائرة التسجيل العقاري
        'real_right_type',           -- نوع الحق العيني
        'movable_type',              -- نوع المنقول
        'plate_number',              -- رقم اللوحة
        'movable_location',          -- مكان المنقول
        'debt_value',                -- قيمة الدين
        'contractual_penalties',     -- الغرامات الاتفاقية
        'compensation_value'         -- قيمة التعويض
    ];
BEGIN
    FOREACH col_name IN ARRAY required_civil_fields
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing Civil Case (المدنية) fields: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All Civil Case (المدنية) fields exist ✓';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Verify All Criminal Case Fields (الجزائية) Exist
-- ============================================================================

DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
    required_criminal_fields TEXT[] := ARRAY[
        'crime_type',                    -- نوع الجناية
        'victim_classification',         -- تصنيف الضحية
        'has_injuries',                  -- وجود إصابات
        'has_weapon',                    -- وجود سلاح
        'incident_location',             -- مكان الحادث
        'eyewitnesses',                  -- شهود العيان
        'violation_date',                -- تاريخ المخالفة
        'violation_time',                -- وقت المخالفة
        'material_evidence',             -- أدلة مادية
        'misdemeanor_type',              -- نوع الجنحة
        'has_criminal_record',           -- وجود سابقة جنائية
        'damage_nature',                 -- طبيعة الضرر
        'report_number',                 -- رقم المحضر
        'report_date',                   -- تاريخ المحضر
        'civil_compensation_request',    -- طلب تعويض مدني
        'misdemeanor_transfer_request',  -- طلب ترحيل الجنحة
        'violation_type',                -- نوع المخالفة
        'traffic_violation_number',      -- رقم مخالفة المرور
        'vehicle_type',                  -- نوع المركبة
        'estimated_fine',                -- غرامة مقدرة
        'violation_cancellation_request', -- طلب إلغاء المخالفة
        'has_previous_appeal'            -- وجود استئناف سابق
    ];
BEGIN
    FOREACH col_name IN ARRAY required_criminal_fields
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing Criminal Case (الجزائية) fields: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All Criminal Case (الجزائية) fields exist ✓';
    END IF;
END $$;

-- ============================================================================
-- PART 4: Verify All Sharia Case Fields (الشرعية) Exist
-- ============================================================================

DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
    required_sharia_fields TEXT[] := ARRAY[
        'sect',                          -- المذهب
        'competent_court',               -- المحكمة المختصة
        'marriage_contract_date',        -- تاريخ عقد الزواج
        'marriage_contract_number',      -- رقم عقد الزواج
        'marriage_contract_location',     -- مكان عقد الزواج
        'divorce_type',                  -- نوع الطلاق
        'separation_type',               -- نوع التفريق
        'deferred_dowry',                -- المهر المؤجل
        'iddah_period_from_divorce',     -- فترة العدة (من تاريخ الطلاق)
        'alimony_type',                  -- نوع النفقة
        'alimony_duration_required',     -- مدة النفقة المطلوبة
        'alimony_estimation_basis',      -- أساس تقدير النفقة
        'custody_years',                 -- سنوات حضانة الأولاد
        'request_visit_custodian',       -- طلب زيارة المحضون
        'birth_date',                    -- تاريخ الولادة
        'birth_location',                -- مكان الولادة
        'guardianship_type',             -- نوع الولاية
        'request_appoint_guardian',      -- طلب نصب وصي / قيم
        'current_guardian_status',       -- حالة الوصي الحالي
        'number_of_heirs',               -- عدد الورثة
        'kinship_degrees',               -- درجات القرابة
        'approximate_estate_value',      -- قيمة التركة التقريبية
        'will_type',                     -- نوع الوصية
        'dispute_details'                -- تفاصيل النزاع
    ];
BEGIN
    FOREACH col_name IN ARRAY required_sharia_fields
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing Sharia Case (الشرعية) fields: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All Sharia Case (الشرعية) fields exist ✓';
    END IF;
END $$;

-- ============================================================================
-- PART 5: Summary Report - All Fields Check
-- ============================================================================

-- Get all columns in cases table for verification
SELECT 
    'Cases Table Columns' AS report_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cases'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 6: Count Cases by Type with Field Usage
-- ============================================================================

-- Count cases by type and show which optional fields are being used
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    "caseType" AS case_type,
    COUNT(*) AS total_cases,
    COUNT(CASE WHEN obligation_type IS NOT NULL THEN 1 END) AS civil_fields_used,
    COUNT(CASE WHEN crime_type IS NOT NULL THEN 1 END) AS criminal_fields_used,
    COUNT(CASE WHEN sect IS NOT NULL THEN 1 END) AS sharia_fields_used
FROM cases
WHERE "caseType" IN ('المدنية', 'الجزائية', 'الشرعية')
GROUP BY "caseType"
ORDER BY "caseType";

-- ============================================================================
-- PART 7: Check for Orphaned Data (Fields with values but wrong case type)
-- ============================================================================

-- Check for civil case fields used in non-civil cases
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    'Civil fields in non-civil cases' AS check_type,
    id,
    case_number,
    "caseType",
    COUNT(*) FILTER (WHERE obligation_type IS NOT NULL OR contract_type IS NOT NULL OR property_type IS NOT NULL) AS civil_fields_found
FROM cases
WHERE "caseType" != 'المدنية' 
    AND (obligation_type IS NOT NULL OR contract_type IS NOT NULL OR property_type IS NOT NULL)
GROUP BY id, case_number, "caseType";

-- Check for criminal case fields used in non-criminal cases
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    'Criminal fields in non-criminal cases' AS check_type,
    id,
    case_number,
    "caseType",
    COUNT(*) FILTER (WHERE crime_type IS NOT NULL OR violation_type IS NOT NULL OR misdemeanor_type IS NOT NULL) AS criminal_fields_found
FROM cases
WHERE "caseType" != 'الجزائية'
    AND (crime_type IS NOT NULL OR violation_type IS NOT NULL OR misdemeanor_type IS NOT NULL)
GROUP BY id, case_number, "caseType";

-- Check for sharia case fields used in non-sharia cases
-- Note: Using quoted identifiers for case-sensitive column names
SELECT 
    'Sharia fields in non-sharia cases' AS check_type,
    id,
    case_number,
    "caseType",
    COUNT(*) FILTER (WHERE sect IS NOT NULL OR divorce_type IS NOT NULL OR guardianship_type IS NOT NULL) AS sharia_fields_found
FROM cases
WHERE "caseType" != 'الشرعية'
    AND (sect IS NOT NULL OR divorce_type IS NOT NULL OR guardianship_type IS NOT NULL)
GROUP BY id, case_number, "caseType";

