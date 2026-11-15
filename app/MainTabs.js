import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './theme';
import FloatingTabBar from './components/FloatingTabBar';
import { useChatUnread } from './ChatUnreadContext';

import HomeScreen from './screens/HomeScreen';
import MyPageScreen from './screens/MyPageScreen';
import FeedScreen from './screens/FeedScreen';
import MapScreen from './screens/MapScreen';
import ChatListScreen from './screens/ChatListScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { chatUnread } = useChatUnread();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // ⚠️ animation 옵션은 bottom-tabs v7(Fabric)에서 탭 전환/백그라운드 복귀 후
        // 이전 화면 컨테이너가 터치를 가로채는 버그가 있음 → 플로팅바만 눌리고 나머지 먹통.
        // 그래서 애니메이션 끔(기본 즉시 전환).
        animation: 'none',
        // 플로팅 글래스 바 밑으로 콘텐츠가 가리지 않게 씬 하단 여백 + 크림 배경으로 이음새 감춤
        // 콘텐츠가 플로팅 글래스 바 '밑으로' 흐르도록 씬 여백 제거 (블러가 콘텐츠를 비추게)
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="지도" component={MapScreen} />
      <Tab.Screen name="커뮤니티" component={FeedScreen} />
      <Tab.Screen
        name="채팅"
        component={ChatListScreen}
        options={{ tabBarBadge: chatUnread > 0 ? chatUnread : undefined }}
      />
      <Tab.Screen name="마이페이지" component={MyPageScreen} />
    </Tab.Navigator>
  );
}
