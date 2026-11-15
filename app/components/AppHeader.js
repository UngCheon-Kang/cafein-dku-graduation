import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from './NotificationBell';
import { colors, spacing, font } from '../theme';

export default function AppHeader({ title, onSearch }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {onSearch && (
          <TouchableOpacity onPress={onSearch} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: font.h2, fontWeight: 'bold', color: colors.primary },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 4 },
});