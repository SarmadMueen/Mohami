-- SQL script to add criminal case (الجزائية) specific fields to the cases table
-- This migration adds fields for crime details, violations, evidence, and related information

-- Add crime-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS crime_type TEXT,                    -- نوع الجناية
ADD COLUMN IF NOT EXISTS victim_classification TEXT;         -- تصنيف الضحية

-- Add incident and evidence fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS has_injuries TEXT,                  -- وجود إصابات (نعم/لا)
ADD COLUMN IF NOT EXISTS has_weapon TEXT,                   -- وجود سلاح (نعم/لا)
ADD COLUMN IF NOT EXISTS incident_location TEXT,            -- مكان الحادث
ADD COLUMN IF NOT EXISTS eyewitnesses TEXT,                  -- شهود العيان
ADD COLUMN IF NOT EXISTS material_evidence TEXT;            -- أدلة مادية

-- Add violation-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS violation_date DATE,               -- تاريخ المخالفة
ADD COLUMN IF NOT EXISTS violation_time TIME,               -- وقت المخالفة
ADD COLUMN IF NOT EXISTS violation_type TEXT,               -- نوع المخالفة
ADD COLUMN IF NOT EXISTS traffic_violation_number TEXT,      -- رقم مخالفة المرور
ADD COLUMN IF NOT EXISTS estimated_fine DECIMAL(15, 2);     -- غرامة مقدرة

-- Add misdemeanor and damage fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS misdemeanor_type TEXT,             -- نوع الجنحة
ADD COLUMN IF NOT EXISTS damage_nature TEXT;                 -- طبيعة الضرر

-- Add criminal record and report fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS has_criminal_record TEXT,          -- وجود سابقة جنائية (نعم/لا)
ADD COLUMN IF NOT EXISTS report_number TEXT,                -- رقم المحضر
ADD COLUMN IF NOT EXISTS report_date DATE;                   -- تاريخ المحضر

-- Add request and appeal fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS civil_compensation_request TEXT,   -- طلب تعويض مدني (نعم/لا)
ADD COLUMN IF NOT EXISTS misdemeanor_transfer_request TEXT, -- طلب ترحيل الجنحة (نعم/لا)
ADD COLUMN IF NOT EXISTS violation_cancellation_request TEXT, -- طلب إلغاء المخالفة (نعم/لا)
ADD COLUMN IF NOT EXISTS has_previous_appeal TEXT;          -- وجود استئناف سابق (نعم/لا)

-- Add vehicle-related fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT;                  -- نوع المركبة

-- Add comments to columns for documentation
COMMENT ON COLUMN cases.crime_type IS 'نوع الجناية';
COMMENT ON COLUMN cases.victim_classification IS 'تصنيف الضحية';
COMMENT ON COLUMN cases.has_injuries IS 'وجود إصابات';
COMMENT ON COLUMN cases.has_weapon IS 'وجود سلاح';
COMMENT ON COLUMN cases.incident_location IS 'مكان الحادث';
COMMENT ON COLUMN cases.eyewitnesses IS 'شهود العيان';
COMMENT ON COLUMN cases.material_evidence IS 'أدلة مادية';
COMMENT ON COLUMN cases.violation_date IS 'تاريخ المخالفة';
COMMENT ON COLUMN cases.violation_time IS 'وقت المخالفة';
COMMENT ON COLUMN cases.violation_type IS 'نوع المخالفة';
COMMENT ON COLUMN cases.traffic_violation_number IS 'رقم مخالفة المرور';
COMMENT ON COLUMN cases.estimated_fine IS 'غرامة مقدرة';
COMMENT ON COLUMN cases.misdemeanor_type IS 'نوع الجنحة';
COMMENT ON COLUMN cases.damage_nature IS 'طبيعة الضرر';
COMMENT ON COLUMN cases.has_criminal_record IS 'وجود سابقة جنائية';
COMMENT ON COLUMN cases.report_number IS 'رقم المحضر';
COMMENT ON COLUMN cases.report_date IS 'تاريخ المحضر';
COMMENT ON COLUMN cases.civil_compensation_request IS 'طلب تعويض مدني';
COMMENT ON COLUMN cases.misdemeanor_transfer_request IS 'طلب ترحيل الجنحة';
COMMENT ON COLUMN cases.violation_cancellation_request IS 'طلب إلغاء المخالفة';
COMMENT ON COLUMN cases.has_previous_appeal IS 'وجود استئناف سابق';
COMMENT ON COLUMN cases.vehicle_type IS 'نوع المركبة';

-- Create indexes for better query performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_cases_crime_type ON cases(crime_type);
CREATE INDEX IF NOT EXISTS idx_cases_violation_date ON cases(violation_date);
CREATE INDEX IF NOT EXISTS idx_cases_violation_type ON cases(violation_type);
CREATE INDEX IF NOT EXISTS idx_cases_misdemeanor_type ON cases(misdemeanor_type);
CREATE INDEX IF NOT EXISTS idx_cases_report_number ON cases(report_number);






