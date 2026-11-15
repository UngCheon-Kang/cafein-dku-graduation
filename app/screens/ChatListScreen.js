import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getChatRooms, leaveChatRoom } from '../api';
import SwipeToDelete from '../components/SwipeToDelete';
import { getToken } from '../auth';
import { timeAgo } from '../utils';
import AppHeader from '../components/AppHeader';
import { colors, spacing, radius, font } from '../theme';
import { useChatUnread } from '../ChatUnreadContext';

export default function ChatListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const { setChatUnread } = useChatUnread();

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const load = async () => {
        const token = await getToken();
        if (!alive) return;
        if (!token) {
          setIsGuest(true);
          setLoading(false);
          setChatUnread(0);
          return;
        }
        setIsGuest(false);
        try {
          const data = await getChatRooms();
          if (!alive) return;
          setRooms(data);
          // 하단 탭 배지도 목록과 동시에 갱신
          const total = data.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
          setChatUnread(total);
        } catch (e) {
          console.log('채팅방 로드 실패:', e.message);
        } finally {
          if (alive) setLoading(false);
        }
      };

      load();
      // 이 화면에 머무는 동안 주기적으로 새로고침 → 새 톡 오면 목록/배지 실시간 반영
      const id = setInterval(load, 5000);
      return () => { alive = false; clearInterval(id); };
    }, [setChatUnread])
  );

  const handleLeave = (roomId) => {
    Alert.alert('채팅방 나가기', '이 채팅방을 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveChatRoom(roomId);
            setRooms((prev) => {
              const next = prev.filter((r) => r.roomId !== roomId);
              // 나간 방에 안읽음이 있었으면 하단 배지도 즉시 반영
              setChatUnread(next.reduce((sum, r) => sum + (r.unreadCount || 0), 0));
              return next;
            });
          } catch (e) {
            Alert.alert('실패', e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <SwipeToDelete actionLabel="나가기" onAction={() => handleLeave(item.roomId)}>
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        navigation.navigate('ChatRoom', {
          roomId: item.roomId,
          partnerNickname: item.partnerNickname,
          partnerLastReadAt: item.partnerLastReadAt,
          partnerId: item.partnerId,
        })
      }
    >
      {item.partnerProfileImageUrl ? (
        <Image source={{ uri: item.partnerProfileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{item.partnerNickname?.[0] ?? '?'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.itemTop}>
          <Text style={styles.nick} numberOfLines={1}>{item.partnerNickname}</Text>
          {item.lastMessageAt ? <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text> : null}
        </View>
        <View style={styles.itemBottom}>
          <Text style={styles.last} numberOfLines={1}>
            {item.lastMessage ?? '대화를 시작해보세요'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
    </SwipeToDelete>
  );

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="채팅" />
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
      <AppHeader title="채팅" />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderItem}
          keyExtractor={(item) => item.roomId.toString()}
          ListEmptyComponent={<Text style={styles.empty}>채팅방이 없습니다.</Text>}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: colors.white, fontSize: font.h3, fontWeight: 'bold' },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nick: { fontSize: font.body, fontWeight: 'bold', color: colors.primary, flex: 1, marginRight: 8 },
  time: { fontSize: font.caption, color: colors.textMuted },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  last: { fontSize: font.sub, color: colors.textSub, flex: 1 },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
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