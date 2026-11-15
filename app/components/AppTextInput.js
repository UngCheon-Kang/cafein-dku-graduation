import { forwardRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';

// 모든 화면 공용 입력창.
//
// [움찔거림의 원인]
// 지금까지 입력창들은 고정 height 없이 padding 으로만 크기가 잡혀 있어서,
// 높이가 "내용"에 따라 자동 계산됐다. 그래서 빈 칸(placeholder) → 첫 글자로 넘어갈 때
// iOS/Android가 텍스트 뷰 높이를 미세하게 다르게 재고, 그 1~2px 차이 때문에
// 칸이 "살짝 늘었다 줄었다" 하는 리플로우(움찔)가 생긴다. (첫 글자에서 특히 뚜렷)
//
// [해결]
// 한 줄 입력창은 내용과 무관하게 높이를 고정한다. 각 화면이 넘긴 style(폰트/패딩/테두리)
// 에서 자연 높이를 그대로 계산해 height 로 박으므로, 겉모습은 똑같고 높이만 안 변한다.
// 여러 줄(multiline) 입력창은 원래 늘어나야 하므로 고정하지 않는다.
const AppTextInput = forwardRef(function AppTextInput(
  { style, multiline = false, ...props },
  ref
) {
  const flat = StyleSheet.flatten(style) || {};
  const fontSize = flat.fontSize || 15;
  const lineHeight = flat.lineHeight || Math.round(fontSize * 1.3);

  // 한 줄 입력창의 고정 높이 = 한 줄 텍스트 높이 + 상하 패딩 + 상하 테두리
  // (React Native는 border-box라 height가 padding/border를 포함한다)
  let fixed = null;
  if (!multiline) {
    if (flat.height != null) {
      fixed = flat.height; // 화면이 이미 높이를 지정했으면 그대로 존중
    } else {
      const padTop = flat.paddingTop ?? flat.paddingVertical ?? flat.padding ?? 0;
      const padBottom = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0;
      const bTop = flat.borderTopWidth ?? flat.borderWidth ?? 0;
      const bBottom = flat.borderBottomWidth ?? flat.borderWidth ?? 0;
      fixed = Math.round(lineHeight) + padTop + padBottom + bTop + bBottom;
    }
  }

  return (
    <TextInput
      ref={ref}
      // 타이핑 중 뜨는 iOS '자동 완성'(AutoFill) 박스/예측 제안도 함께 끈다.
      autoCorrect={false}
      spellCheck={false}
      autoComplete="off"
      textContentType="none"
      importantForAutofill="no"
      multiline={multiline}
      underlineColorAndroid="transparent"
      style={[
        {
          includeFontPadding: false,
          lineHeight,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
        // height 는 화면 style 보다 뒤에 둬서, 한 줄 입력창은 항상 고정 높이가 이긴다.
        fixed != null ? { height: fixed } : null,
      ]}
      {...props}
    />
  );
});

export default AppTextInput;
