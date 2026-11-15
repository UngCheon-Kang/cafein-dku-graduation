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
import { getMyComments } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { getUser } from '../auth';
import { colors, spacing, radius, font, shadow } from '../theme';

export default function MyCommentsScreen({ navigation }) {
  const { items: comments, loading, refreshing, loadingMore, reset, loadMore } = usePagedList();
  const [uid, setUid] = useState(null);

  useEffect(() => {
    getUser().then((u) => setUid(u?.userId));
  }, []);
  useEffect(() => {
    if (uid != null) reset((p) => getMyComments(uid, p));
  }, [uid, reset]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('FeedDetail', { feedId: item.feedId })}
    >
      <View style={styles.feedRow}>
        <Ionicons name="document-text-outline" size={14} color={colors.textSub} />
        <Text style={styles.feedTitle} numberOfLines={1}>{item.feedTitle}</Text>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.meta}>
        {item.parentId ? '답글' : '댓글'} · {timeAgo(item.createdAt)}
      </Text>
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
        data={comments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={() => uid != null && reset((p) => getMyComments(uid, p), { refresh: true })}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>작성한 댓글이 없습니다.</Text>}
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
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  feedTitle: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, flex: 1 },
  content: { fontSize: font.body, color: colors.text, lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: font.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});