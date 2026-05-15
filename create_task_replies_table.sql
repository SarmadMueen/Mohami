-- Create task_replies table for replies on tasks
CREATE TABLE IF NOT EXISTS task_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Task Reference
    task_id BIGINT NOT NULL,  -- Links to tasks.id (tasks.id is BIGINT)
    
    -- Reply Information
    reply_content TEXT NOT NULL,  -- محتوى الرد
    reply_status TEXT,  -- حالة المهمة عند إضافة الرد (قيد العمل، قيد التنفيذ، إلخ)
    
    -- User Information
    reply_by TEXT,  -- اسم المستخدم الذي أضاف الرد
    reply_by_user_id UUID,  -- معرف المستخدم الذي أضاف الرد (من auth.users)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_task_replies_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_replies_task_id ON task_replies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_replies_created_at ON task_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_task_replies_reply_by_user_id ON task_replies(reply_by_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE task_replies ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE task_replies IS 'جدول الردود على المهام الوظيفية';
COMMENT ON COLUMN task_replies.task_id IS 'معرف المهمة المرتبطة';
COMMENT ON COLUMN task_replies.reply_content IS 'محتوى الرد';
COMMENT ON COLUMN task_replies.reply_status IS 'حالة المهمة عند إضافة الرد';
COMMENT ON COLUMN task_replies.reply_by IS 'اسم المستخدم الذي أضاف الرد';
COMMENT ON COLUMN task_replies.reply_by_user_id IS 'معرف المستخدم الذي أضاف الرد';

