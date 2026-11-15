// 서버가 타임존 표기 없이 보내는 시각을 UTC(협정세계시)로 해석한다.
// 백엔드가 LocalDateTime을 오프셋 없이("2026-08-25T01:30:00") 내려주는데,
// 서버(도커)는 UTC로 도므로 이 값은 UTC 벽시계다.
// 문자열에 타임존 표기가 없으면 'Z'를 붙여 UTC로 파싱 → 기기 로컬(KST)로 자동 변환된다.
// ※ 임시 보정: 나중에 백엔드가 시간을 타임존 포함해서 내려주면 이 처리는 걷어내야 함.
export function parseServerDate(dateString) {
  if (!dateString) return null;
  const hasTz = /([zZ])|([+-]\d{2}:?\d{2})$/.test(dateString);
  return new Date(hasTz ? dateString : `${dateString}Z`);
}

// ISO 날짜 문자열 → "방금 전 / N분 전 / N시간 전 / N일 전"
export function timeAgo(dateString) {
  if (!dateString) return '';

  const now = new Date();
  const past = parseServerDate(dateString);
  if (!past || isNaN(past)) return '';
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 0) return '방금 전';
  if (diffSec < 60) return '방금 전';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}일 전`;

  // 일주일 넘으면 날짜로
  return `${past.getMonth() + 1}월 ${past.getDate()}일`;
}
