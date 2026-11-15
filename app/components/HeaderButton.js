// 헤더(내비게이션 바) 우측 버튼 공통 래퍼.
// iOS 26 '리퀴드 글래스' 내비바는 버튼을 자동으로 유리 캡슐로 감싼다.
// 그래서 여기서는 수동 여백(marginRight)을 주지 않고 대칭 padding으로
// 적당한 히트영역만 확보한다 → iOS26(캡슐)/iOS17(납작)/Android 모두 정렬이 맞는다.
import { Platform, TouchableOpacity } from 'react-native';

export default function HeaderButton({ children, onPress, hitSlop = 8 }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={hitSlop}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        // 유리 캡슐이 없는 안드로이드/구형 iOS에서만 가장자리와 살짝 간격
        marginRight: Platform.OS === 'android' ? 4 : 0,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
