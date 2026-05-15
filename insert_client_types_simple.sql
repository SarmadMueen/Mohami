-- Simple SQL script to insert client_type values
-- Run each INSERT statement separately if needed

-- Check existing values first
SELECT DISTINCT client_type FROM case_options WHERE client_type IS NOT NULL;

-- Insert each value individually (safer approach)
INSERT INTO case_options (client_type)
SELECT 'مشتكي عليه' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'مشتكي عليه');

INSERT INTO case_options (client_type)
SELECT 'مطعون ضده' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'مطعون ضده');

INSERT INTO case_options (client_type)
SELECT 'مطلوب منهم' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'مطلوب منهم');

INSERT INTO case_options (client_type)
SELECT 'ملتمس' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'ملتمس');

INSERT INTO case_options (client_type)
SELECT 'ملتمس ضده' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'ملتمس ضده');

INSERT INTO case_options (client_type)
SELECT 'منفذ' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'منفذ');

INSERT INTO case_options (client_type)
SELECT 'منفذ ضده' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'منفذ ضده');

INSERT INTO case_options (client_type)
SELECT 'منفذ له' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'منفذ له');

INSERT INTO case_options (client_type)
SELECT 'مُتهِم' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'مُتهِم');

INSERT INTO case_options (client_type)
SELECT 'مُنذر' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'مُنذر');

INSERT INTO case_options (client_type)
SELECT 'نيابة' WHERE NOT EXISTS (SELECT 1 FROM case_options WHERE client_type = 'نيابة');

-- Verify all values were inserted
SELECT id, client_type FROM case_options WHERE client_type IS NOT NULL ORDER BY client_type;



