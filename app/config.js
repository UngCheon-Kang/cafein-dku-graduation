// API/WebSocket 주소를 한 곳에서 관리 (플랫폼별 로컬 호스트 자동 보정)
import { Platform } from 'react-native';

const raw = process.env.EXPO_PUBLIC_API_URL || '';

// 개발용 로컬 주소일 때 호스트가 플랫폼마다 다름:
//  - Android 에뮬레이터: 호스트 = 10.0.2.2
//  - iOS 시뮬레이터:     호스트 = localhost
// .env엔 안드로이드 기준(10.0.2.2)으로 넣어두고, iOS일 땐 자동으로 localhost로 치환.
// (운영 https 주소나 실기기 LAN IP엔 '10.0.2.2'가 없어서 그대로 통과 → 아무 영향 없음)
export const API_BASE_URL =
  Platform.OS === 'ios' ? raw.replace('10.0.2.2', 'localhost') : raw;

// REST가 https면 wss로, http면 ws로 자동 전환
export const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
