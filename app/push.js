// 푸시 알림 등록 헬퍼 (Expo Push).
// registerForPushAsync(): 권한 요청 → Expo 푸시 토큰 반환(없으면 null).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import appJson from './app.json';

const projectId = appJson?.expo?.extra?.eas?.projectId;

// 앱이 켜져 있을 때(포그라운드)도 배너 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushAsync() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) console.log('📱 Expo push token:', data); // 개발 중에만 (릴리스엔 안 찍힘)
    return data; // "ExponentPushToken[xxxx]"
  } catch (e) {
    console.log('푸시 등록 실패:', e?.message);
    return null;
  }
}
