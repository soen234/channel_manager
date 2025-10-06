# SQL Scripts

이 폴더는 데이터베이스 스키마와 마이그레이션 스크립트를 포함합니다.

## 실행 순서 (새로운 데이터베이스 설정)

### 1. 기본 스키마 생성
```bash
supabase_schema.sql              # 기본 테이블 (properties, rooms, reservations, etc.)
supabase_expenses_schema.sql     # 비용 관련 테이블
```

### 2. 멀티테넌트 스키마 적용
```bash
supabase_multitenant_schema.sql  # organizations 테이블 추가 및 모든 테이블에 organization_id 추가
```

### 3. RLS 비활성화
```bash
disable_rls.sql                  # Row Level Security 비활성화 (API 레벨 인증 사용)
```

### 4. 기존 데이터 마이그레이션 (이미 데이터가 있는 경우)
```bash
simple_migration.sql             # 기존 데이터를 기본 organization에 할당
```

---

## 파일 설명

### 현재 사용 중인 스키마
- **supabase_multitenant_schema.sql** - 최신 멀티테넌트 스키마
- **disable_rls.sql** - RLS 비활성화 (필수)
- **add_constraints.sql** - 제약조건 추가 (organization_id NOT NULL, UNIQUE)
- **simple_migration.sql** - 기존 데이터 마이그레이션

### 레거시/참고용
- **supabase_schema.sql** - 초기 스키마 (멀티테넌트 이전)
- **supabase_staff_schema.sql** - 스태프 관리 스키마 (이미 multitenant에 포함됨)
- **supabase_expenses_schema.sql** - 비용 관리 스키마 (이미 multitenant에 포함됨)
- **supabase_migration_ical.sql** - iCal 마이그레이션
- **migration_to_multitenant.sql** - 복잡한 마이그레이션 (사용 안 함)
- **migration_to_multitenant_fixed.sql** - 수정된 마이그레이션 (사용 안 함)

---

## 새 프로젝트 설정 가이드

1. Supabase 프로젝트 생성
2. SQL Editor에서 다음 순서로 실행:
   ```sql
   -- 1. 멀티테넌트 스키마
   supabase_multitenant_schema.sql

   -- 2. RLS 비활성화
   disable_rls.sql

   -- 3. 제약조건 추가 (중복 방지, NOT NULL)
   add_constraints.sql
   ```
3. 완료!

---

## 기존 프로젝트 마이그레이션

데이터가 이미 있는 경우:
```sql
-- 1. 멀티테넌트 스키마 적용
supabase_multitenant_schema.sql

-- 2. 기존 데이터 마이그레이션
simple_migration.sql

-- 3. RLS 비활성화
disable_rls.sql
```

---

## 멀티테넌트 구조

### Organizations (조직)
각 사용자는 회원가입 시 자동으로 조직을 생성합니다.
- 조직 소유자(OWNER)가 됩니다.
- 모든 데이터(properties, rooms, reservations 등)는 organization_id로 격리됩니다.

### 역할
- **SUPER_ADMIN** - 전체 서비스 관리자 (모든 조직 접근)
- **OWNER** - 조직 소유자 (자신의 조직 완전 관리)
- **ADMIN** - 조직 관리자 (자신의 조직 관리)
- **STAFF** - 조직 스태프 (읽기 전용)
- **PENDING** - 승인 대기 (접근 불가)

### 데이터 격리
모든 API 요청은 자동으로 사용자의 organization_id로 필터링됩니다.
- 사용자는 자신의 조직 데이터만 접근 가능
- organization_id가 다르면 완전히 격리됨
