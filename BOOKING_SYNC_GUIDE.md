# Booking.com 자동 동기화 설정 가이드

이 가이드는 Booking.com extranet에서 예약 정보를 자동으로 스크래핑하여 채널 매니저 DB와 동기화하는 시스템을 설명합니다.

## 개요

시스템은 Puppeteer를 사용하여:
- Booking.com extranet에 자동 로그인
- 예약 목록 스크래핑
- DB와 비교하여 변경사항 감지
- 자동 업데이트 (취소, 신규 예약 등)

---

## 1. 시스템 요구사항

### ⚠️ 중요: Vercel 제한사항

**Puppeteer는 Vercel Serverless Functions에서 작동하지 않습니다!**

이유:
- Vercel 함수는 50MB 크기 제한 (Chromium은 ~170MB)
- 제한된 실행 환경

### 대안 배포 옵션:

#### 옵션 A: Docker + Cloud Run (추천)
```bash
# Google Cloud Run에 배포
# 장점: 안정적, 오토스케일링, 무료 티어
# 단점: 약간의 설정 필요
```

#### 옵션 B: Railway/Render
```bash
# Railway 또는 Render에 배포
# 장점: 간단한 배포, Dockerfile 지원
# 단점: 무료 티어 제한
```

#### 옵션 C: 로컬 서버 + Cron
```bash
# 자체 서버에서 Node.js + cron
# 장점: 완전한 제어, 무료
# 단점: 서버 관리 필요
```

---

## 2. 환경 변수 설정

### 필수 환경 변수

```bash
# Booking.com 로그인 정보
BOOKING_COM_USERNAME=your-email@example.com
BOOKING_COM_PASSWORD=your-password
BOOKING_COM_HOTEL_ID=your-hotel-id

# Cron 보안 (선택사항)
CRON_SECRET=your-random-secret-string
```

### 호텔 ID 찾기

1. Booking.com extranet 로그인
2. URL 확인: `https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/home.html?hotel_id=XXXXXX`
3. `hotel_id=` 뒤의 숫자가 호텔 ID

---

## 3. Docker로 배포 (Cloud Run/Railway)

### 3.1 Dockerfile 생성

```dockerfile
FROM node:22

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \\
    chromium \\
    fonts-liberation \\
    libnss3 \\
    libatk-bridge2.0-0 \\
    libx11-xcb1 \\
    libxcomposite1 \\
    libxdamage1 \\
    libxrandr2 \\
    libgbm1 \\
    libasound2

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
```

### 3.2 간단한 서버 생성 (server.js)

```javascript
const express = require('express');
const app = express();

// Import sync endpoint
const bookingSync = require('./api/sync/booking');

app.post('/api/sync/booking', bookingSync);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3.3 Cloud Run 배포

```bash
# Google Cloud CLI 설치 후
gcloud builds submit --tag gcr.io/YOUR_PROJECT/booking-sync
gcloud run deploy booking-sync \\
  --image gcr.io/YOUR_PROJECT/booking-sync \\
  --platform managed \\
  --region asia-northeast1 \\
  --allow-unauthenticated
```

---

## 4. Cron 스케줄 설정

### Google Cloud Scheduler (Cloud Run 사용 시)

```bash
gcloud scheduler jobs create http booking-sync \\
  --schedule="*/10 * * * *" \\
  --uri="https://your-cloud-run-url.run.app/api/sync/booking" \\
  --http-method=POST \\
  --headers="x-cron-secret=YOUR_SECRET"
```

### 외부 Cron 서비스 (cron-job.org)

1. [cron-job.org](https://cron-job.org) 가입
2. 새 Cron Job 생성:
   - URL: `https://your-domain/api/sync/booking`
   - Method: POST
   - Headers: `x-cron-secret: YOUR_SECRET`
   - Schedule: `*/10 * * * *` (10분마다)

---

## 5. 로컬 테스트

### 5.1 패키지 설치

```bash
npm install
```

### 5.2 환경 변수 설정

`.env` 파일 생성:
```bash
BOOKING_COM_USERNAME=your-email@example.com
BOOKING_COM_PASSWORD=your-password
BOOKING_COM_HOTEL_ID=your-hotel-id
```

### 5.3 테스트 실행

```bash
# API 호출
curl -X POST http://localhost:3000/api/sync/booking \\
  -H "x-cron-secret: YOUR_SECRET"
```

---

## 6. 동작 방식

### 스크래핑 프로세스

1. **로그인**: Booking.com extranet 자동 로그인
2. **예약 목록 접근**: 예약 관리 페이지 이동
3. **데이터 추출**: DOM에서 예약 정보 파싱
4. **DB 비교**: 기존 예약과 비교
5. **동기화**:
   - 취소됨 → 상태 업데이트
   - 신규 예약 → DB에 추가
   - 변경사항 → 업데이트

### 예상 응답

```json
{
  "success": true,
  "message": "Synced 15 reservations from Booking.com",
  "scraped": 15,
  "updated": 3,
  "created": 2,
  "cancelled": 1,
  "errors": 0,
  "details": [
    {
      "reservationNumber": "5116810977",
      "action": "cancelled"
    },
    {
      "reservationNumber": "5608461376",
      "action": "created"
    }
  ]
}
```

---

## 7. 문제 해결

### Puppeteer 로그인 실패

**원인**: Booking.com에서 봇 감지
**해결**:
- User-Agent 업데이트
- Headless 모드 끄기 (로컬 테스트 시)
- 2FA 비활성화 또는 전용 계정 사용

### DOM 선택자 오류

**원인**: Booking.com 페이지 구조 변경
**해결**:
- `booking-scraper.js`의 선택자 업데이트
- Chrome DevTools로 실제 HTML 구조 확인

```javascript
// 선택자 업데이트 예시
const resNumber = row.querySelector('.NEW_CLASS_NAME')?.textContent?.trim();
```

### 메모리 부족

**원인**: Puppeteer + Chromium 메모리 사용량 높음
**해결**:
- Cloud Run 메모리 증가: `--memory 1Gi`
- 동시 실행 제한

---

## 8. 보안 고려사항

### 1. 자격 증명 보호
- ✅ 환경 변수로만 저장
- ❌ 코드에 하드코딩 금지
- ✅ 전용 Booking.com 계정 사용 권장

### 2. API 보안
- Cron Secret 사용
- 필요시 IP 화이트리스트

### 3. 로그 관리
- 비밀번호 로그에 출력 안 됨
- 에러 로그만 저장

---

## 9. 제한사항 및 주의사항

### 현재 제한사항

1. **Booking.com 구조 의존성**
   - 페이지 구조 변경 시 업데이트 필요
   - 선택자는 예시이며 실제 구조에 맞게 조정 필요

2. **불완전한 데이터**
   - 스크래핑으로 모든 정보를 얻기 어려움
   - 신규 예약은 기본값으로 생성 후 수동 확인 필요

3. **Rate Limiting**
   - 너무 자주 실행 시 Booking.com에서 차단 가능
   - 10분 간격 권장

### 향후 개선

- Booking.com API 사용 (승인 필요)
- 더 정확한 데이터 추출
- 에러 알림 시스템
- 재시도 로직 개선

---

## 10. 다음 단계

1. ✅ Docker 이미지 생성
2. ✅ Cloud Run/Railway 배포
3. ✅ 환경 변수 설정
4. ✅ Cron 스케줄 설정
5. ✅ 실제 Booking.com 페이지 구조 확인 및 선택자 조정
6. ✅ 테스트 및 모니터링

---

## 지원

문제가 발생하면:
1. 로그 확인 (Cloud Run/Railway 콘솔)
2. 선택자가 올바른지 확인
3. Booking.com 페이지 구조 변경 확인
