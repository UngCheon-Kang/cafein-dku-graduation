import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { changePassword } from '../api';
import { colors, spacing, radius, font } from '../theme';

export default function PasswordChangeScreen({ navigation }) {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const handleSave = async () => {
    if (!curPw || !newPw) { Alert.alert('알림', '현재/새 비밀번호를 입력해주세요.'); return; }
    try {
      await changePassword(curPw, newPw);
      Alert.alert('완료', '비밀번호가 변경되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('실패', e.message); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>현재 비밀번호</Text>
      <AppTextInput style={styles.input} value={curPw} onChangeText={setCurPw} secureTextEntry placeholder="현재 비밀번호" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>새 비밀번호</Text>
      <AppTextInput style={styles.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="새 비밀번호" placeholderTextColor={colors.textMuted} />
      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>비밀번호 변경</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, fontSize: font.body, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.lg },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
});