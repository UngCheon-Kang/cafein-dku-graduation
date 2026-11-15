import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

// 토큰·유저 정보는 기기 암호화 저장소(SecureStore)에 보관 (AsyncStorage 평문 저장 대체)
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

// 로그인 성공 시 호출 — 토큰 2개 + 유저 정보 저장
export async function saveAuth(accessToken, refreshToken, user) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

// 토큰만 갱신 (재발급 시) — 유저 정보는 유지
export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

// 액세스 토큰 꺼내기 (없으면 null)
export async function getToken() {
  return await SecureStore.getItemAsync(ACCESS_KEY);
}

// 리프레시 토큰 꺼내기 (없으면 null)
export async function getRefreshToken() {
  return await SecureStore.getItemAsync(REFRESH_KEY);
}

// 저장된 유저 정보 꺼내기 (없으면 null)
export async function getUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// 저장된 유저 정보 일부 갱신 (예: 닉네임 변경 후 즉시 반영)
export async function updateStoredUser(patch) {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  const user = raw ? JSON.parse(raw) : {};
  const merged = { ...user, ...patch };
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged));
  return merged;
}

// 로그아웃 — 저장된 것 전부 삭제
export async function clearAuth() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// 로그인 필요한 액션 앞에서 호출. 게스트면 안내 후 false 반환
export async function requireLogin(navigation, message) {
  const token = await getToken();
  if (!token) {
    Alert.alert(
      '로그인이 필요해요',
      message ?? '이 기능은 로그인 후 이용할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') },
      ]
    );
    return false;
  }
  return true;
}
