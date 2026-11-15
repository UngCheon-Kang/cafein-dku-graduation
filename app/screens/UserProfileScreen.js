import { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import HeaderButton from '../components/HeaderButton';
import { timeAgo } from '../utils';
import {
  getUserProfile,
  getMyFeeds,
  getMyComments,
  getMyBlocks,
  blockUser,
  unblockUser,
  createChatRoom,
} from '../api';
import { getUser } from '../auth';
import { colors, spacing, radius, font, shadow } from '../theme';
import ReportSheet from '../components/ReportSheet';
import ImageViewerModal from '../components/ImageViewerModal';


const TYPE_LABEL = { FREE: '자유', CAFE_REC: '카페추천', STUDY: '스터디모집' };

export default function UserProfileScreen({ route, navigation }) {
  const { userId, nickname } = route.params;

  const [feeds, setFeeds] = useState([]);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState('feeds');
  const [displayNick, setDisplayNick] = useState(nickname ?? '');
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: nickname ?? '프로필' });
  }, [nickname]);

  useEffect(() => {
    const isMeNow = myUserId != null && userId === myUserId;
    navigation.setOptions({
      headerRight: () =>
        isMeNow ? null : (
          <HeaderButton onPress={() => setReportTarget({ type: 'USER', id: userId })}>
            <Ionicons name="flag-outline" size={20} color={colors.danger} />
          </HeaderButton>
        ),
    });
  }, [myUserId, userId]);

  const load = useCallback(() => {
    getUser().then((u) => setMyUserId(u?.userId));
    Promise.all([
      getUserProfile(userId),
      getMyFeeds(userId),
      getMyComments(userId),
      getMyBlocks(),
    ])
      .then(([profile, userFeeds, userComments, blocks]) => {
        setDisplayNick(profile?.nickname ?? nickname ?? '');
        setProfileImageUrl(profile?.profileImageUrl ?? null);
        setFeeds(userFeeds?.content ?? []);
        setComments(userComments?.content ?? []);
        setIsBlocked(blocks.some((b) => b.blockedUserId === userId));
      })
      .catch((e) => console.log('프로필 로드 실패:', e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await unblockUser(userId);
        setIsBlocked(false);
        Alert.alert('완료', '차단을 해제했습니다.');
      } else {
        await blockUser(userId);
        setIsBlocked(true);
        Alert.alert('완료', '차단했습니다. 이 사용자의 글·댓글이 보이지 않습니다.');
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleChat = async () => {
    try {
      const room = await createChatRoom(userId);
      navigation.navigate('ChatRoom', { roomId: room.roomId, partnerNickname: displayNick, partnerId: userId });
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const renderFeed = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('FeedDetail', { feedId: item.id })}
    >
      <View style={styles.itemTop}>
        <Text style={styles.badge}>{TYPE_LABEL[item.feedType]}</Text>
        <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
      </View>
      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
        <Text style={styles.meta}> {item.likeCount}</Text>
      </View>
    </TouchableOpacity>
  );

  // 내가 댓글 단 피드 (중복 제거 + 최신순) → '작성한 글'과 같은 카드로 쓰려고 피드 모양으로 변환
  const commentedFeeds = Object.values(
    comments.reduce((acc, c) => {
      const prev = acc[c.feedId];
      if (!prev || new Date(c.createdAt) > new Date(prev.createdAt)) acc[c.feedId] = c;
      return acc;
    }, {})
  )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((c) => ({
      id: c.feedId,
      feedType: c.feedType,
      title: c.feedTitle,
      likeCount: c.likeCount,
      createdAt: c.createdAt,
    }));

  const renderComment = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('FeedDetail', { feedId: item.feedId })}
    >
      <View style={styles.feedRow}>
        <Ionicons name="chatbubble-outline" size={13} color={colors.textSub} />
        <Text style={styles.commentFeed} numberOfLines={1}>{item.feedTitle}</Text>
      </View>
      <Text style={styles.meta}>댓글 단 글 · {timeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isMe = myUserId != null && userId === myUserId;

  const header = (
    <View style={styles.profileBox}>
      {profileImageUrl ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setViewerOpen(true)}>
          <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarLetter}>{displayNick?.[0] ?? '?'}</Text>
        </View>
      )}

      <Text style={styles.nick}>{displayNick}</Text>

      {!isMe && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <Text style={styles.chatText}>채팅하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.blockBtn, isBlocked && styles.unblockBtn]}
            onPress={handleBlock}
          >
            <Ionicons
              name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'}
              size={15}
              color={isBlocked ? colors.textSub : colors.text}
            />
            <Text style={[styles.blockText, isBlocked && styles.unblockText]}>
              {isBlocked ? '차단 해제' : '차단하기'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('feeds')} style={styles.tabBtn}>
          <Text style={[styles.tabText, tab === 'feeds' && styles.tabActive]}>
            작성한 글 {feeds.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('comments')} style={styles.tabBtn}>
          <Text style={[styles.tabText, tab === 'comments' && styles.tabActive]}>
            댓글 단 글 {commentedFeeds.length}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={tab === 'feeds' ? feeds : commentedFeeds}
        renderItem={renderFeed}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'feeds' ? '작성한 글이 없습니다.' : '댓글 단 글이 없습니다.'}
          </Text>
        }
        contentContainerStyle={{ padding: spacing.lg }}
      />
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />

      <ImageViewerModal
        visible={viewerOpen}
        images={profileImageUrl ? [profileImageUrl] : []}
        onClose={() => setViewerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  profileBox: { marginBottom: spacing.sm, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 32, fontWeight: 'bold' },
  nick: { fontSize: font.h1, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  chatBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  chatText: { color: colors.text, fontSize: font.sub, fontWeight: 'bold' },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  blockText: { color: colors.text, fontSize: font.sub, fontWeight: 'bold' },
  unblockBtn: { borderColor: colors.border },
  unblockText: { color: colors.textSub },
  tabRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: { paddingBottom: 10 },
  tabText: { fontSize: font.sub, color: colors.textSub },
  tabActive: { color: colors.primary, fontWeight: 'bold' },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    fontSize: font.caption,
    color: colors.chipText,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  itemTitle: { fontSize: font.h3, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  commentFeed: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, flex: 1 },
  commentText: { fontSize: font.body, color: colors.text, marginBottom: 4, lineHeight: 20 },
  meta: { fontSize: font.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});