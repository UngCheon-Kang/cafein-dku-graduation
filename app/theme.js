// 앱 전체 디자인 토큰 — 클린 화이트 / 뉴트럴
// 색·간격·글자크기 등을 여기서 한 곳에 정의하고, 모든 화면이 가져다 쓴다.

export const colors = {
  bg: '#F5F6F8',        // 페이지 배경 (아주 옅은 화이트그레이 — 카드가 떠 보이게)
  surface: '#FFFFFF',   // 카드·입력창 배경 (순수 화이트)
  primary: '#111214',   // 메인 (잉크 블랙) — 버튼·제목
  accent: '#2E7CF6',    // 포인트 (클린 블루) — 링크·강조·활성
  text: '#111214',      // 기본 텍스트
  textSub: '#6B7280',   // 보조 텍스트 (날짜·주소 등)
  textMuted: '#9CA3AF', // 힌트·플레이스홀더
  border: '#ECEDEF',    // 테두리 (옅은 회색)
  chipBg: '#F1F3F5',    // 칩 배경
  chipText: '#4B5563',  // 칩 텍스트
  danger: '#E5484D',    // 삭제·경고
  good: '#2E9E6B',      // 카공지수 '좋음' (초록)
  white: '#FFFFFF',
};

// 간격 (여백·패딩) — 8의 배수 기반
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// 모서리 둥글기
export const radius = { sm: 8, md: 12, card: 16, pill: 999 };

// 글자 크기
export const font = {
  h1: 22,   // 큰 제목
  h2: 18,   // 화면 제목
  h3: 16,   // 카드 제목
  body: 15, // 본문
  sub: 13,  // 보조
  caption: 12, // 캡션·칩
};

// 카드 그림자 (뉴트럴, 은은하게)
export const shadow = {
  card: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2, // 안드로이드
  },
};
