# app — 모바일 앱

React Native + Expo (SDK 54). Android / iOS.

## 실행

```bash
npm install
cp .env.example .env     # EXPO_PUBLIC_API_URL 에 백엔드 주소 입력
npx expo run:android     # 또는 npx expo run:ios
```

- 지도·소셜 로그인이 네이티브 모듈이라 **Expo Go로는 실행되지 않습니다.** `expo run:*`으로 개발 빌드를 만들어 설치해야 합니다.
- JS 코드만 수정할 때는 `npx expo start`로 개발 서버만 다시 띄우면 됩니다.

## 주요 구조

| 경로 | 설명 |
|---|---|
| `screens/` | 화면 단위 컴포넌트 (홈·지도·카페 상세·리뷰 작성·커뮤니티·채팅·마이페이지 등) |
| `components/` | 공통 UI (입력창, 이미지 뷰어, 플로팅 탭바, 에러 바운더리 등) |
| `hooks/` | 페이지네이션 등 공통 로직 |
| `api.js` | 백엔드 REST 호출 모듈 |
| `auth.js` | 토큰 저장·갱신 (expo-secure-store) |
| `push.js` | 푸시 토큰 등록 |
| `App.js` / `MainTabs.js` | 네비게이션 구성 |

## 빌드 (스토어 배포)

```bash
eas build --platform android --profile production
```

`eas.json`의 production 프로필이 운영 서버 주소를 주입하며, 안드로이드는 로컬 업로드 키로 서명합니다(`credentialsSource: local`). 서명에 필요한 `credentials.json`과 키스토어 파일은 저장소에 포함되지 않습니다.
