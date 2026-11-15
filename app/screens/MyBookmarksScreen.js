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
import { getMyBookmarks } from '../api';
import { usePagedList } from '../hooks/usePagedList';
import { colors, spacing, radius, font, shadow } from '../theme';

export default function MyBookmarksScreen({ navigation }) {
  const { items: cafes, loading, refreshing, loadingMore, reset, loadMore } = usePagedList();

  useEffect(() => {
    reset((p) => getMyBookmarks(p));
  }, [reset]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('CafeDetail', { cafeId: item.id })}
    >
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="star" size={12} color="#F5A623" />
        <Text style={styles.meta}>{item.score?.toFixed(1) ?? '0.0'} · 리뷰 {item.reviewCount}</Text>
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
        data={cafes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={() => reset((p) => getMyBookmarks(p), { refresh: true })}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>북마크한 카페가 없습니다.</Text>}
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
  name: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  address: { fontSize: font.sub, color: colors.textSub, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: font.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});