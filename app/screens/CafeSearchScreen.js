import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { searchCafes, getAllCafes } from '../api';
import { requireLogin } from '../auth';
import { colors, spacing, radius, font } from '../theme';

export default function CafeSearchScreen({ navigation }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const revealAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 190, mass: 0.7 }).start();
  }, []);

  useEffect(() => {
    getAllCafes()
      .then((data) => setCafes(data))
      .catch((e) => console.log('카페 로드 실패:', e.message));
  }, []);

  const findMyCafe = (kakaoPlaceId) =>
    cafes.find((c) => c.kakaoPlaceId === kakaoPlaceId);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchCafes(keyword);
      setResults(data.cafes || []);
    } catch (e) {
      console.log('검색 실패:', e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (place) => {
    const myCafe = findMyCafe(place.kakaoPlaceId);
    if (myCafe) {
      navigation.navigate('CafeDetail', { cafeId: myCafe.id });
    } else {
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

  const renderItem = ({ item }) => {
    const registered = !!findMyCafe(item.kakaoPlaceId);
    return (
      <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.name, !registered && styles.textGray]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.address, !registered && styles.textGray]} numberOfLines={1}>{item.address}</Text>
        </View>
        <Text style={registered ? styles.badgeOn : styles.badgeOff}>
          {registered ? '리뷰 있음' : '미등록'}
        </Text>
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
      <Animated.View
        style={{
          opacity: revealAnim,
          transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }}
      >
        <View style={styles.searchBar}>
          <AppTextInput
            style={styles.input}
            placeholder="카페 이름을 검색하세요"
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={sortedResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.kakaoPlaceId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searched ? '검색 결과가 없습니다.' : '카페를 검색해보세요.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: font.body,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary },
  address: { fontSize: font.sub, color: colors.textSub, marginTop: 4 },
  badgeOn: {
    fontSize: font.caption, color: colors.white, backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden',
  },
  badgeOff: {
    fontSize: font.caption, color: colors.textMuted, backgroundColor: colors.chipBg,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden',
  },
  textGray: { color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});