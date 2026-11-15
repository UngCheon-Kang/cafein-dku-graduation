// 앱 전역 에러 바운더리 — 렌더 중 발생한 에러로 앱 전체가 하얗게/크래시 나는 것을 막고
// 안내 화면 + 다시 시도 버튼을 보여준다. (에러 바운더리는 반드시 클래스 컴포넌트)
import { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 실서비스라면 여기서 Sentry 등으로 전송. 지금은 콘솔 로그.
    console.log('ErrorBoundary:', error?.message, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>문제가 발생했어요</Text>
          <Text style={styles.desc}>일시적인 오류예요.{'\n'}다시 시도해 주세요.</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontSize: font.h2, fontWeight: 'bold', color: colors.text, marginBottom: spacing.sm },
  desc: { fontSize: font.body, color: colors.textSub, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
});
