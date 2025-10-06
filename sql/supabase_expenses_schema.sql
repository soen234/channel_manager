-- 비용 설정 (수수료율 등)
CREATE TABLE IF NOT EXISTS expense_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 수수료율 설정 삽입
INSERT INTO expense_settings (setting_key, setting_value, description) VALUES
('channel_commission_rates', '{"YANOLJA": 16, "BOOKING_COM": 18, "AIRBNB": 5, "NAVER": 3}', '채널별 수수료율 (%)'),
('card_commission_rate', '{"rate": 2.5}', '카드 수수료율 (%)'),
('paypal_commission_rate', '{"rate": 4.4}', '페이팔 수수료율 (%)'),
('toss_commission_rate', '{"rate": 2.8}', '토스 수수료율 (%)'),
('vat_rate', '{"rate": 10}', '부가가치세율 (%)'),
('income_tax_rate', '{"rate": 24}', '소득세율 (%)')
ON CONFLICT (setting_key) DO NOTHING;

-- 월별 고정 비용
CREATE TABLE IF NOT EXISTS monthly_fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year_month TEXT NOT NULL, -- YYYY-MM 형식
  rent DECIMAL DEFAULT 0,
  internet DECIMAL DEFAULT 0,
  fire_insurance DECIMAL DEFAULT 0,
  water_purifier DECIMAL DEFAULT 0,
  laundry DECIMAL DEFAULT 0,
  pest_control DECIMAL DEFAULT 0,
  tax_service DECIMAL DEFAULT 0,
  social_insurance DECIMAL DEFAULT 0,
  electricity DECIMAL DEFAULT 0,
  gas DECIMAL DEFAULT 0,
  water DECIMAL DEFAULT 0,
  channel_manager DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year_month)
);

-- 비품 구매 내역
CREATE TABLE IF NOT EXISTS supply_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  store TEXT,
  amount DECIMAL NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기타 세금
CREATE TABLE IF NOT EXISTS other_taxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year_month TEXT NOT NULL,
  tax_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 직원 근무 기록
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_name TEXT NOT NULL,
  work_date DATE NOT NULL,
  hours_worked DECIMAL NOT NULL,
  hourly_rate DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_monthly_fixed_expenses_year_month ON monthly_fixed_expenses(year_month);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_date ON supply_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_other_taxes_year_month ON other_taxes(year_month);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(work_date);

-- 트리거 생성
CREATE TRIGGER update_expense_settings_updated_at BEFORE UPDATE ON expense_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_fixed_expenses_updated_at BEFORE UPDATE ON monthly_fixed_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supply_purchases_updated_at BEFORE UPDATE ON supply_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_other_taxes_updated_at BEFORE UPDATE ON other_taxes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_attendance_updated_at BEFORE UPDATE ON staff_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
