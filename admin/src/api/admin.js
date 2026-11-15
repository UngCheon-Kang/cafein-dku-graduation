import client from "./client";

// 로그인 → { userId, accessToken, refreshToken, nickname }
export async function login(email, password) {
  const res = await client.post("/users/login", { email, password });
  return res.data;
}

// 신고 목록 (status 선택 + 페이징). 백엔드가 Page면 {content,totalElements}, List면 배열 그대로.
export async function getReports(status, page = 0, size = 20) {
  const res = await client.get("/admin/reports", {
    params: { ...(status ? { status } : {}), page, size },
  });
  return res.data;
}

// 신고 처리 (action: RESOLVE_HIDE / RESOLVE_KEEP / REJECT)
export async function handleReport(reportId, action) {
  const res = await client.patch(`/admin/reports/${reportId}`, null, {
    params: { action },
  });
  return res.data;
}

// 유저(가해자) 정지 (reportId를 넘기면 사유·콘텐츠가 함께 기록됨)
export async function suspendUser(userId, reportId) {
  await client.patch(`/admin/users/${userId}/suspend`, null, {
    params: reportId ? { reportId } : {},
  });
}

// 신고된 채팅방 읽기전용 조회
export async function getReportedChat(reportId) {
  const res = await client.get(`/admin/reports/${reportId}/chat`);
  return res.data;
}

// 신고 대상 콘텐츠 상세 (피드/리뷰/댓글 전체 내용)
export async function getReportDetail(reportId) {
  const res = await client.get(`/admin/reports/${reportId}/detail`);
  return res.data;
}

// 유저 프로필 이미지 강제 삭제 (reportId 주면 그 신고도 처리완료로 기록)
export async function removeProfileImage(userId, reportId) {
  await client.patch(`/admin/users/${userId}/profile-image/remove`, null, {
    params: reportId ? { reportId } : {},
  });
}

// 카페 검색/목록 (Slice)
export async function getCafes(keyword, page = 0, size = 20) {
  const res = await client.get("/cafes", {
    params: { ...(keyword ? { keyword } : {}), page, size },
  });
  return res.data;
}

// S3 presigned POST 발급 (관리자 토큰 필요)
export async function getUploadUrl(folder, contentType) {
  const res = await client.post("/images/upload-url", null, {
    params: { folder, contentType },
  });
  return res.data; // { url, fields, key }
}

// presigned로 S3에 직접 업로드 (우리 JWT 안 붙임 — 순수 fetch, 파일은 반드시 맨 마지막)
export async function uploadToS3(presigned, file) {
  const form = new FormData();
  Object.entries(presigned.fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", file); // ★ 반드시 마지막
  const res = await fetch(presigned.url, { method: "POST", body: form }); // Content-Type 헤더 직접 설정 금지
  if (!res.ok) throw new Error("S3 업로드 실패: " + res.status);
  return presigned.key;
}

// 카페의 현재 이미지 (key + url) — 편집 시 기존 유지용
export async function getCafeImages(cafeId) {
  const res = await client.get(`/admin/cafes/${cafeId}/images`);
  return res.data; // [{ key, url }]
}

// 사진 미등록 카페 (생성순, 페이징)
export async function getCafesWithoutImage(page = 0, size = 20) {
  const res = await client.get("/admin/cafes/no-image", { params: { page, size } });
  return res.data; // Page { content, totalElements, ... }
}

// 카페 이미지 저장 (남긴 기존 + 새 key 전체를 보냄)
export async function setCafeImages(cafeId, imageKeys) {
  await client.post(`/admin/cafes/${cafeId}/images`, { imageKeys });
}

// 카페 숨김 (soft delete — 앱에서 안 보이게)
export async function hideCafe(cafeId) {
  await client.delete(`/admin/cafes/${cafeId}`);
}

// 카페 사진 출처 URL 저장
export async function setCafeSource(cafeId, sourceUrl) {
  await client.patch(`/admin/cafes/${cafeId}/source`, { sourceUrl });
}

// 숨김 카페 목록
export async function getHiddenCafes(page = 0, size = 20) {
  const res = await client.get("/admin/cafes/hidden", { params: { page, size } });
  return res.data;
}

// 카페 복원 (숨김 해제)
export async function unhideCafe(cafeId) {
  await client.patch(`/admin/cafes/${cafeId}/unhide`);
}

// 정지된 사용자 목록
export async function getSuspendedUsers() {
  const res = await client.get("/admin/users/suspended");
  return res.data;
}

// 정지 해제
export async function unsuspendUser(userId) {
  await client.patch(`/admin/users/${userId}/unsuspend`);
}
