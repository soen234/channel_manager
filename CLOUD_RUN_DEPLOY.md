# Google Cloud Run 배포 가이드

Booking.com 자동 동기화 서비스를 Google Cloud Run에 배포하는 완전 가이드입니다.

## 왜 Cloud Run인가?

### 비용 비교

| 항목 | Vercel | Cloud Run |
|------|--------|-----------|
| **무료 티어** | 100GB-hours/월 | 2백만 요청/월, 360,000 GB-초 |
| **Puppeteer 지원** | ❌ 불가능 (50MB 제한) | ✅ 가능 |
| **Cron** | Pro 플랜 필요 ($20/월) | Cloud Scheduler 무료 (3개까지) |
| **예상 비용** | $20/월 (Pro) | **무료** (가벼운 사용 시) |

**결론**: Cloud Run이 이 프로젝트에 훨씬 적합하고 저렴합니다!

---

## 1. 사전 준비

### 1.1 Google Cloud 계정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 신규 가입 시 $300 크레딧 제공 (3개월)
3. 결제 계정 설정 (필수이지만 무료 티어 내에서는 과금 안 됨)

### 1.2 gcloud CLI 설치

**macOS:**
```bash
brew install google-cloud-sdk
```

**Windows:**
[설치 프로그램 다운로드](https://cloud.google.com/sdk/docs/install)

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 1.3 gcloud 인증

```bash
# Google 계정으로 로그인
gcloud auth login

# 프로젝트 생성
gcloud projects create channel-manager --name="Channel Manager"

# 프로젝트 설정
gcloud config set project channel-manager

# 필요한 API 활성화
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

---

## 2. 환경 변수 준비

배포 전에 다음 환경 변수를 준비하세요:

```bash
# Supabase 설정
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"

# Booking.com 로그인 정보
export BOOKING_COM_USERNAME="your-booking-email@example.com"
export BOOKING_COM_PASSWORD="your-booking-password"
export BOOKING_COM_HOTEL_ID="your-hotel-id"

# Cron 보안
export CRON_SECRET="$(openssl rand -hex 32)"

# GCP 설정 (선택사항)
export GCP_PROJECT_ID="channel-manager"
export GCP_REGION="asia-northeast3"  # 서울 리전
```

**보안 팁**: `.env` 파일에 저장하고 `source .env`로 로드하세요.

---

## 3. 배포 실행

### 방법 1: 자동 스크립트 (추천)

```bash
./deploy-cloud-run.sh
```

### 방법 2: 수동 배포

```bash
# 1. Docker 이미지 빌드
gcloud builds submit --tag gcr.io/channel-manager/booking-sync

# 2. Cloud Run 배포
gcloud run deploy booking-sync \
  --image gcr.io/channel-manager/booking-sync \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "SUPABASE_URL=${SUPABASE_URL}" \
  --set-env-vars "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
  --set-env-vars "BOOKING_COM_USERNAME=${BOOKING_COM_USERNAME}" \
  --set-env-vars "BOOKING_COM_PASSWORD=${BOOKING_COM_PASSWORD}" \
  --set-env-vars "BOOKING_COM_HOTEL_ID=${BOOKING_COM_HOTEL_ID}" \
  --set-env-vars "CRON_SECRET=${CRON_SECRET}"
```

배포가 완료되면 서비스 URL이 표시됩니다:
```
Service URL: https://booking-sync-xxx-an.a.run.app
```

---

## 4. 배포 확인

### Health Check

```bash
curl https://booking-sync-xxx-an.a.run.app/health
```

예상 응답:
```json
{
  "status": "ok",
  "service": "Channel Manager Booking Sync",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### 수동 동기화 테스트

```bash
curl -X POST https://booking-sync-xxx-an.a.run.app/api/sync/booking \
  -H "x-cron-secret: ${CRON_SECRET}"
```

---

## 5. Cloud Scheduler 설정 (Cron)

10분마다 자동 실행되도록 설정:

```bash
# Cloud Scheduler API 활성화
gcloud services enable cloudscheduler.googleapis.com

# App Engine 앱 생성 (Scheduler 요구사항)
gcloud app create --region=asia-northeast3

# Cron Job 생성
gcloud scheduler jobs create http booking-sync-cron \
  --schedule="*/10 * * * *" \
  --uri="https://booking-sync-xxx-an.a.run.app/api/sync/booking" \
  --http-method=POST \
  --headers="x-cron-secret=${CRON_SECRET}" \
  --location=asia-northeast3 \
  --description="Sync Booking.com reservations every 10 minutes"
```

### Cron 스케줄 변경

```bash
# 5분마다
--schedule="*/5 * * * *"

# 30분마다
--schedule="*/30 * * * *"

# 매시간
--schedule="0 * * * *"

# 매일 오전 9시
--schedule="0 9 * * *"
```

---

## 6. 로그 확인

### Cloud Run 로그

```bash
# 최근 로그 보기
gcloud run services logs read booking-sync --region=asia-northeast3 --limit=50

# 실시간 로그
gcloud run services logs tail booking-sync --region=asia-northeast3
```

### Web Console

1. [Cloud Run Console](https://console.cloud.google.com/run) 접속
2. `booking-sync` 서비스 클릭
3. "Logs" 탭 선택

---

## 7. 비용 모니터링

### 예상 비용 (10분마다 실행)

- **요청 수**: 144회/일 = 4,320회/월
- **실행 시간**: ~30초/회 = 2,160초/월
- **메모리**: 1GB

**무료 티어 한도:**
- ✅ 2백만 요청/월 (0.2% 사용)
- ✅ 360,000 GB-초/월 (0.6% 사용)

**결론**: 완전 무료!

### 비용 확인

```bash
# 청구 확인
gcloud billing accounts list

# 비용 알림 설정 (선택사항)
# https://console.cloud.google.com/billing/budgets
```

---

## 8. 업데이트 배포

코드 수정 후 재배포:

```bash
# 간단한 방법
./deploy-cloud-run.sh

# 또는 수동
gcloud builds submit --tag gcr.io/channel-manager/booking-sync
gcloud run deploy booking-sync --image gcr.io/channel-manager/booking-sync --region asia-northeast3
```

---

## 9. 환경 변수 업데이트

비밀번호 변경 등:

```bash
gcloud run services update booking-sync \
  --region=asia-northeast3 \
  --update-env-vars "BOOKING_COM_PASSWORD=new-password"
```

---

## 10. 문제 해결

### Puppeteer 실행 오류

**증상**: "Failed to launch browser"

**해결**:
```bash
# Dockerfile에 필요한 패키지가 있는지 확인
# 이미 포함되어 있어야 함
```

### 메모리 부족

**증상**: "Memory limit exceeded"

**해결**:
```bash
gcloud run services update booking-sync \
  --region=asia-northeast3 \
  --memory 2Gi
```

### 타임아웃

**증상**: "Deadline exceeded"

**해결**:
```bash
gcloud run services update booking-sync \
  --region=asia-northeast3 \
  --timeout 600  # 10분
```

### 로그인 실패

**확인사항**:
1. Booking.com 자격 증명이 올바른지
2. 2FA가 비활성화되어 있는지
3. Booking.com에서 봇 차단하지 않는지

---

## 11. 보안

### 환경 변수 암호화

Cloud Run은 자동으로 환경 변수를 암호화합니다.

### 더 강력한 보안 (선택사항)

Secret Manager 사용:

```bash
# Secret 생성
echo -n "your-password" | gcloud secrets create booking-password --data-file=-

# Cloud Run에 Secret 연결
gcloud run services update booking-sync \
  --region=asia-northeast3 \
  --update-secrets=BOOKING_COM_PASSWORD=booking-password:latest
```

---

## 12. 삭제

서비스 제거:

```bash
# Cloud Run 서비스 삭제
gcloud run services delete booking-sync --region=asia-northeast3

# Scheduler Job 삭제
gcloud scheduler jobs delete booking-sync-cron --location=asia-northeast3

# Docker 이미지 삭제
gcloud container images delete gcr.io/channel-manager/booking-sync
```

---

## 요약

✅ **설정 완료 체크리스트**

- [ ] Google Cloud 계정 생성
- [ ] gcloud CLI 설치 및 인증
- [ ] 프로젝트 생성 및 API 활성화
- [ ] 환경 변수 준비
- [ ] `./deploy-cloud-run.sh` 실행
- [ ] Health check 확인
- [ ] 수동 동기화 테스트
- [ ] Cloud Scheduler cron 설정
- [ ] 로그 확인

**배포 시간**: ~10분
**예상 비용**: 무료 (무료 티어 내)
**유지보수**: 거의 필요 없음

---

## 지원

문제 발생 시:
1. Cloud Run 로그 확인
2. Booking.com 페이지 구조 변경 확인
3. 환경 변수 재확인
