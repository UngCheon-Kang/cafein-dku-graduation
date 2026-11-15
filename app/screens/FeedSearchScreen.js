import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils';
import { requireLogin, getUser } from '../auth';
import { searchFeeds } from '../api';
import { colors, radius, font } from '../theme';
import SegmentedControl from '../components/SegmentedControl';

const TYPES = [
  { label: '제목', value: 'title' },
  { label: '내용', value: 'content' },
  { label: '작성자', value: 'author' },
];
const TYPE_LABEL = { FREE: '자유', CAFE_REC: '카페추천', STUDY: '스터디모집' };

export default function FeedSearchScreen({ navigation }) {
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('title');
  const [feeds, setFeeds] = useState([]);
  const [users, setUsers] = useState([]);
  const [resultType, setResultType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const revealAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 190, mass: 0.7 }).start();
  }, []);

  const [myUserId, setMyUserId] = useState(null);
  useEffect(() => {
    getUser().then((u) => setMyUserId(u?.userId));
  }, []);

  const doSearch = async (searchType = type) => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchFeeds(keyword.trim(), searchType);
      if (data.type === 'author') {
        setUsers(data.users ?? []);
        setFeeds([]);
        setResultType('author');
      } else {
        setFeeds(data.feeds?.content ?? []);
        setUsers([]);
        setResultType('feed');
      }
    } catch (e) {
      console.log('검색 실패:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFeed = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={async () => {
        if (!(await requireLogin(navigation, '피드 상세는 로그인 후 볼 수 있어요.'))) return;
        navigation.navigate('FeedDetail', { feedId: item.id });
      }}
    >
      <View style={styles.itemTop}>
        <Text style={styles.badge}>{TYPE_LABEL[item.feedType]}</Text>
        <Text style={styles.meta}>{item.nickname} · {timeAgo(item.createdAt)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
    </TouchableOpacity>
  );

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={async () => {
        if (item.id === myUserId) {
          navigation.navigate('Main', { screen: '마이페이지' });
          return;
        }
        if (!(await requireLogin(navigation, '사용자 프로필은 로그인 후 볼 수 있어요.'))) return;
        navigation.navigate('UserProfile', { userId: item.id, nickname: item.nickname });
      }}
    >
      <View style={styles.userLeft}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarLetter}>{item.nickname?.[0] ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.userNick}>{item.nickname}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View
        style={{
          opacity: revealAnim,
          transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }}
      >
        <AppTextInput
          style={styles.search}
          placeholder="검색어 입력 후 확인"
          placeholderTextColor={colors.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => doSearch()}
          returnKeyType="search"
          autoFocus
        />
      </Animated.View>

      <View style={styles.typeWrap}>
        <SegmentedControl
          options={TYPES}
          value={type}
          onChange={(v) => {
            setType(v);
            if (keyword.trim()) doSearch(v);
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : resultType === 'author' ? (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={searched ? <Text style={styles.empty}>결과가 없습니다.</Text> : null}
        />
      ) : (
        <FlatList
          data={feeds}
          renderItem={renderFeed}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={searched ? <Text style={styles.empty}>결과가 없습니다.</Text> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    fontSize: font.body,
    color: colors.text,
    margin: 16,
    marginBottom: 8,
  },
  typeWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 14 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: {
    fontSize: font.caption,
    color: colors.chipText,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  title: { fontSize: font.h3, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  content: { fontSize: font.body, color: colors.textSub, lineHeight: 20 },
  meta: { fontSize: font.caption, color: colors.textMuted },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  userAvatarLetter: { color: colors.white, fontSize: font.sub, fontWeight: 'bold' },
  userNick: { fontSize: font.body, fontWeight: 'bold', color: colors.primary },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});