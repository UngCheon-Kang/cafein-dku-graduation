import { useState, useEffect } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { login, loginKakao, loginApple } from '../api';
import { saveAuth } from '../auth';
import { colors, spacing, radius, font } from '../theme';
import { login as kakaoSDKLogin } from '@react-native-seoul/kakao-login';


export default function LoginScreen({ route, navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 회원가입 완료 후 넘어오면 가입한 이메일 채워두기
  const signupEmail = route.params?.email;
  useEffect(() => {
    if (signupEmail) {
      setEmail(signupEmail);
      setPassword('');
    }
  }, [signupEmail]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, password);
      await saveAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        nickname: data.nickname,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      Alert.alert('로그인 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      // 1) 카카오 SDK로 로그인 → 카카오 access token 받기
      const token = await kakaoSDKLogin();
      // 2) 그 토큰을 백엔드로 → 우리 JWT 받기
      const data = await loginKakao(token.accessToken);
      await saveAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        nickname: data.nickname,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      // 사용자가 취소한 경우는 조용히 넘김
      if (e?.message?.includes('cancel') || e?.code === 'E_CANCELLED_OPERATION') {
        // 취소 — 무시
      } else {
        Alert.alert('카카오 로그인 실패', e.message ?? '다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      // 1) Apple 네이티브 로그인 → identity token(JWT) 받기
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // 이름은 '최초 로그인' 때만 옴 (성+이름). 이후엔 null → 백엔드가 기본 닉네임 처리
      const fullName = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName]
            .filter(Boolean)
            .join('')
        : null;
      // 2) 그 토큰을 백엔드로 → 우리 JWT 받기
      const data = await loginApple(credential.identityToken, fullName);
      await saveAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        nickname: data.nickname,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      // 사용자가 취소한 경우는 조용히 넘김
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        // 취소 — 무시
      } else {
        Alert.alert('애플 로그인 실패', e?.message ?? '다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
      <Text style={styles.logo}>CAFE<Text style={{ color: colors.accent }}>IN</Text></Text>
      <Text style={styles.subtitle}>카공하기 좋은 카페를 찾아보세요</Text>

      <AppTextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.pwWrap}>
        <AppTextInput
          style={styles.pwInput}
          placeholder="비밀번호"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.pwEye}
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin} disabled={loading}>
        <Image source={require('../assets/kakao.png')} style={styles.btnIcon} resizeMode="contain" />
        <Text style={styles.kakaoButtonText}>카카오 로그인</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.appleButton} onPress={handleAppleLogin} disabled={loading}>
          <Ionicons name="logo-apple" size={20} color="#fff" style={{ marginTop: -2 }} />
          <Text style={styles.appleButtonText}>Apple로 로그인</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>회원가입</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('PasswordReset')}>
        <Text style={styles.forgotLink}>비밀번호를 잊으셨나요?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}>
        <Text style={styles.guestLink}>로그인 없이 둘러보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoIcon: { alignSelf: 'center', marginBottom: 8 },
  logoImg: { width: 92, height: 92, alignSelf: 'center', marginBottom: 6 },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: font.sub,
    textAlign: 'center',
    color: colors.textSub,
    marginTop: 8,
    marginBottom: 40,
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
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  pwInput: {
    flex: 1,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
  },
  pwEye: { paddingHorizontal: 14, paddingVertical: 10 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  buttonText: { color: colors.white, fontSize: font.h3, fontWeight: '700' },
  link: {
    textAlign: 'center',
    color: colors.accent,
    fontWeight: 'bold',
    marginTop: 20,
    fontSize: font.sub,
  },
  guestLink: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 12,
    fontSize: font.sub,
  },
   forgotLink: {
    textAlign: 'center',
    color: colors.textSub,
    marginTop: 12,
    fontSize: font.sub,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  kakaoButtonText: { color: '#191600', fontSize: font.h3, fontWeight: '700' },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  appleButtonText: { color: '#FFFFFF', fontSize: font.h3, fontWeight: '700' },
  btnIcon: { width: 20, height: 20 },
});