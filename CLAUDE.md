# DICOM Viewer - Project Context for Claude Code

## Project Overview

WebAssembly の可能性を探る試行プロジェクトとして構築しているブラウザベースの DICOM Viewer。
Cornerstone3D をベースに、パフォーマンスが求められる処理を Rust → Wasm で拡張するハイブリッドアーキテクチャ。
将来的に商用利用可能なレベルを目指し、段階的に機能を拡張中。

## Current Status

- **Phase 1 (MVP): 完了** — 2D画像表示、WL/WW、ズーム/パン/回転、メタデータ表示、D&D、エラーハンドリング
- **Phase 2: 完了** — シリーズ自動グループ化、マルチフレームスクロール、距離/角度計測、矢印アノテーション
- **Phase 3: 未着手** — 3Dボリュームレンダリング、MPR、カスタムフィルタ（Rust Wasm本格活用）
- **Phase 4: 未着手** — 超音波動画、心電図波形、DICOMweb/PACS連携

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Build | Vite | Wasm対応、HMR、vite-plugin-commonjs |
| UI | React 18 + TypeScript | CSS Modules、Lucide React icons、Inter font |
| Rendering | Cornerstone3D v4.x | WebGL、StackViewport |
| Tools | Cornerstone3D Tools | WL/WW、Zoom、Pan、Rotate、Length、Angle、ArrowAnnotate、StackScroll |
| DICOM Parse | dicom-parser | ヘッダパース、シリーズグループ化 |
| Wasm | Rust + wasm-pack | ピクセル変換モジュール（ビルド済み、パイプライン未接続） |
| Test | Vitest + Testing Library | jsdom環境、WebGLモック |

## Architecture

```
src/
├── App.tsx                    # Root: 全state管理、コンポーネント統合
├── main.tsx                   # Entry point
├── components/
│   ├── Header.tsx             # ロゴ、ファイル名、フルスクリーン
│   ├── Toolbar.tsx            # ツール切替、WL/WW表示、プリセット、スライスナビ
│   ├── Viewport.tsx           # Cornerstone3D ビューポートラッパー
│   ├── SeriesPanel.tsx        # 左パネル: シリーズ一覧 + スライスサムネイル
│   ├── MetadataPanel.tsx      # 右パネル: DICOMタグ表示（折りたたみ可能）
│   ├── DropZone.tsx           # D&D + ファイル選択
│   └── Toast.tsx              # 通知システム
├── core/
│   ├── cornerstoneSetup.ts    # Cornerstone3D初期化（HMR対応）
│   ├── toolSetup.ts           # ツール登録・グループ管理・アクティブツール切替
│   ├── imageLoader.ts         # DICOM検証、ファイル登録
│   ├── seriesManager.ts       # シリーズグループ化・ソート（dicom-parser使用）
│   └── metadataProvider.ts    # メタデータストア
├── hooks/
│   ├── useCornerstone.ts      # 初期化Hook
│   └── useToast.ts            # トースト通知Hook
├── types/
│   └── dicom.ts               # 型定義（DicomMetadata, SeriesInfo, ActiveTool, WLPresets）
└── styles/
    └── globals.css             # CSS変数、ダークテーマ、リセット
wasm/
├── Cargo.toml                 # Rust crate: dicom-wasm
└── src/
    ├── lib.rs                 # Wasmエクスポート: convert_pixel_data, version
    └── pixel.rs               # 16bit→8bit WL/WW変換
```

## Key Design Decisions

- **Wasm は意味のある場所にだけ使う**: Cornerstone3D が GPU/JS で十分高速な処理はそのまま使う。Wasm は CPU bound なデコード・大量ピクセル演算に限定
- **Cornerstone3D のビルトインツールを最大限活用**: 計測・アノテーションは Cornerstone3D Tools のビルトイン
- **ダークモード主体**: 読影室の暗い環境に合うプロフェッショナルUI
- **ローカルオンリー（現時点）**: ブラウザの File API でファイル読込、サーバーに送信しない
- **ライセンス方針**: MIT / Apache 2.0 優先、LGPL まで許容、GPL 除外

## Development Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173/)
npm run build        # Production build
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run
npm run wasm:build   # Rust Wasm build (cd wasm && wasm-pack build --target web --out-dir pkg)
```

## Windows-Specific Notes

- Node.js PATH: `/c/Program Files/nodejs` が必要な場合あり
- Rust: `stable-x86_64-pc-windows-gnu` toolchain を使用（MSVC link.exe 競合回避）
- wasm-pack: npm グローバルインストール版を使用（cargo install は link.exe 問題で失敗）
- wasm-opt: `Cargo.toml` で `wasm-opt = false` に設定（GNU target との互換性問題）
- Git Bash 環境: CRLF 警告は無害

## Design Documents

- Phase 1 spec: `docs/superpowers/specs/2026-03-24-dicom-viewer-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-03-24-dicom-viewer-mvp.md`
- Phase 2 spec: `docs/superpowers/specs/2026-03-24-phase2-design.md`
- Phase 2 plan: `docs/superpowers/plans/2026-03-24-phase2-implementation.md`

## Known Issues / Technical Debt

- Cornerstone3D の Worker 重複登録警告: HMR時に発生するが `window.__cornerstoneInitialized__` フラグで抑制済み
- 自作 Rust Wasm モジュール: ビルド済みだがレンダリングパイプラインには未接続。Phase 3 で本格接続予定
- JPEG2000 Rust デコーダ: 未実装（Cornerstone3D 内蔵コーデックを使用中）
- チャンクサイズ警告: Cornerstone3D が大きいため production build 時に警告。code-splitting で対応可能

## Coding Conventions

- コンポーネント: 関数コンポーネント + CSS Modules (`.module.css`)
- 状態管理: React hooks (useState/useCallback/useRef)、グローバル状態なし
- コールバック通信: Viewport → App は `useRef` でコールバックを保持（クロージャの古い値問題回避）
- テスト: Vitest + @testing-library/react、WebGL は tests/setup.ts でモック
- コミットメッセージ: `feat:` / `fix:` / `docs:` / `chore:` prefix
- 日本語UI: ラベル・プレースホルダーは日本語
