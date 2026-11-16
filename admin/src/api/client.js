import axios from "axios";
import { getAdminToken, notifyAdminSessionExpired } from "./token";

// 백엔드 주소. 기본값은 로컬 서버.
// prod 백엔드(crccafe.com)에 붙이려면 .env.local 에 VITE_API_URL=https://crccafe.com 넣으면 됨.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// 모든 요청에 저장된 관리자 토큰을 자동으로 붙임
client.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 토큰 만료(401) 또는 관리자 권한 없음(403)이면 토큰을 지우고 로그인 화면으로
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const isLogin = error?.config?.url?.includes("/users/login");
    if (!isLogin && (status === 401 || status === 403)) {
      notifyAdminSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default client;
