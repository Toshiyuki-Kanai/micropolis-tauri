# v0.1.0 素材とライセンスの解決記録

2026-10-18。追加パックの再配布許諾を推測せず、配布する画像を元のGPL公開版に限定した。

- 元リポジトリ：`https://github.com/SimHacker/micropolis`、固定Commit `c98f6b08519887b450d9be198bfca5237aab6d0c`。
- `micropolis-activity/README` は18–29行で都市・画像・Sugarアイコン等の非テキスト素材にも同じ著作権とGPL/EA追加条項が適用されると明記。原文を同梱した。
- `distribution/source-assets/micropolis-gpl` の65ファイルは元Git blob hashで検証したもの。`asset-provenance.json` にURL・固定Commit・ハッシュを記録。
- `tiles.xpm` をPNGへ、`obj1`〜`obj7` を既存のsprite manifestと同じフレーム配置へ機械変換。元XPMを保持し、`script/prepare_gpl_assets.py` で再生成できる。
- Tauri側のViteエイリアスだけでGPL素材へ置換。元Web版の合成画像・追加パック・classic BMP由来のPNGは、配布ビルドへ取り込まない。元ファイルや上流履歴は削除・書き換えない。
- アイコンは同じGPL公開版の `activity-micropolis.svg` をTauri CLIで変換。初期favicon由来のアイコンは配布対象から置換。
- 同梱32都市のうち24は元GPL公開版のファイルとGit blob一致。8シナリオは元 `res/snro.111`〜`.888` とマップ本体24,000バイトが一致。ヘッダーの変更もGPL素材の派生として記録。
- 建設・シミュレーション・保存形式は変更していない。未確認の追加パックの見た目は配布しない。

## フォントとコード

- Fira Mono：SIL OFL 1.1の原文と著作権を同梱。FontsourceのCSS等については2022年時点のMIT原文（Copyright 2020 Lotus）を取得し、フォント本体と区別。
- Svelte、Tauri API、dialog/fs：配布バージョンのライセンス/SPDX/著作権表示を同梱。
- Rust：Cargo.lockに対応するmacOS通常依存グラフを走査し、各パッケージの宣言と原文・NOTICE等を収録。MITが選択肢の多重ライセンスではMITを選択し、AND条件の表示も保持。
- objc2系は公開crateにライセンス本文がなく、固定Commitの上流 `LICENSE.md` がSPDX宣言と説明を提供するため、その原文と、MITの標準許諾本文・Cargoの作者情報を収録。作者や著作権年は捏造しない。
- MPL対象を含むRust依存の元crateアーカイブをCargo.lockのSHA256で照合し、対応ソースに含める。MPLは未改変。
- Rust標準ライブラリのCOPYRIGHTと原文、Emscripten、musl、libc++/libc++abi、compiler-rt、libunwindの文書も同梱。
- システムのAppKit/WebKit等は同梱せず、macOS提供のframeworkへリンクする。
- アプリの「Licenses and Source…」メニューからローカルの文書一覧を読める。名称ライセンスの帰属と無保証・再配布条件も表示。

## 対応ソース

`script/archive_release_source.py` は、この配布アプリを再ビルドできるソース、固定バージョン情報、ライセンス、GPL元画像、依存ライブラリの元ソースをまとめる。未確認の元PNGや追加パックの画像は含めない。ソースアーカイブをDMG内のSourceフォルダにも置き、GPL §6(d)およびMPL対象コードのソースへ無償で直接アクセスできるようにする。

Commitはまだ行わないため、基準Commitと作業中のソースを区別し、ソースファイルのSHA256一覧を作成する。公開時には、この実装を含む最終Commitとタグも同じReleaseから参照できるようにする。

原文の取得元とハッシュは `distribution/licenses/upstream-license-provenance.json`、依存一覧は `distribution/licenses/dependency-inventory.json` を参照。
