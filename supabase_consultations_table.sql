-- Supabase Table Structure for Legal Consultations (استشارة قانونية)
-- Table: consultations

CREATE TABLE IF NOT EXISTS consultations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Consultation Information (معلومات الإستشارة)
    consultation_title TEXT NOT NULL,  -- عنوان الاستشارة
    consultation_type TEXT NOT NULL,   -- نوع الإستشارة
    consultation_date DATE NOT NULL,   -- تاريخ الإستشارة
    consultation_time TIME NOT NULL,   -- وقت الإستشارة
    consultation_fees DECIMAL(10, 2) DEFAULT 0,  -- رسوم الإستشارة
    
    -- Consultation Details (تفاصيل الإستشارة)
    case_facts TEXT,                   -- وقائع القضية
    legal_discussion TEXT,             -- المناقشة القانونية
    legal_opinion TEXT,                -- الرأي القانوني
    
    -- Client Information
    client_name TEXT,                  -- اسم الموكل (optional)
    
    -- Tracking IDs (for tracking actions)
    admin_id UUID,                     -- ID of admin who created/updated
    lawyer_id UUID,                    -- ID of lawyer assigned/created
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints (if needed)
    CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_lawyer FOREIGN KEY (lawyer_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_admin_id ON consultations(admin_id);
CREATE INDEX IF NOT EXISTS idx_consultations_lawyer_id ON consultations(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_client_name ON consultations(client_name);

-- Enable Row Level Security (RLS)
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your requirements)
-- Policy: Admins can view all consultations
CREATE POLICY "Admins can view all consultations"
    ON consultations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can view their own consultations
CREATE POLICY "Lawyers can view their consultations"
    ON consultations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND consultations.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can insert consultations
CREATE POLICY "Admins can insert consultations"
    ON consultations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can insert their consultations
CREATE POLICY "Lawyers can insert consultations"
    ON consultations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can update all consultations
CREATE POLICY "Admins can update consultations"
    ON consultations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can update their own consultations
CREATE POLICY "Lawyers can update their consultations"
    ON consultations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND consultations.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can delete consultations
CREATE POLICY "Admins can delete consultations"
    ON consultations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_consultations_updated_at();

-- Comments for documentation
COMMENT ON TABLE consultations IS 'جدول الاستشارات القانونية';
COMMENT ON COLUMN consultations.consultation_title IS 'عنوان الاستشارة';
COMMENT ON COLUMN consultations.consultation_type IS 'نوع الإستشارة';
COMMENT ON COLUMN consultations.consultation_date IS 'تاريخ الإستشارة';
COMMENT ON COLUMN consultations.consultation_time IS 'وقت الإستشارة';
COMMENT ON COLUMN consultations.consultation_fees IS 'رسوم الإستشارة';
COMMENT ON COLUMN consultations.case_facts IS 'وقائع القضية';
COMMENT ON COLUMN consultations.legal_discussion IS 'المناقشة القانونية';
COMMENT ON COLUMN consultations.legal_opinion IS 'الرأي القانوني';
COMMENT ON COLUMN consultations.client_name IS 'اسم الموكل';
COMMENT ON COLUMN consultations.admin_id IS 'معرف المسؤول';
COMMENT ON COLUMN consultations.lawyer_id IS 'معرف المحامي';
