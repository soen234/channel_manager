-- 사용자 권한 관리
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PENDING', -- ADMIN, STAFF, PENDING
  status TEXT NOT NULL DEFAULT 'PENDING', -- ACTIVE, SUSPENDED, DEACTIVATED, PENDING
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투숙객 요청사항
CREATE TABLE IF NOT EXISTS guest_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- CLEANING, ADDITIONAL_PAYMENT, OTHER
  description TEXT,
  additional_payment DECIMAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_status ON user_roles(role, status);
CREATE INDEX IF NOT EXISTS idx_guest_requests_reservation_id ON guest_requests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_status ON guest_requests(status);
CREATE INDEX IF NOT EXISTS idx_guest_requests_created_at ON guest_requests(created_at);

-- 트리거 생성
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_requests_updated_at BEFORE UPDATE ON guest_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기본 관리자 계정 설정 (signup 후 수동으로 실행)
-- INSERT INTO user_roles (user_id, email, role, status, approved_at)
-- VALUES ('YOUR_USER_ID', 'admin@example.com', 'ADMIN', 'ACTIVE', NOW());
