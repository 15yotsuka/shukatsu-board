# ShukatsuBoard — Claude Code設定

セッション開始時に必ず `PLAN.md` を読むこと。

## 開発ルール
- `npm run build` エラー0件確認後にpush
- 実装完了後: `superpowers:verification-before-completion` 必須
- 大きな変更時: `superpowers:requesting-code-review` も実施
- コミット前に `git status` 確認 → `git add .` → コミット

## モデル使い分け
- **Sonnet:** UI変更・単一ファイル修正
- **Opus:** 型変更+マイグレーション・複数画面波及・データ設計判断
