# v0.1.0 ローカル配布パッケージの再生成

2026-10-18。ライセンス解決は `LICENSE-RESOLUTION.ja.md` を参照。素材の生成元とハッシュは `asset-provenance.json`、同梱文書は `distribution/licenses/`。

## 前提

- Node/pnpm/RustとmacOS開発環境を用意する。通常ビルドにEmscriptenの再コンパイルは不要。
- Developer ID Application: Toshiyuki Kanai (WBADLDV5D2)。Keychain Profile: MacNotarization。
- Keychain登録済みの情報を使う。秘密鍵・APIキー・パスワードをソースへ書き出さない。新しい認証が要求されたら停止する。
- `.tools` は任意のローカルツール配置先。再生成用PythonスクリプトにはPillowが必要。配布アプリ自体にはPythonは不要。

## ビルド・テスト

```bash
source script/desktop-env.sh
# 元のXPMを再変換する場合のみ（生成PNGもソース管理対象）
python3 script/prepare_gpl_assets.py
# Rust依存のライセンスを再集計する場合（固定Commitから取得済みの原文も保持）
python3 script/collect_release_licenses.py
pnpm --filter @micropolis/desktop check
pnpm --filter @micropolis/desktop test
pnpm desktop:build
pnpm --filter @micropolis/desktop test:webkit
```

WebKitを `.tools/playwright` に置いた環境では `PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/playwright"` を指定する。Svelte/JS/Rust/Emscriptenの版を変更したときは、ライセンス集計と必要表示も再確認する。

## Developer ID署名とアプリ公証

空の `build/release/0.1.0/stage` から開始する。既存の検証済み成果物を上書きする前に退避する。`script/package_release.sh` は署名済みstageや記録済みの提出を自動上書きしない。

```bash
./script/package_release.sh sign
./script/package_release.sh submit-app
```

アプリはHardened Runtimeを有効にし、追加Entitlementsなしで署名する。公開用Identityを使い、ad-hocで代用しない。提出IDは `build/release/0.1.0/app-submission.json` に記録する。

```bash
xcrun notarytool wait APP_SUBMISSION_ID --keychain-profile MacNotarization --timeout 45s --output-format json
```

タイムアウトは承認ではない。再提出せず同じIDを `info` / `wait` で確認する。Invalidの場合はログを取得し、原因が安全に解決できなければ停止。Acceptedになってから：

```bash
xcrun stapler staple build/release/0.1.0/stage/Micropolis.app
xcrun stapler validate build/release/0.1.0/stage/Micropolis.app
spctl --assess --type execute --verbose=2 build/release/0.1.0/stage/Micropolis.app
```

## ソース・DMG・DMG公証

```bash
python3 script/archive_release_source.py
./script/package_release.sh dmg
./script/package_release.sh submit-dmg
xcrun notarytool wait DMG_SUBMISSION_ID --keychain-profile MacNotarization --timeout 45s --output-format json
```

対応ソースは元PNG/未確認追加パックを含まない。Rust元crateはCargo.lockのSHA256を検証し、JSとフォントのソースパッケージも収録する。DMGのSourceフォルダに同梱するので、GitHubタグがまだなくても配布バイナリと対応するソースへアクセスできる。

DMGもAccepted後に：

```bash
xcrun stapler staple build/release/0.1.0/Micropolis-0.1.0-arm64.dmg
./script/package_release.sh verify
```

最後にDMGをread-onlyでマウントし、内部アプリの署名・Stapling・Gatekeeper・バージョン・arm64を確認する。Applicationsリンクは `/Applications` を指す。既存インストールには勝手に上書きしない。

## 公開は別途承認後

この作業にCommit/Push/Merge/タグ作成/Release作成/アップロードは含めない。公開直前にソースを最終Commitへ記録し、タグとReleaseからも参照できるようにする。ソースやバイナリを変更した場合はソーススナップショットと署名・公証・DMGの対応を再確認する。署名後のアプリやDMGを編集したものを既存の検証済み成果物として扱わない。
