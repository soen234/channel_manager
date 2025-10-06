# Utility Scripts

데이터베이스 마이그레이션 및 관리를 위한 Node.js 스크립트 모음

## 사용법

모든 스크립트는 프로젝트 루트에서 실행:
```bash
node scripts/스크립트이름.js
```

---

## 스크립트 목록

### 1. migrate.js
**멀티테넌트 마이그레이션 실행**

기존 데이터를 멀티테넌트 구조로 마이그레이션합니다.

```bash
node scripts/migrate.js
```

**동작:**
- 기본 organization 생성
- 모든 user_roles 업데이트
- 모든 데이터 테이블(properties, rooms, reservations 등)에 organization_id 할당
- 자동 검증

---

### 2. check_data.js
**데이터베이스 상태 확인**

현재 데이터베이스의 organization 할당 상태를 확인합니다.

```bash
node scripts/check_data.js
```

**출력 예시:**
```
Organizations:
  - 기본 조직 (00000000-0000-0000-0000-000000000001)

User Roles:
  - user@example.com: OWNER (org: 00000000-...)

Properties:
  - 다우하우스1 (org: 00000000-...)
```

---

### 3. add_admin.js
**특정 사용자를 ADMIN으로 설정**

이메일로 사용자를 찾아서 ADMIN 역할을 부여합니다.

```bash
node scripts/add_admin.js
```

**현재 설정:** `soen234@gmail.com`

수정하려면 파일 내 `email` 변수를 변경하세요.

---

### 4. create_new_org.js
**새 organization 생성**

특정 사용자를 위한 새로운 organization을 생성합니다.

```bash
node scripts/create_new_org.js
```

**현재 설정:** `ggg0531@gmail.com`

**주의:** 데이터는 자동으로 이동되지 않습니다.

---

### 5. fix_ggg_org.js
**사용자를 기본 organization으로 이동**

특정 사용자를 기본 organization으로 되돌립니다.

```bash
node scripts/fix_ggg_org.js
```

빈 organization은 자동으로 삭제됩니다.

---

### 6. fix_ggg_account.js
**사용자 계정 수정**

user_roles 레코드를 생성하거나 업데이트합니다.

```bash
node scripts/fix_ggg_account.js
```

---

## 일반적인 사용 시나리오

### 새 데이터베이스 설정
```bash
# 1. SQL 스키마 실행 (Supabase Dashboard)
# 2. 마이그레이션 (데이터가 있는 경우만)
node scripts/migrate.js

# 3. 상태 확인
node scripts/check_data.js
```

### 관리자 추가
```bash
# add_admin.js 파일에서 이메일 수정 후
node scripts/add_admin.js
```

### 문제 해결
```bash
# 먼저 상태 확인
node scripts/check_data.js

# 필요한 스크립트 실행
node scripts/fix_ggg_org.js
```

---

## 환경 변수

모든 스크립트는 하드코딩된 Supabase 설정을 사용합니다:
- `SUPABASE_URL`: https://rdujhmznuxjnhqchbige.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (스크립트 내 포함)

**주의:** 프로덕션 환경에서는 환경 변수로 관리하세요.

---

---

## 주요 스크립트

일반적으로 다음 스크립트만 사용하면 됩니다:
- ✅ `migrate.js` - 멀티테넌트 마이그레이션
- ✅ `check_data.js` - 데이터 상태 확인
- ✅ `add_admin.js` - 관리자 추가
- ✅ `fix_null_organizations.js` - organization_id가 null인 사용자 정리
- ✅ `assign_null_org_user.js` - 특정 사용자에게 organization 할당

---

## 레거시 스크립트

`legacy/` 폴더에 일회성 스크립트들이 보관되어 있습니다:
- `legacy/fix_ggg_account.js`
- `legacy/fix_ggg_org.js`
- `legacy/create_new_org.js`

이 파일들은 초기 설정 시 사용되었으며, 더 이상 필요하지 않습니다.
