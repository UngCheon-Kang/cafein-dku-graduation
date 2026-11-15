import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,

  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
  StyleSheet,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Client } from '@stomp/stompjs';
import { getChatMessages, markChatRead, getUserProfile, getChatRooms } from '../api';
import { getToken, getUser } from '../auth';
import { colors, radius, font } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import ReportSheet from '../components/ReportSheet';
import HeaderButton from '../components/HeaderButton';
import { parseServerDate } from '../utils';
import { WS_URL } from '../config';
import { useChatUnread } from '../ChatUnreadContext';

// 채팅 시간 포맷 (오전/오후 h:mm) — 서버 시간 UTC 보정 적용
const fmtChatTime = (iso) => {
  const d = parseServerDate(iso);
  if (!d || isNaN(d)) return '';
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `${ampm} ${h}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, partnerNickname, partnerLastReadAt, partnerId } = route.params;
  const insets = useSafeAreaInsets();
  const { refresh: refreshChatUnread } = useChatUnread();

  const [messages, setMessages] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  // 상대가 마지막으로 읽은 시각 (이보다 최신인 내 메시지는 "1")
  const [partnerReadAt, setPartnerReadAt] = useState(partnerLastReadAt ?? null);
  const [reportTarget, setReportTarget] = useState(null);
  const [partnerSuspended, setPartnerSuspended] = useState(false);
  const [partnerProfileUrl, setPartnerProfileUrl] = useState(null);
   useEffect(() => {
    if (!partnerId) return;
    getUserProfile(partnerId)
      .then((p) => {
        setPartnerSuspended(!!p?.suspended);
        const url = p?.profileImageUrl ?? null;
        if (url) {
          // 이미지를 미리 캐시한 뒤 상태 세팅 → 말풍선 프사가 하나씩 뜨지 않고 한 번에
          Image.prefetch(url).finally(() => setPartnerProfileUrl(url));
        } else {
          setPartnerProfileUrl(null);
        }
      })
      .catch(() => {});
  }, [partnerId]);

  // 키보드 높이 측정 (edge-to-edge 대응)
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const clientRef = useRef(null);
  const listRef = useRef(null);
  const myUserIdRef = useRef(null);
  const messagesRef = useRef([]);

  // 최신 값들을 ref에도 담아둠 (구독 콜백은 오래된 state를 봄)
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() =>
            partnerId && navigation.navigate('UserProfile', { userId: partnerId, nickname: partnerNickname })
          }
        >
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.primary }}>
            {partnerNickname ?? '채팅'}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <HeaderButton onPress={() => setReportTarget({ type: 'CHAT_ROOM', id: roomId })}>
          <Ionicons name="flag-outline" size={20} color={colors.danger} />
        </HeaderButton>
      ),
    });
  }, [partnerNickname, partnerId, roomId]);

  // 이력 로드 + 읽음 처리
  useEffect(() => {
    getUser().then((u) => setMyUserId(u?.userId));
    getChatMessages(roomId)
      .then((data) => setMessages(data))
      .catch((e) => console.log('메시지 로드 실패:', e.message))
      .finally(() => setLoading(false));
    markChatRead(roomId)
      .then(() => refreshChatUnread())   // 읽는 즉시 하단 탭 배지 갱신(지연 제거)
      .catch(() => {});
    // 상대 읽음 시각을 route로 못 받았으면(예: 스터디 관리에서 진입) 서버에서 채워옴
    // → 안 그러면 이미 읽은 내 메시지에도 "1"이 잘못 표시됨
    if (partnerLastReadAt == null) {
      getChatRooms()
        .then((rooms) => {
          const r = rooms?.find((x) => x.roomId === roomId);
          if (r?.partnerLastReadAt) setPartnerReadAt(r.partnerLastReadAt);
        })
        .catch(() => {});
    }
  }, [roomId]);

  // WebSocket 연결 + 방 구독
  useEffect(() => {
    let client;
    let cancelled = false;   // 연결 준비 도중 화면을 벗어나면 활성화하지 않기 위한 가드
    (async () => {
      try {
        const me = await getUser();
        const myId = me?.userId;
        if (cancelled) return;
        client = new Client({
          brokerURL: WS_URL,
          reconnectDelay: 3000,
          // 매 (재)연결 직전에 저장소의 최신 토큰을 다시 읽어 헤더에 세팅
          // → 재발급/회전된 토큰이 재연결에도 반영됨 (옛 토큰 고정 문제 해결)
          beforeConnect: async () => {
            const fresh = await getToken();
            client.connectHeaders = { Authorization: `Bearer ${fresh}` };
          },
          forceBinaryWSFrames: true,
          appendMissingNULLonIncoming: true,
          onConnect: () => {
            // 개인 에러 토픽 구독 (rate limit 등 서버 에러 알림)
            if (myId) {
              client.subscribe(`/topic/user/${myId}`, (message) => {
                try {
                  const body = JSON.parse(message.body);
                  if (body.error === 'ERROR' && body.message) {
                    Alert.alert('알림', body.message);
                  }
                } catch {}
              });
            }
            client.subscribe(`/topic/room/${roomId}`, (message) => {
              const body = JSON.parse(message.body);

              // 읽음 신호
              if (body.type === 'READ') {
                // 상대가 읽었으면 → 현재까지의 내 메시지 읽음 처리
                if (body.readerId !== myUserIdRef.current) {
                  const arr = messagesRef.current;
                  if (arr.length > 0) {
                    setPartnerReadAt(arr[arr.length - 1].createdAt);
                  }
                }
                return;
              }

              // 새 메시지
              if (body.messageId) {
                setMessages((prev) => [...prev, body]);
                // 상대가 보낸 메시지면 읽음 처리 (상대 "1" 지우기)
                if (body.senderId !== myUserIdRef.current) {
                  markChatRead(roomId)
                    .then(() => refreshChatUnread())
                    .catch(() => {});
                }
              }
            });
          },
          onStompError: (frame) => console.log('STOMP 에러:', frame.headers?.message),
          onWebSocketError: (e) => console.log('WS 에러:', e?.message),
          onWebSocketClose: (e) => console.log('WS 닫힘:', e?.code, e?.reason),
        });
        if (cancelled) return;   // 생성 사이 언마운트됐으면 연결 안 함
        client.activate();
        clientRef.current = client;
      } catch (err) {
        console.log('WS 초기화 에러:', err?.message);
      }
    })();

    return () => {
      cancelled = true;
      // 로컬 client를 직접 정리 (clientRef가 아직 세팅 전이어도 확실히 해제 → 연결 누수 방지)
      client?.deactivate();
      clientRef.current = null;
    };
  }, [roomId]);

  const handleSend = () => {
    if (partnerSuspended) return;
    const text = input.trim();
    if (!text || !clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: '/app/chat',
      body: JSON.stringify({ roomId, content: text }),
    });
    setInput('');
  };

  const renderItem = ({ item }) => {
    const mine = item.senderId === myUserId;
    // 내 메시지인데 상대가 아직 안 읽었으면 "1"
    const unread = mine && (!partnerReadAt || item.createdAt > partnerReadAt);
    return (
      <View style={[styles.row, mine ? styles.rowRight : styles.rowLeft]}>
        {!mine && (
          partnerProfileUrl ? (
            <Image source={{ uri: partnerProfileUrl }} style={styles.chatAvatar} />
          ) : (
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarLetter}>{partnerNickname?.[0] ?? '?'}</Text>
            </View>
          )
        )}
        {mine && (
          <View style={styles.metaMine}>
            {unread && <Text style={styles.unread}>1</Text>}
            <Text style={styles.time}>{fmtChatTime(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={mine ? styles.textMine : styles.textTheirs}>{item.content}</Text>
        </View>
        {!mine && <Text style={[styles.time, styles.timeTheirs]}>{fmtChatTime(item.createdAt)}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B2C24" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: kbHeight }]}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.messageId.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>첫 메시지를 보내보세요.</Text>}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {partnerSuspended ? (
          <View style={styles.suspendedBar}>
            <Text style={styles.suspendedText}>정지된 사용자입니다. 메시지를 보낼 수 없어요.</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <AppTextInput
              style={styles.input}
              placeholder="메시지를 입력하세요"
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendText}>전송</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  row: { marginBottom: 10, flexDirection: 'row', alignItems: 'flex-end' },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarLetter: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  textMine: { color: colors.white, fontSize: font.body },
  textTheirs: { color: colors.text, fontSize: font.body },
  unread: { fontSize: 11, color: colors.accent, fontWeight: 'bold' },
  metaMine: { alignItems: 'flex-end', justifyContent: 'flex-end', marginRight: 4 },
  time: { fontSize: 10, color: colors.textMuted },
  timeTheirs: { marginLeft: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: font.body,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontWeight: 'bold' },
  suspendedBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
  },
  suspendedText: { color: colors.textSub, fontSize: font.sub },
});