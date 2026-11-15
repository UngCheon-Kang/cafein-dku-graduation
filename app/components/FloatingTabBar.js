// 플로팅 하단 탭바 (흰색, 둥근 모서리로 떠 있음)
// 활성 탭 뒤로 '물방울(버블)' 원형 인디케이터가 스프링으로 스무스하게 이동.
import { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const ICONS = {
  '홈': ['home', 'home-outline'],
  '지도': ['map', 'map-outline'],
  '커뮤니티': ['people', 'people-outline'],
  '채팅': ['chatbubble', 'chatbubble-outline'],
  '마이페이지': ['person', 'person-outline'],
};

const BUBBLE = 40; // 물방울 지름

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);
  const count = state.routes.length;
  const tabW = barW ? barW / count : 0;

  // 하단 띄우는 높이: 아이폰은 홈 인디케이터(막대)만 피하면 됨.
  // 안드로이드는 제스처/3버튼 내비 위로 여유를 더 준다.
  const bottomOffset =
    Platform.OS === 'ios' ? 18 : insets.bottom + 10; // iOS: 홈 인디케이터 바로 위 (숫자 줄이면 더 내려감)

  // 버블의 가로 위치 (활성 탭 인덱스로 스프링 이동)
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tabW) return;
    Animated.spring(indicatorX, {
      toValue: state.index * tabW,
      useNativeDriver: true,
      speed: 12,        // 이동 속도
      bounciness: 11,   // 물방울처럼 살짝 통통 튀는 느낌
    }).start();
  }, [state.index, tabW]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      >
        {/* 움직이는 물방울 인디케이터 (아이콘 뒤) */}
        {tabW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              { left: (tabW - BUBBLE) / 2, transform: [{ translateX: indicatorX }] },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const badge = options.tabBarBadge;
          const [on, off] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
          const tint = focused ? colors.accent : colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View style={styles.iconSlot}>
                <Ionicons name={focused ? on : off} size={22} color={tint} />
                {badge != null && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 28,
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bar: {
    flexDirection: 'row',
    height: 66,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  bubble: {
    position: 'absolute',
    top: 5,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: 'rgba(46,124,246,0.12)', // accent(#2E7CF6) 옅은 톤
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
