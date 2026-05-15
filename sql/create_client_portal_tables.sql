-- ============================================================
-- Client Portal Tables for Mohami Pro
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- 1. client_accounts: Links Supabase auth users to clients_data for portal access
CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_data_id INTEGER NOT NULL REFERENCES clients_data(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  is_portal_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  last_login TIMESTAMPTZ,
  UNIQUE(client_data_id),
  UNIQUE(auth_user_id)
);

-- RLS for client_accounts
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

-- Clients can read their own account
CREATE POLICY "client_read_own_account" ON client_accounts
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Admins/lawyers can manage client accounts they created
CREATE POLICY "admin_manage_client_accounts" ON client_accounts
  FOR ALL USING (auth.uid() = admin_id OR auth.uid() = created_by);


-- 2. client_shared_documents: Documents shared between lawyer and client
CREATE TABLE IF NOT EXISTS client_shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_data_id INTEGER NOT NULL REFERENCES clients_data(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  admin_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT DEFAULT 'shared_by_lawyer',
  shared_by UUID,
  uploaded_by_client BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for client_shared_documents
ALTER TABLE client_shared_documents ENABLE ROW LEVEL SECURITY;

-- Clients can view documents shared with them
CREATE POLICY "client_view_shared_docs" ON client_shared_documents
  FOR SELECT USING (
    client_data_id IN (
      SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Clients can upload (insert) documents
CREATE POLICY "client_upload_docs" ON client_shared_documents
  FOR INSERT WITH CHECK (
    uploaded_by_client = true AND
    client_data_id IN (
      SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Admins/lawyers can manage all docs for their firm
CREATE POLICY "admin_manage_shared_docs" ON client_shared_documents
  FOR ALL USING (auth.uid() = admin_id OR auth.uid() = shared_by);


-- 3. client_messages: Messaging between lawyer and client
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_data_id INTEGER NOT NULL REFERENCES clients_data(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('lawyer', 'client')),
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for client_messages
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view and send messages for their account
CREATE POLICY "client_messages_select" ON client_messages
  FOR SELECT USING (
    client_data_id IN (
      SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
    )
    OR admin_id = auth.uid()
  );

CREATE POLICY "client_messages_insert" ON client_messages
  FOR INSERT WITH CHECK (
    (
      sender_type = 'client' AND
      client_data_id IN (
        SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
      )
    )
    OR (
      sender_type = 'lawyer' AND auth.uid() = admin_id
    )
  );

-- Admins/lawyers can manage messages
CREATE POLICY "admin_messages_all" ON client_messages
  FOR ALL USING (auth.uid() = admin_id);

-- Update read status
CREATE POLICY "client_messages_update_read" ON client_messages
  FOR UPDATE USING (
    client_data_id IN (
      SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
    )
  );


-- 4. Add client_data_id column to cases table for reliable linking
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_data_id INTEGER REFERENCES clients_data(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cases_client_data_id ON cases(client_data_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_auth_user ON client_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_admin ON client_accounts(admin_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_data_id);
CREATE INDEX IF NOT EXISTS idx_client_shared_docs_client ON client_shared_documents(client_data_id);
