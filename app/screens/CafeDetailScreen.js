import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCafe, getCafeReviews, addBookmark, removeBookmark, deleteReview } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { requireLogin, getUser } from '../auth';
import { timeAgo } from '../utils';
import { colors, spacing, radius, font, shadow } from '../theme';
import ReportSheet from '../components/ReportSheet';
import ImageViewerModal from '../components/ImageViewerModal';
import { cafeImageSource } from '../cafeImage';

// 카공지수 항목 정의 (아이콘 · 라벨 · 값별 [표시문구, 좋음/보통/나쁨])
const INDEX = [
  { icon: 'power-plug-outline', label: '콘센트', field: 'outletQuantity',
    v: { MANY: ['넉넉함', 'good'], NORMAL: ['보통', 'mid'], FEW: ['적음', 'bad'] } },
  { icon: 'wifi', label: '와이파이', field: 'wifiStatus',
    v: { FAST: ['빠름', 'good'], NORMAL: ['보통', 'mid'], SLOW: ['느림', 'bad'] } },
  { icon: 'volume-high', label: '소음', field: 'noiseLevel',
    v: { QUIET: ['조용함', 'good'], NORMAL: ['보통', 'mid'], LOUD: ['시끄러움', 'bad'] } },
  { icon: 'seat-outline', label: '좌석', field: 'seatQuantity',
    v: { MANY: ['많음', 'good'], NORMAL: ['보통', 'mid'], FEW: ['적음', 'bad'] } },
];

const valColor = (kind) =>
  kind === 'good' ? '#4F9E80'      // 차분한 초록
    : kind === 'bad' ? '#C0885B'   // 차분한 주황 (경고색 아님)
    : colors.textSub;              // 보통/없음 = 회색

const reviewChips = (item) => {
  const out = [];
  const push = (icon, raw, map) => { if (raw) { const [label, kind] = map[raw]; out.push({ icon, label, kind }); } };
  push('power-plug-outline', item.outletScore, { MANY: ['넉넉함', 'good'], NORMAL: ['보통', 'mid'], FEW: ['적음', 'bad'] });
  push('wifi', item.wifiScore, { FAST: ['빠름', 'good'], NORMAL: ['보통', 'mid'], SLOW: ['느림', 'bad'] });
  push('volume-high', item.noiseScore, { QUIET: ['조용', 'good'], NORMAL: ['보통', 'mid'], LOUD: ['시끄러움', 'bad'] });
  push('seat-outline', item.seatScore, { MANY: ['많음', 'good'], NORMAL: ['보통', 'mid'], FEW: ['적음', 'bad'] });
  return out;
};

export default function CafeDetailScreen({ route, navigation }) {
  const { cafeId } = route.params;
  const insets = useSafeAreaInsets();

  const [cafe, setCafe] = useState(null);
  const { items: reviews, loadingMore, reset: resetReviews, loadMore: loadMoreReviews } = usePagedList();
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [viewer, setViewer] = useState({ visible: false, images: [], index: 0 });
  const [heroIndex, setHeroIndex] = useState(0);
  const { width: screenW } = useWindowDimensions();

  const loadData = useCallback(() => {
    getCafe(cafeId)
      .then((cafeData) => setCafe(cafeData))
      .catch((e) => console.log('상세 로드 실패:', e.message))
      .finally(() => setLoading(false));
    resetReviews((p) => getCafeReviews(cafeId, p));
  }, [cafeId, resetReviews]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      getUser().then((u) => setMyUserId(u?.userId));
    }, [loadData])
  );

  const handleToggleBookmark = async () => {
    if (!(await requireLogin(navigation, '북마크는 로그인 후 이용할 수 있어요.'))) return;
    if (!cafe) return;
    try {
      if (cafe.isBookmarked) await removeBookmark(cafe.id);
      else await addBookmark(cafe.id);
      setCafe({ ...cafe, isBookmarked: !cafe.isBookmarked });
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert('삭제', '이 리뷰를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(reviewId);
            loadData();
          } catch (e) {
            Alert.alert('실패', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!cafe) {
    return (
      <View style={styles.center}>
        <Text>카페 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const hasMyReview = reviews.some((r) => r.userId === myUserId);

  const goWriteReview = async () => {
    if (!(await requireLogin(navigation, '리뷰 작성은 로그인 후 이용할 수 있어요.'))) return;
    navigation.navigate('ReviewWrite', {
      place: {
        kakaoPlaceId: cafe.kakaoPlaceId,
        name: cafe.name,
        address: cafe.address,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        phone: cafe.phone,
      },
      returnBack: true,
    });
  };

  const renderReview = ({ item }) => {
    const isMine = item.userId === myUserId;
    const chips = reviewChips(item);
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <TouchableOpacity
            style={styles.reviewAuthor}
            onPress={() => {
              if (item.userId === myUserId) {
                navigation.navigate('Main', { screen: '마이페이지' });
              } else {
                navigation.navigate('UserProfile', { userId: item.userId, nickname: item.nickname });
              }
            }}
          >
            {item.profileImageUrl ? (
              <Image source={{ uri: item.profileImageUrl }} style={styles.reviewAvatar} />
            ) : (
              <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
                <Text style={styles.reviewAvatarLetter}>{item.nickname?.[0] ?? '?'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.reviewNick}>{item.nickname}</Text>
              {item.createdAt && <Text style={styles.reviewTime}>{timeAgo(item.createdAt)}</Text>}
            </View>
          </TouchableOpacity>
          <View style={styles.reviewScoreWrap}>
            <Ionicons name="star" size={13} color="#F5A623" />
            <Text style={styles.reviewScore}>{item.score?.toFixed(1) ?? '-'}</Text>
          </View>
        </View>

        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((c) => (
              <View key={c.icon} style={styles.chip}>
                <MaterialCommunityIcons name={c.icon} size={12} color={valColor(c.kind)} />
                <Text style={[styles.chipText, { color: valColor(c.kind) }]}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.reviewContent}>{item.content}</Text>

        {item.imageUrls?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {item.imageUrls.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => setViewer({ visible: true, images: item.imageUrls, index: idx })}
              >
                <Image source={{ uri: url }} style={styles.reviewImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isMine && (
          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() =>
                navigation.navigate('ReviewWrite', {
                  editReview: item,
                  cafeName: cafe.name,
                  cafeAddress: cafe.address,
                })
              }
            >
              <Ionicons name="create-outline" size={14} color={colors.textSub} />
              <Text style={styles.reviewBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => handleDeleteReview(item.id)}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.reviewBtnText, { color: colors.danger }]}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isMine && (
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setReportTarget({ type: 'REVIEW', id: item.id })}>
              <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.reviewBtnText}>신고</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    );
  };

  const cafeImg = cafeImageSource(cafe);
  const heroImages = (cafe.imageUrls && cafe.imageUrls.length > 0)
    ? cafe.imageUrls
    : (cafe.thumbnailUrl ? [cafe.thumbnailUrl] : []);
  const header = (
    <View>
      {/* 히어로 이미지 */}
      <View style={styles.heroWrap}>
        {heroImages.length > 0 ? (
          <>
            <FlatList
              data={heroImages}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / screenW))
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => setViewer({ visible: true, images: heroImages, index })}
                >
                  <Image source={{ uri: item }} style={[styles.hero, { width: screenW }]} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
            {heroImages.length > 1 && (
              <View style={styles.heroCounter}>
                <Text style={styles.heroCounterText}>{heroIndex + 1} / {heroImages.length}</Text>
              </View>
            )}
          </>
        ) : cafeImg ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setViewer({ visible: true, images: [cafeImg.source], index: 0 })}
          >
            <Image source={cafeImg.source} style={styles.hero} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Image source={require('../assets/logo-gray.png')} style={{ width: 88, height: 88 }} resizeMode="contain" />
          </View>
        )}
        <TouchableOpacity style={styles.bookmarkOverlay} onPress={handleToggleBookmark}>
          <Ionicons
            name={cafe.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>

        {cafe.sourceUrl ? (
          <TouchableOpacity
            style={styles.sourceOverlay}
            onPress={() => Linking.openURL(cafe.sourceUrl).catch(() => {})}
          >
            <Text style={styles.sourceText}>출처</Text>
            <Ionicons name="open-outline" size={11} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.nameRow}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <View style={styles.scoreBadge}>
            <Ionicons name="star" size={14} color="#F5A623" />
            <Text style={styles.scoreBadgeText}>{cafe.score?.toFixed(1) ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color={colors.textSub} />
          <Text style={styles.infoText} numberOfLines={2}>{cafe.address}</Text>
        </View>
        {cafe.phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={15} color={colors.textSub} />
            <Text style={styles.infoText}>{cafe.phone}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>카공지수</Text>
        <View style={styles.indexGrid}>
          {INDEX.map((it) => {
            const raw = cafe[it.field];
            const [label, kind] = raw ? it.v[raw] : ['정보 없음', 'none'];
            return (
              <View key={it.label} style={styles.indexCard}>
                <View style={styles.indexCardLeft}>
                  <MaterialCommunityIcons name={it.icon} size={18} color={colors.primary} />
                  <Text style={styles.indexCardLabel}>{it.label}</Text>
                </View>
                <Text style={[styles.indexCardValue, { color: valColor(kind) }]}>{label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>리뷰 {cafe.reviewCount ?? reviews.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        onEndReached={loadMoreReviews}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>아직 리뷰가 없습니다.</Text>}
        style={styles.list}
        contentContainerStyle={styles.container}
      />
      {!hasMyReview && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.writeBtn} onPress={goWriteReview}>
            <Ionicons name="pencil" size={16} color={colors.white} />
            <Text style={styles.writeBtnText}>리뷰 작성</Text>
          </TouchableOpacity>
        </View>
      )}
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />

      <ImageViewerModal
        visible={viewer.visible}
        images={viewer.images}
        initialIndex={viewer.index}
        onClose={() => setViewer({ visible: false, images: [], index: 0 })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  container: { paddingBottom: 90, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 240, backgroundColor: colors.chipBg },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6E9ED' },
  heroCounter: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  heroCounterText: { color: '#fff', fontSize: font.caption, fontWeight: '600' },
  sourceOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sourceText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  bookmarkOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cafeName: { fontSize: font.h1, fontWeight: 'bold', color: colors.primary, flex: 1, marginRight: 8 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.chipBg,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  scoreBadgeText: { fontSize: font.body, fontWeight: 'bold', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  infoText: { fontSize: font.sub, color: colors.textSub, flex: 1 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },

  sectionTitle: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.md },
  indexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.xl },
  indexCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadow.card,
  },
  indexCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indexCardLabel: { fontSize: font.sub, color: colors.text, fontWeight: 'bold' },
  indexCardValue: { fontSize: font.sub, fontWeight: 'bold' },

  reviewCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewAvatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarLetter: { color: colors.white, fontSize: 13, fontWeight: 'bold' },
  reviewNick: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary },
  reviewTime: { fontSize: font.caption, color: colors.textMuted, marginTop: 1 },
  reviewScoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewScore: { fontSize: font.sub, color: colors.text, fontWeight: 'bold' },
  reviewContent: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  reviewActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewBtnText: { fontSize: font.caption, color: colors.textSub, fontWeight: 'bold' },
  reviewImage: { width: 120, height: 120, borderRadius: radius.md, marginRight: 8, backgroundColor: colors.chipBg },

  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  writeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  writeBtnText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: font.caption, fontWeight: 'bold' },
});