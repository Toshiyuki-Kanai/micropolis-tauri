# Micropolis v0.1.0 リリース準備状況

2026-10-19更新。素材のライセンス問題は、元GPL公開版へ限定することで解決。アプリとDMGのDeveloper ID署名・Apple公証・Stapling・Gatekeeper検証が完了。ユーザーによる最終DMGからのインストールと手動プレイも成功。Commit・Push・main向けPR作成が承認された。

## 確認した構成

- ブランチ：`codex/tauri-macos`。基準Commit：`4940add8365007753711367bd93afe9e4cf0a24e`。このCommitは基準Commitにv0.1.0の最終変更を追加する。
- origin：`https://github.com/Toshiyuki-Kanai/micropolis-tauri.git`。upstream：`https://github.com/SimHacker/MicropolisCore.git`。
- Micropolis 0.1.0、Bundle ID `io.github.toshiyuki-kanai.micropolis-tauri`。
- Apple Silicon arm64、macOS 13以降。Tauri 2.12.4、dialog 2.8.3、fs 2.7.1。
- Releaseビルド成功。ゲームのC++ロジック、都市データ、保存形式は変更していない。
- Developer ID Application: Toshiyuki Kanai (WBADLDV5D2)。Keychain Profile: MacNotarization。
- Hardened Runtime有効。追加Entitlementsなし。Keychainの秘密情報の取得・表示・コピーは行っていない。

## ライセンスの解決

詳細は [LICENSE-RESOLUTION.ja.md](LICENSE-RESOLUTION.ja.md) を参照。

元のGPL公開版READMEは、都市データ・画像・アイコンにもGPL/EA追加条項が適用されることを明記する。固定Commitから取得しハッシュを確認した素材を、既存の描画・スプライト形式へ機械変換した。許諾未確認の合成タイルセットは配布物から除外した。32都市の出典も照合済み。

フォントのOFL、Fontsource/Svelte/Tauriの文書、macOSのRust依存、Rust標準ライブラリとEmscripten/C++ランタイムの必要文書を同梱する。アプリの「Licenses and Source…」メニューで参照できる。Micropolis GmbHの商標帰属と無保証等も表示する。

対応ソースは `Micropolis-0.1.0-source.tar.gz`。Rust元crateはCargo.lockのSHA256で検証。未確認素材やローカルツール・ビルド出力・認証情報は含めず、DMGのSourceフォルダから直接取得できる構成とした。

## 検証結果

- デスクトップの型検査：エラー0・警告0。
- デスクトップ回帰テスト：8件成功（保存復元、終了処理、ライセンス画面を開いた場合の終了）。
- 元Micropolisの回帰テスト：80件成功。
- 最終WebKit検証：12,000タイル表示、既存ツールバー＋マウスによる住宅建設、資金100減少、日時進行、保存復元、外部通信全遮断下の動作に成功。
- 未確認合成アトラスの不在とローカルライセンス画面も自動検証。
- WebKitのスクリーンショットを目視確認し、地図の表示を確認。
- 2026-10-19、ユーザーから最終DMGをインストールして手動プレイに成功したとの報告を受領。Codexの自動検証とは別の確認結果として記録する。
- 公証済みアプリはcodesign検証成功、Stapling検証成功、Gatekeeperで `accepted / source=Notarized Developer ID`。

## 公証と成果物

- アプリ公証ID：`e3de1a64-29e6-4011-a947-3751cff93d75`。結果：Accepted。
- 詳細ログは `build/release/0.1.0/`。秘密情報は保存しない。
- DMG公証ID：`923044c2-ab01-4b33-bb40-b9f965f7a239`。結果：Accepted。アプリ・DMGともAppleの詳細ログは `issues: null`。
- DMGをread-onlyでマウントし、Applicationsリンク、バージョン、ソース同一性、内部アプリの署名・Stapling・Gatekeeperを確認。コピーしたアプリの単体起動（プロセス存続）も確認。

- 最終DMGのcodesign、stapler、spctl（Notarized Developer ID）、hdiutil verifyはすべて成功。
- 配布物：`build/release/0.1.0/Micropolis-0.1.0-arm64.dmg`。Applicationsへのドラッグでインストールできる。
- DMG SHA256：`2c4ab2396b0eabb6a01c446fb37918b3a4004c877272d1c7f3938f78ec20801d`。
- 対応ソース SHA256：`301e3b5195b4fe2a770c43005ca7e24266bb04f7b619f89401d9846349424797`。
- `SHA256SUMS.txt`、`final-verification.log`、公証結果JSONを同じ成果物フォルダに保存。

## 次の操作と公開範囲

最終DMGの手動確認は完了。2026-10-19の承認範囲は、現在の作業ブランチでのCommit・Pushとmain向けPR作成まで。GitHubのmainと作業ブランチがともに基準Commitを指し、既定ブランチがmainであることを確認した。

Merge・mainへの直接Push・タグ作成/Push・Release作成/公開・DMGやチェックサムのアップロードは実施しない。既存DMGは再ビルド・変更しない。Intel Mac、macOS 13実機、別Mac、長時間プレイは未検証。

参照：[元GPL公開版README](https://github.com/SimHacker/micropolis/blob/c98f6b08519887b450d9be198bfca5237aab6d0c/micropolis-activity/README)、[名称ライセンス](../../MicropolisPublicNameLicense.md)、[Appleの公証](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow)、[Tauri署名](https://v2.tauri.app/distribute/sign/macos/)。

## Commit前の整合性確認

対応ソースの全1,590ファイルをSHA256一覧と照合し、リポジトリ由来ファイルがCommit対象のソースと一致することを確認。差分はソースアーカイブ生成時に明示的に除外したREADINESS・release-plan・RELEASE-NOTESの進捗記録のみ。ライセンス・実装・ビルド設定は一致する。DMGとソースアーカイブのSHA256も一致。追加・変更対象には秘密情報、ローカル絶対パス、ビルド成果物・一時ファイルを含めない。上流由来の未確認素材は履歴保持のため既存リポジトリに残るが、配布ビルドと対応ソースには含めない。

ステージ済みのリポジトリ由来815ファイルも対応ソース一覧と一致。`git diff --cached --check` の指摘は、原文保持した第三者ライセンス35ファイルとGPL素材原文2ファイルの空白のみ。これらを除く実装・設定・資料は同検査に成功。原文と対応ソースの同一性を優先し、第三者原文の空白は変更していない。
