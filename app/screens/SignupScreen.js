import { useState, useEffect } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { signup, verifySignup, resendCode, checkEmail, checkNickname } from '../api';
import { colors, spacing, radius, font } from '../theme';

const TERMS_URL = 'https://crccafe.com/terms.html';
const PRIVACY_URL = 'https://crccafe.com/privacy.html';

// 백엔드 규칙과 동일: 대/소문자·숫자·특수문자(@$!%*?&#) 포함 8자 이상
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPwCheck, setShowPwCheck] = useState(false);

  const [emailStatus, setEmailStatus] = useState(null); // null | 'ok' | 'taken' | 'invalid'
  const [nickStatus, setNickStatus] = useState(null);   // null | 'ok' | 'taken'
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingNick, setCheckingNick] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // 회원가입 동의 (필수 3개)
  const [agreeAge, setAgreeAge] = useState(false);           // [필수] 만 14세 이상
  const [agreeTerms, setAgreeTerms] = useState(false);       // [필수] 이용약관
  const [agreePrivacy, setAgreePrivacy] = useState(false);   // [필수] 개인정보 수집·이용
  const allRequiredAgreed = agreeAge && agreeTerms && agreePrivacy;
  const allAgreed = allRequiredAgreed;
  const toggleAll = () => {
    const next = !allAgreed;
    setAgreeAge(next); setAgreeTerms(next); setAgreePrivacy(next);
  };

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

  const pwValid = PW_REGEX.test(password);
  const pwMatch = passwordCheck.length > 0 && password === passwordCheck;

  // 입력이 바뀌면 이전 중복확인 결과 무효화
  const onEmailChange = (t) => { setEmail(t); setEmailStatus(null); };
  const onNickChange = (t) => { setNickname(t); setNickStatus(null); };

  const handleCheckEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(em)) { setEmailStatus('invalid'); return; }
    setCheckingEmail(true);
    try {
      const available = await checkEmail(em);
      setEmailStatus(available ? 'ok' : 'taken');
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleCheckNick = async () => {
    const nk = nickname.trim();
    if (!nk) return;
    setCheckingNick(true);
    try {
      const available = await checkNickname(nk);
      setNickStatus(available ? 'ok' : 'taken');
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setCheckingNick(false);
    }
  };

  const handleRequestCode = async () => {
    if (emailStatus !== 'ok') { Alert.alert('알림', '이메일 중복확인을 해주세요.'); return; }
    if (nickStatus !== 'ok') { Alert.alert('알림', '닉네임 중복확인을 해주세요.'); return; }
    if (!pwValid) { Alert.alert('알림', '비밀번호 조건을 확인해주세요.'); return; }
    if (!pwMatch) { Alert.alert('알림', '비밀번호가 서로 일치하지 않습니다.'); return; }
    if (!allRequiredAgreed) { Alert.alert('알림', '필수 약관에 모두 동의해주세요.'); return; }
    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, nickname.trim());
      Alert.alert('인증코드 발송', `${email}로 인증코드를 보냈어요.`);
      setStep(2);
      setSecondsLeft(300);
    } catch (e) {
      Alert.alert('실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('알림', '인증코드를 입력해주세요.');
      return;
    }
    if (secondsLeft <= 0) {
      Alert.alert('알림', '인증코드가 만료됐어요. "코드 재발송"을 눌러주세요.');
      return;
    }
    setLoading(true);
    try {
      const em = email.trim().toLowerCase();
      // 가입 완료 후 자동 로그인하지 않고 로그인 화면으로 (이메일은 채워서 넘김)
      await verifySignup(em, code.trim());
      Alert.alert('회원가입 완료', '가입이 완료됐어요. 로그인해주세요.', [
        { text: '확인', onPress: () => navigation.popTo('Login', { email: em }) },
      ]);
    } catch (e) {
      Alert.alert('인증 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode(email.trim().toLowerCase());
      Alert.alert('재발송', '인증코드를 다시 보냈어요.');
      setSecondsLeft(300);
    } catch (e) {
      Alert.alert('실패', e.message);
    }
  };

  // 동의 체크 한 줄
  const renderCheck = (checked, onToggle, label, required, viewUrl) => (
    <View style={styles.checkRow}>
      <TouchableOpacity style={styles.checkLeft} onPress={onToggle} activeOpacity={0.7} hitSlop={8}>
        <Ionicons
          name={checked ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={checked ? colors.accent : colors.textMuted}
        />
        <Text style={styles.checkLabel}>
          <Text style={required ? styles.reqTag : styles.optTag}>{required ? '[필수] ' : '[선택] '}</Text>
          {label}
        </Text>
      </TouchableOpacity>
      {viewUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(viewUrl)} hitSlop={8}>
          <Text style={styles.viewLink}>보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {step === 1 ? (
        <>
          <Text style={styles.title}>회원가입</Text>

          {/* 이메일 + 중복확인 */}
          <View style={styles.row}>
            <AppTextInput
              style={[styles.input, styles.rowInput]}
              placeholder="이메일"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.checkBtn} onPress={handleCheckEmail} disabled={checkingEmail}>
              {checkingEmail ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.checkBtnText}>중복확인</Text>
              )}
            </TouchableOpacity>
          </View>
          {emailStatus && (
            <Text style={[styles.hint, emailStatus === 'ok' ? styles.ok : styles.err]}>
              {emailStatus === 'ok'
                ? '사용 가능한 이메일이에요.'
                : emailStatus === 'taken'
                ? '이미 사용 중인 이메일이에요.'
                : '올바른 이메일 형식이 아니에요.'}
            </Text>
          )}

          {/* 닉네임 + 중복확인 */}
          <View style={styles.row}>
            <AppTextInput
              style={[styles.input, styles.rowInput]}
              placeholder="닉네임"
              placeholderTextColor={colors.textMuted}
              value={nickname}
              onChangeText={onNickChange}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.checkBtn} onPress={handleCheckNick} disabled={checkingNick}>
              {checkingNick ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.checkBtnText}>중복확인</Text>
              )}
            </TouchableOpacity>
          </View>
          {nickStatus && (
            <Text style={[styles.hint, nickStatus === 'ok' ? styles.ok : styles.err]}>
              {nickStatus === 'ok' ? '사용 가능한 닉네임이에요.' : '이미 사용 중인 닉네임이에요.'}
            </Text>
          )}

          {/* 비밀번호 + 조건 안내 */}
          <View style={styles.pwWrap}>
            <AppTextInput
              style={styles.pwInput}
              placeholder="비밀번호"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity style={styles.pwEye} onPress={() => setShowPw((v) => !v)} hitSlop={10}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.hint,
              password.length === 0 ? styles.muted : pwValid ? styles.ok : styles.err,
            ]}
          >
            대소문자·숫자·특수문자(@$!%*?&#) 포함 8자 이상
          </Text>

          {/* 비밀번호 확인 + 일치 표시 */}
          <View style={styles.pwWrap}>
            <AppTextInput
              style={styles.pwInput}
              placeholder="비밀번호 확인"
              placeholderTextColor={colors.textMuted}
              value={passwordCheck}
              onChangeText={setPasswordCheck}
              secureTextEntry={!showPwCheck}
            />
            <TouchableOpacity style={styles.pwEye} onPress={() => setShowPwCheck((v) => !v)} hitSlop={10}>
              <Ionicons name={showPwCheck ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {passwordCheck.length > 0 && (
            <Text style={[styles.hint, pwMatch ? styles.ok : styles.err]}>
              {pwMatch ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.'}
            </Text>
          )}

          {/* 약관 동의 */}
          <View style={styles.agreeBox}>
            <TouchableOpacity style={styles.allAgreeRow} onPress={toggleAll} activeOpacity={0.7}>
              <Ionicons
                name={allAgreed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={allAgreed ? colors.accent : colors.textMuted}
              />
              <Text style={styles.allAgreeText}>전체 동의</Text>
            </TouchableOpacity>
            <View style={styles.agreeDivider} />
            {renderCheck(agreeAge, () => setAgreeAge((v) => !v), '만 14세 이상입니다', true, null)}
            {renderCheck(agreeTerms, () => setAgreeTerms((v) => !v), '이용약관 동의', true, TERMS_URL)}
            {renderCheck(agreePrivacy, () => setAgreePrivacy((v) => !v), '개인정보 수집·이용 동의', true, PRIVACY_URL)}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRequestCode} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>인증코드 받기</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.info}>
            {email}로 보낸{'\n'}6자리 인증코드를 입력하세요.
          </Text>
          <AppTextInput
            style={styles.input}
            placeholder="인증코드 6자리"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={[styles.timer, secondsLeft === 0 && styles.err]}>
            {secondsLeft > 0 ? `남은 시간 ${mmss}` : '인증코드가 만료됐어요'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>인증하고 가입 완료</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.link}>코드 재발송</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.link}>정보 다시 입력</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  title: {
    fontSize: font.h1,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
    marginBottom: 12,
  },
  // 비밀번호 칸 + 눈 아이콘 (LoginScreen과 동일)
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  pwInput: { flex: 1, padding: 14, fontSize: font.body, color: colors.text },
  pwEye: { paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  rowInput: { flex: 1, marginBottom: 0 },
  checkBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  checkBtnText: { color: colors.accent, fontSize: font.sub, fontWeight: 'bold' },
  hint: { fontSize: font.caption, marginTop: -4, marginBottom: 12, marginLeft: 4 },
  timer: { fontSize: font.sub, color: colors.accent, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
  muted: { color: colors.textMuted },
  ok: { color: '#2E9E6B' },
  err: { color: colors.danger },
  agreeBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  allAgreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  allAgreeText: { fontSize: font.body, fontWeight: 'bold', color: colors.primary },
  agreeDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  checkLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkLabel: { fontSize: font.sub, color: colors.textSub, flexShrink: 1 },
  reqTag: { color: colors.accent, fontWeight: 'bold' },
  optTag: { color: colors.textMuted, fontWeight: 'bold' },
  viewLink: { fontSize: font.caption, color: colors.textMuted, textDecorationLine: 'underline', paddingLeft: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: colors.white, fontSize: font.h3, fontWeight: 'bold' },
  info: {
    fontSize: font.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  link: {
    color: colors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
});
