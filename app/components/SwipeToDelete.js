// 의존성 없는 스와이프-삭제 행 (RN 내장 PanResponder/Animated)
// 왼쪽으로 밀면 오른쪽에 액션 버튼(삭제/나가기)이 드러남
import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, font } from '../theme';

const ACTION_W = 84;

export default function SwipeToDelete({ children, onAction, actionLabel = '삭제' }) {
  const tx = useRef(new Animated.Value(0)).current;
  const open = useRef(false);

  const snap = (toOpen) => {
    open.current = toOpen;
    Animated.spring(tx, {
      toValue: toOpen ? -ACTION_W : 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      // 가로로 확실히 움직일 때만 스와이프로 인식 (세로 스크롤과 충돌 방지)
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = open.current ? -ACTION_W : 0;
        let next = base + g.dx;
        if (next > 0) next = 0;
        if (next < -ACTION_W - 24) next = -ACTION_W - 24;
        tx.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const base = open.current ? -ACTION_W : 0;
        snap(base + g.dx < -ACTION_W / 2);
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.actionBg}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { snap(false); onAction?.(); }}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.front, { transform: [{ translateX: tx }] }]}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  actionBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_W,
    backgroundColor: colors.danger,
    justifyContent: 'center',
  },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontSize: font.sub, fontWeight: '700' },
  front: { backgroundColor: colors.bg }, // 닫혔을 때 뒤의 빨간 액션을 가림
});
