-- Create notifications table for app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Notification Information
    title TEXT NOT NULL,  -- عنوان الإشعار
    message TEXT NOT NULL,  -- نص الإشعار
    notification_type TEXT NOT NULL,  -- نوع الإشعار: case, session, reminder, task
    icon_type TEXT,  -- نوع الأيقونة: bell, clock, video, person, etc.
    
    -- Related Entity Information
    related_entity_type TEXT,  -- نوع الكيان المرتبط: case, session, reminder, task
    related_entity_id TEXT,  -- معرف الكيان المرتبط (case_number, session_id, etc.)
    case_number TEXT,  -- رقم الدعوى (إذا كان مرتبطاً بقضية)
    
    -- User Information
    user_id UUID NOT NULL,  -- معرف المستخدم الذي يجب أن يرى الإشعار
    created_by_user_id UUID,  -- معرف المستخدم الذي أنشأ الإشعار
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,  -- هل تم قراءة الإشعار
    read_at TIMESTAMP WITH TIME ZONE,  -- تاريخ قراءة الإشعار
    
    -- Additional Data (JSON for flexibility)
    metadata JSONB,  -- بيانات إضافية (مثل تفاصيل الجلسة، التذكير، إلخ)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_case_number ON notifications(case_number);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity_id ON notifications(related_entity_id);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Policy: Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Anyone authenticated can insert notifications (for system notifications)
CREATE POLICY "Authenticated users can insert notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE notifications IS 'جدول الإشعارات للتطبيق';
COMMENT ON COLUMN notifications.title IS 'عنوان الإشعار';
COMMENT ON COLUMN notifications.message IS 'نص الإشعار';
COMMENT ON COLUMN notifications.notification_type IS 'نوع الإشعار: case, session, reminder, task';
COMMENT ON COLUMN notifications.icon_type IS 'نوع الأيقونة: bell, clock, video, person, etc.';
COMMENT ON COLUMN notifications.user_id IS 'معرف المستخدم الذي يجب أن يرى الإشعار';
COMMENT ON COLUMN notifications.is_read IS 'هل تم قراءة الإشعار';
COMMENT ON COLUMN notifications.case_number IS 'رقم الدعوى (إذا كان مرتبطاً بقضية)';







