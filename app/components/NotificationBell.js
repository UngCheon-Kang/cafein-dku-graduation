import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getUnreadCount } from '../api';
import { getToken, requireLogin } from '../auth';
import { colors } from '../theme';

export default function NotificationBell() {
  const navigation = useNavigation();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getToken().then((token) => {
        if (!token) { setUnread(0); return; }
        getUnreadCount().then((d) => setUnread(d.count ?? 0)).catch(() => {});
      });
    }, [])
  );

  const handlePress = async () => {
    if (!(await requireLogin(navigation, '알림은 로그인 후 볼 수 있어요.'))) return;
    navigation.navigate('Notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.wrap}>
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 4 },
  badge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: colors.danger, borderRadius: 9,
    minWidth: 18, height: 18, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
});