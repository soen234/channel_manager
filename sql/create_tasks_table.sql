-- Create tasks table for daily task management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_date DATE NOT NULL,
  assigned_to UUID, -- user_id from user_roles
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID, -- user_id from user_roles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Add comments
COMMENT ON TABLE tasks IS '일일 작업 관리 테이블';
COMMENT ON COLUMN tasks.organization_id IS '조직 ID';
COMMENT ON COLUMN tasks.title IS '할일 제목';
COMMENT ON COLUMN tasks.description IS '할일 설명';
COMMENT ON COLUMN tasks.task_date IS '작업 날짜';
COMMENT ON COLUMN tasks.assigned_to IS '담당자 (user_id)';
COMMENT ON COLUMN tasks.completed IS '완료 여부';
COMMENT ON COLUMN tasks.completed_at IS '완료 시간';
COMMENT ON COLUMN tasks.completed_by IS '완료한 사용자 (user_id)';
