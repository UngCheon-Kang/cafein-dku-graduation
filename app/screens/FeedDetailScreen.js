import { useState, useEffect } from 'react';
import {
  View,
  Text,

  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils';
import {
  getFeed, getComments, getReplies, createComment,
  likeFeed, unlikeFeed, deleteFeed, updateComment, deleteComment,
  applyStudy, cancelStudy, createChatRoom,
} from '../api';
import { getUser } from '../auth';
import { colors, spacing, radius, font } from '../theme';
import ReportSheet from '../components/ReportSheet';
import ImageViewerModal from '../components/ImageViewerModal';

const TYPE_LABEL = {
  FREE: '자유',
  CAFE_REC: '카페추천',
  STUDY: '스터디모집',
};

const isStudyClosed = (s) =>
  s?.status === 'CLOSED' || (s?.meetAt && new Date(s.meetAt) < new Date());

const formatMeetAt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${ampm} ${h}:${mm}`;
};

export default function FeedDetailScreen({ route, navigation }) {
  const { feedId } = route.params;

  const insets = useSafeAreaInsets();

  const [feed, setFeed] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [viewer, setViewer] = useState({ visible: false, images: [], index: 0 });

  const [threads, setThreads] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsLast, setCommentsLast] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentMenu, setCommentMenu] = useState(null); // 점3개 누른 댓글

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

  const loadFeed = () => {
    getFeed(feedId)
      .then((data) => setFeed(data))
      .catch((e) => console.log('상세 로드 실패:', e.message))
      .finally(() => setLoading(false));
  };

  const loadComments = async (page, reset) => {
    try {
      const { items, last } = await getComments(feedId, page);
      const enriched = items.map((t) => ({
        ...t,
        replyPage: null,
        repliesLast: true,
        loadingReplies: false,
      }));
      setThreads((prev) => (reset ? enriched : [...prev, ...enriched]));
      setCommentsPage(page);
      setCommentsLast(last);
    } catch (e) {
      console.log('댓글 로드 실패:', e.message);
    }
  };

  const loadMoreComments = () => {
    if (loadingMore || commentsLast) return;
    setLoadingMore(true);
    loadComments(commentsPage + 1, false).finally(() => setLoadingMore(false));
  };

  const updateThread = (commentId, patch) => {
    setThreads((prev) =>
      prev.map((t) => (t.comment.id === commentId ? { ...t, ...patch } : t))
    );
  };

  const loadMoreReplies = async (thread) => {
    const commentId = thread.comment.id;
    if (thread.loadingReplies) return;
    updateThread(commentId, { loadingReplies: true });
    try {
      if (thread.replyPage === null) {
        const { items, last } = await getReplies(commentId, 0);
        updateThread(commentId, {
          replies: items, replyPage: 0, repliesLast: last, loadingReplies: false,
        });
      } else {
        const next = thread.replyPage + 1;
        const { items, last } = await getReplies(commentId, next);
        updateThread(commentId, {
          replies: [...thread.replies, ...items],
          replyPage: next, repliesLast: last, loadingReplies: false,
        });
      }
    } catch (e) {
      updateThread(commentId, { loadingReplies: false });
      Alert.alert('오류', e.message);
    }
  };

  const reload = () => {
    loadFeed();
    loadComments(0, true);
  };

  useEffect(() => {
    getUser().then((u) => setMyUserId(u?.userId));
  }, []);

  useEffect(() => {
    loadFeed();
    setCommentsLoading(true);
    loadComments(0, true).finally(() => setCommentsLoading(false));
  }, [feedId]);

  const handleDelete = () => {
    Alert.alert('삭제', '이 게시글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeed(feedId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('실패', e.message);
          }
        },
      },
    ]);
  };

  const handleToggleLike = async () => {
    if (!feed) return;
    try {
      if (feed.isLiked) {
        await unlikeFeed(feed.id);
      } else {
        await likeFeed(feed.id);
      }
      setFeed({
        ...feed,
        isLiked: !feed.isLiked,
        likeCount: feed.likeCount + (feed.isLiked ? -1 : 1),
      });
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleToggleStudy = async () => {
    if (!feed.study) return;
    const applied =
      feed.study.myStatus === 'PENDING' || feed.study.myStatus === 'ACCEPTED';

    if (applied) {
      const msg =
        feed.study.myStatus === 'ACCEPTED'
          ? '참여를 취소하시겠어요? 자리가 다른 사람에게 넘어갈 수 있어요.'
          : '신청을 취소하시겠어요?';
      Alert.alert('취소', msg, [
        { text: '아니요', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelStudy(feed.study.id);
              loadFeed();
            } catch (e) {
              Alert.alert('오류', e.message);
            }
          },
        },
      ]);
      return;
    }

    try {
      await applyStudy(feed.study.id);
      loadFeed();
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleChat = async () => {
    try {
      const room = await createChatRoom(feed.userId);
      navigation.navigate('ChatRoom', {
        roomId: room.roomId,
        partnerNickname: feed.nickname,
        partnerId: feed.userId,
      });
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  // 프로필로 이동: 나면 마이페이지 탭, 남이면 유저 프로필
  const goProfile = (uid, nick) =>
    uid === myUserId
      ? navigation.navigate('Main', { screen: '마이페이지' })
      : navigation.navigate('UserProfile', { userId: uid, nickname: nick });

  const openReport = (targetType, targetId) => {
    setReportTarget({ type: targetType, id: targetId });
  };

  

  const handleDeleteComment = (commentId) => {
    Alert.alert('삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            reload();
          } catch (e) {
            Alert.alert('실패', e.message);
          }
        },
      },
    ]);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await updateComment(commentId, editText);
      setEditingId(null);
      setEditText('');
      reload();
    } catch (e) {
      Alert.alert('실패', e.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await createComment(feedId, input, replyTo?.id ?? null);
      setInput('');
      setReplyTo(null);
      reload();
    } catch (e) {
      Alert.alert('실패', e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!feed) {
    return (
      <View style={styles.center}>
        <Text>게시글을 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const header = (
    <View style={styles.feedBox}>
      <View style={styles.feedTop}>
        <View style={styles.authorRow}>
          <TouchableOpacity
            onPress={() => goProfile(feed.userId, feed.nickname)}
          >
            {feed.profileImageUrl ? (
              <Image source={{ uri: feed.profileImageUrl }} style={styles.smallAvatar} />
            ) : (
              <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
                <Text style={styles.smallAvatarLetter}>{feed.nickname?.[0] ?? '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.nickname} numberOfLines={1}>
            <Text
              style={styles.nickLink}
              onPress={() => goProfile(feed.userId, feed.nickname)}
            >
              {feed.nickname}
            </Text>
            {' · '}{timeAgo(feed.createdAt)}
          </Text>
          <Ionicons name="eye-outline" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
          <Text style={styles.viewCount}>{feed.viewCount}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.badge}>{TYPE_LABEL[feed.feedType]}</Text>
          <TouchableOpacity style={styles.kebab} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSub} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.title}>{feed.title}</Text>
      <Text style={styles.content}>{feed.content}</Text>

      {feed.imageUrls?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {feed.imageUrls.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setViewer({ visible: true, images: feed.imageUrls, index: idx })}
            >
              <Image source={{ uri: url }} style={styles.feedImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {feed.cafe && (
        <TouchableOpacity
          style={styles.cafeBox}
          onPress={() => navigation.navigate('CafeDetail', { cafeId: feed.cafe.id })}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.cafeNameRow}>
              <Ionicons name="cafe" size={15} color={colors.textSub} />
              <Text style={styles.cafeName} numberOfLines={1}>{feed.cafe.name}</Text>
            </View>
            <View style={styles.cafeMetaRow}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <Text style={styles.cafeMeta} numberOfLines={1}>
                {feed.cafe.score?.toFixed(1) ?? '-'} · {feed.cafe.address}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {feed.study && (
        <View style={styles.studyBox}>
          <View style={styles.studyRow}>
            <Ionicons name="location" size={15} color={colors.textSub} />
            <Text style={styles.studyText}>장소 · {feed.study.location}</Text>
          </View>
          <View style={styles.studyRow}>
            <Ionicons name="calendar" size={15} color={colors.textSub} />
            <Text style={styles.studyText}>일시 · {formatMeetAt(feed.study.meetAt)}</Text>
          </View>
          <View style={styles.studyRow}>
            <Ionicons name="people" size={15} color={colors.textSub} />
            <Text style={styles.studyText}>
              인원 · {feed.study.capacity}명 중 {feed.study.currentCount}명 모집됨
              {isStudyClosed(feed.study) ? ' (마감)' : ''}
            </Text>
          </View>

          {feed.userId === myUserId ? (
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() =>
                navigation.navigate('StudyApplicants', {
                  studyId: feed.study.id,
                  studyTitle: feed.title,
                })
              }
            >
              <Text style={styles.applyBtnText}>신청자 관리</Text>
            </TouchableOpacity>
          ) : feed.study.myStatus === 'ACCEPTED' ? (
            <View>
              <View style={styles.acceptedBanner}>
                <Text style={styles.acceptedBannerText}>✓ 참여 확정됐어요!</Text>
              </View>
              <TouchableOpacity
                style={[styles.applyBtn, styles.applyBtnCancel]}
                onPress={handleToggleStudy}
              >
                <Text style={styles.applyBtnText}>참여 취소</Text>
              </TouchableOpacity>
            </View>
          ) : feed.study.myStatus === 'PENDING' ? (
            <TouchableOpacity
              style={[styles.applyBtn, styles.applyBtnCancel]}
              onPress={handleToggleStudy}
            >
              <Text style={styles.applyBtnText}>수락 대기중 · 신청 취소</Text>
            </TouchableOpacity>
          ) : feed.study.myStatus === 'REJECTED' ? (
            <View style={[styles.applyBtn, styles.applyBtnDisabled]}>
              <Text style={styles.applyBtnText}>거절된 신청이에요</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyBtn,
                isStudyClosed(feed.study) && styles.applyBtnDisabled,
              ]}
              onPress={handleToggleStudy}
              disabled={isStudyClosed(feed.study)}
            >
              <Text style={styles.applyBtnText}>
                {isStudyClosed(feed.study) ? '모집 마감' : '신청하기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.likeRow} onPress={handleToggleLike}>
          <Ionicons
            name={feed.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={feed.isLiked ? colors.danger : colors.textSub}
          />
          <Text style={styles.likeCount}>{feed.likeCount}</Text>
        </TouchableOpacity>

        {feed.userId !== myUserId && feed.feedType === 'STUDY' && (
          <TouchableOpacity style={styles.chatPill} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.textSub} />
            <Text style={styles.chatBtnText}>작성자와 채팅</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.commentHeader}>댓글 {feed.commentCount}</Text>
    </View>
  );

  const renderCommentRow = (item, isReply) => {
    const isMine = item.userId === myUserId;
    const isDeleted = item.content === '삭제된 댓글입니다.';
    const isEditing = editingId === item.id;

    return (
      <View key={item.id} style={[styles.commentItem, isReply && styles.replyItem]}>
        <View style={styles.commentTop}>
          <TouchableOpacity
            style={styles.commentAuthor}
            activeOpacity={isDeleted ? 1 : 0.6}
            disabled={isDeleted}
            onPress={() => goProfile(item.userId, item.nickname)}
          >
            {isReply && <Text style={styles.commentNick}>↳ </Text>}
            {!isDeleted &&
              (item.profileImageUrl ? (
                <Image source={{ uri: item.profileImageUrl }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.smallAvatarPlaceholder]}>
                  <Text style={styles.commentAvatarLetter}>{item.nickname?.[0] ?? '?'}</Text>
                </View>
              ))}
            <Text style={styles.commentNick}>{item.nickname}</Text>
            {!isDeleted && item.createdAt && (
              <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
            )}
          </TouchableOpacity>
          {!isEditing && !isDeleted && (
            <TouchableOpacity style={styles.kebab} onPress={() => setCommentMenu(item)}>
              <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <AppTextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
            />
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.cmtBtn} onPress={() => handleUpdateComment(item.id)}>
                <Ionicons name="checkmark" size={14} color={colors.accent} />
                <Text style={[styles.cmtBtnText, { color: colors.accent }]}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cmtBtn} onPress={() => setEditingId(null)}>
                <Ionicons name="close" size={14} color={colors.textSub} />
                <Text style={styles.cmtBtnText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.commentContent}>{item.content}</Text>
        )}

        {!isEditing && !isReply && !isDeleted && (
          <TouchableOpacity
            style={styles.replyLink}
            onPress={() => setReplyTo({ id: item.id, nickname: item.nickname })}
          >
            <Ionicons name="arrow-undo-outline" size={13} color={colors.textSub} />
            <Text style={styles.cmtBtnText}>답글</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderThread = ({ item }) => {
    const shownReplies = item.replies || [];
    const remaining = item.replyCount - shownReplies.length;
    return (
      <View>
        {renderCommentRow(item.comment, false)}
        {shownReplies.map((reply) => renderCommentRow(reply, true))}
        {remaining > 0 && (
          <TouchableOpacity
            style={styles.moreReplies}
            onPress={() => loadMoreReplies(item)}
            disabled={item.loadingReplies}
          >
            <Text style={styles.moreRepliesText}>
              {item.loadingReplies ? '불러오는 중...' : `답글 ${remaining}개 더보기`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: kbHeight }]}>
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.comment.id.toString()}
          ListHeaderComponent={header}
          onEndReached={loadMoreComments}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            commentsLoading ? null : (
              <Text style={styles.empty}>첫 댓글을 남겨보세요.</Text>
            )
          }
          contentContainerStyle={{ padding: 16 }}
        />

        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>@{replyTo.nickname}에게 답글</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.replyCancel}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <AppTextInput
            style={styles.input}
            placeholder={replyTo ? '답글을 입력하세요' : '댓글을 입력하세요'}
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
            <Text style={styles.sendText}>{sending ? '...' : '전송'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 점3개 메뉴 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.modalSheet}>
            {feed.userId === myUserId ? (
              <>
                <TouchableOpacity style={styles.modalItem} onPress={() => { setMenuVisible(false); navigation.navigate('FeedWrite', { feed }); }}>
                  <Text style={styles.modalItemText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalItem} onPress={() => { setMenuVisible(false); handleDelete(); }}>
                  <Text style={[styles.modalItemText, { color: colors.danger }]}>삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setMenuVisible(false); openReport('FEED', feed.id); }}>
                <Text style={[styles.modalItemText, { color: colors.danger }]}>신고</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMenuVisible(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>    
      
      {/* 댓글 점3개 메뉴 */}
      <Modal
        visible={!!commentMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentMenu(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCommentMenu(null)}>
          <View style={styles.modalSheet}>
            {commentMenu?.userId === myUserId ? (
              <>
                <TouchableOpacity style={styles.modalItem} onPress={() => { const c = commentMenu; setCommentMenu(null); setEditingId(c.id); setEditText(c.content); }}>
                  <Text style={styles.modalItemText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalItem} onPress={() => { const id = commentMenu.id; setCommentMenu(null); handleDeleteComment(id); }}>
                  <Text style={[styles.modalItemText, { color: colors.danger }]}>삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.modalItem} onPress={() => { const id = commentMenu.id; setCommentMenu(null); openReport('COMMENT', id); }}>
                <Text style={[styles.modalItemText, { color: colors.danger }]}>신고</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setCommentMenu(null)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />

      <ImageViewerModal
        visible={viewer.visible}
        images={viewer.images}
        initialIndex={viewer.index}
        onClose={() => setViewer({ visible: false, images: [], index: 0 })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  feedBox: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.lg, marginBottom: spacing.sm },
  feedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nickname: { fontSize: font.sub, color: colors.textSub, flexShrink: 1 },
  viewCount: { fontSize: font.caption, color: colors.textMuted, marginLeft: 3 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  smallAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarLetter: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  badge: {
    fontSize: font.caption,
    fontWeight: 'bold',
    color: colors.accent,
    backgroundColor: 'rgba(46,124,246,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.sm },
  content: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  commentHeader: {
    fontSize: font.sub,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 20,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentNick: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary },
  commentTime: { fontSize: font.sub - 1, color: colors.textMuted, marginLeft: 6 },
  commentAuthor: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  commentAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  commentAvatarLetter: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
  commentContent: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
  moreReplies: { marginLeft: 24, paddingVertical: 8 },
  moreRepliesText: { fontSize: font.sub, color: colors.accent, fontWeight: 'bold' },
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
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  chatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  likeCount: { fontSize: font.body, color: colors.textSub, marginLeft: 2 },
  otherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 12,
  },
  chatBtnText: { color: colors.textSub, fontSize: font.sub, fontWeight: '600' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportText: { color: colors.danger, fontSize: font.sub, fontWeight: 'bold' },
  ownerActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  ownerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownerBtnText: { fontSize: font.sub, color: colors.textSub, fontWeight: 'bold' },
  commentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentActions: { flexDirection: 'row', gap: 12 },
  cmtBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cmtBtnText: { fontSize: font.caption, color: colors.textSub, fontWeight: 'bold' },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    fontSize: font.body,
    marginBottom: 6,
    textAlignVertical: 'top',
    color: colors.text,
  },
  replyItem: { marginLeft: 24 },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.chipBg,
  },
  replyBannerText: { fontSize: font.caption, color: colors.primary },
  replyCancel: { fontSize: font.caption, color: colors.textSub },
  cafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
  },
  cafeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cafeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cafeName: { fontSize: font.sub, fontWeight: 'bold', color: colors.text, flexShrink: 1 },
  cafeMeta: { fontSize: font.sub, color: colors.textSub, flexShrink: 1 },
  studyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  studyRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  studyText: { fontSize: font.sub, color: colors.text, flexShrink: 1 },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  applyBtnCancel: { backgroundColor: colors.textSub },
  applyBtnDisabled: { backgroundColor: colors.textMuted },
  applyBtnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
  nickLink: { fontWeight: 'bold', color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: font.sub,
    fontWeight: 'bold',
    color: colors.textSub,
    textAlign: 'center',
    paddingVertical: 14,
  },
  modalItem: { paddingVertical: 16, alignItems: 'center' },
  modalItemText: { fontSize: font.h3, color: colors.text },
  modalCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  modalCancelText: { fontSize: font.h3, color: colors.danger, fontWeight: 'bold' },
  feedImage: { width: 200, height: 200, borderRadius: radius.md, marginRight: 8, backgroundColor: colors.chipBg },
  acceptedBanner: {
    backgroundColor: '#E4F0E4',
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptedBannerText: { color: '#2E7D32', fontSize: font.body, fontWeight: 'bold' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kebab: { padding: 4 },
  chatBtnFull: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: 12,
  },
  replyLink: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8, alignSelf: 'flex-start' },
});