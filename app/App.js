import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { colors } from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import { setOnSessionExpired, savePushToken } from './api';
import * as Notifications from 'expo-notifications';
import { registerForPushAsync } from './push';
import { ChatUnreadProvider } from './ChatUnreadContext';


import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MainTabs from './MainTabs';
import { getToken } from './auth';
import CafeDetailScreen from './screens/CafeDetailScreen';
import CafeSearchScreen from './screens/CafeSearchScreen';
import ReviewWriteScreen from './screens/ReviewWriteScreen';
import FeedWriteScreen from './screens/FeedWriteScreen';
import FeedDetailScreen from './screens/FeedDetailScreen';
import MyFeedsScreen from './screens/MyFeedsScreen';
import MyBookmarksScreen from './screens/MyBookmarksScreen';
import MyReviewsScreen from './screens/MyReviewsScreen';
import MyCommentsScreen from './screens/MyCommentsScreen';
import CafePickerScreen from './screens/CafePickerScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import AccountScreen from './screens/AccountScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import BlockListScreen from './screens/BlockListScreen';
import FeedSearchScreen from './screens/FeedSearchScreen';
import StudyApplicantsScreen from './screens/StudyApplicantsScreen';
import NotificationScreen from './screens/NotificationScreen';
import NicknameEditScreen from './screens/NicknameEditScreen';
import PasswordChangeScreen from './screens/PasswordChangeScreen';
import DeleteAccountScreen from './screens/DeleteAccountScreen';
import PasswordResetScreen from './screens/PasswordResetScreen';
import SettingsScreen from './screens/SettingsScreen';



const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    getToken().then((token) => {
      setLoggedIn(!!token);
    });
  }, []);

  // 세션 만료(401) 시 로그인 화면으로 이동
  useEffect(() => {
    setOnSessionExpired((message) => {
      if (message) Alert.alert('알림', message);
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    });
  }, []);

  // 푸시: 로그인 상태에서 토큰 등록 + 알림 탭 시 해당 화면으로 이동
  useEffect(() => {
    if (!loggedIn) return;
    registerForPushAsync().then((token) => {
      if (token) savePushToken(token).catch(() => {});
    });
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp?.notification?.request?.content?.data || {};
      if (!navigationRef.isReady()) return;
      if (data.roomId) {
        navigationRef.navigate('ChatRoom', { roomId: Number(data.roomId), partnerNickname: data.partnerNickname });
      } else if (data.feedId) {
        navigationRef.navigate('FeedDetail', { feedId: Number(data.feedId) });
      }
    });
    return () => sub.remove();
  }, [loggedIn]);

  if (loggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B2C24" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <StatusBar style="dark" />
    <ErrorBoundary>
    <SafeAreaProvider>
    <ChatUnreadProvider>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={loggedIn ? "Main" : "Login"}
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ title: '회원가입' }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CafeDetail"
          component={CafeDetailScreen}
          options={{ title: '카페 상세' }}
        />

        <Stack.Screen
          name="CafeSearch"
          component={CafeSearchScreen}
          options={{ title: '카페 검색' }}
        />

        <Stack.Screen
          name="ReviewWrite"
          component={ReviewWriteScreen}
          options={{ title: '리뷰 작성' }}
        />

        <Stack.Screen
          name="FeedWrite"
          component={FeedWriteScreen}
          options={{ title: '글쓰기' }}
        />

        <Stack.Screen
          name="FeedDetail"
          component={FeedDetailScreen}
          options={{ title: '게시글' }}
        />

        <Stack.Screen
          name="MyFeeds"
          component={MyFeedsScreen}
          options={{ title: '내가 쓴 글' }}
        />

         <Stack.Screen
          name="MyBookmarks"
          component={MyBookmarksScreen}
          options={{ title: '북마크한 카페' }}
        />

        <Stack.Screen
          name="MyReviews"
          component={MyReviewsScreen}
          options={{ title: '내가 쓴 리뷰' }}
        />
        
        <Stack.Screen
          name="MyComments"
          component={MyCommentsScreen}
          options={{ title: '내가 쓴 댓글' }}
        />
        
        <Stack.Screen
          name="CafePicker"
          component={CafePickerScreen}
          options={{ title: '카페 선택' }}
        />
        
        <Stack.Screen
          name="ChatRoom"
          component={ChatRoomScreen}
          options={{ title: '채팅' }}
        />

        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: '계정 관리' }}
        />

        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ title: '프로필' }}
        />

        <Stack.Screen
          name="BlockList"
          component={BlockListScreen}
          options={{ title: '차단 목록' }}
        />

        <Stack.Screen
          name="FeedSearch"
          component={FeedSearchScreen}
          options={{ title: '피드 검색' }}
        />

        <Stack.Screen
          name="StudyApplicants"
          component={StudyApplicantsScreen}
          options={{ title: '신청자 관리' }}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationScreen}
          options={{ title: '알림' }}
        />

        <Stack.Screen 
          name="NicknameEdit" 
          component={NicknameEditScreen} 
          options={{ title: '닉네임 변경' }} />

        <Stack.Screen 
          name="PasswordChange" 
          component={PasswordChangeScreen} 
          options={{ title: '비밀번호 변경' }} />

        <Stack.Screen 
          name="DeleteAccount" 
          component={DeleteAccountScreen} 
          options={{ title: '회원 탈퇴' }} />
        
        <Stack.Screen 
        name="PasswordReset" 
        component={PasswordResetScreen} 
        options={{ title: '비밀번호 찾기' }} />

        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: '설정' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
    </ChatUnreadProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}