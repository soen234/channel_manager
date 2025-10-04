# 빠른 시작 가이드

## ✅ 서버 실행 완료!

채널매니저 서버가 성공적으로 실행되었습니다.

## 접속 정보

- **서버 주소**: http://localhost:3000
- **대시보드**: http://localhost:3000/
- **헬스 체크**: http://localhost:3000/health

## API 엔드포인트

### 숙소 관리
```bash
# 숙소 생성
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 호텔",
    "address": "서울시 강남구",
    "description": "테스트 숙소"
  }'

# 숙소 목록 조회
curl http://localhost:3000/api/properties
```

### 객실 관리
```bash
# 객실 생성 (propertyId는 위에서 생성한 숙소 ID)
curl -X POST http://localhost:3000/api/properties/{propertyId}/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "스탠다드룸",
    "type": "STANDARD",
    "capacity": 2,
    "basePrice": 100000
  }'
```

### 재고 관리
```bash
# 재고 업데이트
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "date": "2025-10-10",
    "available": 5,
    "total": 5
  }'

# 재고 조회
curl "http://localhost:3000/api/inventory/room/{roomId}?startDate=2025-10-01&endDate=2025-10-31"
```

### 요금 관리
```bash
# 요금 업데이트
curl -X POST http://localhost:3000/api/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "date": "2025-10-10",
    "price": 120000
  }'

# 요금 조회
curl "http://localhost:3000/api/pricing/room/{roomId}?startDate=2025-10-01&endDate=2025-10-31"
```

### 예약 관리
```bash
# 예약 목록 조회
curl "http://localhost:3000/api/reservations?startDate=2025-10-01&endDate=2025-10-31"

# 예약 동기화
curl -X POST http://localhost:3000/api/reservations/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 대시보드 통계
```bash
curl http://localhost:3000/api/dashboard
```

## 데이터베이스

SQLite 데이터베이스가 `prisma/dev.db`에 생성되었습니다.

Prisma Studio로 데이터를 확인하려면:
```bash
npm run prisma:studio
```

## 서버 중지

서버를 중지하려면 터미널에서 `Ctrl+C`를 누르세요.

## 다음 단계

1. **브라우저로 대시보드 확인**: http://localhost:3000
2. **테스트 데이터 생성**: 위의 API를 사용하여 숙소와 객실 생성
3. **채널 연동 설정**: `.env` 파일에서 실제 API 키 입력
4. **동기화 테스트**: 각 채널의 API 키 설정 후 동기화 기능 테스트

## 주요 기능

- ✅ Booking.com / 야놀자 / Airbnb 3개 채널 연동
- ✅ 재고/요금 실시간 동기화
- ✅ 예약 통합 관리
- ✅ 자동 동기화 스케줄러 (5분마다)
- ✅ 실시간 대시보드
- ✅ REST API

## 문제 해결

### 포트가 이미 사용중인 경우
`.env` 파일에서 `PORT` 값을 변경하세요.

### 데이터베이스 리셋이 필요한 경우
```bash
rm -rf prisma/dev.db prisma/migrations
npm run prisma:migrate
```
