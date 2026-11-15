import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { getMyInfo, updateNickname } from '../api';
import { updateStoredUser } from '../auth';
import { colors, spacing, radius, font } from '../theme';

export default function NicknameEditScreen({ navigation }) {
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    getMyInfo().then((me) => setNickname(me?.nickname ?? '')).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!nickname.trim()) { Alert.alert('알림', '닉네임을 입력해주세요.'); return; }
    try {
      const trimmed = nickname.trim();
      await updateNickname(trimmed);
      // 저장소의 유저 정보도 즉시 갱신 (앱 재시작 없이 반영되게)
      await updateStoredUser({ nickname: trimmed });
      Alert.alert('완료', '닉네임이 변경되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('실패', e.message); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>닉네임</Text>
      <AppTextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        maxLength={20}
        placeholder="닉네임"
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>저장</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, fontSize: font.body, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.lg },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
});