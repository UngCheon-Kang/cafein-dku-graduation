import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { toJpeg } from '../imageUtils';
import { getMyInfo, updateProfileImage, getUnreadCount, logoutApi } from '../api';
import { clearAuth, getToken } from '../auth';
import AppHeader from '../components/AppHeader';
import { colors, spacing, radius, font, shadow } from '../theme';

export default function MyPageScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getToken().then((token) => {
      if (!token) {
        setIsGuest(true);
        setLoading(false);
        return;
      }
      getMyInfo()
        .then((data) => setMe(data))
        .catch((e) => console.log('내 정보 로드 실패:', e.message))
        .finally(() => setLoading(false));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getToken().then((token) => {
        if (!token) return;
        // 화면에 다시 들어올 때마다 내 정보 새로고침 (닉네임 변경 즉시 반영)
        getMyInfo()
          .then((data) => setMe(data))
          .catch(() => {});
        getUnreadCount()
          .then((data) => setUnread(data.count ?? 0))
          .catch(() => {});
      });
    }, [])
  );

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      const jpegUri = await toJpeg(asset.uri, { width: asset.width, height: asset.height });
      const updated = await updateProfileImage(jpegUri, 'image/jpeg');
      setMe(updated);
    } catch (e) {
      Alert.alert('실패', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    await clearAuth();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const MenuRow = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ marginHorizontal: -20 }}>
          <AppHeader title="마이페이지" />
        </View>
        <View style={styles.guestBox}>
          <Text style={styles.guestText}>로그인이 필요해요</Text>
          <TouchableOpacity style={styles.guestLoginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.guestLoginText}>로그인 / 회원가입</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ marginHorizontal: -20 }}>
        <AppHeader title="마이페이지" />
      </View>

      <View style={styles.profileBox}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : me ? (
          <>
            <TouchableOpacity onPress={pickProfileImage} disabled={uploading}>
              {me.profileImageUrl ? (
                <Image source={{ uri: me.profileImageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>{me.nickname?.[0] ?? '?'}</Text>
                </View>
              )}
              {uploading && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color={colors.white} />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <Text style={styles.nickname}>{me.nickname}</Text>
            <Text style={styles.sub}>{me.email}</Text>
          </>
        ) : (
          <Text style={styles.sub}>정보를 불러오지 못했습니다.</Text>
        )}
      </View>

      <MenuRow icon="document-text-outline" label="내가 쓴 글" onPress={() => navigation.navigate('MyFeeds')} />
      <MenuRow icon="bookmark-outline" label="북마크한 카페" onPress={() => navigation.navigate('MyBookmarks')} />
      <MenuRow icon="star-outline" label="내가 쓴 리뷰" onPress={() => navigation.navigate('MyReviews')} />
      <MenuRow icon="chatbubble-outline" label="내가 쓴 댓글" onPress={() => navigation.navigate('MyComments')} />
      <MenuRow icon="person-circle-outline" label="계정 관리" onPress={() => navigation.navigate('Account')} />
      <MenuRow icon="person-remove-outline" label="차단 목록" onPress={() => navigation.navigate('BlockList')} />
      <MenuRow icon="settings-outline" label="설정" onPress={() => navigation.navigate('Settings')} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingBottom: 90 },
  title: {
    fontSize: font.h1,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  profileBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 32, fontWeight: 'bold' },
  avatarLoading: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nickname: { fontSize: font.h2, fontWeight: 'bold', color: colors.primary },
  sub: { fontSize: font.sub, color: colors.textSub, marginTop: 6 },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  logoutText: { color: colors.textMuted, fontSize: font.sub },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: font.body, color: colors.text },
  guestBox: { alignItems: 'center', marginTop: 60 },
  guestText: { fontSize: font.body, color: colors.textSub, marginBottom: 20 },
  guestLoginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radius.md,
  },
  guestLoginText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
});