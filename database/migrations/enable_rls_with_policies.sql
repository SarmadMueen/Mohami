-- ============================================================
-- RLS Policies for Mohami Pro
-- This file creates RLS policies but does NOT enable RLS yet
-- Run this first, then enable RLS table-by-table for safe rollout
-- ============================================================

-- ============================================================
-- REFERENCE TABLES (Read-only for authenticated users)
-- ============================================================

-- Countries table
DROP POLICY IF EXISTS "Authenticated users can read countries" ON countries;
CREATE POLICY "Authenticated users can read countries"
    ON countries FOR SELECT
    TO authenticated
    USING (true);

-- Countriesd table
DROP POLICY IF EXISTS "Authenticated users can read countriesd" ON countriesd;
CREATE POLICY "Authenticated users can read countriesd"
    ON countriesd FOR SELECT
    TO authenticated
    USING (true);

-- Legal codes table
DROP POLICY IF EXISTS "Authenticated users can read legal_codes" ON legal_codes;
CREATE POLICY "Authenticated users can read legal_codes"
    ON legal_codes FOR SELECT
    TO authenticated
    USING (true);

-- Civil law table
DROP POLICY IF EXISTS "Authenticated users can read civil_law" ON civil_law;
CREATE POLICY "Authenticated users can read civil_law"
    ON civil_law FOR SELECT
    TO authenticated
    USING (true);

-- Criminal procedures law table
DROP POLICY IF EXISTS "Authenticated users can read criminal_procedures_law" ON criminal_procedures_law;
CREATE POLICY "Authenticated users can read criminal_procedures_law"
    ON criminal_procedures_law FOR SELECT
    TO authenticated
    USING (true);

-- Personal status law table
DROP POLICY IF EXISTS "Authenticated users can read personal_status_law" ON personal_status_law;
CREATE POLICY "Authenticated users can read personal_status_law"
    ON personal_status_law FOR SELECT
    TO authenticated
    USING (true);

-- Court table
DROP POLICY IF EXISTS "Authenticated users can read court" ON court;
CREATE POLICY "Authenticated users can read court"
    ON court FOR SELECT
    TO authenticated
    USING (true);

-- Templates table
DROP POLICY IF EXISTS "Authenticated users can read templates" ON templates;
CREATE POLICY "Authenticated users can read templates"
    ON templates FOR SELECT
    TO authenticated
    USING (true);

-- Case options table
DROP POLICY IF EXISTS "Authenticated users can read case_options" ON case_options;
CREATE POLICY "Authenticated users can read case_options"
    ON case_options FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- USER METADATA TABLE (Critical for auth)
-- ============================================================

-- User metadata - users can read their own metadata, admins can read all
DROP POLICY IF EXISTS "Users can read own metadata" ON user_metadata;
CREATE POLICY "Users can read own metadata"
    ON user_metadata FOR SELECT
    TO authenticated
    USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can read all metadata" ON user_metadata;
CREATE POLICY "Admins can read all metadata"
    ON user_metadata FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata um
            WHERE um.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can update own metadata" ON user_metadata;
CREATE POLICY "Users can update own metadata"
    ON user_metadata FOR UPDATE
    TO authenticated
    USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update all metadata" ON user_metadata;
CREATE POLICY "Admins can update all metadata"
    ON user_metadata FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata um
            WHERE um.admin_user_id::text = auth.uid()::text
        )
    );

-- ============================================================
-- CONSULTATIONS (Existing policies from supabase_consultations_table.sql)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all consultations" ON consultations;
CREATE POLICY "Admins can view all consultations"
    ON consultations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their consultations" ON consultations;
CREATE POLICY "Lawyers can view their consultations"
    ON consultations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND consultations.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can insert consultations" ON consultations;
CREATE POLICY "Admins can insert consultations"
    ON consultations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can insert consultations" ON consultations;
CREATE POLICY "Lawyers can insert consultations"
    ON consultations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can update consultations" ON consultations;
CREATE POLICY "Admins can update consultations"
    ON consultations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can update their consultations" ON consultations;
CREATE POLICY "Lawyers can update their consultations"
    ON consultations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND consultations.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can delete consultations" ON consultations;
CREATE POLICY "Admins can delete consultations"
    ON consultations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- ============================================================
-- CONTRACT REVIEWS (Existing policies from supabase_contract_reviews_table.sql)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all contract reviews" ON contract_reviews;
CREATE POLICY "Admins can view all contract reviews"
    ON contract_reviews FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their contract reviews" ON contract_reviews;
CREATE POLICY "Lawyers can view their contract reviews"
    ON contract_reviews FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND contract_reviews.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can insert contract reviews" ON contract_reviews;
CREATE POLICY "Admins can insert contract reviews"
    ON contract_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can insert contract reviews" ON contract_reviews;
CREATE POLICY "Lawyers can insert contract reviews"
    ON contract_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can update contract reviews" ON contract_reviews;
CREATE POLICY "Admins can update contract reviews"
    ON contract_reviews FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can update contract reviews" ON contract_reviews;
CREATE POLICY "Lawyers can update contract reviews"
    ON contract_reviews FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND contract_reviews.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can delete contract reviews" ON contract_reviews;
CREATE POLICY "Admins can delete contract reviews"
    ON contract_reviews FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- ============================================================
-- DOCUMENT REVIEWS (Existing policies from supabase_document_reviews_table.sql)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all document reviews" ON document_reviews;
CREATE POLICY "Admins can view all document reviews"
    ON document_reviews FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their document reviews" ON document_reviews;
CREATE POLICY "Lawyers can view their document reviews"
    ON document_reviews FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND document_reviews.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can insert document reviews" ON document_reviews;
CREATE POLICY "Admins can insert document reviews"
    ON document_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can insert document reviews" ON document_reviews;
CREATE POLICY "Lawyers can insert document reviews"
    ON document_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can update document reviews" ON document_reviews;
CREATE POLICY "Admins can update document reviews"
    ON document_reviews FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can update document reviews" ON document_reviews;
CREATE POLICY "Lawyers can update document reviews"
    ON document_reviews FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND document_reviews.lawyer_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can delete document reviews" ON document_reviews;
CREATE POLICY "Admins can delete document reviews"
    ON document_reviews FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- ============================================================
-- TRIAL REQUESTS (Existing policies from sql/create_trial_requests.sql)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can submit trial request" ON trial_requests;
CREATE POLICY "Anyone can submit trial request"
    ON trial_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view trial requests" ON trial_requests;
CREATE POLICY "Admins can view trial requests"
    ON trial_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can update trial requests" ON trial_requests;
CREATE POLICY "Admins can update trial requests"
    ON trial_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- ============================================================
-- CLIENT ACCOUNTS (Existing policies from sql/create_client_portal_tables.sql)
-- ============================================================

DROP POLICY IF EXISTS "client_read_own_account" ON client_accounts;
CREATE POLICY "client_read_own_account"
    ON client_accounts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "admin_manage_client_accounts" ON client_accounts;
CREATE POLICY "admin_manage_client_accounts"
    ON client_accounts
    FOR ALL
    TO authenticated
    USING (auth.uid() = admin_id OR auth.uid() = created_by);

-- ============================================================
-- SUBSCRIPTIONS (Existing policies from create_wayl_tables.sql)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
    ON subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
CREATE POLICY "Users can update their own subscriptions"
    ON subscriptions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- PAYMENT ORDERS (Existing policies from create_wayl_tables.sql)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own payment orders" ON payment_orders;
CREATE POLICY "Users can view their own payment orders"
    ON payment_orders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment orders" ON payment_orders;
CREATE POLICY "Users can insert their own payment orders"
    ON payment_orders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CLIENTS DATA TABLE (Core client data)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all clients_data" ON clients_data;
CREATE POLICY "Admins can view all clients_data"
    ON clients_data FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm clients_data" ON clients_data;
CREATE POLICY "Lawyers can view their firm clients_data"
    ON clients_data FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = clients_data.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert clients_data" ON clients_data;
CREATE POLICY "Admins can insert clients_data"
    ON clients_data FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update clients_data" ON clients_data;
CREATE POLICY "Admins can update clients_data"
    ON clients_data FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete clients_data" ON clients_data;
CREATE POLICY "Admins can delete clients_data"
    ON clients_data FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- CLIENTS TABLE (Legacy clients table)
-- ============================================================

DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
CREATE POLICY "Enable read access for all users"
    ON clients FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
CREATE POLICY "Admins can insert clients"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update clients" ON clients;
CREATE POLICY "Admins can update clients"
    ON clients FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
CREATE POLICY "Admins can delete clients"
    ON clients FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- CASES TABLE (Core case data)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all cases" ON cases;
CREATE POLICY "Admins can view all cases"
    ON cases FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm cases" ON cases;
CREATE POLICY "Lawyers can view their firm cases"
    ON cases FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR lawyer_id::text = auth.uid()::text
        OR caseLawyerId::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = cases.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert cases" ON cases;
CREATE POLICY "Admins can insert cases"
    ON cases FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update cases" ON cases;
CREATE POLICY "Admins can update cases"
    ON cases FOR UPDATE
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR lawyer_id::text = auth.uid()::text
        OR caseLawyerId::text = auth.uid()::text
    );

DROP POLICY IF EXISTS "Admins can delete cases" ON cases;
CREATE POLICY "Admins can delete cases"
    ON cases FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions"
    ON sessions FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm sessions" ON sessions;
CREATE POLICY "Lawyers can view their firm sessions"
    ON sessions FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = sessions.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;
CREATE POLICY "Admins can insert sessions"
    ON sessions FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
CREATE POLICY "Admins can update sessions"
    ON sessions FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;
CREATE POLICY "Admins can delete sessions"
    ON sessions FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- TASKS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
CREATE POLICY "Admins can view all tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm tasks" ON tasks;
CREATE POLICY "Lawyers can view their firm tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = tasks.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert tasks" ON tasks;
CREATE POLICY "Admins can insert tasks"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update tasks" ON tasks;
CREATE POLICY "Admins can update tasks"
    ON tasks FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
CREATE POLICY "Admins can delete tasks"
    ON tasks FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- NOTES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
CREATE POLICY "Admins can view all notes"
    ON notes FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm notes" ON notes;
CREATE POLICY "Lawyers can view their firm notes"
    ON notes FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = notes.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert notes" ON notes;
CREATE POLICY "Admins can insert notes"
    ON notes FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update notes" ON notes;
CREATE POLICY "Admins can update notes"
    ON notes FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete notes" ON notes;
CREATE POLICY "Admins can delete notes"
    ON notes FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- ATTACHMENTS TABLE (Sensitive - session_id column)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all attachments" ON attachments;
CREATE POLICY "Admins can view all attachments"
    ON attachments FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm attachments" ON attachments;
CREATE POLICY "Lawyers can view their firm attachments"
    ON attachments FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = attachments.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert attachments" ON attachments;
CREATE POLICY "Admins can insert attachments"
    ON attachments FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update attachments" ON attachments;
CREATE POLICY "Admins can update attachments"
    ON attachments FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete attachments" ON attachments;
CREATE POLICY "Admins can delete attachments"
    ON attachments FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- REMINDERS TABLE (Sensitive - session_id column)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all reminders" ON reminders;
CREATE POLICY "Admins can view all reminders"
    ON reminders FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm reminders" ON reminders;
CREATE POLICY "Lawyers can view their firm reminders"
    ON reminders FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = reminders.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert reminders" ON reminders;
CREATE POLICY "Admins can insert reminders"
    ON reminders FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update reminders" ON reminders;
CREATE POLICY "Admins can update reminders"
    ON reminders FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete reminders" ON reminders;
CREATE POLICY "Admins can delete reminders"
    ON reminders FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all expenses" ON expenses;
CREATE POLICY "Admins can view all expenses"
    ON expenses FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm expenses" ON expenses;
CREATE POLICY "Lawyers can view their firm expenses"
    ON expenses FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = expenses.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert expenses" ON expenses;
CREATE POLICY "Admins can insert expenses"
    ON expenses FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update expenses" ON expenses;
CREATE POLICY "Admins can update expenses"
    ON expenses FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;
CREATE POLICY "Admins can delete expenses"
    ON expenses FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- OFFICE EXPENSES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all office_expenses" ON office_expenses;
CREATE POLICY "Admins can view all office_expenses"
    ON office_expenses FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm office_expenses" ON office_expenses;
CREATE POLICY "Lawyers can view their firm office_expenses"
    ON office_expenses FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = office_expenses.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert office_expenses" ON office_expenses;
CREATE POLICY "Admins can insert office_expenses"
    ON office_expenses FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update office_expenses" ON office_expenses;
CREATE POLICY "Admins can update office_expenses"
    ON office_expenses FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete office_expenses" ON office_expenses;
CREATE POLICY "Admins can delete office_expenses"
    ON office_expenses FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- LAWYER USERS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read lawyer_users" ON lawyer_users;
CREATE POLICY "Authenticated users can read lawyer_users"
    ON lawyer_users FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert lawyer_users" ON lawyer_users;
CREATE POLICY "Admins can insert lawyer_users"
    ON lawyer_users FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update lawyer_users" ON lawyer_users;
CREATE POLICY "Admins can update lawyer_users"
    ON lawyer_users FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- LAWYER TABLE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read lawyer" ON lawyer;
CREATE POLICY "Authenticated users can read lawyer"
    ON lawyer FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert lawyer" ON lawyer;
CREATE POLICY "Admins can insert lawyer"
    ON lawyer FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update lawyer" ON lawyer;
CREATE POLICY "Admins can update lawyer"
    ON lawyer FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- ATTORNEY TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all attorney" ON attorney;
CREATE POLICY "Admins can view all attorney"
    ON attorney FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm attorney" ON attorney;
CREATE POLICY "Lawyers can view their firm attorney"
    ON attorney FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = attorney.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert attorney" ON attorney;
CREATE POLICY "Admins can insert attorney"
    ON attorney FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update attorney" ON attorney;
CREATE POLICY "Admins can update attorney"
    ON attorney FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete attorney" ON attorney;
CREATE POLICY "Admins can delete attorney"
    ON attorney FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- LAWYER FEES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all lawyer_fees" ON lawyer_fees;
CREATE POLICY "Admins can view all lawyer_fees"
    ON lawyer_fees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm lawyer_fees" ON lawyer_fees;
CREATE POLICY "Lawyers can view their firm lawyer_fees"
    ON lawyer_fees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = lawyer_fees.case_id
            AND (
                c.admin_id::text = auth.uid()::text
                OR c.lawyer_id::text = auth.uid()::text
                OR c.caseLawyerId::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM user_metadata
                    WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
                    AND user_metadata.admin_user_id = c.admin_id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins can insert lawyer_fees" ON lawyer_fees;
CREATE POLICY "Admins can insert lawyer_fees"
    ON lawyer_fees FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update lawyer_fees" ON lawyer_fees;
CREATE POLICY "Admins can update lawyer_fees"
    ON lawyer_fees FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can delete lawyer_fees" ON lawyer_fees;
CREATE POLICY "Admins can delete lawyer_fees"
    ON lawyer_fees FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- ATTORNEY FEES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all attorneyFees" ON attorneyFees;
CREATE POLICY "Admins can view all attorneyFees"
    ON attorneyFees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm attorneyFees" ON attorneyFees;
CREATE POLICY "Lawyers can view their firm attorneyFees"
    ON attorneyFees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = attorneyFees.case_id
            AND (
                c.admin_id::text = auth.uid()::text
                OR c.lawyer_id::text = auth.uid()::text
                OR c.caseLawyerId::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM user_metadata
                    WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
                    AND user_metadata.admin_user_id = c.admin_id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins can insert attorneyFees" ON attorneyFees;
CREATE POLICY "Admins can insert attorneyFees"
    ON attorneyFees FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update attorneyFees" ON attorneyFees;
CREATE POLICY "Admins can update attorneyFees"
    ON attorneyFees FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can delete attorneyFees" ON attorneyFees;
CREATE POLICY "Admins can delete attorneyFees"
    ON attorneyFees FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- PERMISSION PROFILES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read permission_profiles" ON permission_profiles;
CREATE POLICY "Authenticated users can read permission_profiles"
    ON permission_profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert permission_profiles" ON permission_profiles;
CREATE POLICY "Admins can insert permission_profiles"
    ON permission_profiles FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update permission_profiles" ON permission_profiles;
CREATE POLICY "Admins can update permission_profiles"
    ON permission_profiles FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- ACTIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON actions;
CREATE POLICY "Enable insert for authenticated users only"
    ON actions FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read actions" ON actions;
CREATE POLICY "Authenticated users can read actions"
    ON actions FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- RELATED CASES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all related_cases" ON related_cases;
CREATE POLICY "Admins can view all related_cases"
    ON related_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm related_cases" ON related_cases;
CREATE POLICY "Lawyers can view their firm related_cases"
    ON related_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE (c.id = related_cases.case_id OR c.id = related_cases.related_case_id)
            AND (
                c.admin_id::text = auth.uid()::text
                OR c.lawyer_id::text = auth.uid()::text
                OR c.caseLawyerId::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM user_metadata
                    WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
                    AND user_metadata.admin_user_id = c.admin_id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins can insert related_cases" ON related_cases;
CREATE POLICY "Admins can insert related_cases"
    ON related_cases FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete related_cases" ON related_cases;
CREATE POLICY "Admins can delete related_cases"
    ON related_cases FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- CASE UPDATE TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all case_update" ON case_update;
CREATE POLICY "Admins can view all case_update"
    ON case_update FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm case_update" ON case_update;
CREATE POLICY "Lawyers can view their firm case_update"
    ON case_update FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = case_update.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert case_update" ON case_update;
CREATE POLICY "Admins can insert case_update"
    ON case_update FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

-- ============================================================
-- TASK REPLIES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all task_replies" ON task_replies;
CREATE POLICY "Admins can view all task_replies"
    ON task_replies FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm task_replies" ON task_replies;
CREATE POLICY "Lawyers can view their firm task_replies"
    ON task_replies FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_replies.task_id
            AND (
                t.admin_id::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM user_metadata
                    WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
                    AND user_metadata.admin_user_id = t.admin_id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins can insert task_replies" ON task_replies;
CREATE POLICY "Admins can insert task_replies"
    ON task_replies FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update task_replies" ON task_replies;
CREATE POLICY "Admins can update task_replies"
    ON task_replies FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- CONTRACT TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all contract" ON contract;
CREATE POLICY "Admins can view all contract"
    ON contract FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm contract" ON contract;
CREATE POLICY "Lawyers can view their firm contract"
    ON contract FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = contract.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert contract" ON contract;
CREATE POLICY "Admins can insert contract"
    ON contract FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update contract" ON contract;
CREATE POLICY "Admins can update contract"
    ON contract FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete contract" ON contract;
CREATE POLICY "Admins can delete contract"
    ON contract FOR DELETE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- FF TABLE (Unknown purpose - allowing authenticated read)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read ff" ON ff;
CREATE POLICY "Authenticated users can read ff"
    ON ff FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- CLIENTS V2 TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all clients_v2" ON clients_v2;
CREATE POLICY "Admins can view all clients_v2"
    ON clients_v2 FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Lawyers can view their firm clients_v2" ON clients_v2;
CREATE POLICY "Lawyers can view their firm clients_v2"
    ON clients_v2 FOR SELECT
    TO authenticated
    USING (
        admin_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND user_metadata.admin_user_id = clients_v2.admin_id
        )
    );

DROP POLICY IF EXISTS "Admins can insert clients_v2" ON clients_v2;
CREATE POLICY "Admins can insert clients_v2"
    ON clients_v2 FOR INSERT
    TO authenticated
    WITH CHECK (admin_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can update clients_v2" ON clients_v2;
CREATE POLICY "Admins can update clients_v2"
    ON clients_v2 FOR UPDATE
    TO authenticated
    USING (admin_id::text = auth.uid()::text);

-- ============================================================
-- CLIENT SHARED DOCUMENTS (From create_client_portal_tables.sql)
-- ============================================================

DROP POLICY IF EXISTS "client_view_shared_docs" ON client_shared_documents;
CREATE POLICY "client_view_shared_docs"
    ON client_shared_documents FOR SELECT
    TO authenticated
    USING (
        client_data_id IN (
            SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "client_upload_docs" ON client_shared_documents;
CREATE POLICY "client_upload_docs"
    ON client_shared_documents FOR INSERT
    TO authenticated
    WITH CHECK (
        uploaded_by_client = true AND
        client_data_id IN (
            SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "admin_manage_shared_docs" ON client_shared_documents;
CREATE POLICY "admin_manage_shared_docs"
    ON client_shared_documents FOR ALL
    TO authenticated
    USING (auth.uid() = admin_id OR auth.uid() = shared_by);

-- ============================================================
-- CLIENT MESSAGES (From create_client_portal_tables.sql)
-- ============================================================

DROP POLICY IF EXISTS "client_messages_select" ON client_messages;
CREATE POLICY "client_messages_select"
    ON client_messages FOR SELECT
    TO authenticated
    USING (
        client_data_id IN (
            SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
        )
        OR admin_id = auth.uid()
    );

DROP POLICY IF EXISTS "client_messages_insert" ON client_messages;
CREATE POLICY "client_messages_insert"
    ON client_messages FOR INSERT
    TO authenticated
    WITH CHECK (
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

DROP POLICY IF EXISTS "admin_messages_all" ON client_messages;
CREATE POLICY "admin_messages_all"
    ON client_messages FOR ALL
    TO authenticated
    USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "client_messages_update_read" ON client_messages;
CREATE POLICY "client_messages_update_read"
    ON client_messages FOR UPDATE
    TO authenticated
    USING (
        client_data_id IN (
            SELECT client_data_id FROM client_accounts WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================================
-- COURT DECISIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read court_decisions" ON court_decisions;
CREATE POLICY "Authenticated users can read court_decisions"
    ON court_decisions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert court_decisions" ON court_decisions;
CREATE POLICY "Admins can insert court_decisions"
    ON court_decisions FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update court_decisions" ON court_decisions;
CREATE POLICY "Admins can update court_decisions"
    ON court_decisions FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can delete court_decisions" ON court_decisions;
CREATE POLICY "Admins can delete court_decisions"
    ON court_decisions FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id::text = auth.uid()::text);

-- ============================================================
-- END OF POLICIES
-- Policies created but RLS NOT enabled yet
-- Proceed to enable RLS table-by-table for safe rollout
-- ============================================================
