// 이미지 업로드 전 JPEG로 변환한다.
// 아이폰 기본 HEIC/HEIF 포함해 어떤 포맷이든 JPEG로 통일 →
// 서버 화이트리스트(jpeg) 통과 + 안드로이드/웹에서도 정상 표시.
import * as ImageManipulator from 'expo-image-manipulator';

export async function toJpeg(uri, opts = {}) {
  const MAX = opts.maxDim ?? 1600;   // 긴 변 상한(px)
  const w = opts.width, h = opts.height;
  const actions = [];
  if (w && h) {
    // 원본이 상한보다 클 때만 축소(업스케일로 인한 뭉개짐 방지)
    const long = Math.max(w, h);
    if (long > MAX) actions.push(w >= h ? { resize: { width: MAX } } : { resize: { height: MAX } });
  } else {
    actions.push({ resize: { width: MAX } }); // 크기 모르면 가로 기준 축소
  }
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG } // 한 번만 압축
    );
    return result.uri;
  } catch (e) {
    console.log('⚠️ JPEG 변환 실패:', e?.message);
    return uri; // 실패 시 원본이라도 시도
  }
}
