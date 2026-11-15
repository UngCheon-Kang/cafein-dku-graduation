import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFeeds } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { requireLogin } from '../auth';
import { timeAgo } from '../utils';
import AppHeader from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, font, shadow } from '../theme';
import SegmentedControl from '../components/SegmentedControl';

const FILTERS = [
  { label: '전체', value: null },
  { label: '자유', value: 'FREE' },
  { label: '카페추천', value: 'CAFE_REC' },
  { label: '스터디모집', value: 'STUDY' },
];

const SORTS = [
  { label: '최신순', value: 'latest' },
  { label: '인기순', value: 'popular' },
];

const TYPE_LABEL = {
  FREE: '자유',
  CAFE_REC: '카페추천',
  STUDY: '스터디모집',
};

const formatMeetAt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${ampm} ${h}:${mm}`;
};

export default function FeedScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState(null);
  const [sort, setSort] = useState('latest');
  const { items: feeds, loading, refreshing, loadingMore, reset, loadMore } = usePagedList();

  // 상세 갔다 와도 위치 유지: focus마다가 아니라 최초·필터/정렬 변경 시에만 로드
  useEffect(() => {
    reset((p) => getFeeds(filter, sort, p));
  }, [filter, sort, reset]);

  const onRefresh = () => {
    reset((p) => getFeeds(filter, sort, p), { refresh: true });
  };

  const renderFeed = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={async () => {
        if (!(await requireLogin(navigation, '피드 상세는 로그인 후 볼 수 있어요.'))) return;
        navigation.navigate('FeedDetail', { feedId: item.id });
      }}
    >
      <View style={styles.cardTop}>
        <View style={styles.authorRow}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.smallAvatar} />
          ) : (
            <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
              <Text style={styles.smallAvatarLetter}>{item.nickname?.[0] ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname} · {timeAgo(item.createdAt)}
          </Text>
          <Ionicons name="eye-outline" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
          <Text style={styles.viewCount}>{item.viewCount}</Text>
        </View>
        <Text style={styles.badge}>{TYPE_LABEL[item.feedType]}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={2}>
        {item.content}
      </Text>

      {item.imageUrls?.length > 0 && (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.cardImage} />
      )}

      {item.cafe && (
        <View style={styles.cafeBox}>
          <View style={styles.cafeNameRow}>
            <Ionicons name="cafe" size={14} color={colors.textSub} />
            <Text style={styles.cafeName} numberOfLines={1}>{item.cafe.name}</Text>
          </View>
          <View style={styles.cafeMetaRow}>
            <Ionicons name="star" size={12} color="#F5A623" />
            <Text style={styles.cafeMeta} numberOfLines={1}>
              {item.cafe.score?.toFixed(1) ?? '-'} · {item.cafe.address}
            </Text>
          </View>
        </View>
      )}

      {item.study && (
        <View style={styles.studyBox}>
          <View style={styles.studyRow}>
            <Ionicons name="location" size={14} color={colors.textSub} />
            <Text style={styles.studyLine}>{item.study.location}</Text>
          </View>
          <View style={styles.studyRow}>
            <Ionicons name="calendar" size={14} color={colors.textSub} />
            <Text style={styles.studyLine}>{formatMeetAt(item.study.meetAt)}</Text>
          </View>
          <View style={styles.studyRow}>
            <Ionicons name="people" size={14} color={colors.textSub} />
            <Text style={styles.studyLine}>
              {item.study.capacity}명 중 {item.study.currentCount}명 모집됨
              {item.study.status === 'CLOSED' ? ' (마감)' : ''}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
        <Text style={styles.meta}>{item.likeCount}</Text>
        <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} style={{ marginLeft: 12 }} />
        <Text style={styles.meta}>{item.commentCount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="커뮤니티" onSearch={() => navigation.navigate('FeedSearch')} />

      {/* 필터 탭 */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 정렬 */}
      <View style={styles.sortWrap}>
        <SegmentedControl options={SORTS} value={sort} onChange={setSort} style={{ width: 150 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={feeds}
          renderItem={renderFeed}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>아직 게시글이 없습니다.</Text>}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: Platform.OS === 'ios' ? 116 : insets.bottom + 104 }]}
        onPress={async () => {
          if (!(await requireLogin(navigation, '글쓰기는 로그인 후 이용할 수 있어요.'))) return;
          navigation.navigate('FeedWrite');
        }}
      >
        <Ionicons name="pencil" size={24} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: font.sub, color: colors.textSub },
  filterTextActive: { color: colors.white, fontWeight: 'bold' },
  sortWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listContent: { padding: spacing.lg, paddingTop: 0, paddingBottom: 110 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nickname: { fontSize: font.sub, color: colors.textSub, flexShrink: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  smallAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarLetter: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  badge: {
    fontSize: font.caption,
    color: colors.chipText,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  title: { fontSize: font.h3, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  content: { fontSize: font.body, color: colors.textSub, lineHeight: 20 },
  cardImage: { width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.md, backgroundColor: colors.chipBg },
  cafeBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cafeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cafeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cafeName: { fontSize: font.sub, fontWeight: 'bold', color: colors.text, flexShrink: 1 },
  cafeMeta: { fontSize: font.caption, color: colors.textSub, flexShrink: 1 },
  studyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },
  studyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  studyLine: { fontSize: font.caption, color: colors.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  meta: { fontSize: font.caption, color: colors.textMuted, marginLeft: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
    elevation: 5,
  },
  viewCount: { fontSize: font.caption, color: colors.textMuted, marginLeft: 3 },
});