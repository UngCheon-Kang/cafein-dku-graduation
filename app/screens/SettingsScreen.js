import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logoutApi } from '../api';
import { clearAuth } from '../auth';
import { colors, spacing, radius, font, shadow } from '../theme';
import appJson from '../app.json';

const VERSION = appJson?.expo?.version ?? '1.0.0';
const BUILD = appJson?.expo?.ios?.buildNumber ?? '';
const VERSION_LABEL = BUILD ? `${VERSION} (${BUILD})` : VERSION;

const SUPPORT_EMAIL = 'zh938002@gmail.com';
const TERMS_URL = 'https://crccafe.com/terms.html';
const PRIVACY_URL = 'https://crccafe.com/privacy.html';

export default function SettingsScreen({ navigation }) {
  const openUrl = (url) =>
    Linking.openURL(url).catch(() => Alert.alert('오류', '페이지를 열 수 없어요.'));

  const openNotificationSettings = () =>
    Linking.openSettings().catch(() => Alert.alert('오류', '설정을 열 수 없어요.'));

  const contact = () => {
    const subject = '[CAFEIN] Feedback';
    const body =
      `- Application Name : CAFEIN\n` +
      `- iOS version : ${Platform.OS === 'ios' ? Platform.Version : Platform.OS}\n` +
      `- App version : ${VERSION_LABEL}\n` +
      `✓ 이슈나 제안사항을 아래에 작성해주세요.\n` +
      `도움주셔서 감사합니다. 🤗\n` +
      `(Please describe your issue or feedback below.)\n` +
      `==============================\n\n`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert('메일 앱을 열 수 없어요', `문의: ${SUPPORT_EMAIL}`));
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try { await logoutApi(); } catch {}
          await clearAuth();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const Row = ({ icon, label, onPress, value, danger }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
        <Text style={[styles.label, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      {value != null ? (
        <Text style={styles.value}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.section}>일반</Text>
      <View style={styles.card}>
        <Row icon="notifications-outline" label="알림 설정" onPress={openNotificationSettings} />
      </View>

      <Text style={styles.section}>약관 · 정보</Text>
      <View style={styles.card}>
        <Row icon="shield-checkmark-outline" label="개인정보 처리방침" onPress={() => openUrl(PRIVACY_URL)} />
        <View style={styles.divider} />
        <Row icon="document-text-outline" label="서비스 이용약관" onPress={() => openUrl(TERMS_URL)} />
        <View style={styles.divider} />
        <Row icon="mail-outline" label="문의하기" onPress={contact} />
        <View style={styles.divider} />
        <Row icon="information-circle-outline" label="버전 정보" value={VERSION_LABEL} />
      </View>

      <Text style={styles.section}>계정</Text>
      <View style={styles.card}>
        <Row icon="log-out-outline" label="로그아웃" onPress={handleLogout} />
        <View style={styles.divider} />
        <Row icon="trash-outline" label="회원 탈퇴" danger onPress={() => navigation.navigate('DeleteAccount')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: font.sub, color: colors.textSub, fontWeight: '600', marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, marginHorizontal: 16, ...shadow.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: font.body, color: colors.text },
  value: { fontSize: font.sub, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
});
