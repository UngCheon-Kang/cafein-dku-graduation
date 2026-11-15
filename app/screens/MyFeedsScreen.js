import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils';
import { getMyFeeds } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { getUser } from '../auth';
import { colors, spacing, radius, font, shadow } from '../theme';

const TYPE_LABEL = {
  FREE: '자유',
  CAFE_REC: '카페추천',
  STUDY: '스터디모집',
};

export default function MyFeedsScreen({ navigation }) {
  const { items: feeds, loading, refreshing, loadingMore, reset, loadMore } = usePagedList();
  const [uid, setUid] = useState(null);

  useEffect(() => {
    getUser().then((u) => setUid(u?.userId));
  }, []);
  useEffect(() => {
    if (uid != null) reset((p) => getMyFeeds(uid, p));
  }, [uid, reset]);

  const renderItem = ({ item }) => (
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
      <Text style={styles.itemContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
        <Text style={styles.meta}>{item.likeCount}</Text>
        <Ionicons name="eye-outline" size={14} color={colors.textMuted} style={{ marginLeft: 10 }} />
        <Text style={styles.meta}>{item.viewCount}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={feeds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={() => uid != null && reset((p) => getMyFeeds(uid, p), { refresh: true })}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>작성한 글이 없습니다.</Text>}
        contentContainerStyle={{ padding: spacing.lg }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  itemContent: { fontSize: font.body, color: colors.textSub, marginBottom: 8, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: font.caption, color: colors.textMuted, marginLeft: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});