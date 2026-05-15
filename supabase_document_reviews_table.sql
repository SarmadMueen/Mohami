-- Create document_reviews table for مراجعة أوراق قانونية
CREATE TABLE IF NOT EXISTS document_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Case Reference (رقم الدعوى المرجعي)
    case_reference_id TEXT,  -- Links to cases.case_number
    
    -- Document Information (معلومات المستند)
    document_title TEXT NOT NULL,  -- عنوان/اسم المستند
    review_date DATE NOT NULL,     -- تاريخ المراجعة
    
    -- Folder Information (معلومات المجلد)
    folder_name TEXT,              -- اسم المجلد الذي تم رفع الملف إليه
    
    -- Review Status (حالة المراجعة)
    status TEXT NOT NULL,          -- الحالة: مراجعة, تحتاج مراجعة, موافقة
    
    -- Key Findings (النتائج الرئيسية)
    key_findings TEXT,             -- النتائج الرئيسية/الملاحظات
    
    -- Next Action (الإجراء التالي)
    next_action_required TEXT,     -- الإجراء المطلوب: رفع للمحكمة, صياغة رد, الحصول على التوقيعات, أرشفة
    action_deadline DATE,          -- تاريخ انتهاء الإجراء
    
    -- Document Upload (رفع المستند)
    document_upload_url TEXT,      -- رابط الملف المرفوع
    file_name TEXT,                -- اسم الملف الأصلي
    
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
    CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_lawyer FOREIGN KEY (lawyer_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_document_reviews_admin_id ON document_reviews(admin_id);
CREATE INDEX IF NOT EXISTS idx_document_reviews_lawyer_id ON document_reviews(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_document_reviews_created_by ON document_reviews(created_by);
CREATE INDEX IF NOT EXISTS idx_document_reviews_updated_by ON document_reviews(updated_by);
CREATE INDEX IF NOT EXISTS idx_document_reviews_case_reference ON document_reviews(case_reference_id);
CREATE INDEX IF NOT EXISTS idx_document_reviews_date ON document_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_document_reviews_status ON document_reviews(status);
CREATE INDEX IF NOT EXISTS idx_document_reviews_folder_name ON document_reviews(folder_name);
CREATE INDEX IF NOT EXISTS idx_document_reviews_client_id ON document_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_document_reviews_case_type ON document_reviews(case_type);
CREATE INDEX IF NOT EXISTS idx_document_reviews_completed ON document_reviews(is_review_completed);
CREATE INDEX IF NOT EXISTS idx_document_reviews_created_at ON document_reviews(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your requirements)
-- Policy: Admins can view all document reviews
CREATE POLICY "Admins can view all document reviews"
    ON document_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can view their own document reviews
CREATE POLICY "Lawyers can view their document reviews"
    ON document_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND document_reviews.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can insert document reviews
CREATE POLICY "Admins can insert document reviews"
    ON document_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can insert their document reviews
CREATE POLICY "Lawyers can insert document reviews"
    ON document_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can update all document reviews
CREATE POLICY "Admins can update document reviews"
    ON document_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Policy: Lawyers can update their own document reviews
CREATE POLICY "Lawyers can update document reviews"
    ON document_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.new_lawyer_id::text = auth.uid()::text
            AND document_reviews.lawyer_id::text = auth.uid()::text
        )
    );

-- Policy: Admins can delete document reviews
CREATE POLICY "Admins can delete document reviews"
    ON document_reviews FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_metadata
            WHERE user_metadata.admin_user_id::text = auth.uid()::text
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_document_reviews_updated_at
    BEFORE UPDATE ON document_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_document_reviews_updated_at();

-- Comments for documentation
COMMENT ON TABLE document_reviews IS 'جدول مراجعة الأوراق القانونية';
COMMENT ON COLUMN document_reviews.case_reference_id IS 'رقم الدعوى المرجعي';
COMMENT ON COLUMN document_reviews.document_title IS 'عنوان/اسم المستند';
COMMENT ON COLUMN document_reviews.review_date IS 'تاريخ المراجعة';
COMMENT ON COLUMN document_reviews.folder_name IS 'اسم المجلد الذي تم رفع الملف إليه';
COMMENT ON COLUMN document_reviews.status IS 'حالة المراجعة: مراجعة، تحتاج مراجعة، موافقة';
COMMENT ON COLUMN document_reviews.key_findings IS 'النتائج الرئيسية/الملاحظات';
COMMENT ON COLUMN document_reviews.next_action_required IS 'الإجراء المطلوب التالي';
COMMENT ON COLUMN document_reviews.action_deadline IS 'تاريخ انتهاء الإجراء';
COMMENT ON COLUMN document_reviews.document_upload_url IS 'رابط الملف المرفوع';
COMMENT ON COLUMN document_reviews.file_name IS 'اسم الملف الأصلي';
COMMENT ON COLUMN document_reviews.admin_id IS 'معرف المسؤول';
COMMENT ON COLUMN document_reviews.lawyer_id IS 'معرف المحامي';
COMMENT ON COLUMN document_reviews.created_by IS 'معرف المستخدم الذي أنشأ المراجعة';
COMMENT ON COLUMN document_reviews.updated_by IS 'معرف المستخدم الذي قام بآخر تحديث';
COMMENT ON COLUMN document_reviews.review_duration_minutes IS 'مدة المراجعة بالدقائق (للمراقبة)';
COMMENT ON COLUMN document_reviews.review_completed_at IS 'تاريخ اكتمال المراجعة';
COMMENT ON COLUMN document_reviews.is_review_completed IS 'هل تمت المراجعة (للمراقبة)';
COMMENT ON COLUMN document_reviews.client_id IS 'معرف العميل (للربط مع clients_data)';
COMMENT ON COLUMN document_reviews.case_type IS 'نوع الدعوى (للإحصائيات والمراقبة)';

