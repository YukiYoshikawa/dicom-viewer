# DICOM Viewer Phase 2 - Design Specification

## Overview

Phase 1 (MVP) で構築した 2D 単一画像ビューアを拡張し、マルチフレームスクロール、シリーズ管理、計測ツール、アノテーション機能を追加する。Cornerstone3D の既存ツールを最大限活用し、最小限のカスタムコードで実用的な読影ワークフローを実現する。

## Features

### 1. Series Management & Multi-frame Scrolling

#### Data Flow

```
ファイルドロップ（フォルダ or 複数.dcm）
    │
    ▼
全ファイルの DICOM ヘッダをパース
(Series Instance UID, Instance Number, Slice Location 抽出)
    │
    ▼
Series Instance UID でグループ化
    │
    ▼
各シリーズ内を Instance Number / Slice Location でソート
    │
    ▼
左パネル: シリーズ一覧 → 選択シリーズのスライスサムネイル
    │
    ▼
ビューポート: 選択シリーズの imageIds を setStack
              マウスホイールでスライススクロール
```

#### Series Grouping Logic

1. 全ドロップファイルから DICOM ヘッダを読み取る（`dicom-parser` を使用）
2. `Series Instance UID` (0020,000E) でグループ化
3. グループ内を以下の優先順でソート:
   - `Instance Number` (0020,0013) — 第一キー
   - `Slice Location` (0020,1041) — 第二キー（Instance Number が同一の場合）
   - `SOP Instance UID` (0008,0018) — 第三キー（フォールバック）
4. 各シリーズの情報を抽出:
   - Series Number, Series Description, Modality, 画像枚数

#### Left Panel Redesign

現在のフラットサムネイルリスト → 2階層構造:

- **上部: シリーズ一覧** — カード形式、選択でハイライト
  - 各カード: モダリティアイコン + シリーズ説明 + 枚数
  - クリックでシリーズ切替
- **下部: スライスサムネイル** — 選択シリーズ内のスライス一覧
  - 現在表示中のスライスをハイライト
  - クリックでスライスジャンプ
- パネル幅: 120px → 180px に拡大

#### Scroll Interaction

- マウスホイール → スライス切替（`StackScrollTool` をホイールにバインド）
- スライスインジケーター: ビューポート左下に `12 / 120` 形式で常時表示
- ツールバーにもスライス位置表示

### 2. Measurement Tools

#### Tools

| Tool | Cornerstone3D Class | Operation | Output |
|------|---------------------|-----------|--------|
| 距離計測 | `LengthTool` | 2点クリック | mm 単位の距離（Pixel Spacing から算出） |
| 角度計測 | `AngleTool` | 3点クリック | 度数 |

#### Interaction

- ツールバーのボタンで計測モードに切替
- 左クリックで点を配置
- 計測結果はビューポート上にオーバーレイ表示（Cornerstone3D 標準）
- 配置済み計測の削除: 計測線を選択 → Delete キー
- ESC で計測モード解除（前のツールに戻る）

#### Pixel Spacing

- DICOM タグ `Pixel Spacing` (0028,0030) から取得
- 存在しない場合は px 単位で表示（キャリブレーション未対応を明示）

### 3. Annotations

#### Tools

| Tool | Cornerstone3D Class | Operation |
|------|---------------------|-----------|
| 矢印マーカー | `ArrowAnnotateTool` | クリック+ドラッグで矢印配置、テキスト入力 |

#### Interaction

- 矢印配置後にテキスト入力ダイアログ（シンプルな `prompt` または インラインテキスト入力）
- 既存アノテーションの編集: ダブルクリック
- 削除: 選択 → Delete キー

#### Data Persistence

- Phase 2: ブラウザセッション内のみ（Cornerstone3D Annotation State Manager が管理）
- シリーズ切替時もアノテーションを保持（imageId ごとに紐づけ）
- エクスポート/インポートは将来の Phase で対応

### 4. Toolbar Extension

```
[WL/WW] [Zoom] [Pan] [Rotate] | [距離] [角度] [矢印] | [Fit] [Reset] | WL:400 WW:1500 | プリセット | 12/120 | [◀ ▶]
```

- 既存ツール群の右にセパレーターを挟んで計測/アノテーション群を追加
- リセットボタン追加（ビューポート初期化 + アノテーション全クリア）
- スライスインジケーター (`currentSlice / totalSlices`) をツールバー右側に表示
- 前/次スライスボタン (◀ ▶) を追加

### 5. Error Handling

- フォルダドロップ時に非 DICOM ファイルをスキップし、トーストで件数を通知
- シリーズが 0 件の場合: 「有効な DICOM シリーズが見つかりません」トースト
- Pixel Spacing 未設定の場合: 計測結果に「(px)」を付記

## Type Definitions

```typescript
interface SeriesInfo {
  seriesInstanceUid: string;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  imageIds: string[];       // Instance Number 順にソート済み
  imageCount: number;
}

interface StudyInfo {
  studyInstanceUid: string;
  studyDate: string;
  studyDescription: string;
  patientName: string;
  series: SeriesInfo[];
}

type ActiveTool =
  | 'windowLevel' | 'zoom' | 'pan' | 'rotate'
  | 'length' | 'angle' | 'arrowAnnotate';
```

## File Structure Changes

```
src/
├── core/
│   ├── seriesManager.ts        # NEW: DICOM ヘッダパース、シリーズグループ化・ソート
│   ├── toolSetup.ts            # MODIFY: LengthTool, AngleTool, ArrowAnnotateTool 追加
│   ├── imageLoader.ts          # MODIFY: フォルダ読込対応（webkitGetAsEntry API）
│   ├── cornerstoneSetup.ts     # NO CHANGE
│   └── metadataProvider.ts     # NO CHANGE
│
├── components/
│   ├── SeriesPanel.tsx          # NEW: 2階層左パネル（シリーズ一覧 + スライスサムネイル）
│   ├── SeriesPanel.module.css   # NEW
│   ├── ThumbnailPanel.tsx       # REMOVE (SeriesPanel に統合)
│   ├── ThumbnailPanel.module.css # REMOVE
│   ├── Toolbar.tsx              # MODIFY: 計測/アノテーション/スライスインジケーター追加
│   ├── Toolbar.module.css       # MODIFY
│   ├── Viewport.tsx             # MODIFY: スライスインジケーターオーバーレイ追加
│   ├── Viewport.module.css      # MODIFY
│   └── App.tsx                  # MODIFY: シリーズ管理 state、スライス操作
│
├── types/
│   └── dicom.ts                # MODIFY: SeriesInfo, StudyInfo, ActiveTool 拡張
│
├── hooks/
│   ├── useCornerstone.ts       # NO CHANGE
│   └── useToast.ts             # NO CHANGE
│
└── styles/
    └── globals.css             # MODIFY: --panel-left-width: 180px
```

## Tech Stack Additions

| Addition | Purpose | License |
|----------|---------|---------|
| `dicom-parser` (既存) | シリーズグループ化のためのヘッダパース | MIT |
| `LengthTool` (Cornerstone3D Tools 既存) | 距離計測 | MIT |
| `AngleTool` (Cornerstone3D Tools 既存) | 角度計測 | MIT |
| `ArrowAnnotateTool` (Cornerstone3D Tools 既存) | 矢印アノテーション | MIT |

新たな依存追加なし。全て既存の Cornerstone3D Tools のビルトインツール。

## JPEG-LS Wasm Decoder

Phase 2 では保留。Cornerstone3D の内蔵コーデック (`@cornerstonejs/codec-charls`) が JPEG-LS を処理可能。自作 Rust Wasm デコーダの差し替えは Phase 3 のボリュームレンダリング時にまとめて行う。
