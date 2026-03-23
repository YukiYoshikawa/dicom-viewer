# Phase 2 Implementation Plan: Series Management, Measurement & Annotation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-frame scrolling with automatic series grouping, distance/angle measurement tools, and arrow annotations to the DICOM Viewer.

**Architecture:** Extend the existing Cornerstone3D-based viewer. Add `seriesManager.ts` for DICOM header parsing and series grouping using `dicom-parser`. Replace `ThumbnailPanel` with a 2-level `SeriesPanel`. Register `LengthTool`, `AngleTool`, and `ArrowAnnotateTool` from Cornerstone3D Tools into the existing tool group. Extend `Toolbar` with measurement/annotation buttons and slice indicator.

**Tech Stack:** React 18, TypeScript, Cornerstone3D (core + tools + dicom-image-loader), dicom-parser, Vite

**Spec:** `docs/superpowers/specs/2026-03-24-phase2-design.md`

---

## File Structure

```
src/
├── types/
│   └── dicom.ts                 # MODIFY: add SeriesInfo, extend ActiveTool
├── core/
│   ├── seriesManager.ts         # NEW: parse headers, group by series, sort
│   ├── toolSetup.ts             # MODIFY: add LengthTool, AngleTool, ArrowAnnotateTool
│   └── imageLoader.ts           # MODIFY: add folder extraction via DataTransfer
├── components/
│   ├── SeriesPanel.tsx          # NEW: replaces ThumbnailPanel
│   ├── SeriesPanel.module.css   # NEW
│   ├── Toolbar.tsx              # MODIFY: add measurement/annotation buttons, slice indicator
│   ├── Toolbar.module.css       # MODIFY
│   ├── Viewport.tsx             # MODIFY: add slice overlay, onSliceChange callback
│   ├── Viewport.module.css      # MODIFY
│   └── App.tsx (src/App.tsx)    # MODIFY: series state, wire new components
├── styles/
│   └── globals.css              # MODIFY: --panel-left-width: 180px
└── tests/
    └── core/
        └── seriesManager.test.ts # NEW
```

---

## Task 1: Type Definitions Extension

**Files:**
- Modify: `src/types/dicom.ts`

- [ ] **Step 1: Add SeriesInfo type and extend ActiveTool**

Add to end of `src/types/dicom.ts`:

```typescript
export interface SeriesInfo {
  seriesInstanceUid: string;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  imageIds: string[];
  imageCount: number;
}

// Replace the existing ActiveTool type:
// OLD: export type ActiveTool = 'windowLevel' | 'zoom' | 'pan' | 'rotate';
// NEW:
export type ActiveTool =
  | 'windowLevel' | 'zoom' | 'pan' | 'rotate'
  | 'length' | 'angle' | 'arrowAnnotate';
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. (Toolbar's TOOL_BUTTONS array only references the old 4 tools — that's fine, it will be updated in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/types/dicom.ts
git commit -m "feat: add SeriesInfo type and extend ActiveTool for measurement/annotation"
```

---

## Task 2: Series Manager (Core Logic)

**Files:**
- Create: `src/core/seriesManager.ts`
- Create: `tests/core/seriesManager.test.ts`

- [ ] **Step 1: Write series manager tests**

Create `tests/core/seriesManager.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { groupFilesBySeriesFromMetadata } from '../../src/core/seriesManager';

describe('seriesManager', () => {
  it('should group images by series instance UID', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: 'Axial', modality: 'CT', sopInstanceUid: 'A' },
      { imageId: 'dicomfile:1', seriesInstanceUid: 'S1', instanceNumber: 2, sliceLocation: 1, seriesNumber: '1', seriesDescription: 'Axial', modality: 'CT', sopInstanceUid: 'B' },
      { imageId: 'dicomfile:2', seriesInstanceUid: 'S2', instanceNumber: 1, sliceLocation: 0, seriesNumber: '2', seriesDescription: 'Sagittal', modality: 'CT', sopInstanceUid: 'C' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series).toHaveLength(2);
    expect(series[0].imageIds).toEqual(['dicomfile:0', 'dicomfile:1']);
    expect(series[1].imageIds).toEqual(['dicomfile:2']);
  });

  it('should sort by instance number within series', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 3, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'A' },
      { imageId: 'dicomfile:1', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'B' },
      { imageId: 'dicomfile:2', seriesInstanceUid: 'S1', instanceNumber: 2, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'C' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series[0].imageIds).toEqual(['dicomfile:1', 'dicomfile:2', 'dicomfile:0']);
  });

  it('should handle single image as single series', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: 'Scout', modality: 'CR', sopInstanceUid: 'A' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series).toHaveLength(1);
    expect(series[0].imageCount).toBe(1);
    expect(series[0].modality).toBe('CR');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/core/seriesManager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement series manager**

Create `src/core/seriesManager.ts`:

```typescript
import * as dicomParser from 'dicom-parser';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import type { SeriesInfo } from '../types/dicom';

export interface DicomFileEntry {
  imageId: string;
  seriesInstanceUid: string;
  instanceNumber: number;
  sliceLocation: number;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  sopInstanceUid: string;
}

/**
 * Parse DICOM header from a File to extract series-relevant tags.
 * Reads only the first ~64KB for efficiency.
 */
export async function parseDicomHeader(
  file: File,
  imageId: string,
): Promise<DicomFileEntry | null> {
  try {
    const headerSize = Math.min(file.size, 65536);
    const buffer = await file.slice(0, headerSize).arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray, { untilTag: 'x7FE00010' });

    return {
      imageId,
      seriesInstanceUid: dataSet.string('x0020000e') ?? 'unknown',
      instanceNumber: dataSet.intString('x00200013') ?? 0,
      sliceLocation: dataSet.floatString('x00201041') ?? 0,
      seriesNumber: dataSet.string('x00200011') ?? '',
      seriesDescription: dataSet.string('x0008103e') ?? '',
      modality: dataSet.string('x00080060') ?? '',
      sopInstanceUid: dataSet.string('x00080018') ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Group parsed DICOM entries by Series Instance UID.
 * Each group is sorted by Instance Number, then Slice Location, then SOP Instance UID.
 */
export function groupFilesBySeriesFromMetadata(
  entries: DicomFileEntry[],
): SeriesInfo[] {
  const groups = new Map<string, DicomFileEntry[]>();

  for (const entry of entries) {
    const key = entry.seriesInstanceUid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const seriesList: SeriesInfo[] = [];

  for (const [uid, items] of groups) {
    // Sort: Instance Number → Slice Location → SOP Instance UID
    items.sort((a, b) => {
      if (a.instanceNumber !== b.instanceNumber) return a.instanceNumber - b.instanceNumber;
      if (a.sliceLocation !== b.sliceLocation) return a.sliceLocation - b.sliceLocation;
      return a.sopInstanceUid.localeCompare(b.sopInstanceUid);
    });

    const first = items[0];
    seriesList.push({
      seriesInstanceUid: uid,
      seriesNumber: first.seriesNumber,
      seriesDescription: first.seriesDescription,
      modality: first.modality,
      imageIds: items.map((i) => i.imageId),
      imageCount: items.length,
    });
  }

  // Sort series by series number
  seriesList.sort((a, b) => {
    const na = parseInt(a.seriesNumber) || 0;
    const nb = parseInt(b.seriesNumber) || 0;
    return na - nb;
  });

  return seriesList;
}

/**
 * High-level: register files with Cornerstone, parse headers, group into series.
 */
export async function loadAndGroupFiles(
  files: File[],
): Promise<{ seriesList: SeriesInfo[]; skipped: string[] }> {
  const skipped: string[] = [];
  const entries: DicomFileEntry[] = [];

  for (const file of files) {
    const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
    const entry = await parseDicomHeader(file, imageId);
    if (entry) {
      entries.push(entry);
    } else {
      skipped.push(file.name);
    }
  }

  const seriesList = groupFilesBySeriesFromMetadata(entries);
  return { seriesList, skipped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/core/seriesManager.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/seriesManager.ts tests/core/seriesManager.test.ts
git commit -m "feat: add series manager with DICOM header parsing and grouping"
```

---

## Task 3: Tool Setup Extension (Measurement + Annotation)

**Files:**
- Modify: `src/core/toolSetup.ts`

- [ ] **Step 1: Add measurement and annotation tools**

Modify `src/core/toolSetup.ts`:

1. Add imports for `LengthTool`, `AngleTool`, `ArrowAnnotateTool` from `@cornerstonejs/tools`
2. Register them in `setupTools()` with `addTool()`
3. Add them to `createToolGroup()` with `toolGroup.addTool()`
4. Update `setActiveTool()` to include the new tools in the switchable list

The key changes:

```typescript
// Add to imports:
import {
  // ...existing...
  LengthTool,
  AngleTool,
  ArrowAnnotateTool,
} from '@cornerstonejs/tools';

// In setupTools(), add:
addTool(LengthTool);
addTool(AngleTool);
addTool(ArrowAnnotateTool);

// In createToolGroup(), add:
toolGroup.addTool(LengthTool.toolName);
toolGroup.addTool(AngleTool.toolName);
toolGroup.addTool(ArrowAnnotateTool.toolName);

// In setActiveTool(), expand the tools array:
const tools = [
  WindowLevelTool.toolName,
  ZoomTool.toolName,
  PanTool.toolName,
  TrackballRotateTool.toolName,
  LengthTool.toolName,
  AngleTool.toolName,
  ArrowAnnotateTool.toolName,
];
```

NOTE: `LengthTool`, `AngleTool`, `ArrowAnnotateTool` may not exist with these exact names in Cornerstone3D v4.x. Check the actual exports:
```bash
node -e "const t = require('@cornerstonejs/tools'); console.log(Object.keys(t).filter(k => /length|angle|arrow/i.test(k)))"
```
Adapt names accordingly.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/core/toolSetup.ts
git commit -m "feat: register measurement and annotation tools in tool setup"
```

---

## Task 4: Series Panel (Replace ThumbnailPanel)

**Files:**
- Create: `src/components/SeriesPanel.tsx`
- Create: `src/components/SeriesPanel.module.css`
- Delete: `src/components/ThumbnailPanel.tsx`, `src/components/ThumbnailPanel.module.css`

- [ ] **Step 1: Create SeriesPanel CSS**

Create `src/components/SeriesPanel.module.css`:

```css
.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.seriesList {
  flex-shrink: 0;
  max-height: 40%;
  overflow-y: auto;
  border-bottom: 1px solid var(--border-subtle);
  padding: 4px;
}

.seriesCard {
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seriesCard:hover {
  background: var(--bg-hover);
}

.seriesCardActive {
  background: var(--bg-active);
  border-color: var(--accent);
}

.seriesModality {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
}

.seriesDescription {
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seriesCount {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.sliceList {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sliceItem {
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
  text-align: center;
}

.sliceItem:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sliceItemActive {
  background: var(--bg-active);
  border-color: var(--accent);
  color: var(--text-primary);
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  font-size: var(--font-size-xs);
  writing-mode: vertical-rl;
}

.sectionLabel {
  padding: 4px 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
```

- [ ] **Step 2: Create SeriesPanel component**

Create `src/components/SeriesPanel.tsx`:

```tsx
import type { SeriesInfo } from '../types/dicom';
import styles from './SeriesPanel.module.css';

interface SeriesPanelProps {
  seriesList: SeriesInfo[];
  activeSeriesIndex: number;
  activeSliceIndex: number;
  onSeriesSelect: (index: number) => void;
  onSliceSelect: (index: number) => void;
}

export function SeriesPanel({
  seriesList,
  activeSeriesIndex,
  activeSliceIndex,
  onSeriesSelect,
  onSliceSelect,
}: SeriesPanelProps) {
  if (seriesList.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>シリーズ</div>
      </div>
    );
  }

  const activeSeries = seriesList[activeSeriesIndex];

  return (
    <div className={styles.panel}>
      {/* Series list */}
      <div className={styles.seriesList}>
        <div className={styles.sectionLabel}>Series</div>
        {seriesList.map((series, index) => (
          <div
            key={series.seriesInstanceUid}
            className={`${styles.seriesCard} ${index === activeSeriesIndex ? styles.seriesCardActive : ''}`}
            onClick={() => onSeriesSelect(index)}
          >
            <span className={styles.seriesModality}>{series.modality}</span>
            <span className={styles.seriesDescription}>
              {series.seriesDescription || `Series ${series.seriesNumber}`}
            </span>
            <span className={styles.seriesCount}>{series.imageCount} images</span>
          </div>
        ))}
      </div>

      {/* Slice list for active series */}
      <div className={styles.sectionLabel}>
        Slices ({activeSeries?.imageCount ?? 0})
      </div>
      <div className={styles.sliceList}>
        {activeSeries?.imageIds.map((_, index) => (
          <div
            key={index}
            className={`${styles.sliceItem} ${index === activeSliceIndex ? styles.sliceItemActive : ''}`}
            onClick={() => onSliceSelect(index)}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete old ThumbnailPanel**

```bash
rm src/components/ThumbnailPanel.tsx src/components/ThumbnailPanel.module.css
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SeriesPanel.tsx src/components/SeriesPanel.module.css
git rm src/components/ThumbnailPanel.tsx src/components/ThumbnailPanel.module.css
git commit -m "feat: add SeriesPanel with 2-level hierarchy, remove ThumbnailPanel"
```

---

## Task 5: Toolbar Extension

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Toolbar.module.css`

- [ ] **Step 1: Add measurement/annotation buttons and slice indicator**

Update `Toolbar.tsx`:

1. Add new tool buttons to `TOOL_BUTTONS` array:
   - `{ tool: 'length', Icon: Ruler, title: '距離計測 (L)' }`
   - `{ tool: 'angle', Icon: Triangle, title: '角度計測 (A)' }` (use `Triangle` or appropriate lucide icon)
   - `{ tool: 'arrowAnnotate', Icon: ArrowUpRight, title: '矢印アノテーション' }`

2. Add separator between navigation tools and measurement tools

3. Add Reset button (RotateCcw icon) that calls `onReset`

4. Add slice indicator display and prev/next buttons:
   ```tsx
   <span className={styles.sliceIndicator}>
     {currentSlice} / {totalSlices}
   </span>
   <button onClick={onPrevSlice} title="前のスライス">
     <ChevronLeft size={16} />
   </button>
   <button onClick={onNextSlice} title="次のスライス">
     <ChevronRight size={16} />
   </button>
   ```

5. Extend `ToolbarProps`:
   ```typescript
   interface ToolbarProps {
     // ...existing...
     currentSlice: number;
     totalSlices: number;
     onPrevSlice: () => void;
     onNextSlice: () => void;
     onReset: () => void;
   }
   ```

- [ ] **Step 2: Update Toolbar CSS**

Add to `Toolbar.module.css`:

```css
.sliceIndicator {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  min-width: 60px;
  text-align: center;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build may fail because App.tsx doesn't pass the new props yet. That's OK — will be fixed in Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.module.css
git commit -m "feat: extend toolbar with measurement tools, annotations, and slice navigation"
```

---

## Task 6: Viewport Slice Overlay & Callback

**Files:**
- Modify: `src/components/Viewport.tsx`
- Modify: `src/components/Viewport.module.css`

- [ ] **Step 1: Add slice overlay to Viewport**

Add to `Viewport.module.css`:

```css
.sliceOverlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
```

- [ ] **Step 2: Add onSliceChange callback and slice display**

Update `ViewportProps`:

```typescript
interface ViewportProps {
  imageIds: string[];
  onVoiChange?: (windowCenter: number, windowWidth: number) => void;
  onImageRendered?: (imageId: string) => void;
  onImageLoadFailed?: (errorMessage: string) => void;
  onSliceChange?: (currentIndex: number, totalSlices: number) => void;
  error?: string | null;
}
```

After `viewport.setStack()` resolves, call:
```typescript
if (onSliceChangeRef.current) {
  onSliceChangeRef.current(0, imageIds.length);
}
```

Add a `STACK_NEW_IMAGE` event listener on the viewport element to track when the user scrolls through slices:
```typescript
const onStackNewImage = (evt: Event) => {
  const detail = (evt as CustomEvent).detail;
  const newIndex = detail?.imageIdIndex ?? 0;
  if (onSliceChangeRef.current) {
    onSliceChangeRef.current(newIndex, imageIds.length);
  }
};
element.addEventListener(Enums.Events.STACK_VIEWPORT_NEW_STACK, onStackNewImage);
```

NOTE: The exact event name may be `STACK_NEW_IMAGE` or `STACK_VIEWPORT_NEW_STACK` — check `Enums.Events` for available events.

Render slice overlay in JSX:
```tsx
{imageIds.length > 1 && (
  <div className={styles.sliceOverlay}>
    {currentSlice + 1} / {imageIds.length}
  </div>
)}
```

Use a local `currentSlice` state or ref within Viewport, updated by the stack event.

- [ ] **Step 3: Commit**

```bash
git add src/components/Viewport.tsx src/components/Viewport.module.css
git commit -m "feat: add slice overlay and scroll tracking to viewport"
```

---

## Task 7: App Integration (Wire Everything Together)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Update globals.css panel width**

In `src/styles/globals.css`, change:
```css
--panel-left-width: 180px;
```

- [ ] **Step 2: Rewrite App.tsx for series management**

Major changes to `src/App.tsx`:

1. Replace `ThumbnailPanel` import with `SeriesPanel`
2. Replace `validateDicomFiles` + `loadLocalFiles` with `loadAndGroupFiles` from `seriesManager`
3. Add state:
   ```typescript
   const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
   const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
   const [currentSlice, setCurrentSlice] = useState(0);
   const [totalSlices, setTotalSlices] = useState(0);
   ```

4. Update `handleFilesSelected`:
   ```typescript
   const handleFilesSelected = useCallback(async (files: File[]) => {
     const { seriesList, skipped } = await loadAndGroupFiles(files);
     if (skipped.length > 0) {
       addToast(`${skipped.length}件のファイルをスキップしました`, 'error');
     }
     if (seriesList.length === 0) {
       addToast('有効なDICOMシリーズが見つかりません', 'error');
       return;
     }
     setSeriesList(seriesList);
     setActiveSeriesIndex(0);
     setImageIds(seriesList[0].imageIds);
     setCurrentSlice(0);
     setTotalSlices(seriesList[0].imageCount);
     setFilename(seriesList.length === 1
       ? `${seriesList[0].modality} - ${seriesList[0].seriesDescription || 'Series ' + seriesList[0].seriesNumber}`
       : `${seriesList.length} series`);
   }, [addToast]);
   ```

5. Add `handleSeriesSelect`:
   ```typescript
   const handleSeriesSelect = useCallback((index: number) => {
     setActiveSeriesIndex(index);
     const series = seriesList[index];
     setImageIds(series.imageIds);
     setCurrentSlice(0);
     setTotalSlices(series.imageCount);
     setMetadata(null);
     setViewportError(null);
   }, [seriesList]);
   ```

6. Add `handleSliceChange`:
   ```typescript
   const handleSliceChange = useCallback((current: number, total: number) => {
     setCurrentSlice(current);
     setTotalSlices(total);
   }, []);
   ```

7. Add slice navigation:
   ```typescript
   const handlePrevSlice = useCallback(() => {
     const engine = getRenderingEngine(RENDERING_ENGINE_ID);
     if (!engine) return;
     const viewport = engine.getStackViewport(VIEWPORT_ID);
     if (!viewport) return;
     const newIndex = Math.max(0, currentSlice - 1);
     viewport.setImageIdIndex(newIndex);
   }, [currentSlice]);

   const handleNextSlice = useCallback(() => {
     const engine = getRenderingEngine(RENDERING_ENGINE_ID);
     if (!engine) return;
     const viewport = engine.getStackViewport(VIEWPORT_ID);
     if (!viewport) return;
     const newIndex = Math.min(totalSlices - 1, currentSlice + 1);
     viewport.setImageIdIndex(newIndex);
   }, [currentSlice, totalSlices]);
   ```

8. Add `handleReset`:
   ```typescript
   const handleReset = useCallback(() => {
     const engine = getRenderingEngine(RENDERING_ENGINE_ID);
     if (!engine) return;
     const viewport = engine.getStackViewport(VIEWPORT_ID);
     if (!viewport) return;
     viewport.resetCamera();
     viewport.render();
   }, []);
   ```

9. Update `handleToolChange` to map new tools:
   ```typescript
   const toolNameMap: Record<ActiveTool, string> = {
     windowLevel: 'WindowLevel',
     zoom: 'Zoom',
     pan: 'Pan',
     rotate: 'TrackballRotate',
     length: 'Length',
     angle: 'Angle',
     arrowAnnotate: 'ArrowAnnotate',
   };
   ```
   NOTE: Tool names may differ — check actual Cornerstone3D exports.

10. Replace `<ThumbnailPanel>` with `<SeriesPanel>` in JSX

11. Pass new props to `<Toolbar>`:
    ```tsx
    <Toolbar
      {...existingProps}
      currentSlice={currentSlice + 1}
      totalSlices={totalSlices}
      onPrevSlice={handlePrevSlice}
      onNextSlice={handleNextSlice}
      onReset={handleReset}
    />
    ```

12. Pass `onSliceChange` to `<Viewport>`:
    ```tsx
    <Viewport
      {...existingProps}
      onSliceChange={handleSliceChange}
    />
    ```

- [ ] **Step 3: Verify build and tests**

```bash
npm run test:run && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/styles/globals.css
git commit -m "feat: integrate series management, measurement tools, and slice navigation"
```

---

## Task 8: End-to-End Testing & Polish

**Files:**
- Various minor fixes

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Manual testing checklist**

1. Drop a single .dcm file → displays, metadata shows, single series in panel
2. Drop a folder with multiple series → auto-groups, series panel shows cards
3. Click series card → viewport switches to that series
4. Scroll mouse wheel → slices change, indicator updates
5. Click ◀ ▶ buttons → slice navigates
6. Select Length tool → click 2 points → distance displayed
7. Select Angle tool → click 3 points → angle displayed
8. Select Arrow tool → click + drag → arrow with text prompt
9. Delete key on selected annotation → removed
10. Reset button → viewport resets
11. Toggle panels → show/hide correctly
12. WL/WW presets still work

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete - series management, measurement, and annotation"
```

---

## Summary

| Task | Description | Key Output |
|------|-------------|------------|
| 1 | Type definitions | SeriesInfo type, extended ActiveTool |
| 2 | Series manager | Header parsing, grouping, sorting |
| 3 | Tool setup | LengthTool, AngleTool, ArrowAnnotateTool |
| 4 | Series panel | 2-level left panel replaces ThumbnailPanel |
| 5 | Toolbar extension | Measurement/annotation buttons, slice nav |
| 6 | Viewport update | Slice overlay, scroll tracking |
| 7 | App integration | Wire all new components and state |
| 8 | Testing & polish | E2E verification, final cleanup |
