import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getCafesPage } from '../api';
import AppHeader from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, font, shadow } from '../theme';
import SegmentedControl from '../components/SegmentedControl';
import { cafeImageSource } from '../cafeImage';

const SORTS = [
  { label: '평점순', value: 'score' },
  { label: '거리순', value: 'distance' },
];

// 카공지수 enum → 한글 라벨
const WIFI = { SLOW: '느림', NORMAL: '보통', FAST: '빠름' };
const QTY = { FEW: '적음', NORMAL: '보통', MANY: '많음' };
const NOISE = { QUIET: '조용', NORMAL: '보통', LOUD: '시끄러움' };

const chipsFor = (item) => {
  const c = [];
  if (item.wifiStatus) c.push({ icon: 'wifi', label: WIFI[item.wifiStatus] });
  if (item.outletQuantity) c.push({ icon: 'power-plug-outline', label: QTY[item.outletQuantity] });
  if (item.seatQuantity) c.push({ icon: 'seat-outline', label: QTY[item.seatQuantity] });
  if (item.noiseLevel) c.push({ icon: 'volume-high', label: NOISE[item.noiseLevel] });
  return c;
};

export default function HomeScreen({ navigation }) {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState('score');
  const [loadingMore, setLoadingMore] = useState(false);

  const pageRef = useRef(0);        // 현재 페이지
  const lastRef = useRef(false);    // 마지막 페이지 도달 여부
  const locRef = useRef(null);      // 거리순용 좌표
  const loadingRef = useRef(false); // 중복 로드 방지

  // 첫 페이지 로드(리셋)
  const loadCafes = async (sortValue) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      let lat, lng;
      if (sortValue === 'distance') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한 필요', '거리순 정렬을 하려면 위치 권한이 필요해요.');
          setSort('score');
          return;
        }
        let loc = await Location.getLastKnownPositionAsync();
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        locRef.current = { lat, lng };
      } else {
        locRef.current = null;
      }
      const { content, last } = await getCafesPage(sortValue, 0, lat, lng);
      setCafes(content);
      pageRef.current = 0;
      lastRef.current = last;
    } catch (e) {
      console.log('카페 로드 실패:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  };

  // 스크롤 끝 → 다음 페이지 이어붙이기
  const loadMore = async () => {
    if (loadingRef.current || lastRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const loc = locRef.current;
      const { content, last } = await getCafesPage(sort, nextPage, loc?.lat, loc?.lng);
      setCafes((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...prev, ...content.filter((c) => !ids.has(c.id))];
      });
      pageRef.current = nextPage;
      lastRef.current = last;
    } catch (e) {
      console.log('추가 로드 실패:', e.message);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  // 상세 화면 갔다 돌아올 때 목록/스크롤 위치 유지를 위해 focus마다가 아니라
  // 최초 진입·정렬 변경 시에만 로드 (새로고침은 당겨서 새로고침으로)
  useEffect(() => {
    loadCafes(sort);
  }, [sort]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCafes(sort);
  };

  const renderCafe = ({ item }) => {
    const chips = chipsFor(item);
    const cafeImg = cafeImageSource(item);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CafeDetail', { cafeId: item.id })}
      >
        {cafeImg ? (
          <Image source={cafeImg.source} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Image source={require('../assets/logo-gray.png')} style={{ width: 64, height: 64 }} resizeMode="contain" />
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cafeName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.scoreWrap}>
              <Ionicons name="star" size={14} color="#F5A623" />
              <Text style={styles.score}>{item.score?.toFixed(1) ?? '-'}</Text>
            </View>
          </View>
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>

          {chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((c) => (
                <View key={c.icon} style={styles.chip}>
                  <MaterialCommunityIcons name={c.icon} size={13} color={colors.chipText} />
                  <Text style={styles.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.reviewCount}>
            {item.distanceKm != null && `${item.distanceKm.toFixed(1)}km · `}
            리뷰 {item.reviewCount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="홈" onSearch={() => navigation.navigate('CafeSearch')} />

      <View style={styles.sortWrap}>
        <SegmentedControl options={SORTS} value={sort} onChange={setSort} style={{ width: 150 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={cafes}
          renderItem={renderCafe}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>등록된 카페가 없습니다.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sortWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: 12, paddingTop: spacing.md, paddingBottom: 110 },
  // 넓고 큰 가로형 사진 + 아주 연한 그림자 (모던)
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.chipBg,
  },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6E9ED' },
  cardBody: { padding: spacing.lg },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cafeName: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary, flex: 1, marginRight: 8 },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  score: { fontSize: font.body, color: colors.text, fontWeight: 'bold' },
  address: { fontSize: font.sub, color: colors.textSub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: font.caption, color: colors.chipText },
  reviewCount: { fontSize: font.caption, color: colors.textMuted, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});