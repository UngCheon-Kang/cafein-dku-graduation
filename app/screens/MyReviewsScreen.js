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
import { getMyReviews } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { colors, spacing, radius, font, shadow } from '../theme';

export default function MyReviewsScreen({ navigation }) {
  const { items: reviews, loading, refreshing, loadingMore, reset, loadMore } = usePagedList();

  useEffect(() => {
    reset((p) => getMyReviews(p));
  }, [reset]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('CafeDetail', { cafeId: item.cafeId })}
    >
      <View style={styles.itemTop}>
        <Text style={styles.cafeName} numberOfLines={1}>{item.cafeName}</Text>
        <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Ionicons name="star" size={14} color="#F5A623" />
        <Text style={styles.score}>{item.score?.toFixed(1) ?? '0.0'}</Text>
      </View>
      <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
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
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={() => reset((p) => getMyReviews(p), { refresh: true })}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>작성한 리뷰가 없습니다.</Text>}
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
  cafeName: { fontSize: font.sub, fontWeight: 'bold', color: colors.primary, flex: 1, marginRight: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  score: { fontSize: font.body, fontWeight: 'bold', color: colors.text },
  content: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  meta: { fontSize: font.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});