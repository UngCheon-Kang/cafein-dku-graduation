import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset } from '../api';
import { colors, spacing, radius, font } from '../theme';

const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export default function PasswordResetScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: 이메일, 2: 코드 확인, 3: 새 비밀번호
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  // 남은 시간 카운트다운 (백엔드 코드 유효시간 5분과 동일)
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0]);

  const pwValid = PW_REGEX.test(newPassword);
  const pwMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const sendCode = async () => {
    if (!email.trim()) return Alert.alert('알림', '이메일을 입력해주세요.');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      Alert.alert('안내', '가입된 이메일이면 인증코드를 보냈어요.');
      setStep(2);
      setSecondsLeft(300);
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await requestPasswordReset(email.trim());
      Alert.alert('재발송', '인증코드를 다시 보냈어요.');
      setSecondsLeft(300);
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setResending(false);
    }
  };

  const verify = async () => {
    if (code.trim().length !== 6) return Alert.alert('알림', '인증코드 6자리를 입력해주세요.');
    if (secondsLeft <= 0) return Alert.alert('알림', '인증코드가 만료됐어요. "인증코드 다시 받기"를 눌러주세요.');
    setLoading(true);
    try {
      await verifyPasswordResetCode(email.trim(), code.trim());
      setStep(3);
    } catch (e) {
      Alert.alert('인증 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!pwValid) return Alert.alert('알림', '비밀번호 조건을 확인해주세요.');
    if (!pwMatch) return Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
    setLoading(true);
    try {
      await confirmPasswordReset(email.trim(), code.trim(), newPassword);
      Alert.alert('완료', '비밀번호가 변경되었어요. 다시 로그인해주세요.', [
        { text: '확인', onPress: () => navigation.replace('Login') },
      ]);
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.title}>비밀번호 재설정</Text>

        {step === 1 && (
          <>
            <Text style={styles.desc}>가입한 이메일을 입력하면 인증코드를 보내드려요.</Text>
            <AppTextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.btn} onPress={sendCode} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>인증코드 받기</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.desc}>{email} 로 보낸 6자리 인증코드를 입력하세요.</Text>
            <AppTextInput
              style={styles.input}
              placeholder="인증코드 6자리"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={[styles.timer, secondsLeft === 0 && styles.timerExpired]}>
              {secondsLeft > 0 ? `남은 시간 ${mmss}` : '인증코드가 만료됐어요'}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>인증코드 확인</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={resend} style={styles.linkBtn} disabled={resending}>
              <Text style={styles.link}>{resending ? '보내는 중...' : '인증코드 다시 받기'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep(1); setCode(''); }} style={styles.linkBtn}>
              <Text style={styles.linkMuted}>이메일 다시 입력</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.desc}>새 비밀번호를 입력하세요.</Text>
            <AppTextInput
              style={styles.input}
              placeholder="새 비밀번호"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={[styles.hint, newPassword.length === 0 ? styles.muted : pwValid ? styles.ok : styles.err]}>
              대소문자·숫자·특수문자(@$!%*?&#) 포함 8자 이상
            </Text>
            <AppTextInput
              style={styles.input}
              placeholder="새 비밀번호 확인"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && (
              <Text style={[styles.hint, pwMatch ? styles.ok : styles.err]}>
                {pwMatch ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.'}
              </Text>
            )}
            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>비밀번호 변경</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  title: { fontSize: font.h1, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.sm },
  desc: { fontSize: font.sub, color: colors.textSub, marginBottom: spacing.lg, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: 14, fontSize: font.body, color: colors.text,
    marginBottom: 6,
  },
  hint: { fontSize: font.caption, marginBottom: 16, marginLeft: 2 },
  timer: { fontSize: font.sub, color: colors.accent, fontWeight: 'bold', marginBottom: 16, marginLeft: 2 },
  timerExpired: { color: colors.danger },
  muted: { color: colors.textMuted },
  ok: { color: '#2E9E6B' },
  err: { color: colors.danger },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md, padding: 15,
    alignItems: 'center', marginTop: spacing.sm,
  },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  link: { color: colors.accent, fontSize: font.sub, fontWeight: 'bold' },
  linkMuted: { color: colors.textSub, fontSize: font.sub },
});
