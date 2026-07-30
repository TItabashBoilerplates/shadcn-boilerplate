// NativeWind v5 (react-native-css) は import-rewrite 方式のため、
// `nativewind/babel` preset や `jsxImportSource: "nativewind"` は不要
// （v4 以前の JSX 変換方式の名残であり、公式 v5 移行ガイドは明示的に削除を指示している。
//  https://www.nativewind.dev/v5/guides/migrate-from-v4 の Babel Configuration Changes 参照）。
//
// このファイル自体が無いと Metro は babel-preset-expo にフォールバックするが、
// react-native-reanimated 4 / react-native-worklets が要求する worklets babel plugin が
// 一切登録されず、`useAnimatedStyle` 等が動かない（ParallaxScrollView が壊れて画面が
// 真っ黒になる）。エラーは出ないので気づきにくい — 詳細は
// `.claude/skills/gluestack/SKILL.md` の「よくある詰まり」参照。
module.exports = (api) => {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 必ず最後に置くこと（公式ドキュメント指定）
      'react-native-worklets/plugin',
    ],
  }
}
