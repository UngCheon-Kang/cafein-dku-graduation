import { useState, useEffect } from 'react';
import {
  View,
  Text,

  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCafes } from '../api';
import { colors, spacing, radius, font } from '../theme';

export default function CafePickerScreen({ navigation }) {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      getCafes('score', undefined, undefined, keyword)
        .then((data) => setCafes(data))
        .catch((e) => console.log('카페 목록 실패:', e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const selectCafe = (item) => {
    navigation.navigate('FeedWrite', {
      cafe: {
        id: item.id,
        name: item.name,
        address: item.address,
        score: item.score,
      },
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => selectCafe(item)}>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="star" size={12} color="#F5A623" />
        <Text style={styles.meta} numberOfLines={1}>
          {item.score?.toFixed(1) ?? '-'} · {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppTextInput
        style={styles.search}
        placeholder="카페 이름 검색"
        placeholderTextColor={colors.textMuted}
        value={keyword}
        onChangeText={setKeyword}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={cafes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.empty}>검색 결과가 없습니다.</Text>}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
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
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
  },
  name: { fontSize: font.h3, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: font.sub, color: colors.textSub, flexShrink: 1 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});