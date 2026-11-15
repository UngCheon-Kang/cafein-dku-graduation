import { getToken, getRefreshToken, saveTokens, clearAuth } from './auth';
import { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

// 세션 만료 시 호출할 콜백 (App.js에서 등록)
let onSessionExpired = null;
export function setOnSessionExpired(fn) {
  onSessionExpired = fn;
}

// ── 토큰 자동 재발급 (동시 401이 여러 개여도 재발급은 한 번만) ──
let reissuePromise = null;
async function tryReissue() {
  if (!reissuePromise) {
    reissuePromise = doReissue().finally(() => {
      reissuePromise = null;
    });
  }
  return reissuePromise;
}
async function doReissue() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/users/token/reissue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── 인증 요청 공통 (access 토큰 부착 + 401이면 재발급 후 1회 재시도) ──
async function authFetch(path, options = {}, _retry = true) {
  const token = await getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && _retry) {
    const ok = await tryReissue();
    if (ok) {
      return authFetch(path, options, false); // 새 토큰으로 한 번 더
    }
    await clearAuth();
    if (onSessionExpired) onSessionExpired();
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  }
  return response;
}

// 응답 처리 공통 함수
async function handleResponse(response, fallbackMessage) {
  if (response.status === 401) {
    await clearAuth();
    if (onSessionExpired) onSessionExpired();
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  // 정지/탈퇴 계정 → 자동 로그아웃
  if (response.status === 403 && data?.code === 'ACCOUNT_INACTIVE') {
    await clearAuth();
    if (onSessionExpired) onSessionExpired(data.message || '사용할 수 없는 계정입니다.');
    throw new Error(data?.message || '사용할 수 없는 계정입니다.');
  }
  if (!response.ok) {
    throw new Error((data && data.message) || fallbackMessage);
  }
  return data;
}

// ───────────────── 인증 (공개) ─────────────────

// 로그인
export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response, '로그인에 실패했습니다.');
  // { userId, accessToken, refreshToken, nickname }
}

// 회원가입 요청 (인증코드 발송)
export async function signup(email, password, nickname) {
  const response = await fetch(`${BASE_URL}/users/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname }),
  });
  return handleResponse(response, '회원가입에 실패했습니다.');
}

// 회원가입 인증코드 확인 → 가입 완료 + 자동 로그인
export async function verifySignup(email, code) {
  const response = await fetch(`${BASE_URL}/users/signup/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse(response, '인증에 실패했습니다.');
  // { userId, accessToken, refreshToken, nickname }
}

// 인증코드 재발송
export async function resendCode(email) {
  const response = await fetch(`${BASE_URL}/users/signup/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response, '재발송에 실패했습니다.');
}

// 로그아웃 (서버의 refresh 토큰 삭제)
export async function logoutApi() {
  const response = await authFetch(`/users/logout`, { method: 'POST' });
  return handleResponse(response, '로그아웃에 실패했습니다.');
}

// 이메일 중복 확인 (true = 사용 가능)
export async function checkEmail(email) {
  const response = await fetch(
    `${BASE_URL}/users/check-email?email=${encodeURIComponent(email)}`
  );
  return handleResponse(response, '이메일 확인에 실패했습니다.');
}

// 닉네임 중복 확인 (true = 사용 가능)
export async function checkNickname(nickname) {
  const response = await fetch(
    `${BASE_URL}/users/check-nickname?nickname=${encodeURIComponent(nickname)}`
  );
  return handleResponse(response, '닉네임 확인에 실패했습니다.');
}

// ───────────────── 유저/카페/피드 등 (인증) ─────────────────

// 내 정보 조회
export async function savePushToken(token) {
  const response = await authFetch(`/users/me/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse(response, '푸시 토큰 저장에 실패했습니다.');
}

export async function getMyInfo() {
  const response = await authFetch(`/users/me`);
  return handleResponse(response, '내 정보를 불러오지 못했습니다.');
}

// 카페 목록 조회 (공개 API)
export async function getCafes(sort = 'score', lat, lng, keyword) {
  const params = [`sort=${sort}`];
  if (lat != null && lng != null) {
    params.push(`lat=${lat}`, `lng=${lng}`);
  }
  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  const response = await fetch(`${BASE_URL}/cafes?${params.join('&')}`);
  const data = await handleResponse(response, '카페 목록을 불러오지 못했습니다.');
  return data.content ?? data;
}

// 홈 무한스크롤용: 페이지 단위 조회 → { content, last } 반환
export async function getCafesPage(sort = 'score', page = 0, lat, lng, size = 20) {
  const params = [`sort=${sort}`, `page=${page}`, `size=${size}`];
  if (lat != null && lng != null) {
    params.push(`lat=${lat}`, `lng=${lng}`);
  }
  const response = await fetch(`${BASE_URL}/cafes?${params.join('&')}`);
  const data = await handleResponse(response, '카페 목록을 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}

// 지도 핀 / 검색 등록판정용: 전체 카페를 페이지 다 돌아서 배열로 반환
export async function getAllCafes(sort = 'score', lat, lng) {
  const size = 50; // 서버 최대 페이지 크기(Pageables.MAX_SIZE=50)에 맞춤
  let page = 0;
  let all = [];
  while (page < 200) { // 안전장치
    const { content, last } = await getCafesPage(sort, page, lat, lng, size);
    all = all.concat(content);
    if (last || content.length === 0) break; // 종료는 last 플래그로만 (요청>상한이어도 안 멈춤)
    page++;
  }
  return all;
}

// 카페 상세 조회 (토큰 필요 - 북마크 여부 계산)
export async function getCafe(cafeId) {
  const response = await authFetch(`/cafes/${cafeId}`);
  return handleResponse(response, '카페 정보를 불러오지 못했습니다.');
}

// 특정 카페의 리뷰 목록 (공개 API)
export async function getCafeReviews(cafeId, page = 0, size = 20) {
  const response = await fetch(`${BASE_URL}/cafes/${cafeId}/reviews?page=${page}&size=${size}`);
  const data = await handleResponse(response, '리뷰를 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}

// 카페 검색 (카카오, 공개 API)
export async function searchCafes(keyword) {
  const response = await fetch(
    `${BASE_URL}/cafes/search?keyword=${encodeURIComponent(keyword)}`
  );
  return handleResponse(response, '검색에 실패했습니다.');
}

// 리뷰 작성
export async function createReview(reviewData) {
  const response = await authFetch(`/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });
  return handleResponse(response, '리뷰 작성에 실패했습니다.');
}

// 피드 목록 조회
export async function getFeeds(type, sort, page = 0, size = 20) {
  const params = [`page=${page}`, `size=${size}`];
  if (type) params.push(`type=${type}`);
  if (sort) params.push(`sort=${sort}`);
  const response = await authFetch(`/feeds?${params.join('&')}`);
  const data = await handleResponse(response, '피드를 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}

// 피드 작성
export async function createFeed(feedData) {
  const response = await authFetch(`/feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedData),
  });
  return handleResponse(response, '피드 작성에 실패했습니다.');
}

// 피드 상세 조회
export async function getFeed(feedId) {
  const response = await authFetch(`/feeds/${feedId}`);
  return handleResponse(response, '게시글을 불러오지 못했습니다.');
}

// 댓글 작성
export async function createComment(feedId, content, parentId = null) {
  const response = await authFetch(`/feeds/${feedId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, parentId }),
  });
  return handleResponse(response, '댓글 작성에 실패했습니다.');
}

// 좋아요
export async function likeFeed(feedId) {
  const response = await authFetch(`/feeds/${feedId}/likes`, { method: 'POST' });
  return handleResponse(response, '좋아요에 실패했습니다.');
}
export async function unlikeFeed(feedId) {
  const response = await authFetch(`/feeds/${feedId}/likes`, { method: 'DELETE' });
  return handleResponse(response, '좋아요 취소에 실패했습니다.');
}

// 피드 수정 / 삭제
export async function updateFeed(feedId, title, content, imageKeys) {
  const response = await authFetch(`/feeds/${feedId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, imageKeys }),
  });
  return handleResponse(response, '수정에 실패했습니다.');
}
export async function deleteFeed(feedId) {
  const response = await authFetch(`/feeds/${feedId}`, { method: 'DELETE' });
  return handleResponse(response, '삭제에 실패했습니다.');
}

// 북마크
export async function addBookmark(cafeId) {
  const response = await authFetch(`/cafes/${cafeId}/bookmark`, { method: 'POST' });
  return handleResponse(response, '북마크에 실패했습니다.');
}
export async function removeBookmark(cafeId) {
  const response = await authFetch(`/cafes/${cafeId}/bookmark`, { method: 'DELETE' });
  return handleResponse(response, '북마크 취소에 실패했습니다.');
}

// 댓글 수정 / 삭제
export async function updateComment(commentId, content) {
  const response = await authFetch(`/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse(response, '댓글 수정에 실패했습니다.');
}
export async function deleteComment(commentId) {
  const response = await authFetch(`/comments/${commentId}`, { method: 'DELETE' });
  return handleResponse(response, '댓글 삭제에 실패했습니다.');
}

// 내 목록들
export async function getMyFeeds(userId, page = 0, size = 20) {
  const response = await authFetch(`/users/${userId}/feeds?page=${page}&size=${size}`);
  const data = await handleResponse(response, '내 글을 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}
export async function getMyBookmarks(page = 0, size = 20) {
  const response = await authFetch(`/users/me/bookmarks?page=${page}&size=${size}`);
  const data = await handleResponse(response, '북마크를 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}
export async function getMyReviews(page = 0, size = 20) {
  const response = await authFetch(`/users/me/reviews?page=${page}&size=${size}`);
  const data = await handleResponse(response, '내 리뷰를 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}
export async function getMyComments(userId, page = 0, size = 20) {
  const response = await authFetch(`/users/${userId}/comments?page=${page}&size=${size}`);
  const data = await handleResponse(response, '내 댓글을 불러오지 못했습니다.');
  const content = data.content ?? (Array.isArray(data) ? data : []);
  const last = (data && typeof data.last === 'boolean') ? data.last : content.length < size;
  return { content, last };
}

// 리뷰 수정 / 삭제
export async function updateReview(reviewId, reviewData) {
  const response = await authFetch(`/reviews/${reviewId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });
  return handleResponse(response, '리뷰 수정에 실패했습니다.');
}
export async function deleteReview(reviewId) {
  const response = await authFetch(`/reviews/${reviewId}`, { method: 'DELETE' });
  return handleResponse(response, '리뷰 삭제에 실패했습니다.');
}

// 스터디 신청 / 취소
export async function applyStudy(studyId) {
  const response = await authFetch(`/studies/${studyId}/applications`, { method: 'POST' });
  return handleResponse(response, '신청에 실패했습니다.');
}
export async function cancelStudy(studyId) {
  const response = await authFetch(`/studies/${studyId}/applications`, { method: 'DELETE' });
  return handleResponse(response, '신청 취소에 실패했습니다.');
}

// 채팅
export async function getChatRooms() {
  const response = await authFetch(`/chat-rooms`);
  return handleResponse(response, '채팅방을 불러오지 못했습니다.');
}
export async function createChatRoom(partnerId) {
  const response = await authFetch(`/chat-rooms?partnerId=${partnerId}`, { method: 'POST' });
  return handleResponse(response, '채팅방을 열지 못했습니다.');
}
export async function getChatMessages(roomId, cursorId) {
  const path = cursorId
    ? `/chat-rooms/${roomId}/messages?cursorId=${cursorId}`
    : `/chat-rooms/${roomId}/messages`;
  const response = await authFetch(path);
  return handleResponse(response, '메시지를 불러오지 못했습니다.');
}
export async function markChatRead(roomId) {
  const response = await authFetch(`/chat-rooms/${roomId}/read`, { method: 'POST' });
  return handleResponse(response, '읽음 처리에 실패했습니다.');
}
export async function leaveChatRoom(roomId) {
  const response = await authFetch(`/chat-rooms/${roomId}`, { method: 'DELETE' });
  return handleResponse(response, '나가기에 실패했습니다.');
}

// 계정 관리
export async function updateNickname(nickname) {
  const response = await authFetch(`/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  return handleResponse(response, '닉네임 변경에 실패했습니다.');
}
export async function changePassword(currentPassword, newPassword) {
  const response = await authFetch(`/users/me/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(response, '비밀번호 변경에 실패했습니다.');
}
export async function deleteAccount(password) {
  const response = await authFetch(`/users/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return handleResponse(response, '회원 탈퇴에 실패했습니다.');
}

// 프로필 / 차단 / 신고
export async function getUserProfile(userId) {
  const response = await authFetch(`/users/${userId}`);
  return handleResponse(response, '프로필을 불러오지 못했습니다.');
}
export async function blockUser(userId) {
  const response = await authFetch(`/users/${userId}/block`, { method: 'POST' });
  return handleResponse(response, '차단에 실패했습니다.');
}
export async function unblockUser(userId) {
  const response = await authFetch(`/users/${userId}/block`, { method: 'DELETE' });
  return handleResponse(response, '차단 해제에 실패했습니다.');
}
export async function getMyBlocks() {
  const response = await authFetch(`/users/me/blocks`);
  return handleResponse(response, '차단 목록을 불러오지 못했습니다.');
}
export async function reportContent(targetType, targetId, reason, detail) {
  const response = await authFetch(`/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId, reason, detail: detail ?? null }),
  });
  return handleResponse(response, '신고에 실패했습니다.');
}

// 피드 검색
export async function searchFeeds(keyword, type) {
  const params = `keyword=${encodeURIComponent(keyword)}&type=${type}`;
  const response = await authFetch(`/feeds/search?${params}`);
  return handleResponse(response, '검색에 실패했습니다.');
}

// 이미지 업로드 (folder: feeds | reviews | profile)
export async function uploadImage(fileUri, contentType, folder) {
  const res = await authFetch(
    `/images/upload-url?folder=${folder}&contentType=${encodeURIComponent(contentType)}`,
    { method: 'POST' }
  );
  const presigned = await handleResponse(res, '업로드 준비에 실패했습니다.');

  const form = new FormData();
  Object.entries(presigned.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', { uri: fileUri, name: 'upload', type: contentType });

  const s3res = await fetch(presigned.url, { method: 'POST', body: form });
  if (!s3res.ok) {
    throw new Error('이미지 업로드에 실패했습니다.');
  }
  return presigned.key;
}

// 프로필 사진 변경 (fileUri=null이면 제거)
export async function updateProfileImage(fileUri, contentType) {
  const key = fileUri ? await uploadImage(fileUri, contentType, 'profile') : null;
  const response = await authFetch(`/users/me/profile-image`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageKey: key }),
  });
  return handleResponse(response, '프로필 사진 변경에 실패했습니다.');
}

// 스터디 신청자 관리
export async function getStudyApplicants(studyId) {
  const response = await authFetch(`/studies/${studyId}/applications`);
  return handleResponse(response, '신청자 목록을 불러오지 못했습니다.');
}
export async function acceptApplication(applicationId) {
  const response = await authFetch(`/applications/${applicationId}/accept`, { method: 'POST' });
  return handleResponse(response, '수락에 실패했습니다.');
}
export async function rejectApplication(applicationId) {
  const response = await authFetch(`/applications/${applicationId}/reject`, { method: 'POST' });
  return handleResponse(response, '거절에 실패했습니다.');
}


// 알림 목록 (페이지 단위, 토큰 필요)
export async function getNotifications(page = 0) {
  const response = await authFetch(`/notifications?page=${page}&size=20`);
  const data = await handleResponse(response, '알림을 불러오지 못했습니다.');
  return {
    items: data.content ?? [],   // 이번 페이지 알림들
    last: data.last ?? true,     // 마지막 페이지면 true (더 없음)
  };
}
export async function getUnreadCount() {
  const response = await authFetch(`/notifications/unread-count`);
  return handleResponse(response, '알림 개수를 불러오지 못했습니다.');
}
export async function markAllNotificationsRead() {
  const response = await authFetch(`/notifications/read-all`, { method: 'PATCH' });
  return handleResponse(response, '읽음 처리에 실패했습니다.');
}
export async function deleteNotification(id) {
  const response = await authFetch(`/notifications/${id}`, { method: 'DELETE' });
  return handleResponse(response, '알림 삭제에 실패했습니다.');
}
export async function deleteAllNotifications() {
  const response = await authFetch(`/notifications`, { method: 'DELETE' });
  return handleResponse(response, '알림 전체 삭제에 실패했습니다.');
}

// 댓글 목록 (원댓글 페이징 + 각 원댓글의 답글 미리보기 3개 + 답글 총개수)
export async function getComments(feedId, page = 0) {
  const response = await authFetch(`/feeds/${feedId}/comments?page=${page}&size=20`);
  const data = await handleResponse(response, '댓글을 불러오지 못했습니다.');
  return {
    items: data.content ?? [],   // [{ comment, replyCount, replies }]
    last: data.last ?? true,     // 마지막 페이지면 true
  };
}

// 특정 원댓글의 답글 페이징 (더보기용)
export async function getReplies(parentId, page = 0) {
  const response = await authFetch(`/comments/${parentId}/replies?page=${page}&size=20`);
  const data = await handleResponse(response, '답글을 불러오지 못했습니다.');
  return {
    items: data.content ?? [],   // [CommentResponse]
    last: data.last ?? true,
  };
}

export async function requestPasswordReset(email) {
  const response = await authFetch(`/users/password/reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response, '요청에 실패했습니다.');
}
export async function verifyPasswordResetCode(email, code) {
  const response = await authFetch(`/users/password/reset/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse(response, '인증코드 확인에 실패했습니다.');
}
export async function confirmPasswordReset(email, code, newPassword) {
  const response = await authFetch(`/users/password/reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return handleResponse(response, '비밀번호 재설정에 실패했습니다.');
}

export async function loginKakao(kakaoAccessToken) {
  const response = await fetch(`${BASE_URL}/users/login/kakao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: kakaoAccessToken }),
  });
  return handleResponse(response, '카카오 로그인에 실패했습니다.');
}

export async function loginApple(identityToken, fullName) {
  const response = await fetch(`${BASE_URL}/users/login/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken, fullName }),
  });
  return handleResponse(response, '애플 로그인에 실패했습니다.');
}