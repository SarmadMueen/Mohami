-- ============================================================
-- Company Manager Test Environment Database Migration
-- This migration creates tables for the isolated test environment
-- for dr.abd256@gmail.com only
-- ============================================================

-- 1. Add company_manager role to existing roles (if not exists)
-- Note: This is a reference update, actual role enforcement happens via user_metadata

-- 2. Create company_manager_preferences table
CREATE TABLE IF NOT EXISTS company_manager_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_features JSONB DEFAULT '[]'::jsonb,
  default_view TEXT DEFAULT 'dashboard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Add columns to cases table for manager assignment
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_by_manager_id UUID;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS manager_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_cases_assigned_by_manager ON cases(assigned_by_manager_id);

-- 4. Add column to user_metadata to track which manager created the lawyer account
ALTER TABLE user_metadata ADD COLUMN IF NOT EXISTS created_by_manager_id UUID;
CREATE INDEX IF NOT EXISTS idx_user_metadata_created_by_manager ON user_metadata(created_by_manager_id);

-- 5. Create lawyer_activity_metrics table
CREATE TABLE IF NOT EXISTS lawyer_activity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  date DATE NOT NULL,
  cases_assigned INTEGER DEFAULT 0,
  sessions_attended INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  avg_response_time_hours NUMERIC DEFAULT 0,
  cases_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lawyer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_lawyer_activity_metrics_lawyer ON lawyer_activity_metrics(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_activity_metrics_admin ON lawyer_activity_metrics(admin_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_activity_metrics_date ON lawyer_activity_metrics(date);

-- 6. Enable RLS on new tables
ALTER TABLE company_manager_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_activity_metrics ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for company_manager_preferences
-- Users can read their own preferences
CREATE POLICY "users_read_own_preferences" ON company_manager_preferences
  FOR SELECT USING (user_id = auth.uid()::uuid);

-- Users can update their own preferences
CREATE POLICY "users_update_own_preferences" ON company_manager_preferences
  FOR UPDATE USING (user_id = auth.uid()::uuid);

-- Users can insert their own preferences
CREATE POLICY "users_insert_own_preferences" ON company_manager_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- 8. RLS Policies for lawyer_activity_metrics
-- Admins can read metrics for their lawyers
CREATE POLICY "admins_read_lawyer_metrics" ON lawyer_activity_metrics
  FOR SELECT USING (
    admin_id = auth.uid()::uuid OR
    EXISTS (
      SELECT 1 FROM user_metadata
      WHERE user_id::text = auth.uid()::text AND admin_user_id::text = lawyer_activity_metrics.admin_id::text
    )
  );

-- Admins can insert metrics
CREATE POLICY "admins_insert_lawyer_metrics" ON lawyer_activity_metrics
  FOR INSERT WITH CHECK (admin_id = auth.uid()::uuid);

-- Admins can update metrics
CREATE POLICY "admins_update_lawyer_metrics" ON lawyer_activity_metrics
  FOR UPDATE USING (admin_id = auth.uid()::uuid);

-- 9. RLS Policies for cases table (for manager assignment)
-- Managers can read cases they assigned
CREATE POLICY "managers_read_assigned_cases" ON cases
  FOR SELECT USING (assigned_by_manager_id = auth.uid()::uuid);

-- Managers can update cases they assigned
CREATE POLICY "managers_update_assigned_cases" ON cases
  FOR UPDATE USING (assigned_by_manager_id = auth.uid()::uuid);

-- Managers can insert cases
CREATE POLICY "managers_insert_cases" ON cases
  FOR INSERT WITH CHECK (assigned_by_manager_id = auth.uid()::uuid);

-- 10. RLS Policies for user_metadata (for lawyer creation tracking)
-- Managers can read lawyers they created
CREATE POLICY "managers_read_created_lawyers" ON user_metadata
  FOR SELECT USING (created_by_manager_id = auth.uid()::uuid);

-- 11. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_company_manager_preferences_updated_at
  BEFORE UPDATE ON company_manager_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawyer_activity_metrics_updated_at
  BEFORE UPDATE ON lawyer_activity_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Note: These changes are for the test environment only
-- and do not affect existing user roles or permissions
-- ============================================================
