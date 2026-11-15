import { Modal, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { colors, font } from '../theme';
import { reportContent } from '../api';

const REPORT_REASONS = [
  { label: '스팸/광고', value: 'SPAM' },
  { label: '욕설/비방', value: 'ABUSE' },
  { label: '음란물/불건전', value: 'OBSCENE' },
  { label: '기타', value: 'ETC' },
];

export default function ReportSheet({ target, onClose }) {
  const submit = async (reason) => {
    if (!target) return;
    try {
      await reportContent(target.type, target.id, reason);
      onClose();
      Alert.alert('완료', '신고가 접수되었습니다.');
    } catch (e) {
      onClose();
      Alert.alert('실패', e.message);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>신고 사유</Text>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity key={r.value} style={styles.item} onPress={() => submit(r.value)}>
              <Text style={styles.itemText}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 8, paddingBottom: 24 },
  title: { fontSize: font.sub, fontWeight: 'bold', color: colors.textSub, textAlign: 'center', paddingVertical: 14 },
  item: { paddingVertical: 16, alignItems: 'center' },
  itemText: { fontSize: font.h3, color: colors.text },
  cancel: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: font.h3, color: colors.danger, fontWeight: 'bold' },
});