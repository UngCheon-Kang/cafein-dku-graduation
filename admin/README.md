# admin — 관리자 웹

React 18 · Vite · Ant Design.

## 실행

```bash
npm install
cp .env.example .env.local    # VITE_API_URL 에 백엔드 주소 입력
npm run dev                   # http://localhost:5173
```

관리자 권한(`admin = true`) 계정으로 로그인해야 접근할 수 있습니다.

## 화면

| 페이지 | 기능 |
|---|---|
| `LoginPage` | 관리자 로그인 |
| `ReportsPage` | 신고 접수 목록 확인 및 처리 |
| `SuspendedUsersPage` | 이용 정지 사용자 관리 |
| `CafeImagesPage` | 카페 대표 이미지 등록·정렬 |
