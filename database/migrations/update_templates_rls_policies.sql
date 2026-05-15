-- Update RLS policies for templates table to support lawyer-uploaded templates
-- This allows lawyers to manage their own templates while admins have full access

-- Ensure RLS is enabled
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read templates" ON templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
DROP POLICY IF EXISTS "Admins can manage all templates" ON templates;

-- Policy: Allow authenticated users to read all templates
-- Lawyers can see all templates (both admin and other lawyers' if shared in future)
CREATE POLICY "Authenticated users can read templates"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow users to insert their own templates
CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own templates
CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Allow users to delete their own templates
CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Allow admins full access to all templates
CREATE POLICY "Admins can manage all templates"
  ON templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_metadata
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
