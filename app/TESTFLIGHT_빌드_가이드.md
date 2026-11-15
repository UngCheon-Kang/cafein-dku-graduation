# CAFEIN 앱 TestFlight 빌드 가이드 (내 폰에서 테스트하기)

RN(Expo) 앱을 새로 빌드해서 **내 아이폰의 TestFlight로 받는** 방법 정리.
백엔드 배포(DEPLOY.md)랑은 완전히 별개다. 이건 "앱(프론트)"을 새로 만드는 것.

---

## 0. 핵심 개념 (한 번만 이해하면 됨)

- **어디서 실행?** → **내 맥 터미널**에서. (백엔드 배포는 서버 검은창이었지만, 앱 빌드는 내 맥 터미널.)
- **어디서 빌드됨?** → 실제 빌드는 **Expo 클라우드 서버**에서 돌아간다. 내 맥은 코드만 올려주고, 빌드가 도는 동안 맥을 꺼도/닫아도 됨.
- **서버 주소 걱정 X** → `eas.json`의 `production` 프로필이 `EXPO_PUBLIC_API_URL=https://crccafe.com`을 자동으로 박아넣는다. 그래서 `.env` 파일이 로컬로 돼 있어도 **TestFlight 빌드는 항상 운영서버(crccafe.com)를 본다.**
- **흐름**: 버전 올리기 → `eas build`(빌드) → `eas submit`(제출) → 폰 TestFlight에서 설치.

---

## 1. 빌드 전 — 매번 꼭 할 것

### (1) 빌드 번호 올리기 ⚠️ 제일 자주 까먹음
`app.json`에서 `ios.buildNumber`를 **직전보다 1 크게** 올린다.
```
"ios": {
  "buildNumber": "6",   ← 예: 5였으면 6으로
  ...
}
```
> 이유: App Store Connect는 같은 version(1.0.0)에서 **이미 올라간 빌드 번호를 다시 받으면 거부**한다.
> (귀찮으면 `eas.json`의 production 프로필에 `"autoIncrement": true` 를 넣으면 자동으로 올라감. 지금은 false라 수동.)

### (2) 푸시 알림 쓸 거면 — aps-environment 확인
`app.json`의 `ios.entitlements`:
```
"entitlements": { "aps-environment": "production" }
```
> TestFlight/스토어 빌드는 애플이 **production APNs**를 쓴다. 이 값이 `development`면 TestFlight에서 푸시가 안 올 수 있음.
> 반대로 **로컬 dev 빌드(`npx expo run:ios`)로 푸시 테스트**할 땐 잠깐 `development`로 돌려야 함.

### (3) (선택) 버전 자체를 올릴 때
큰 업데이트라 `1.0.0 → 1.0.1`처럼 **버전**을 올리고 싶으면 `app.json`의 `version`도 바꾼다. 이땐 buildNumber를 다시 1로 시작해도 됨(버전이 다르니까). 심사 중인 버전이면 보통 version은 그대로 두고 buildNumber만 올린다.

---

## 2. 빌드하기 (내 맥 터미널)

```bash
# 1) 앱 폴더로 이동
cd ~/Desktop/cafeReview/crc-app

# 2) (처음이거나 로그인 풀렸으면) Expo 로그인
eas login          # 계정: juone5905

# 3) iOS 빌드 시작 (production 프로필)
eas build --platform ios --profile production
```

- 중간에 뭐 물어보면(자격증명 등) 대부분 엔터/기본값으로 진행하면 됨. 이미 세팅돼 있어서 웬만하면 안 물어봄.
- 시작되면 **빌드 진행 URL**이 뜬다. 클릭하면 웹에서 진행상황 볼 수 있음.
- 빌드는 **약 10~20분** 걸림. 그동안 터미널 닫아도 됨 (클라우드에서 돌아감).
- `● Build finished` / 초록불 뜨면 완료.

> 진행상황 다시 보고 싶으면: `eas build:list` 또는 뜬 URL.

---

## 3. TestFlight에 올리기 (제출)

빌드가 끝나면, 같은 터미널에서:
```bash
eas submit --platform ios --profile production --latest
```
- `--latest` = 방금 만든 최신 빌드를 올린다는 뜻.
- 이것도 물어보면 기본값으로 진행. (Apple 계정/키는 이미 저장돼 있을 것)
- 업로드 자체는 몇 분. 그 뒤 **애플이 처리하는 데 5~15분** 더 걸림.
- `Submitted successfully` 뜨면 내 쪽 할 일 끝.

---

## 4. 폰에서 받기

1. 아이폰에서 **TestFlight** 앱 열기 (없으면 App Store에서 설치).
2. **CAFEIN** 이 목록에 보임.
3. 방금 올린 빌드가 "처리 중"이면 몇 분 기다렸다가 → **업데이트(Update)** 또는 **설치** 버튼.
4. 열어서 테스트!

> 애플이 처리 끝나면 TestFlight에 새 빌드(#6 등)가 뜬다. 안 보이면 5~15분 더 기다렸다 새로고침.

---

## 5. 자주 겪는 문제

| 증상 | 원인 / 해결 |
|---|---|
| `eas submit` 에서 "build number already used" 거부 | buildNumber 안 올림 → app.json에서 +1 하고 다시 빌드부터 |
| TestFlight에 빌드 안 뜸 | 애플 처리 대기중(5~15분) 또는 "내보내기 규정(수출 규정)" 질문 미응답 → App Store Connect 웹에서 해당 빌드 클릭해 답하기 |
| TestFlight에선 푸시 안 옴 | `aps-environment`가 `development`였을 수 있음 → `production`으로 바꾸고 재빌드 |
| 앱은 켜지는데 데이터 안 나옴 | 서버(crccafe.com)가 죽었거나 배포 안 됨 → DEPLOY.md로 백엔드 상태 확인 |
| `eas: command not found` | `npm install -g eas-cli` 로 설치 |

---

## 6. 요약 (익숙해지면 이것만)

```bash
# app.json 에서 ios.buildNumber +1 먼저!
cd ~/Desktop/cafeReview/crc-app
eas build --platform ios --profile production
# (10~20분 기다림)
eas submit --platform ios --profile production --latest
# (5~15분 뒤 폰 TestFlight에서 업데이트)
```
