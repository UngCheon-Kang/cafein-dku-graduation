import axios from "axios";

// 백엔드 주소. 기본값은 로컬 서버.
// prod 백엔드(crccafe.com)에 붙이려면 .env.local 에 VITE_API_URL=https://crccafe.com 넣으면 됨.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// 모든 요청에 저장된 관리자 토큰을 자동으로 붙임
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
