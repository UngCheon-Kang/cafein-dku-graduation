// 관리자 토큰 보관.
// localStorage는 탭을 닫아도 무기한 남아 XSS 한 번에 탈취되므로,
// 탭 단위로 사라지는 sessionStorage에 보관한다.
const KEY = "adminToken";

let onExpired = null;

export function getAdminToken() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  sessionStorage.setItem(KEY, token);
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY); // 이전 버전이 남긴 토큰 정리
  } catch {
    /* 저장소 접근 불가 시 무시 */
  }
}

// 401/403 응답 시 호출할 로그아웃 콜백 (App에서 등록)
export function setOnAdminSessionExpired(fn) {
  onExpired = fn;
}

export function notifyAdminSessionExpired() {
  clearAdminToken();
  if (onExpired) onExpired();
}
