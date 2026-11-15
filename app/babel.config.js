module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // reanimated 4 + worklets: 플러그인은 반드시 목록의 맨 마지막에 있어야 함
    plugins: ['react-native-worklets/plugin'],
  };
};
