// 프랜차이즈 카페 이름 → 앱에 내장된 로고 이미지 매칭.
// 우선순위: 서버 실제 사진(thumbnailUrl) > 프랜차이즈 로고(이름 매칭) > 없음(호출부에서 아이콘)
//
// 로고 추가하는 법: assets/cafe-logos/ 에 파일 넣고 아래 배열에 { kw: '카페이름', img: require(...) } 추가.
// kw는 카페 이름에 포함되면 매칭됨(공백 무시). 겹치는 이름은 더 구체적인 걸 위에 둘 것.

const LOGOS = [
  { kw: '스타벅스', img: require('./assets/cafe-logos/starbucks.png') },
  { kw: '이디야', img: require('./assets/cafe-logos/ediya.png') },
  { kw: '투썸', img: require('./assets/cafe-logos/twosome.jpeg') },
  { kw: '컴포즈', img: require('./assets/cafe-logos/compose.png') },
  { kw: '빽다방', img: require('./assets/cafe-logos/paik.jpeg') },
  { kw: '할리스', img: require('./assets/cafe-logos/hollys.jpeg') },
  { kw: '커피빈', img: require('./assets/cafe-logos/coffeebean.png') },
  { kw: '엔제리너스', img: require('./assets/cafe-logos/angelinus.jpeg') },
  { kw: '탐앤탐스', img: require('./assets/cafe-logos/tomntoms.jpg') },
  { kw: '폴바셋', img: require('./assets/cafe-logos/paulbassett.jpeg') },
  { kw: '파스쿠찌', img: require('./assets/cafe-logos/pascucci.jpg') },
  { kw: '벤티프레소', img: require('./assets/cafe-logos/ventipresso.png') },
  { kw: '더벤티', img: require('./assets/cafe-logos/theventi.jpg') },
  { kw: '매머드', img: require('./assets/cafe-logos/mammoth.jpeg') },
  { kw: '더리터', img: require('./assets/cafe-logos/theliter.png') },
  { kw: '감성커피', img: require('./assets/cafe-logos/gamsung.jpeg') },
  { kw: '커피스미스', img: require('./assets/cafe-logos/coffeesmith.jpg') },
  { kw: '드롭탑', img: require('./assets/cafe-logos/droptop.jpeg') },
  { kw: '요거프레소', img: require('./assets/cafe-logos/yogerpresso.jpeg') },
  { kw: '셀렉토', img: require('./assets/cafe-logos/selecto.jpeg') },
  { kw: '카페베네', img: require('./assets/cafe-logos/caffebene.png') },
  { kw: '달콤커피', img: require('./assets/cafe-logos/dalkomm.jpeg') },
  { kw: '만랩', img: require('./assets/cafe-logos/manleb.jpg') },
  { kw: '토프레소', img: require('./assets/cafe-logos/topresso.jpeg') },
  { kw: '하삼동', img: require('./assets/cafe-logos/hasamdong.png') },
  { kw: '텐퍼센트', img: require('./assets/cafe-logos/tenpercent.jpeg') },
  { kw: '블루보틀', img: require('./assets/cafe-logos/bluebottle.png') },
  { kw: '커피에반하다', img: require('./assets/cafe-logos/banhada.jpg') },
  { kw: '공차', img: require('./assets/cafe-logos/gongcha.jpg') },
  { kw: '메가', img: require('./assets/cafe-logos/mega.jpeg') },
];

// 카페 이름으로 프랜차이즈 로고를 찾음 (없으면 null)
export function cafeLogo(name) {
  if (!name) return null;
  const n = name.replace(/\s/g, '');
  for (const { kw, img } of LOGOS) {
    if (n.includes(kw)) return img;
  }
  return null;
}

// 카페 카드/상세에 쓸 이미지 결정.
// 반환: { source, isLogo } 또는 null(둘 다 없음 → 호출부에서 아이콘 플레이스홀더 표시)
export function cafeImageSource(cafe) {
  if (cafe?.thumbnailUrl) return { source: { uri: cafe.thumbnailUrl }, isLogo: false };
  const logo = cafeLogo(cafe?.name);
  if (logo) return { source: logo, isLogo: true };
  return null;
}
