-- Create contract_reviews table for مراجعة العقود
CREATE TABLE IF NOT EXISTS contract_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Case Reference (رقم الدعوى المرجعي)
    case_reference_id TEXT,  -- Links to cases.case_number
    
    -- Contract Information (معلومات العقد)
    contract_title TEXT NOT NULL,  -- عنوان العقد
    contract_type TEXT NOT NULL,   -- نوع العقد: Lease, Employment, Commercial Sale, etc.
    review_date DATE NOT NULL,     -- تاريخ المراجعة
    
    -- Review Status (حالة المراجعة)
    status TEXT NOT NULL,          -- الحالة: Reviewed, Needs Negotiation, Approved, Rejected
    
    -- Contract Parties (أطراف العقد)
    opposing_party TEXT,           -- الطرف الآخر (الخصم)
    
    -- Legal Information (المعلومات القانونية)
    governing_jurisdiction TEXT,   -- القانون الحاكم (مثل: القانون المدني العراقي)
    requires_registration BOOLEAN DEFAULT FALSE,  -- هل يتطلب تسجيل في وزارة التجارة/العدل
    
    -- Review Content (محتوى المراجعة)
    key_risks_issues TEXT,         -- المخاطر الرئيسية/القضايا
    recommendation TEXT,           -- التوصية (موافقة، رفض، تعديل بند 4، إلخ)
    
    -- Document Upload (رفع المستند)
    document_upload_url TEXT,      -- رابط الملف المرفوع
    file_name TEXT,                -- اسم الملف الأصلي
    folder_name TEXT,              -- اسم المجلد الذي تم رفع الملف إليه
    
    -- Tracking IDs (for tracking actions and performance monitoring)
    admin_id UUID,                 -- ID of admin who created/updated
    lawyer_id UUID,                -- ID of lawyer assigned/created
    created_by UUID,               -- ID of user who created the review (can be admin or lawyer)
    updated_by UUID,               -- ID of user who last updated the review
    
    -- Performance Monitoring (مراقبة الأداء)
    review_duration_minutes INTEGER, -- مدة المراجعة بالدقائق (اختياري)
    review_completed_at TIMESTAMP WITH TIME ZONE, -- تاريخ اكتمال المراجعة
    is_review_completed BOOLEAN DEFAULT FALSE, -- هل تمت المراجعة
    
    -- Additional Tracking
    client_id TEXT,                -- معرف العميل (للربط مع clients_data)
    case_type TEXT,                -- نوع الدعوى (للإحصائيات والمراقبة)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints (if needed)
    CONSTRAINT fk_admin_contract FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_lawyer_contract FOREIGN KEY (lawyer_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_created_by_contract FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_updated_by_contract FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_reviews_admin_id ON contract_reviews(admin_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_lawyer_id ON contract_reviews(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_created_by ON contract_reviews(created_by);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_updated_by ON contract_reviews(updated_by);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_case_reference ON contract_reviews(case_reference_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_date ON contract_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_status ON contract_reviews(status);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_type ON contract_reviews(contract_type);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_folder_name ON contract_reviews(folder_name);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_client_id ON contract_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_case_type ON contract_reviews(case_type);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_completed ON contract_reviews(is_review_completed);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_created_at ON contract_reviews(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE contract_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your requirements)
-- Policy: Admins can view all contract reviews
CREATE POLICY "Admins can view all contract reviews"
    ON contract_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can view their own contract reviews
CREATE POLICY "Lawyers can view their contract reviews"
    ON contract_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND contract_reviews.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can insert contract reviews
CREATE POLICY "Admins can insert contract reviews"
    ON contract_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can insert their contract reviews
CREATE POLICY "Lawyers can insert contract reviews"
    ON contract_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can update all contract reviews
CREATE POLICY "Admins can update contract reviews"
    ON contract_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can update their own contract reviews
CREATE POLICY "Lawyers can update contract reviews"
    ON contract_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND contract_reviews.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can delete contract reviews
CREATE POLICY "Admins can delete contract reviews"
    ON contract_reviews FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_contract_reviews_updated_at
    BEFORE UPDATE ON contract_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_reviews_updated_at();

-- Comments for documentation
COMMENT ON TABLE contract_reviews IS 'جدول مراجعة العقود';
COMMENT ON COLUMN contract_reviews.case_reference_id IS 'رقم الدعوى المرجعي';
COMMENT ON COLUMN contract_reviews.contract_title IS 'عنوان العقد';
COMMENT ON COLUMN contract_reviews.contract_type IS 'نوع العقد: إيجار، عمل، بيع تجاري، إلخ';
COMMENT ON COLUMN contract_reviews.review_date IS 'تاريخ المراجعة';
COMMENT ON COLUMN contract_reviews.status IS 'حالة المراجعة: تمت المراجعة، يحتاج تفاوض، موافقة، رفض';
COMMENT ON COLUMN contract_reviews.opposing_party IS 'الطرف الآخر (الخصم)';
COMMENT ON COLUMN contract_reviews.governing_jurisdiction IS 'القانون الحاكم (مثل: القانون المدني العراقي)';
COMMENT ON COLUMN contract_reviews.requires_registration IS 'هل يتطلب تسجيل في وزارة التجارة/العدل';
COMMENT ON COLUMN contract_reviews.key_risks_issues IS 'المخاطر الرئيسية/القضايا';
COMMENT ON COLUMN contract_reviews.recommendation IS 'التوصية (موافقة، رفض، تعديل بند محدد، إلخ)';
COMMENT ON COLUMN contract_reviews.document_upload_url IS 'رابط الملف المرفوع';
COMMENT ON COLUMN contract_reviews.file_name IS 'اسم الملف الأصلي';
COMMENT ON COLUMN contract_reviews.folder_name IS 'اسم المجلد الذي تم رفع الملف إليه';
COMMENT ON COLUMN contract_reviews.admin_id IS 'معرف المسؤول';
COMMENT ON COLUMN contract_reviews.lawyer_id IS 'معرف المحامي';
COMMENT ON COLUMN contract_reviews.created_by IS 'معرف المستخدم الذي أنشأ المراجعة';
COMMENT ON COLUMN contract_reviews.updated_by IS 'معرف المستخدم الذي قام بآخر تحديث';
COMMENT ON COLUMN contract_reviews.review_duration_minutes IS 'مدة المراجعة بالدقائق (للمراقبة)';
COMMENT ON COLUMN contract_reviews.review_completed_at IS 'تاريخ اكتمال المراجعة';
COMMENT ON COLUMN contract_reviews.is_review_completed IS 'هل تمت المراجعة (للمراقبة)';
COMMENT ON COLUMN contract_reviews.client_id IS 'معرف العميل (للربط مع clients_data)';
COMMENT ON COLUMN contract_reviews.case_type IS 'نوع الدعوى (للإحصائيات والمراقبة)';








