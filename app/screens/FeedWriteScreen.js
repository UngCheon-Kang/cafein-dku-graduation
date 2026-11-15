import { useState, useEffect } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Keyboard,
  Platform,
  Modal,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { toJpeg } from '../imageUtils';
import { createFeed, updateFeed, uploadImage } from '../api';
import { colors, spacing, radius, font } from '../theme';

// 피드 유형 선택지
const TYPES = [
  { label: '자유', value: 'FREE' },
  { label: '카페추천', value: 'CAFE_REC' },
  { label: '스터디모집', value: 'STUDY' },
];

const MAX_IMAGES = 3;

// 날짜/시간 포맷 헬퍼
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const fmtTime = (d) => {
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `${ampm} ${h}:${pad(d.getMinutes())}`;
};
const toLocalISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export default function FeedWriteScreen({ route, navigation }) {
  const editFeed = route.params?.feed ?? null;
  const isEdit = !!editFeed;
  const preCafe = route.params?.cafe ?? null;

  const [feedType, setFeedType] = useState(
    editFeed?.feedType ?? (preCafe ? 'CAFE_REC' : null)
  );
  const [title, setTitle] = useState(editFeed?.title ?? '');
  const [content, setContent] = useState(editFeed?.content ?? '');
  const [cafe, setCafe] = useState(preCafe ?? editFeed?.cafe ?? null);
  const [loading, setLoading] = useState(false);

  // 스터디 입력
  const [location, setLocation] = useState('');
  const [meetAt, setMeetAt] = useState(null);
  const [capacity, setCapacity] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const isIOS = Platform.OS === 'ios';
  // iOS 모달 스피너용 임시값 (완료 눌러야 반영)
  const [tempDateTime, setTempDateTime] = useState(new Date());

  const openDate = () => {
    setTempDateTime(meetAt ?? new Date());
    setShowDate(true);
  };
  const openTime = () => {
    setTempDateTime(meetAt ?? new Date());
    setShowTime(true);
  };
  // iOS 모달 '완료'
  const confirmIOS = () => {
    setMeetAt(new Date(tempDateTime));
    setShowDate(false);
    setShowTime(false);
  };
  const cancelIOS = () => {
    setShowDate(false);
    setShowTime(false);
  };

  // 선택한 이미지들 { uri, type }
  const [images, setImages] = useState(
    (editFeed?.imageKeys ?? []).map((key, i) => ({
      key,
      url: editFeed?.imageUrls?.[i],
      existing: true,
      uploading: false,
    }))
  );

  // 키보드 높이 측정 (입력 시 하단 스크롤 여백 확보)
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (route.params?.cafe) {
      setCafe(route.params.cafe);
      setFeedType('CAFE_REC');
    }
  }, [route.params?.cafe]);

  const onDateChange = (event, selected) => {
    setShowDate(false);
    if (event.type === 'set' && selected) {
      const base = meetAt ?? new Date();
      const d = new Date(selected);
      d.setHours(base.getHours(), base.getMinutes(), 0, 0);
      setMeetAt(d);
    }
  };
  const onTimeChange = (event, selected) => {
    setShowTime(false);
    if (event.type === 'set' && selected) {
      const base = meetAt ?? new Date();
      const d = new Date(base);
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setMeetAt(d);
    }
  };

  // 사진 고르기 → 고른 즉시 S3 업로드 시작
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 1,
    });
    if (result.canceled) return;

    const picked = result.assets.map((a) => ({
      uri: a.uri,
      type: a.mimeType ?? 'image/jpeg',
      width: a.width,
      height: a.height,
      uploading: true,   // 업로드 중
      key: null,
    }));

    // 화면에 먼저 추가 (썸네일 + 업로드중 표시)
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));

    // 각 사진을 바로 업로드하고, 끝나면 key 채우기
    picked.forEach(async (img) => {
      try {
        const jpegUri = await toJpeg(img.uri, { width: img.width, height: img.height });
        const key = await uploadImage(jpegUri, 'image/jpeg', 'feeds');
        setImages((prev) =>
          prev.map((it) => (it.uri === img.uri ? { ...it, key, uploading: false } : it))
        );
      } catch (e) {
        setImages((prev) => prev.filter((it) => it.uri !== img.uri));
        Alert.alert('업로드 실패', '사진 업로드에 실패했어요. 다시 시도해주세요.');
      }
    });
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!feedType) {
      Alert.alert('알림', '게시글 유형을 선택해주세요.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      Alert.alert('알림', '제목과 내용을 입력해주세요.');
      return;
    }
    if (feedType === 'CAFE_REC' && !cafe) {
      Alert.alert('알림', '추천할 카페를 연결해주세요. 카페 상세 페이지의 "추천 글쓰기"로 작성할 수 있어요.');
      return;
    }
    if (feedType === 'STUDY' && !isEdit) {
      if (!location.trim() || !meetAt || !capacity) {
        Alert.alert('알림', '장소·일시·정원을 모두 입력해주세요.');
        return;
      }
    }

    // 아직 업로드 중인 사진이 있으면 대기
    if (images.some((img) => img.uploading)) {
      Alert.alert('알림', '사진 업로드가 끝날 때까지 잠시 기다려주세요.');
      return;
    }

    setLoading(true);
    try {
      // 사진은 고를 때 이미 업로드됨 → key만 수집
      const imageKeys = images.map((img) => img.key).filter(Boolean);

      if (isEdit) {
        await updateFeed(editFeed.id, title, content, imageKeys);
        Alert.alert('완료', '게시글이 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        // 카페추천일 때만 cafeId 첨부 (다른 유형에 카페가 새어들어가지 않게)
        const body = {
          feedType,
          title,
          content,
          cafeId: feedType === 'CAFE_REC' ? (cafe?.id ?? null) : null,
          imageKeys,
        };
        if (feedType === 'STUDY') {
          body.location = location.trim();
          body.meetAt = toLocalISO(meetAt);
          body.capacity = Number(capacity);
        }
        await createFeed(body);
        Alert.alert('완료', '게시글이 등록되었습니다.', [
          {
            text: '확인',
            // navigate는 Main을 새로 push해서 뒤로가기 시 작성창이 다시 뜸(중복 등록 위험) → popTo로 작성창 제거
            onPress: () => navigation.popTo('Main', { screen: '커뮤니티' }),
          },
        ]);
      }
    } catch (e) {
      Alert.alert('실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 20 + kbHeight }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>유형</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.typeBtn,
              feedType === t.value && styles.typeBtnActive,
              isEdit && styles.typeBtnDisabled,
            ]}
            onPress={() => {
              if (isEdit) return;
              setFeedType(t.value);
              // 유형을 바꾸면 다른 유형 전용 입력값 초기화 (교차 오염 방지)
              if (t.value !== 'CAFE_REC') setCafe(null);
              if (t.value !== 'STUDY') {
                setLocation('');
                setMeetAt(null);
                setCapacity('');
              }
            }}
          >
            <Text
              style={[
                styles.typeText,
                feedType === t.value && styles.typeTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 카페추천이면 연결된 카페 표시 */}
      {feedType === 'CAFE_REC' && (
        <>
          <Text style={styles.label}>추천 카페</Text>
          {cafe ? (
            <View style={styles.cafeBox}>
              <Text style={styles.cafeName}>{cafe.name}</Text>
              {cafe.address ? (
                <Text style={styles.cafeAddr} numberOfLines={1}>{cafe.address}</Text>
              ) : null}
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.cafeSelectBtn}
            onPress={() => navigation.navigate('CafePicker')}
          >
            <Text style={styles.cafeSelectText}>
              {cafe ? '카페 변경' : '카페 선택'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* 스터디모집이면 장소/일시/정원 입력 (작성 시에만) */}
      {feedType === 'STUDY' && !isEdit && (
        <>
          <Text style={styles.label}>장소</Text>
          <AppTextInput
            style={styles.input}
            placeholder="예: 강남역 스타벅스 1층"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />

          <Text style={styles.label}>일시</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={openDate}>
              <Text style={[styles.dateBtnText, !meetAt && styles.dateBtnPlaceholder]}>
                {meetAt ? fmtDate(meetAt) : '날짜'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={openTime}>
              <Text style={[styles.dateBtnText, !meetAt && styles.dateBtnPlaceholder]}>
                {meetAt ? fmtTime(meetAt) : '시간'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>정원</Text>
          <AppTextInput
            style={styles.input}
            placeholder="예: 4"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            maxLength={2}
          />

          {/* Android: 네이티브 다이얼로그 그대로 */}
          {!isIOS && showDate && (
            <DateTimePicker value={meetAt ?? new Date()} mode="date" onChange={onDateChange} />
          )}
          {!isIOS && showTime && (
            <DateTimePicker value={meetAt ?? new Date()} mode="time" is24Hour={false} onChange={onTimeChange} />
          )}

          {/* iOS: 하단 시트 모달 + 스피너 + 완료 */}
          {isIOS && (showDate || showTime) && (
            <Modal transparent animationType="slide" visible onRequestClose={cancelIOS}>
              <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={cancelIOS} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerBar}>
                  <TouchableOpacity onPress={cancelIOS} hitSlop={10}>
                    <Text style={styles.pickerCancel}>취소</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>{showDate ? '날짜 선택' : '시간 선택'}</Text>
                  <TouchableOpacity onPress={confirmIOS} hitSlop={10}>
                    <Text style={styles.pickerDone}>완료</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDateTime}
                  mode={showDate ? 'date' : 'time'}
                  is24Hour={false}
                  display="spinner"
                  locale="ko-KR"
                  themeVariant="light"
                  onChange={(e, selected) => selected && setTempDateTime(selected)}
                  style={styles.pickerSpinner}
                />
              </View>
            </Modal>
          )}
        </>
      )}

      <Text style={styles.label}>제목</Text>
      <AppTextInput
        style={styles.input}
        placeholder="제목을 입력하세요"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.label}>내용</Text>
      <AppTextInput
        style={styles.textArea}
        placeholder="내용을 입력하세요"
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={2000}
      />

      {/* 사진 첨부 (작성 시에만) */}
      <Text style={styles.label}>사진 ({images.length}/{MAX_IMAGES})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {images.map((img, idx) => (
          <View key={idx} style={styles.thumbWrap}>
            <Image source={{ uri: img.existing ? img.url : img.uri }} style={styles.thumb} />
            <TouchableOpacity style={styles.thumbX} onPress={() => removeImage(idx)}>
              <Text style={styles.thumbXText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {images.length < MAX_IMAGES && (
          <TouchableOpacity style={styles.addPhoto} onPress={pickImages}>
            <Text style={styles.addPhotoText}>＋</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isEdit ? '수정하기' : '등록하기'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: {
    fontSize: font.sub,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnDisabled: { opacity: 0.5 },
  typeText: { color: colors.textSub, fontSize: font.sub },
  typeTextActive: { color: colors.white, fontWeight: 'bold' },
  cafeBox: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.chipBg,
  },
  cafeName: { fontSize: font.body, fontWeight: 'bold', color: colors.primary },
  cafeAddr: { fontSize: font.sub, color: colors.textSub, marginTop: 4 },
  cafeHint: { fontSize: font.sub, color: colors.textMuted, lineHeight: 20 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  dateBtnText: { color: colors.primary, fontSize: font.body },
  dateBtnPlaceholder: { color: colors.textMuted },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingBottom: 24,
  },
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  pickerCancel: { fontSize: font.body, color: colors.textSub },
  pickerDone: { fontSize: font.body, color: colors.accent, fontWeight: '700' },
  pickerSpinner: { alignSelf: 'stretch' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
    height: 160,
    textAlignVertical: 'top',
  },
  thumbWrap: { marginRight: 8, position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.chipBg },
  thumbX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbXText: { color: colors.white, fontSize: 14, fontWeight: 'bold', lineHeight: 16 },
  addPhoto: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: { fontSize: 28, color: colors.textMuted },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: 40,
  },
  submitText: { color: colors.white, fontSize: font.body, fontWeight: 'bold' },
  cafeSelectBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  cafeSelectText: { color: colors.primary, fontSize: font.sub, fontWeight: 'bold' },
});