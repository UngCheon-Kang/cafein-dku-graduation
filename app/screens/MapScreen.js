import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Image,
  Platform,
  Animated,
  StyleSheet,
  Keyboard,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { NaverMapView, NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import Supercluster from 'supercluster';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllCafes, searchCafes } from '../api';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { requireLogin } from '../auth';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, font, shadow } from '../theme';
import { cafeImageSource } from '../cafeImage';

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [cafes, setCafes] = useState([]);       // 우리 DB 카페
  const [results, setResults] = useState([]);   // 검색 결과
  const [keyword, setKeyword] = useState('');
  const mapRef = useRef(null);

  const [selectedCafe, setSelectedCafe] = useState(null);
  const cardY = useRef(new Animated.Value(200)).current;
  const resultAnim = useRef(new Animated.Value(0)).current; // 검색결과 드롭다운 등장 애니메이션
  // 마커를 탭한 직후 지도 onTapMap이 이어서 발생해 선택을 지우는 것을 막기 위한 가드
  const markerPressAt = useRef(0);

  // 검색결과가 나타날 때 살짝 아래로 슬라이드 + 페이드 (스프링)
  useEffect(() => {
    if (results.length > 0) {
      resultAnim.setValue(0);
      Animated.spring(resultAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
        mass: 0.7,
      }).start();
    }
  }, [results.length]);

  // 지도 초기 카메라 (서울시청 일대)
  const INITIAL_CAMERA = { latitude: 37.5665, longitude: 126.978, zoom: 14 };
  const [region, setRegion] = useState({
    latitude: 37.5665, longitude: 126.978,
    latitudeDelta: 0.03, longitudeDelta: 0.03, zoom: 14,
  });
  const cameraDebounce = useRef(null);
  const appliedRef = useRef({ latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.03, longitudeDelta: 0.03, zoom: 14 });
  useEffect(() => () => { if (cameraDebounce.current) clearTimeout(cameraDebounce.current); }, []);

  // 카공지표 필터 (활성화된 항목만 AND 조건으로 적용)
  const [filters, setFilters] = useState({ outlet: false, wifi: false, seat: false, quiet: false });
  const toggleFilter = (key) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  const FILTER_CHIPS = [
    { key: 'outlet', label: '콘센트 넉넉', icon: 'power-plug' },
    { key: 'wifi', label: '와이파이 빠름', icon: 'wifi' },
    { key: 'seat', label: '좌석 넉넉', icon: 'seat' },
    { key: 'quiet', label: '조용함', icon: 'volume-low' },
  ];

  // 매 렌더마다 새 배열이 되면 클러스터 인덱스가 계속 재생성되어 마커가 폭주한다 → 메모이즈
  const filteredCafes = useMemo(
    () =>
      cafes.filter(
        (c) =>
          Number.isFinite(c.latitude) &&
          Number.isFinite(c.longitude) &&
          (!filters.outlet || c.outletQuantity === 'MANY') &&
          (!filters.wifi || c.wifiStatus === 'FAST') &&
          (!filters.seat || c.seatQuantity === 'MANY') &&
          (!filters.quiet || c.noiseLevel === 'QUIET')
      ),
    [cafes, filters]
  );

  const showCafe = (cafe) => {
    markerPressAt.current = Date.now();
    Keyboard.dismiss(); // 마커를 눌러도 키보드는 내리고 카드만 띄우기
    setSelectedCafe(cafe);
    cardY.setValue(200);
    Animated.timing(cardY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  // 빈 지도 탭 시에만 카드 닫기 (마커 탭 직후의 연쇄 onPress는 무시)
  const handleMapPress = () => {
    if (Date.now() - markerPressAt.current < 350) return;
    Keyboard.dismiss(); // 검색창 입력 중 지도를 누르면 키보드 내리기
    setSelectedCafe(null);
    setResults([]); // 지도 탭 시 검색결과 드롭다운 닫기
  };

  // supercluster 인덱스 (필터된 카페로 구성)
  const clusterIndex = useMemo(() => {
    const idx = new Supercluster({ radius: 60, maxZoom: 16 });
    idx.load(
      filteredCafes.map((c) => ({
        type: 'Feature',
        properties: { cafeId: c.id },
        geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      }))
    );
    return idx;
  }, [filteredCafes]);

  // 현재 카메라 영역/줌 기준 클러스터 계산
  const points = useMemo(() => {
    const zoom = Math.min(Math.max(Math.round(region.zoom), 1), 20);
    const padLat = region.latitudeDelta * 0.75;
    const padLng = region.longitudeDelta * 0.75;
    const bbox = [
      region.longitude - region.longitudeDelta / 2 - padLng,
      region.latitude - region.latitudeDelta / 2 - padLat,
      region.longitude + region.longitudeDelta / 2 + padLng,
      region.latitude + region.latitudeDelta / 2 + padLat,
    ];
    try {
      return clusterIndex.getClusters(bbox, zoom);
    } catch {
      return [];
    }
  }, [clusterIndex, region]);

  // 지도 이동/줌 → 영역 갱신(디바운스). 마커는 좌표 고정이라 이동 중엔 안 흔들리고, 멈추면 재클러스터.
  const handleCameraChanged = (e) => {
    if (cameraDebounce.current) clearTimeout(cameraDebounce.current);
    cameraDebounce.current = setTimeout(() => {
      const rz = Math.min(Math.max(Math.round(e.zoom), 1), 20);
      const prev = appliedRef.current;
      const latD = e.region?.latitudeDelta ?? region.latitudeDelta;
      const lngD = e.region?.longitudeDelta ?? region.longitudeDelta;
      // 팬(같은 줌에서 이동) 중에는 재클러스터하지 않는다 → 마커가 뚝뚝 안 흔들림.
      // 줌 단계가 바뀌거나, 화면 밖으로 크게 움직였을 때만 다시 계산.
      const movedFar =
        Math.abs(e.latitude - prev.latitude) > prev.latitudeDelta * 0.5 ||
        Math.abs(e.longitude - prev.longitude) > prev.longitudeDelta * 0.5;
      if (rz === prev.zoom && !movedFar) return;
      const next = { latitude: e.latitude, longitude: e.longitude, latitudeDelta: latD, longitudeDelta: lngD, zoom: e.zoom };
      appliedRef.current = { ...next, zoom: rz };
      setRegion(next);
    }, 160);
  };

  // 클러스터(묶음) 탭 → 펼쳐지는 줌으로 확대
  const onTapCluster = (clusterId, lat, lng) => {
    const zoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 18);
    mapRef.current?.animateCameraTo({ latitude: lat, longitude: lng, zoom, duration: 400 });
  };

  const loadCafes = () => {
    getAllCafes('score')
      .then((data) => {
        setCafes(data.filter((c) => c.latitude != null && c.longitude != null));
      })
      .catch((e) => console.log('카페 로드 실패:', e.message));
  };

  useFocusEffect(
    useCallback(() => {
      loadCafes();
    }, [])
  );

  // 우리 DB에 이 kakaoPlaceId가 있는지 찾기 (있으면 그 카페 객체, 없으면 undefined)
  const findMyCafe = (kakaoPlaceId) =>
    cafes.find((c) => c.kakaoPlaceId === kakaoPlaceId);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    try {
      const data = await searchCafes(keyword);
      setResults(data.cafes || []);
    } catch (e) {
      Alert.alert('검색 실패', e.message);
    }
  };

  // 내 위치로 지도 이동
  const moveToMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '내 위치를 보려면 위치 권한을 허용해주세요.');
        return;
      }
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      // 현위치 파란 점 표시 (권한 확보 후)
      mapRef.current?.setLocationTrackingMode('NoFollow');
      mapRef.current?.animateRegionTo({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
        duration: 800,
      });
    } catch (e) {
      Alert.alert('오류', '위치를 가져오지 못했어요.');
    }
  };

  // 검색 결과 항목 터치
  const handlePressResult = (place) => {
    const myCafe = findMyCafe(place.kakaoPlaceId);

    if (myCafe) {
      // 우리 DB에 있음 → 핀 선택 + 지도 이동 + 하단 카드
      showCafe(myCafe);
      mapRef.current?.animateCameraTo({
        latitude: myCafe.latitude,
        longitude: myCafe.longitude,
        zoom: 16,
        duration: 600,
      });
    } else {
      // 미등록 → 리뷰 작성 유도
      Alert.alert(
        '리뷰 없는 카페입니다',
        '이 카페를 추가하고 리뷰를 작성하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '작성하기',
            onPress: async () => {
              if (!(await requireLogin(navigation, '리뷰 작성은 로그인 후 이용할 수 있어요.'))) return;
              navigation.navigate('ReviewWrite', { place });
            },
          },
        ]
      );
    }
  };

  // 검색 결과 한 줄
  const renderResult = ({ item }) => {
    const registered = !!findMyCafe(item.kakaoPlaceId);
    return (
      <TouchableOpacity
        style={[styles.resultItem, !registered && styles.resultItemGray]}
        onPress={() => handlePressResult(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultName, !registered && styles.textGray]}>
            {item.name}
          </Text>
          <Text style={[styles.resultAddr, !registered && styles.textGray]}>
            {item.address}
          </Text>
        </View>
        {registered ? (
          <Text style={styles.badgeOn}>리뷰 있음</Text>
        ) : (
          <Text style={styles.badgeOff}>미등록</Text>
        )}
      </TouchableOpacity>
    );
  };

  // '리뷰 있음'(우리 DB에 등록된) 카페를 위로 정렬
  const sortedResults = [...results].sort((a, b) => {
    const aReg = !!findMyCafe(a.kakaoPlaceId);
    const bReg = !!findMyCafe(b.kakaoPlaceId);
    return Number(bReg) - Number(aReg);
  });

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={styles.map}
        initialCamera={INITIAL_CAMERA}
        isExtentBoundedInKorea={true}
        minZoom={6}
        isShowLocationButton={false}
        isShowCompass={false}
        isShowScaleBar={false}
        isShowZoomControls={false}
        onTapMap={handleMapPress}
        onCameraChanged={handleCameraChanged}
      >
        {points.map((p) => {
          const [lng, lat] = p.geometry.coordinates;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          // 묶음(클러스터) 마커 — 검정 원 + 개수
          if (p.properties.cluster) {
            const count = p.properties.point_count;
            // 개수가 많을수록 원이 연속적으로 커진다 (34 ~ 58px)
            const sz = Math.round(Math.min(66, Math.max(42, 38 + 11 * Math.log10(count))));
            const digits = String(count).length;
            const ts = Math.round(sz * (digits >= 3 ? 0.25 : digits === 2 ? 0.30 : 0.34));
            return (
              <NaverMapMarkerOverlay
                key={`cluster-${p.id}`}
                latitude={lat}
                longitude={lng}
                width={sz}
                height={sz}
                anchor={{ x: 0.5, y: 0.5 }}
                image={require('../assets/cluster.png')}
                caption={{ text: String(count), align: 'Center', color: '#ffffff', haloColor: 'transparent', textSize: ts }}
                onTap={() => onTapCluster(p.id, lat, lng)}
              />
            );
          }

          // 개별 카페 마커 — 실루엣 이미지 (선택 시 파랑)
          const cafe = filteredCafes.find((c) => c.id === p.properties.cafeId);
          if (!cafe) return null;
          const isSel = selectedCafe && selectedCafe.id === cafe.id;
          return (
            <NaverMapMarkerOverlay
              key={`cafe-${cafe.id}`}
              latitude={lat}
              longitude={lng}
              width={isSel ? 40 : 34}
              height={isSel ? 40 : 34}
              anchor={{ x: 0.5, y: 0.5 }}
              image={isSel ? require('../assets/cat-pin-blue.png') : require('../assets/cat-pin.png')}
              onTap={() => showCafe(cafe)}
            />
          );
        })}
      </NaverMapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.searchBar}>
          <AppTextInput
            style={styles.input}
            placeholder="카페 또는 동네 검색"
            value={keyword}
            onChangeText={(t) => {
              setKeyword(t);
              if (!t.trim()) setResults([]);
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* 카공지표 필터 칩 — 검색결과 드롭다운이 떠 있을 땐 숨겨 오버레이가 깔끔하게 */}
        {results.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyboardShouldPersistTaps="handled"
          >
            {FILTER_CHIPS.map((chip) => {
              const active = filters[chip.key];
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => toggleFilter(chip.key)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={chip.icon}
                    size={16}
                    color={active ? colors.white : colors.chipText}
                  />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {results.length > 0 && (
          <Animated.View
            style={[
              styles.resultBox,
              {
                opacity: resultAnim,
                transform: [
                  { translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                ],
              },
            ]}
          >
            <FlatList
              data={sortedResults}
              renderItem={renderResult}
              keyExtractor={(item) => item.kakaoPlaceId}
              keyboardShouldPersistTaps="handled"
            />
          </Animated.View>
        )}
      </SafeAreaView>

      {!selectedCafe && (
        <TouchableOpacity style={[styles.myLocationBtn, { bottom: Platform.OS === 'ios' ? 112 : insets.bottom + 104 }]} onPress={moveToMyLocation}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}

      {selectedCafe && (
        <Animated.View style={[styles.cafeCard, { bottom: Platform.OS === 'ios' ? 92 : insets.bottom + 84, transform: [{ translateY: cardY }] }]}>
          <TouchableOpacity
            style={styles.cafeCardInner}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CafeDetail', { cafeId: selectedCafe.id })}
          >
            {(() => {
              const img = cafeImageSource(selectedCafe);
              return img ? (
                <Image source={img.source} style={styles.cafeCardImg} resizeMode="cover" />
              ) : (
                <View style={[styles.cafeCardImg, styles.cafeCardImgPlaceholder]}>
                  <Image source={require('../assets/logo-gray.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
                </View>
              );
            })()}
            <View style={{ flex: 1 }}>
              <Text style={styles.cafeCardName} numberOfLines={1}>{selectedCafe.name}</Text>
              <View style={styles.cafeCardMetaRow}>
                <Ionicons name="star" size={12} color="#F5A623" />
                <Text style={styles.cafeCardMeta} numberOfLines={1}>
                  {selectedCafe.score?.toFixed(1) ?? '-'} · 리뷰 {selectedCafe.reviewCount ?? 0}
                </Text>
              </View>
              {!!selectedCafe.address && (
                <Text style={styles.cafeCardAddr} numberOfLines={1}>{selectedCafe.address}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  clusterBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1f2430',
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  // 커피컵 카페 마커 (브랜드 파란 원 + 흰 아이콘)
  cafeMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1f2430',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
    elevation: 4,
  },
  cafeMarkerSel: { backgroundColor: '#2E7CF6', borderColor: '#2E7CF6' },
  cafeMarkerImg: { width: 22, height: 22 },
  myLocationBtn: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
    elevation: 4,
  },
  cafeCard: { position: 'absolute', left: 16, right: 16, bottom: 96 },
  cafeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
    gap: 12,
    ...shadow.card,
    elevation: 5,
  },
  cafeCardImg: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.chipBg },
  cafeCardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cafeCardName: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary },
  cafeCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cafeCardMeta: { fontSize: font.sub, color: colors.textSub },
  cafeCardAddr: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  searchBar: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 8, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: font.body,
    color: colors.text,
    ...shadow.card,
    elevation: 3,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: { paddingHorizontal: 12, paddingTop: 2, paddingBottom: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...shadow.card,
    elevation: 2,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: font.sub, color: colors.chipText, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },
  resultBox: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    borderRadius: radius.card,
    maxHeight: 340,
    overflow: 'hidden',
    ...shadow.card,
    elevation: 3,
  },
  resultHeader: {
    fontSize: font.caption,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultItemGray: { backgroundColor: colors.bg },
  resultName: { fontSize: font.body, fontWeight: 'bold', color: colors.primary },
  resultAddr: { fontSize: font.caption, color: colors.textSub, marginTop: 2 },
  textGray: { color: colors.textMuted },
  badgeOn: {
    fontSize: 11,
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  badgeOff: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});