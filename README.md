# 채널매니저 (Channel Manager)

통합 숙박 채널 관리 시스템 - Booking.com, 야놀자, Airbnb 연동

## 주요 기능

### 1. 다중 채널 통합 관리
- **Booking.com** 연동
- **야놀자** 연동
- **Airbnb** 연동

### 2. 핵심 기능
- ✅ 재고(Inventory) 실시간 동기화
- ✅ 요금(Pricing) 일괄 업데이트
- ✅ 예약(Reservation) 통합 관리
- ✅ 자동 동기화 스케줄러
- ✅ 대시보드 UI

## 기술 스택

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis + Bull
- **Scheduler**: node-cron
- **Frontend**: HTML + TailwindCSS + Vanilla JS

## 프로젝트 구조

```
channel_manager/
├── src/
│   ├── channels/              # 채널별 API 연동
│   │   ├── booking/          # Booking.com
│   │   ├── yanolja/          # 야놀자
│   │   ├── airbnb/           # Airbnb
│   │   └── types.ts          # 공통 타입
│   ├── sync/                 # 동기화 엔진
│   │   ├── sync.service.ts   # 동기화 로직
│   │   └── sync.scheduler.ts # 스케줄러
│   ├── api/                  # REST API
│   │   ├── routes/           # 라우트
│   │   └── controllers/      # 컨트롤러
│   ├── utils/                # 유틸리티
│   └── index.ts              # 진입점
├── prisma/
│   └── schema.prisma         # DB 스키마
├── public/
│   └── index.html            # 대시보드 UI
└── package.json
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 API 키 및 데이터베이스 설정
```

### 3. 데이터베이스 설정
```bash
npm run prisma:migrate
npm run prisma:generate
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 프로덕션 빌드
```bash
npm run build
npm start
```

## API 엔드포인트

### 숙소 관리
- `POST /api/properties` - 숙소 생성
- `GET /api/properties` - 숙소 목록
- `GET /api/properties/:id` - 숙소 상세
- `PUT /api/properties/:id` - 숙소 수정
- `DELETE /api/properties/:id` - 숙소 삭제

### 객실 관리
- `POST /api/properties/:propertyId/rooms` - 객실 생성
- `GET /api/properties/:propertyId/rooms` - 객실 목록
- `PUT /api/properties/:propertyId/rooms/:roomId` - 객실 수정
- `DELETE /api/properties/:propertyId/rooms/:roomId` - 객실 삭제

### 재고 관리
- `POST /api/inventory` - 재고 업데이트
- `GET /api/inventory/room/:roomId` - 재고 조회
- `POST /api/inventory/bulk` - 재고 일괄 업데이트
- `POST /api/inventory/sync` - 채널 동기화

### 요금 관리
- `POST /api/pricing` - 요금 업데이트
- `GET /api/pricing/room/:roomId` - 요금 조회
- `POST /api/pricing/bulk` - 요금 일괄 업데이트
- `POST /api/pricing/sync` - 채널 동기화

### 예약 관리
- `GET /api/reservations` - 예약 목록
- `GET /api/reservations/:id` - 예약 상세
- `PUT /api/reservations/:id/status` - 예약 상태 변경
- `POST /api/reservations/sync` - 예약 동기화

### 대시보드
- `GET /api/dashboard` - 대시보드 통계

## 데이터 모델

### Property (숙소)
- 기본 정보: 이름, 주소, 설명
- 관계: 객실(rooms), 채널 매핑(channelMappings)

### Room (객실)
- 기본 정보: 이름, 타입, 수용인원, 기본 요금
- 관계: 숙소, 재고, 요금, 예약, 채널 매핑

### Inventory (재고)
- 날짜별 객실 재고 관리
- 전체 수량(total) 및 예약 가능 수량(available)

### Pricing (요금)
- 날짜별 객실 요금 설정
- 통화 지원 (기본 KRW)

### Reservation (예약)
- 예약 정보: 고객명, 체크인/아웃, 인원, 금액
- 채널별 예약 ID 매핑
- 상태: CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT, NO_SHOW

### ChannelMapping
- 숙소 레벨 채널 연동 정보
- API 인증 정보 저장

### ChannelRoomMapping
- 객실 레벨 채널 연동 정보
- 채널별 객실 ID 매핑

## 동기화 로직

### 재고/요금 동기화 (내부 → 채널)
1. 내부 DB에서 재고/요금 데이터 조회
2. 각 채널의 API를 통해 업데이트
3. 동기화 로그 기록

### 예약 동기화 (채널 → 내부)
1. 각 채널에서 예약 정보 조회
2. 내부 DB에 예약 생성/업데이트
3. 재고 자동 차감
4. 동기화 로그 기록

### 자동 동기화 스케줄
- 5분마다 예약 동기화 (설정 가능)
- 매일 새벽 3시 전체 동기화

## 대시보드

`http://localhost:3000` 접속

- 실시간 통계 (체크인/아웃, 예약 현황)
- 채널별 예약 수
- 최근 예약 목록
- 빠른 동기화 버튼

## 주의사항

### API 인증
실제 운영 환경에서는 각 채널의 API 키를 발급받아야 합니다:
- **Booking.com**: Connectivity API 신청
- **야놀자**: 파트너 센터에서 API 키 발급
- **Airbnb**: Host API 액세스 권한 획득

### 동기화 주의사항
- 채널별 API Rate Limit 고려
- 재고 오버부킹 방지 로직 필요
- 환율 변동 대응 (다중 통화 지원시)

## 향후 개선사항

- [ ] 웹훅(Webhook) 기반 실시간 동기화
- [ ] 채널별 수수료 계산
- [ ] 다중 통화 지원 강화
- [ ] 리포트 및 분석 기능
- [ ] 모바일 앱 지원
- [ ] 알림 기능 (SMS, 이메일)

## 라이선스

MIT
