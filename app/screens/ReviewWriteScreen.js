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
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import * as ImagePicker from 'expo-image-picker';
import { toJpeg } from '../imageUtils';
import { createReview, updateReview, uploadImage } from '../api';
import { colors, spacing, radius, font } from '../theme';

// 카공지수 항목별 선택지 (라벨: 화면 표시, value: 서버로 보낼 enum)
const OPTIONS = {
  wifi: [
    { label: '느림', value: 'SLOW', kind: 'bad' },
    { label: '보통', value: 'NORMAL', kind: 'mid' },
    { label: '빠름', value: 'FAST', kind: 'good' },
  ],
  outlet: [
    { label: '적음', value: 'FEW', kind: 'bad' },
    { label: '보통', value: 'NORMAL', kind: 'mid' },
    { label: '많음', value: 'MANY', kind: 'good' },
  ],
  seat: [
    { label: '적음', value: 'FEW', kind: 'bad' },
    { label: '보통', value: 'NORMAL', kind: 'mid' },
    { label: '많음', value: 'MANY', kind: 'good' },
  ],
  noise: [
    { label: '시끄러움', value: 'LOUD', kind: 'bad' },
    { label: '보통', value: 'NORMAL', kind: 'mid' },
    { label: '조용함', value: 'QUIET', kind: 'good' },
  ],
};

// 정도별 색 (카페 상세의 카공지수 색과 동일 계열)
const KIND = {
  good: { color: '#4F9E80', bg: 'rgba(79,158,128,0.14)' },   // 살짝 초록
  bad: { color: '#C0885B', bg: 'rgba(192,136,91,0.16)' },    // 살짝 노랑(카라멜)
  mid: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },   // 무채색
};

const MAX_IMAGES = 5;

export default function ReviewWriteScreen({ route, navigation }) {
  const editReview = route.params?.editReview ?? null;
  const isEdit = !!editReview;
  const place = route.params?.place ?? null;

  const displayName = isEdit ? route.params.cafeName : place.name;
  const displayAddress = isEdit ? route.params.cafeAddress : place.address;

  const [content, setContent] = useState(editReview?.content ?? '');
  const [wifi, setWifi] = useState(editReview?.wifiScore ?? null);
  const [outlet, setOutlet] = useState(editReview?.outletScore ?? null);
  const [seat, setSeat] = useState(editReview?.seatScore ?? null);
  const [noise, setNoise] = useState(editReview?.noiseScore ?? null);
  const [loading, setLoading] = useState(false);

  // 선택한 이미지들 { uri, type }
  const [images, setImages] = useState(
    (editReview?.imageKeys ?? []).map((key, i) => ({
      key,
      url: editReview?.imageUrls?.[i],
      existing: true,
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

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 1,
    });
    if (!result.canceled) {
      const picked = await Promise.all(
        result.assets.map(async (a) => ({
          uri: await toJpeg(a.uri, { width: a.width, height: a.height }),
          type: 'image/jpeg',
        }))
      );
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '리뷰 내용을 입력해주세요.');
      return;
    }
    if (!wifi || !outlet || !seat || !noise) {
      Alert.alert('알림', '카공지수 4개 항목을 모두 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const imageKeys = await Promise.all(
          images.map((img) =>
            img.existing ? img.key : uploadImage(img.uri, img.type, 'reviews')
          )
        );
        await updateReview(editReview.id, {
          content,
          wifiScore: wifi,
          outletScore: outlet,
          seatScore: seat,
          noiseScore: noise,
          imageKeys,
        });
        Alert.alert('완료', '리뷰가 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        // 이미지 먼저 S3 업로드 → key 배열
        let imageKeys = [];
        if (images.length > 0) {
          imageKeys = await Promise.all(
            images.map((img) => uploadImage(img.uri, img.type, 'reviews'))
          );
        }

        await createReview({
          kakaoPlaceId: place.kakaoPlaceId,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          phone: place.phone,
          placeUrl: place.placeUrl,
          content,
          wifiScore: wifi,
          outletScore: outlet,
          seatScore: seat,
          noiseScore: noise,
          imageKeys,
        });
        // navigate('Main')은 v7에서 Main을 새로 push → 뒤로가기 시 작성창이 다시 뜸. 작성창을 스택에서 빼야 함.
        Alert.alert('완료', '리뷰가 등록되었습니다.', [
          {
            text: '확인',
            onPress: () =>
              route.params?.returnBack
                ? navigation.goBack() // 카페 상세에서 왔으면 상세로 (내 리뷰 바로 보임)
                : navigation.popTo('Main', { screen: '홈' }),
          },
        ]);
      }
    } catch (e) {
      Alert.alert('실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSelector = (title, options, selected, onSelect) => (
    <View style={styles.selectorBlock}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <View style={styles.optionRow}>
        {options.map((opt) => {
          const active = selected === opt.value;
          const k = KIND[opt.kind];
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionBtn,
                active && { backgroundColor: k.bg, borderColor: k.color },
              ]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[styles.optionText, active && { color: k.color, fontWeight: 'bold' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 20 + kbHeight }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.cafeName}>{displayName}</Text>
      <Text style={styles.address}>{displayAddress}</Text>

      <Text style={styles.sectionTitle}>카공지수 평가</Text>
      {renderSelector('와이파이', OPTIONS.wifi, wifi, setWifi)}
      {renderSelector('콘센트', OPTIONS.outlet, outlet, setOutlet)}
      {renderSelector('좌석', OPTIONS.seat, seat, setSeat)}
      {renderSelector('소음', OPTIONS.noise, noise, setNoise)}

      <Text style={styles.sectionTitle}>리뷰</Text>
      <AppTextInput
        style={styles.textArea}
        placeholder="카페에 대한 후기를 남겨주세요 (최대 500자)"
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
      />

      {/* 사진 첨부 (작성/수정 모두) */}
      <Text style={styles.sectionTitle}>사진 ({images.length}/{MAX_IMAGES})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
  cafeName: { fontSize: font.h1, fontWeight: 'bold', color: colors.primary },
  address: { fontSize: font.sub, color: colors.textSub, marginTop: 4 },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  selectorBlock: { marginBottom: spacing.lg },
  selectorTitle: { fontSize: font.sub, color: colors.textSub, marginBottom: spacing.sm },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: { color: colors.textSub, fontSize: font.sub },
  optionTextActive: { color: colors.white, fontWeight: 'bold' },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
    height: 120,
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
    backgroundColor: 'rgba(17,18,20,0.75)',
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
});