# Micropolis Tauri版（macOS）

MicropolisCoreを利用した変更版です。既存のゲームUIとC++ゲームロジックを再利用し、Tauri 2のmacOSウィンドウに同梱します。SwiftUI版の作業ディレクトリ・ソースには変更を加えていません。

## 起動と操作

ビルド後の **`build/Micropolis.app` をダブルクリック**してください。アプリ自体はGitに含めないため、取得後は下記の手順でビルドします。起動時にNode.js、開発用サーバー、ターミナル、外部ブラウザ、インターネット接続は不要です。Apple Silicon / macOS 13以降を対象にしています。

- 左のツールバーで建設する施設を選び、地図をクリックします。
- ホイールで拡大・縮小、Shiftを押しながらドラッグして移動します。
- **Spaceは実験的なセル・オートマトンの切替です。地図データを変化させます。再度押すと停止しますが、都市が元に戻るとは限りません。**
- `0` で一時停止・再開、`1`〜`9` で速度変更、`?` で既存の操作ヘルプを表示します。
- 最初は同梱の `haight` 都市が開きます。既存機能の `\` キーでランダムな都市を生成できます（現在の都市を置き換えるため、先に保存してください）。
- **File → Save City…（⌘S）** で保存先を選びます。毎回保存ダイアログを表示します。
- **File → Open City…（⌘O）** で `.cty` または `.mop` を開きます。現在の都市を置き換える前に確認します。
- 保存形式は元エンジンの拡張形式 `.mop`（51,120バイト）。地図、履歴、資金、日時、マップの追加データを保持します。従来の `.cty`（27,120バイト）も読み込めます。
- 自動保存はありません。終了時に未保存の変更が失われることを確認するダイアログを表示します。

現在の署名はローカル実行用のad-hoc署名です。Developer ID署名・公証は実施していません。他のMacへダウンロード配布するための準備は別途必要です。

## 既存Web版と統合方式

| 項目 | 確認した実装 |
| --- | --- |
| フロントエンド | `apps/micropolis` のSvelte 5 / SvelteKit 2 / Vite 5。サイトとゲーム画面を含む |
| ゲームエンジン | `packages/micropolis-engine` のC++をEmscripten / EmbindでWASM化 |
| JSとの接続 | `MicropolisSimulator` と `MicropolisReactive.svelte.ts`。C++からのコールバックをSvelteの状態へ反映 |
| 描画 | 現在の `TileView.svelte` は既存Canvas 2Dレンダラーを明示的に選択。WebGL/WebGPUの共通実装も存在するが、この画面では使用しない |
| ゲームデータ | 同梱 `.data` をEmscripten仮想ファイルシステムへ展開。都市は `/cities/*.cty`。画像・フォントもローカルに同梱 |
| Web版ビルド | `pnpm --filter micropolis build` は事前にEmscriptenビルドを実行し、adapter-staticで出力。開発サーバーはビルド済みWASMでも起動可能 |
| サーバー依存 | ゲーム本体にサーバーは不要。一部のサイトルートにはSvelteKitのserver loadがあるため、デスクトップにはサイトを含めない |
| 保存・読込 | C++には両方存在。Web側には読込接続があるが、保存用公開APIと永続ファイル保存UIがない。TauriでOSのダイアログとファイル入出力を接続 |
| WebKit | 配布用CSPを付けた静的ビルドで描画・マウス建設・時間進行・保存復元を自動検証済み |
| オフライン | 外部リクエストをすべて遮断したWebKitテストが成功。必要なデータをアプリ内へ埋め込む |

`apps/desktop` はVite/Svelteの小さな起動層です。元の `MicropolisView.svelte` を直接読み込み、ツールバー・HUD・地図・ヘルプ・シミュレーションを共有します。SvelteKitのサイト用ルートを複製・書き換える必要がありません。

Tauri側のRustはウィンドウの起動と公式dialog/fsプラグインの登録のみです。ゲームロジックのRust移植はしていません。ファイルへのアクセス範囲は、ユーザーがダイアログで選んだファイルへ動的に付与されます。任意のディレクトリ全体には許可していません。

## 主な変更

- `apps/desktop`：既存画面を読み込むエントリ、Tauri 2設定、Fileメニュー、ファイル保存・読込、既存favicon由来のアイコン。
- C++のEmbind定義：既存の `saveFile` を1メソッド追加公開。保存処理やシミュレーションの中身は変更していません。
- Emscripten設定：`FS` を公開し、CSP下で動的JavaScript評価が不要になる `DYNAMIC_EXECUTION=0` を指定。WASM・JS・型定義を再生成。
- 既存ビュー：シミュレーターの初期化完了が既存スプライト表示へ反映されるよう、変数をSvelteの `$state` に変更（1行）。
- ビルド・起動スクリプト、WebKit操作検証、都市データの保存復元テスト、依存関係のロックファイル。
- 元のGPL、著作権、追加条項、名称ライセンスを維持し、配布アプリにも同梱。変更版である旨を表示。

## 再ビルド

必要なもの：Xcode Command Line Tools、Node.js 22以降、pnpm 11.25.0、Rust 1.99.1（`rust-toolchain.toml`）。ビルド時の依存関係取得にはネット接続が必要です。出来上がったアプリには不要です。

Node.js・pnpm・Rustを各自の開発環境に用意してください。`script/desktop-env.sh` は、任意で `.tools/` 内に導入したローカルツールも利用できます。ローカルツール本体はGitに含めません。

```bash
pnpm --filter @micropolis/desktop... install --frozen-lockfile
./script/build_and_run.sh --verify
```

ビルド済みWASMはソースと一緒に保持しているため、通常のアプリ再ビルドにEmscriptenは不要です。スクリプトはこのチェックアウトの既存Tauriアプリを停止し、ビルド・署名検査・`build/Micropolis.app` への配置・起動を実行します。再ビルド前には都市を保存してください。CodexのRunボタンも同じスクリプトを呼びます。

```bash
# 開発モード（別ターミナルでViteを起動する必要なし）
source script/desktop-env.sh
pnpm desktop:dev

# C++やバインディングを変更した場合のみ（Emscripten 4.0.23を使用）
source /path/to/emsdk/emsdk_env.sh
export PATH="$PWD/apps/micropolis/node_modules/.bin:$PATH"
pnpm build:engine
```

アプリ本体のビルドのみなら `pnpm desktop:build`。出力先は `apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Micropolis.app` です。通常は上記スクリプトで分かりやすい `build/` へ配置してください。

## 検証（2026-10-17）

| 項目 | 結果・検証範囲 |
| --- | --- |
| arm64リリースビルド | 成功。実行ファイルはMach-O arm64 |
| アプリ起動 | `.app` をLaunch Servicesで起動し、プロセスの存続を確認 |
| 署名 | アプリ全体をad-hoc署名。`codesign --verify --deep --strict` で確認 |
| ゲーム画面・マップ | WebKitで既存画面と12,000タイルの読込を確認、スクリーンショットも確認 |
| マウス建設 | WebKitで既存ツールバーから住宅を選択しクリック。3×3の9タイルが建設され、資金が100減少 |
| シミュレーション | WebKitで自動的に都市日時が進行することを確認 |
| セーブ・ロード | 実WASMの保存→読込で地図・追加データ・資金・日時・設定を確認。全12,000タイルが正しい順序で保存されることも確認 |
| 不正ファイル | サイズ不正のデータを、現在の都市を変更する前に拒否するテストが成功 |
| オフライン | 配布用CSPを適用し、外部通信を全遮断したWebKitテストが成功。外部通信要求・資産読込失敗・JSエラーはいずれも0 |
| 回帰テスト | 既存Micropolisテスト80件、追加した保存復元・終了処理の回帰テスト6件が成功 |
| 型検査 | デスクトップのSvelte/TypeScript検査：エラー0・警告0 |
| macOS GUI | ユーザーによる起動・通常操作の確認済み。保存・読み込みも実操作で確認済み |
| 未検証 | 別Macでの動作、長時間プレイ、Developer ID署名・公証による配布 |

WebKit自動検証は実際のmacOS WKWebView上のTauriアプリのGUI操作とは別です。GUIの実操作確認はユーザーによる確認として区別しています。都市の読込時には元エンジンが電力・区域等を再計算します。公証済み配布物ではありません。

再実行例：

```bash
pnpm --filter @micropolis/desktop check
pnpm --filter @micropolis/desktop test
pnpm --filter @micropolis/desktop build
pnpm --filter @micropolis/desktop exec playwright install webkit
pnpm --filter @micropolis/desktop test:webkit

# 元の80件のテストに必要な共有パッケージもビルド
pnpm --filter mooshow... install --frozen-lockfile
pnpm --filter vitamoo build
pnpm --filter mooshow build
pnpm --filter micropolis test
```

任意でWebKitを `.tools/playwright` に配置した場合、インストールとテストの両方に `PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/playwright"` を指定してください。通常のPlaywright標準インストールなら不要です。スクリーンショットは `build/verification/micropolis-webkit.png` に出力します。

## Gitの状態

- 作業ブランチ：`codex/tauri-macos`。
- 取り込み元：`upstream/main` の `9d5b400b2d3beaf81e4103056f6c7f503dfde6e1`。元の306コミットを保持。
- `upstream`：`https://github.com/SimHacker/MicropolisCore.git`。
- `origin`：`https://github.com/Toshiyuki-Kanai/micropolis-tauri.git`。
- 開発・Push先は作業ブランチとし、`main` への直接Pushや元履歴の書き換えは行いません。
- ソース、Cargo.lock、pnpm-lock.yaml、実行に必要なWASMとデータを管理対象にします。元リポジトリに含まれるソースとライセンスも保持します。
- `.tools`、`node_modules`、`target`、`build`、一時ファイル、認証情報を含む `.env` は除外します。

統合時に参照した公式資料：[Tauriのフロントエンド構成](https://v2.tauri.app/start/frontend/)、[SvelteKit](https://v2.tauri.app/start/frontend/sveltekit/)、[ファイルシステム](https://v2.tauri.app/plugin/file-system/)、[ウィンドウメニュー](https://v2.tauri.app/learn/window-menu/)。

## 終了処理の修正

赤い閉じるボタンと⌘Qの終了確認後、TauriのJavaScript APIは `Window.destroy()` を呼びます。初期版にはその `core:window:allow-destroy` 権限が不足していました。権限を追加し、確認後に `close()` を再発行する処理も取り除きました。キャンセル時だけ終了を止め、都市の初期化前でも終了できます。保存・読み込みはユーザーによる実操作で動作確認済みです。
