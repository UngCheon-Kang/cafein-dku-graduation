import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme';

export default function AccountScreen({ navigation }) {
  const Row = ({ icon, label, danger, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
        <Text style={[styles.label, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Row icon="person-outline" label="닉네임 변경" onPress={() => navigation.navigate('NicknameEdit')} />
      <Row icon="lock-closed-outline" label="비밀번호 변경" onPress={() => navigation.navigate('PasswordChange')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: font.body, color: colors.text },
});