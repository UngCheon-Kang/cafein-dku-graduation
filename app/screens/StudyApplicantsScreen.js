import { useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStudyApplicants, acceptApplication, rejectApplication, createChatRoom } from '../api';
import { colors, spacing, radius, font, shadow } from '../theme';

const STATUS_LABEL = { PENDING: '대기중', ACCEPTED: '참여중', REJECTED: '거절됨' };

export default function StudyApplicantsScreen({ route, navigation }) {
  const { studyId } = route.params;
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getStudyApplicants(studyId)
      .then((data) => setApplicants(data))
      .catch((e) => Alert.alert('오류', e.message))
      .finally(() => setLoading(false));
  }, [studyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAccept = async (id) => {
    try { await acceptApplication(id); load(); }
    catch (e) { Alert.alert('오류', e.message); }
  };
  const handleReject = async (id) => {
    try { await rejectApplication(id); load(); }
    catch (e) { Alert.alert('오류', e.message); }
  };
  const handleChat = async (userId, nickname) => {
    try {
      const room = await createChatRoom(userId);
      navigation.navigate('ChatRoom', { roomId: room.roomId, partnerNickname: nickname, partnerId: userId });
    } catch (e) { Alert.alert('오류', e.message); }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{item.nickname?.[0] ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.nick}>{item.nickname}</Text>
        <Text style={[styles.badge, styles['badge_' + item.status]]}>
          {STATUS_LABEL[item.status]}
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(item.userId, item.nickname)}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.text} />
          <Text style={styles.chatBtnText}>채팅</Text>
        </TouchableOpacity>

        {item.status === 'PENDING' && (
          <>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.applicationId)}>
              <Text style={styles.acceptBtnText}>수락</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.applicationId)}>
              <Text style={styles.rejectBtnText}>거절</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'ACCEPTED' && (
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.applicationId)}>
            <Text style={styles.rejectBtnText}>내보내기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={applicants}
        renderItem={renderItem}
        keyExtractor={(item) => item.applicationId.toString()}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={<Text style={styles.empty}>아직 신청자가 없어요.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: font.sub, fontWeight: 'bold' },
  nick: { fontSize: font.body, fontWeight: 'bold', color: colors.primary, flex: 1 },
  badge: { fontSize: font.caption, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden', fontWeight: 'bold' },
  badge_PENDING: { backgroundColor: 'rgba(46,124,246,0.12)', color: colors.accent },
  badge_ACCEPTED: { backgroundColor: 'rgba(46,158,107,0.14)', color: '#2E9E6B' },
  badge_REJECTED: { backgroundColor: colors.chipBg, color: colors.textSub },
  btnRow: { flexDirection: 'row', gap: 8 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chatBtnText: { color: colors.text, fontSize: font.sub, fontWeight: 'bold' },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 18, justifyContent: 'center' },
  acceptBtnText: { color: colors.white, fontSize: font.sub, fontWeight: 'bold' },
  rejectBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 14, justifyContent: 'center' },
  rejectBtnText: { color: colors.textSub, fontSize: font.sub, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});