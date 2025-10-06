# Property-Based Staff System

## 개요
스태프를 **숙소(Property) 단위**로 배정하는 시스템으로 전환했습니다.

### 이전 시스템
- Organization 단위로 스태프 배정
- 하나의 초대 코드로 모든 숙소에 접근

### 새로운 시스템
- **Property 단위로 스태프 배정**
- **각 숙소마다 고유한 6자리 초대 코드**
- 스태프는 초대받은 숙소에만 접근 가능

---

## 데이터베이스 구조

### 1. Properties 테이블
```sql
properties
  - invite_code VARCHAR(6) UNIQUE  -- 6자리 숫자 초대 코드
```

### 2. Property_Staff 테이블 (새로 추가)
```sql
property_staff
  - id UUID PRIMARY KEY
  - property_id UUID → properties(id)
  - user_id UUID → auth.users(id)
  - role TEXT (ADMIN, STAFF)
  - status TEXT (ACTIVE, DEACTIVATED)
  - approved_by UUID
  - approved_at TIMESTAMP
  - UNIQUE(property_id, user_id)  -- 한 사용자는 숙소당 하나의 역할만
```

### 3. User_Roles 테이블 (기존 유지)
- **OWNER 역할만** 여기에 저장 (조직 레벨)
- ADMIN, STAFF는 property_staff로 이동

---

## 역할 및 권한

### OWNER (Organization 레벨)
- 자신의 조직 내 **모든 숙소** 접근 가능
- 숙소 생성/삭제
- 모든 숙소의 스태프 관리

### ADMIN (Property 레벨)
- 배정된 **특정 숙소만** 접근
- 해당 숙소의 데이터 관리
- 해당 숙소의 스태프 관리 가능

### STAFF (Property 레벨)
- 배정된 **특정 숙소만** 접근
- 읽기 전용 권한

---

## 마이그레이션 단계

### 1. SQL 실행
```bash
# Supabase Dashboard → SQL Editor
sql/property_based_staff.sql
```

### 2. 데이터 마이그레이션
```bash
# 기존 properties에 invite_code 생성
# 기존 ADMIN/STAFF를 property_staff로 이동
node scripts/migrate_to_property_staff.js
```

---

## API 변경 사항

### 새로운 엔드포인트

#### GET/POST/PUT/DELETE /api/properties/staff?propertyId=xxx
Property별 스태프 관리

**GET** - 스태프 목록
```json
[
  {
    "id": "...",
    "property_id": "...",
    "user_id": "...",
    "email": "staff@example.com",
    "role": "STAFF",
    "status": "ACTIVE"
  }
]
```

**POST** - 스태프 추가
```json
{
  "userId": "...",
  "role": "STAFF"
}
```

**DELETE** - 스태프 제거
```
?propertyId=xxx&userId=yyy
```

### 수정된 엔드포인트

#### POST /api/auth/signup
- 스태프 가입 시 **property invite_code** 사용
- property_staff 테이블에 자동 등록

#### POST /api/properties
- 숙소 생성 시 6자리 **invite_code 자동 생성**

---

## 프론트엔드 변경

### 숙소 관리 페이지
- 각 숙소마다 초대 코드 표시
- 복사 버튼으로 쉽게 공유
- "스태프 관리" 버튼 추가 (향후 모달 구현 예정)

### 회원가입
- 스태프 가입 시 6자리 숫자 코드 입력
- 해당 숙소에만 배정됨

---

## 사용 시나리오

### 1. 오너가 새 숙소 생성
```
숙소 생성 → 자동으로 6자리 초대 코드 생성 (예: 542318)
```

### 2. 스태프 초대
```
오너: "542318 코드로 가입하세요"
스태프: 회원가입 시 542318 입력 → 해당 숙소에만 접근 가능
```

### 3. 여러 숙소 관리
```
다우하우스1: 초대 코드 542318
다우하우스2: 초대 코드 789234

스태프 A: 542318로 가입 → 다우하우스1만 접근
스태프 B: 789234로 가입 → 다우하우스2만 접근
오너: 두 숙소 모두 접근
```

---

## 보안 개선

✅ **숙소별 데이터 격리**
- 스태프는 배정된 숙소의 데이터만 조회 가능

✅ **최소 권한 원칙**
- 필요한 숙소에만 접근 권한 부여

✅ **초대 코드 간소화**
- 36자 UUID → 6자리 숫자
- 공유 및 입력 편의성 향상

---

## 다음 단계 (선택사항)

### 1. 스태프 관리 UI
Property별 스태프 목록/추가/삭제 모달 구현

### 2. 초대 코드 재생성
보안을 위해 초대 코드 재생성 기능

### 3. 접근 로그
스태프의 숙소별 접근 기록

---

## 호환성

### 기존 시스템과의 호환
- OWNER 역할은 user_roles에 그대로 유지
- OWNER는 모든 숙소 접근 (기존과 동일)
- 기존 데이터는 마이그레이션 스크립트로 자동 이동

### Backward Compatibility
- 기존 API 호출은 대부분 그대로 작동
- Properties API는 자동으로 접근 가능한 숙소만 필터링
