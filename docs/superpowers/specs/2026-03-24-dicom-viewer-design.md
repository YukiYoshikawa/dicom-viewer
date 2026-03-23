# DICOM Viewer - Design Specification

## Overview

WebAssembly の可能性を探る試行プロジェクトとして、ブラウザベースのDICOM Viewerを構築する。
Cornerstone3D をベースに、パフォーマンスが求められる処理を Rust → Wasm で拡張するハイブリッドアプローチを採用。
将来的に商用利用可能なレベルを目指し、段階的に機能を拡張していく。

## Target Users

- **医師・放射線技師**: 診断に使える読影ツールとして
- **患者・一般ユーザー**: 自分の検査画像をブラウザで手軽に閲覧

## Architecture

### Approach: Cornerstone3D + Rust Wasm Hybrid

Cornerstone3D で医療画像表示の基本機能を確保しつつ、CPU bound な処理（画像デコード、ピクセル演算）を Rust → Wasm で実装し差し替える。

### System Diagram

```
┌─────────────────────────────────────────────────┐
│                  Browser                         │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │         React + TypeScript (UI)            │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │Toolbar  │ │Viewport  │ │DICOM Tags  │ │  │
│  │  │(WL/WW,  │ │(画像表示) │ │Panel       │ │  │
│  │  │ zoom等) │ │          │ │(メタデータ) │ │  │
│  │  └────┬────┘ └────┬─────┘ └─────┬──────┘ │  │
│  │       │           │             │         │  │
│  │  ┌────┴───────────┴─────────────┴──────┐  │  │
│  │  │       Cornerstone3D Core            │  │  │
│  │  │  (レンダリング / ビューポート管理)    │  │  │
│  │  │  (WebGL描画 / インタラクション)       │  │  │
│  │  └──────────────┬──────────────────────┘  │  │
│  │                 │                          │  │
│  │  ┌──────────────┴──────────────────────┐  │  │
│  │  │      Image Loader Layer             │  │  │
│  │  │  ┌────────────┐  ┌──────────────┐   │  │  │
│  │  │  │Cornerstone │  │ Rust Wasm    │   │  │  │
│  │  │  │標準Loader  │  │ Decoder      │   │  │  │
│  │  │  │(DICOM解析) │  │ (JPEG2000等) │   │  │  │
│  │  │  └────────────┘  └──────────────┘   │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │          Web Worker                        │  │
│  │  (重い画像デコードをメインスレッド外で実行)  │  │
│  │  ┌──────────────────────────────────┐     │  │
│  │  │  Rust Wasm Module                │     │  │
│  │  │  - JPEG2000 デコード             │     │  │
│  │  │  - ピクセルデータ変換            │     │  │
│  │  │  - (将来) カスタムフィルタ       │     │  │
│  │  └──────────────────────────────────┘     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Wasm Usage Policy

Wasm は「意味のある場所」にのみ使用する。Cornerstone3D が GPU/JS で十分高速に処理できるものはそのまま利用し、CPU bound なデコード・大量ピクセル演算にのみ Wasm を適用する。

| 処理 | Wasm利用 | 理由 |
|------|----------|------|
| WL/WW調整 | No | GPU処理で十分高速 |
| ズーム/パン/回転 | No | Cornerstone3D内蔵で十分 |
| JPEG2000デコード | **Yes** | CPU bound、JSでは遅すぎる |
| ピクセルデータ変換 (12bit→8bit等) | **Yes** | 大量データの数値演算 |

## UI Design

### Design Direction

ダークモード主体のプロフェッショナルUI。読影室の暗い環境に合う黒/ダークグレー基調。

### Color Palette

| 用途 | カラー | 説明 |
|------|--------|------|
| 背景（最深） | `#0a0a0f` | ビューポート背景。画像が映える漆黒 |
| 背景（パネル） | `#12131a` | サイドパネル、ツールバー |
| 背景（サーフェス） | `#1a1b26` | カード、ドロップダウン、モーダル |
| ボーダー | `#2a2b3a` | セクション区切り、控えめな境界線 |
| テキスト（主） | `#e0e0e8` | 高コントラスト、読みやすさ重視 |
| テキスト（副） | `#8888a0` | ラベル、補足情報 |
| アクセント | `#4a9eff` | 選択状態、アクティブツール、フォーカス |
| アクセント（警告） | `#ff6b6b` | エラー、重要な通知 |
| アクセント（成功） | `#4ecdc4` | 成功状態 |

### Layout

```
┌──────────────────────────────────────────────────┐
│  ■ DICOM Viewer          [ファイル名]    [≡] [⛶] │ ← ヘッダーバー (40px)
├──────────────────────────────────────────────────┤
│ 🔍 ⊕ ⊖ ↻ ☼ ◐  [WL: 400] [WW: 1500]           │ ← ツールバー (44px)
├────────┬─────────────────────────────┬───────────┤
│        │                             │ Patient   │
│ thumb  │                             │ ───────── │
│  [1]   │                             │ Name: ... │
│  [2]   │      メインビューポート      │ ID: ...   │
│  [3]   │      (画像表示エリア)        │ Date: ... │
│  [4]   │                             │           │
│  [5]   │   WL/WW: マウス右ドラッグ   │ Study     │
│        │   Zoom: スクロール          │ ───────── │
│        │   Pan: 中ボタンドラッグ     │ Modality  │
│        │                             │ Body Part │
│        │                             │ ...       │
├────────┤                             ├───────────┤
│ 120px  │                             │  280px    │
└────────┴─────────────────────────────┴───────────┘
          ↑ フレキシブル（残り幅全て）
```

- サムネイルパネル（左 120px）: シリーズ内画像一覧。折りたたみ可能
- メインビューポート（中央）: 画像表示。最大限の表示領域確保
- 情報パネル（右 280px）: DICOMメタデータ表示。折りたたみ可能
- 全パネルがリサイズ・折りたたみ可能。フルスクリーン読影モード対応

### Visual Quality

- 微細なグラデーション: パネル背景に `#12131a` → `#14151f`
- ソフトシャドウ: `0 0 20px rgba(0,0,0,0.5)` の奥行き感
- アニメーション: パネル開閉 `200ms ease-out`
- フォント: `Inter` — 可読性の高いUIフォント
- アイコン: `Lucide Icons` — 洗練された線画アイコンセット

## Data Flow

### File Load → Render Pipeline

```
D&D / ファイル選択
    │
    ▼
File API で ArrayBuffer 取得
    │
    ▼
Cornerstone imageLoader に登録
    │
    ▼
loadImage() ── transferable で ArrayBuffer転送 ──▶ Web Worker
                                                       │
                                                       ▼
                                                 DICOMヘッダ解析
                                                 (Transfer Syntax判定)
                                                       │
                                                 ┌─────┴──────┐
                                                 │圧縮形式は？ │
                                                 └─────┬──────┘
                                                  │          │
                                               非圧縮      JPEG2000等
                                                  │          │
                                                  ▼          ▼
                                               そのまま   Rust Wasm
                                               バイト列   デコーダ呼出
                                                  │          │
                                                  └────┬─────┘
                                                       ▼
                                                 PixelData + メタデータ構築
                                                       │
Image オブジェクト ◀── transferable で返送 ◀────────────┘
    │
    ▼
Cornerstone3D WebGL レンダリング
    │
    ▼
画面に表示
```

### Interaction Mapping

| 操作 | 入力 | 処理 | Wasm利用 |
|------|------|------|----------|
| WL/WW調整 | マウス右ドラッグ | Cornerstone3D VOI LUT | No |
| ズーム | マウスホイール | Cornerstone3D viewport scale | No |
| パン | マウス中ドラッグ | Cornerstone3D viewport pan | No |
| 回転 | Shift+左ドラッグ | Cornerstone3D viewport rotation | No |
| JPEG2000デコード | ファイル読込時 | Rust Wasmデコーダ | **Yes** |
| ピクセルデータ変換 | ファイル読込時 | Rust Wasmビット変換 | **Yes** |

### DICOM Metadata Management

```typescript
type DicomMetadata = {
  patient: { name, id, birthDate, sex }
  study:   { date, description, accessionNumber }
  series:  { modality, description, number }
  image:   { rows, columns, bitsAllocated,
             windowCenter, windowWidth,
             transferSyntax, photometric }
}
```

- パース時にメタデータを抽出し、Cornerstone の `metadataProvider` に登録
- UIの情報パネルは provider 経由で取得・表示
- ローカルオンリーのため個人情報はブラウザ外に送信しない。将来的に匿名化機能の余地を残す

## Project Structure

```
dicom-viewer/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Toolbar.tsx
│   │   ├── Viewport.tsx
│   │   ├── ThumbnailPanel.tsx
│   │   ├── MetadataPanel.tsx
│   │   └── DropZone.tsx
│   │
│   ├── core/
│   │   ├── cornerstoneSetup.ts
│   │   ├── imageLoader.ts
│   │   ├── metadataProvider.ts
│   │   └── toolSetup.ts
│   │
│   ├── workers/
│   │   └── decodeWorker.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── components/
│   │
│   └── types/
│       └── dicom.ts
│
├── wasm/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── jpeg2000.rs
│   │   └── pixel.rs
│   └── pkg/
│
└── public/
```

## Tech Stack

| Layer | Technology | License | Rationale |
|-------|-----------|---------|-----------|
| Build | Vite | MIT | Wasm import ネイティブ対応、HMR高速 |
| UI | React 18 + TypeScript | MIT | Cornerstone3D エコシステム最適 |
| Rendering | Cornerstone3D | MIT | 医療画像レンダリングの業界標準 |
| Tools | Cornerstone3D Tools | MIT | WL/WW, Zoom, Pan 等の操作 |
| DICOM Parse | dicom-parser | MIT | 軽量な DICOM ヘッダパーサー |
| Wasm Toolchain | Rust + wasm-pack | MIT/Apache 2.0 | メモリ安全、Wasm最適化が優秀 |
| Image Decode (Wasm) | openjpeg-rs + wrapper | LGPL | JPEG2000 対応 |
| Styling | CSS Modules | — | シンプル、バンドルサイズ小 |
| Icons | Lucide React | MIT | 洗練された線画アイコン |
| Font | Inter | OFL | 可読性の高い UI フォント |

### License Policy

MIT / Apache 2.0 を優先。必要な場合は LGPL まで許容。GPL は除外。
LGPL ライブラリ（openjpeg-rs 等）を Wasm にコンパイルする場合は静的リンクとなるため、LGPL の要件（ユーザーが再リンク可能であること）を満たすよう、Wasm モジュールを独立した差し替え可能なファイルとして配布する。

## Error Handling

- **非DICOMファイル**: ファイル読み込み時に DICOM マジックナンバー（DICM）を検証。非DICOMファイルの場合はトーストで「このファイルはDICOM形式ではありません」と通知
- **未対応 Transfer Syntax**: デコード不可の圧縮形式の場合、メタデータは表示しつつ画像エリアに「未対応の圧縮形式です (Transfer Syntax: xxx)」を表示
- **破損ファイル**: パース途中でエラーが発生した場合、読み込み可能な範囲のメタデータを表示し、エラー内容をトーストで通知

## MVP Specification

| # | Feature | Detail | Acceptance Criteria |
|---|---------|--------|---------------------|
| 1 | ファイル読み込み | D&D またはファイル選択。単一 .dcm + フォルダ一括 | DICOM ファイルを読み込んで画像が表示される |
| 2 | 画像表示 | 非圧縮 + JPEG2000 圧縮 DICOM の表示。対応 Transfer Syntax: Implicit VR Little Endian (1.2.840.10008.1.2), Explicit VR Little Endian (1.2.840.10008.1.2.1), Explicit VR Big Endian (1.2.840.10008.1.2.2), JPEG 2000 Lossless (1.2.840.10008.1.2.4.90), JPEG 2000 Lossy (1.2.840.10008.1.2.4.91) | 上記 Transfer Syntax の画像が正しく表示される |
| 3 | WL/WW 調整 | マウス右ドラッグ。数値表示。プリセット（肺野/骨/軟部組織等） | ドラッグで滑らかにコントラスト変更、プリセット切替動作 |
| 4 | ズーム/パン/回転 | ホイール/中ドラッグ/Shift+左ドラッグ。Fit to Window | 直感的に操作、パフォーマンス滑らか |
| 5 | メタデータ表示 | 右パネルに患者/検査/画像情報。セクション分け。折りたたみ可能 | 主要 DICOM タグが正しく表示される |
| 6 | レスポンシブ | パネル折りたたみ、フルスクリーンモード | フルスクリーン読影表示が可能 |

## Data Handling

- **Phase 1 (MVP)**: ローカルオンリー。ブラウザの File API でファイルを読み込み、サーバーに送信しない
- **将来**: DICOMweb / PACS 連携に対応。サーバーからの画像取得レイヤーを Image Loader に追加

## Phased Roadmap

```
Phase 1 (MVP)                Phase 2                Phase 3               Phase 4
─────────────               ───────                ───────               ───────
✦ 2D単一画像表示             ✦ マルチフレーム        ✦ 3Dボリューム         ✦ 超音波動画
✦ WL/WW調整                  スクロール             レンダリング          ✦ 心電図波形
✦ ズーム/パン/回転          ✦ シリーズ管理          (Rust Wasm)          ✦ 特殊モダリティ
✦ メタデータ表示            ✦ 計測ツール           ✦ MPR (多断面再構成)   ✦ DICOMweb連携
✦ JPEG2000 Wasmデコード     ✦ アノテーション       ✦ カスタムフィルタ     ✦ PACS接続
                            ✦ JPEG-LS Wasmデコード   (Rust Wasm)         ✦ レポート出力
                                                   ✦ セグメンテーション
```

### Wasm Extension Points by Phase

| Phase | Wasm処理 | 理由 |
|-------|----------|------|
| 1 | JPEG2000 デコード | CPU bound。JS では遅すぎる |
| 1 | 12bit→8bit ピクセル変換 | 大量データの数値演算 |
| 2 | JPEG-LS デコード | CPU bound |
| 3 | ボリュームレンダリング（レイキャスティング） | 大量ボクセル演算。Wasm が最も活きる |
| 3 | MPR 断面計算 | 3D ボリュームからの 2D 断面抽出 |
| 3 | 画像フィルタ（エッジ強調、ノイズ除去等） | ピクセル単位のカーネル演算 |
| 4 | 動画フレームデコード | リアルタイムデコードが必要 |
