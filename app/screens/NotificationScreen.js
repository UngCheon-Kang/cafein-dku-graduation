import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markAllNotificationsRead, deleteNotification, deleteAllNotifications } from '../api';
import SwipeToDelete from '../components/SwipeToDelete';
import HeaderButton from '../components/HeaderButton';
import { timeAgo } from '../utils';
import { colors, spacing, font } from '../theme';

// 알림 타입별 아이콘 + 색
const ICON = {
  COMMENT: { name: 'chatbubble-outline', color: colors.primary },
  REPLY: { name: 'arrow-undo-outline', color: colors.primary },
  LIKE: { name: 'heart', color: colors.danger },
  STUDY_APPLY: { name: 'person-add-outline', color: colors.accent },
  STUDY_ACCEPTED: { name: 'checkmark-circle', color: colors.good },
  STUDY_REJECTED: { name: 'close-circle', color: colors.danger },
};

export default function NotificationScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getNotifications(0)
        .then(({ items: newItems, last: isLast }) => {
          if (!active) return;
          setItems(newItems);
          setLast(isLast);
          setPage(0);
        })
        .catch((e) => console.log('알림 로드 실패:', e.message))
        .finally(() => active && setLoading(false));
      markAllNotificationsRead().catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const loadMore = async () => {
    if (loadingMore || last) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items: newItems, last: isLast } = await getNotifications(next);
      setItems((prev) => [...prev, ...newItems]);
      setLast(isLast);
      setPage(next);
    } catch (e) {
      console.log('알림 추가 로드 실패:', e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try { await deleteNotification(id); } catch (e) { console.log('알림 삭제 실패:', e.message); }
  };

  const handleDeleteAll = () => {
    if (items.length === 0) return;
    Alert.alert('알림 전체 삭제', '모든 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '전체 삭제',
        style: 'destructive',
        onPress: async () => {
          setItems([]);
          try { await deleteAllNotifications(); } catch (e) { Alert.alert('실패', e.message); }
        },
      },
    ]);
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        items.length > 0 ? (
          <HeaderButton onPress={handleDeleteAll}>
            <Text style={{ color: colors.textSub, fontSize: font.sub, fontWeight: '600' }}>전체 삭제</Text>
          </HeaderButton>
        ) : null,
    });
  }, [items.length]);

  const handlePress = (item) => {
    if (item.targetFeedId) {
      navigation.navigate('FeedDetail', { feedId: item.targetFeedId });
    }
  };

  const renderItem = ({ item }) => {
    const ic = ICON[item.type] ?? { name: 'notifications-outline', color: colors.primary };
    return (
      <SwipeToDelete onAction={() => handleDelete(item.id)}>
        <TouchableOpacity
          style={[styles.item, !item.isRead && styles.itemUnread]}
          onPress={() => handlePress(item)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={ic.name} size={18} color={ic.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </SwipeToDelete>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>알림이 없어요.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemUnread: { backgroundColor: colors.chipBg },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: { fontSize: font.sub, color: colors.text, lineHeight: 20 },
  time: { fontSize: font.caption, color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});