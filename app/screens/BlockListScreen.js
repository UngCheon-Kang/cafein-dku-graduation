import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyBlocks, unblockUser } from '../api';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font } from '../theme';

export default function BlockListScreen() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getMyBlocks()
      .then((data) => setBlocks(data))
      .catch((e) => console.log('차단 목록 실패:', e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUnblock = (userId) => {
    Alert.alert('차단 해제', '이 사용자의 차단을 해제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          try {
            await unblockUser(userId);
            setBlocks((prev) => prev.filter((b) => b.blockedUserId !== userId));
          } catch (e) {
            Alert.alert('실패', e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{item.blockedNickname?.[0] ?? '?'}</Text>
        </View>
        <Text style={styles.nick}>{item.blockedNickname}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => handleUnblock(item.blockedUserId)}>
        <Text style={styles.btnText}>차단 해제</Text>
      </TouchableOpacity>
    </View>
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
        data={blocks}
        renderItem={renderItem}
        keyExtractor={(item) => item.blockedUserId.toString()}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>차단한 사용자가 없어요</Text>
            <Text style={styles.emptyDesc}>불편한 사용자를 차단하면 여기에서 관리할 수 있어요.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: colors.white, fontSize: font.sub, fontWeight: 'bold' },
  nick: { fontSize: font.body, color: colors.text },
  btn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnText: { color: colors.textSub, fontSize: font.sub, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 90, paddingHorizontal: 32 },
  emptyTitle: { fontSize: font.body, fontWeight: 'bold', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: font.sub, color: colors.textSub, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});