import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { deleteAccount, getMyInfo } from '../api';
import { clearAuth } from '../auth';
import { colors, spacing, radius, font } from '../theme';

// 소셜 로그인 계정은 비밀번호가 없음 → 비번 확인 없이 탈퇴
const SOCIAL = ['KAKAO', 'APPLE', 'NAVER'];

export default function DeleteAccountScreen({ navigation }) {
  const [delPw, setDelPw] = useState('');
  const [provider, setProvider] = useState(null); // null = 아직 모름
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyInfo()
      .then((u) => setProvider(u?.provider ?? 'LOCAL'))
      .catch(() => setProvider('LOCAL')) // 못 가져오면 안전하게 비번 요구(기존 동작)
      .finally(() => setLoading(false));
  }, []);

  const isSocial = SOCIAL.includes(provider);

  const doDelete = async () => {
    try {
      await deleteAccount(isSocial ? undefined : delPw);
      await clearAuth();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert('실패', e.message);
    }
  };

  const handleDelete = () => {
    if (!isSocial && !delPw) {
      Alert.alert('알림', '비밀번호를 입력해주세요.');
      return;
    }
    Alert.alert('회원 탈퇴', '정말 탈퇴하시겠습니까? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.warn}>탈퇴하면 계정과 작성한 내용을 되돌릴 수 없어요.</Text>

      {isSocial ? (
        <Text style={styles.socialNote}>
          소셜 로그인으로 가입한 계정이에요. 아래 버튼을 누르면 바로 탈퇴 처리됩니다.
        </Text>
      ) : (
        <>
          <Text style={styles.label}>비밀번호 확인</Text>
          <AppTextInput
            style={styles.input}
            value={delPw}
            onChangeText={setDelPw}
            secureTextEntry
            placeholder="비밀번호"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>회원 탈퇴</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  warn: { fontSize: font.sub, color: colors.textSub, marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  socialNote: { fontSize: font.body, color: colors.text, marginBottom: spacing.lg, lineHeight: 22 },
  label: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, fontSize: font.body, color: colors.text },
  deleteBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.lg },
  deleteText: { color: colors.danger, fontSize: font.body, fontWeight: 'bold' },
});
