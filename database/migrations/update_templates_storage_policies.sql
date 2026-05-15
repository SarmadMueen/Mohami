-- Update storage policies for templates bucket to support lawyer-uploaded templates
-- This allows lawyers to upload to their own folders while admins have full access

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins full storage access" ON storage.objects;

-- Policy: Allow users to upload to their own folder (lawyer-{user_id}/)
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'templates' AND
    name LIKE 'lawyer-' || auth.uid()::text || '/%'
  );

-- Policy: Allow users to read their own templates and all admin templates (root level)
CREATE POLICY "Users can read own templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'templates' AND (
      name LIKE 'lawyer-' || auth.uid()::text || '/%' OR
      NOT name LIKE 'lawyer-%/%'
    )
  );

-- Policy: Allow users to delete their own templates
CREATE POLICY "Users can delete own templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'templates' AND
    name LIKE 'lawyer-' || auth.uid()::text || '/%'
  );

-- Policy: Admins have full access to templates storage
CREATE POLICY "Admins full storage access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'templates' AND
    EXISTS (
      SELECT 1 FROM user_metadata
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
