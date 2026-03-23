# DICOM Viewer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based DICOM Viewer with Cornerstone3D + Rust Wasm hybrid architecture, supporting 2D image display with WL/WW, zoom/pan/rotate, and metadata viewing.

**Architecture:** React + TypeScript frontend using Cornerstone3D for WebGL rendering and tool interactions. Custom Rust → Wasm decoder for JPEG2000 images, running in a Web Worker to keep UI responsive. Dark professional UI with Inter font and Lucide icons.

**Tech Stack:** Vite, React 18, TypeScript, Cornerstone3D (core + tools + dicom-image-loader), Rust + wasm-pack, CSS Modules, Lucide React, Inter font

**Spec:** `docs/superpowers/specs/2026-03-24-dicom-viewer-design.md`

---

## Prerequisites

Before starting, ensure these tools are installed:

```bash
# Node.js (LTS)
winget install OpenJS.NodeJS.LTS
# Restart terminal after install, verify:
node --version   # v20+ or v22+
npm --version

# Rust toolchain
winget install Rustlang.Rustup
# Restart terminal, then:
rustup default stable
rustup target add wasm32-unknown-unknown

# wasm-pack
cargo install wasm-pack
```

---

## File Structure

```
dicom-viewer/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
│
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root: layout shell with panels
│   │
│   ├── components/
│   │   ├── Header.tsx              # Top bar: logo, filename, fullscreen toggle
│   │   ├── Header.module.css
│   │   ├── Toolbar.tsx             # Tool buttons, WL/WW display, presets
│   │   ├── Toolbar.module.css
│   │   ├── Viewport.tsx            # Cornerstone3D viewport wrapper
│   │   ├── Viewport.module.css
│   │   ├── ThumbnailPanel.tsx      # Left panel: image thumbnails
│   │   ├── ThumbnailPanel.module.css
│   │   ├── MetadataPanel.tsx       # Right panel: DICOM tag display
│   │   ├── MetadataPanel.module.css
│   │   ├── DropZone.tsx            # D&D overlay + file picker
│   │   ├── DropZone.module.css
│   │   ├── Toast.tsx               # Error/info notification
│   │   └── Toast.module.css
│   │
│   ├── core/
│   │   ├── cornerstoneSetup.ts     # Initialize Cornerstone3D + dicom-image-loader + tools
│   │   ├── imageLoader.ts          # File → imageId conversion, fileManager integration
│   │   ├── metadataProvider.ts     # Custom metadata extraction for UI panels
│   │   └── toolSetup.ts            # Register & configure tools (WL/WW, Zoom, Pan, Rotate)
│   │
│   ├── hooks/
│   │   ├── useCornerstone.ts       # Hook: init Cornerstone on mount
│   │   └── useToast.ts             # Hook: toast notification state
│   │
│   ├── styles/
│   │   └── globals.css             # CSS custom properties, reset, font import
│   │
│   └── types/
│       └── dicom.ts                # DicomMetadata type, WL/WW preset type
│
├── wasm/
│   ├── Cargo.toml                  # Rust project: wasm-bindgen + openjpeg bindings
│   ├── src/
│   │   ├── lib.rs                  # Wasm entry: export decode_jpeg2000, convert_pixel_data
│   │   └── pixel.rs                # Pixel data conversion (12bit→8bit, etc.)
│   └── pkg/                        # wasm-pack build output (gitignored)
│
├── tests/
│   ├── setup.ts                    # Vitest setup (mock WebGL, etc.)
│   ├── core/
│   │   ├── imageLoader.test.ts     # Image loader unit tests
│   │   └── metadataProvider.test.ts # Metadata extraction tests
│   └── components/
│       ├── DropZone.test.tsx        # D&D and file picker tests
│       └── MetadataPanel.test.tsx   # Metadata display tests
│
└── public/
    └── (test DICOM files, added manually)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Initialize project with Vite**

```bash
cd c:/Users/yukiv/develop/AntiGravity/Workspace/Was_trial/dicom-viewer
npm create vite@latest . -- --template react-ts
```

Select: Overwrite existing files if prompted (only docs/ exists).

- [ ] **Step 2: Install core dependencies**

```bash
npm install @cornerstonejs/core @cornerstonejs/tools @cornerstonejs/dicom-image-loader dicom-parser lucide-react
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D @originjs/vite-plugin-commonjs vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Configure Vite for Cornerstone3D + Wasm**

Replace `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  plugins: [
    react(),
    viteCommonjs(),
  ],
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  worker: {
    format: 'es',
  },
  assetsInclude: ['**/*.wasm'],
});
```

- [ ] **Step 5: Configure TypeScript for tests**

Add to `tsconfig.json` under `compilerOptions`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

Add `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 6: Create test setup file**

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';

// Mock WebGL context for Cornerstone3D in tests
HTMLCanvasElement.prototype.getContext = function (contextType: string) {
  if (contextType === 'webgl2' || contextType === 'webgl') {
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => 0,
      createShader: () => ({}),
      createProgram: () => ({}),
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      enable: () => {},
      disable: () => {},
    } as unknown as WebGLRenderingContext;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
```

- [ ] **Step 7: Add npm scripts**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "wasm:build": "cd wasm && wasm-pack build --target web --out-dir pkg"
  }
}
```

- [ ] **Step 8: Verify project starts**

```bash
npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173`, default React page loads.

- [ ] **Step 9: Initialize git and commit**

```bash
cd c:/Users/yukiv/develop/AntiGravity/Workspace/Was_trial/dicom-viewer
git init
```

Create `.gitignore`:

```
node_modules/
dist/
wasm/pkg/
wasm/target/
*.wasm
.superpowers/
```

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with Cornerstone3D deps"
```

---

## Task 2: Design System (CSS Custom Properties)

**Files:**
- Create: `src/styles/globals.css`
- Modify: `index.html` (add Inter font), `src/main.tsx` (import globals.css)

- [ ] **Step 1: Create globals.css with design tokens**

Create `src/styles/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  /* Background */
  --bg-deepest: #0a0a0f;
  --bg-panel: #12131a;
  --bg-panel-end: #14151f;
  --bg-surface: #1a1b26;
  --bg-hover: #222330;
  --bg-active: #2a2b3a;

  /* Border */
  --border-default: #2a2b3a;
  --border-subtle: #1e1f2e;

  /* Text */
  --text-primary: #e0e0e8;
  --text-secondary: #8888a0;
  --text-disabled: #555566;

  /* Accent */
  --accent: #4a9eff;
  --accent-hover: #6bb0ff;
  --accent-error: #ff6b6b;
  --accent-success: #4ecdc4;

  /* Shadows */
  --shadow-panel: 0 0 20px rgba(0, 0, 0, 0.5);
  --shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.6);

  /* Sizing */
  --header-height: 40px;
  --toolbar-height: 44px;
  --panel-left-width: 120px;
  --panel-right-width: 280px;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;

  /* Font */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: var(--text-primary);
  background: var(--bg-deepest);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Selection */
::selection {
  background: rgba(74, 158, 255, 0.3);
}
```

- [ ] **Step 2: Update main.tsx to import globals**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Update index.html**

Replace `index.html`:

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DICOM Viewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify dark theme renders**

```bash
npm run dev
```

Expected: Page with pure dark background (#0a0a0f), no default Vite styling.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/main.tsx index.html
git commit -m "feat: add dark professional design system with CSS custom properties"
```

---

## Task 3: Type Definitions

**Files:**
- Create: `src/types/dicom.ts`

- [ ] **Step 1: Create DICOM type definitions**

Create `src/types/dicom.ts`:

```typescript
export interface PatientMetadata {
  name: string;
  id: string;
  birthDate: string;
  sex: string;
}

export interface StudyMetadata {
  date: string;
  description: string;
  accessionNumber: string;
}

export interface SeriesMetadata {
  modality: string;
  description: string;
  number: string;
}

export interface ImageMetadata {
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  windowCenter: number;
  windowWidth: number;
  transferSyntax: string;
  photometricInterpretation: string;
  sopInstanceUid: string;
}

export interface DicomMetadata {
  patient: PatientMetadata;
  study: StudyMetadata;
  series: SeriesMetadata;
  image: ImageMetadata;
}

export interface WLPreset {
  label: string;
  windowCenter: number;
  windowWidth: number;
}

export const WL_PRESETS: WLPreset[] = [
  { label: '軟部組織', windowCenter: 40, windowWidth: 400 },
  { label: '肺野', windowCenter: -600, windowWidth: 1500 },
  { label: '骨', windowCenter: 300, windowWidth: 1500 },
  { label: '脳', windowCenter: 40, windowWidth: 80 },
  { label: '腹部', windowCenter: 60, windowWidth: 400 },
];

export type ActiveTool = 'windowLevel' | 'zoom' | 'pan' | 'rotate';
```

- [ ] **Step 2: Commit**

```bash
git add src/types/dicom.ts
git commit -m "feat: add DICOM type definitions and WL/WW presets"
```

---

## Task 4: Cornerstone3D Initialization

**Files:**
- Create: `src/core/cornerstoneSetup.ts`, `src/core/toolSetup.ts`, `src/hooks/useCornerstone.ts`

- [ ] **Step 1: Create Cornerstone initialization module**

Create `src/core/cornerstoneSetup.ts`:

```typescript
import { init as coreInit } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

let initialized = false;

export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  await coreInit();
  await dicomImageLoaderInit();
  cornerstoneToolsInit();

  initialized = true;
}
```

- [ ] **Step 2: Create tool setup module**

Create `src/core/toolSetup.ts`:

```typescript
import {
  addTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
  PanTool,
  TrackballRotateTool,
  StackScrollMouseWheelTool,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';

const TOOL_GROUP_ID = 'dicomViewerToolGroup';

let toolGroupCreated = false;

export function setupTools(): void {
  if (toolGroupCreated) return;

  addTool(WindowLevelTool);
  addTool(ZoomTool);
  addTool(PanTool);
  addTool(TrackballRotateTool);
  addTool(StackScrollMouseWheelTool);

  toolGroupCreated = true;
}

export function createToolGroup(
  viewportId: string,
  renderingEngineId: string,
): void {
  const existing = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (existing) {
    existing.addViewport(viewportId, renderingEngineId);
    return;
  }

  const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  toolGroup.addTool(WindowLevelTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(TrackballRotateTool.toolName);
  toolGroup.addTool(StackScrollMouseWheelTool.toolName);

  toolGroup.addViewport(viewportId, renderingEngineId);

  // Per spec: right-drag = WL/WW, scroll = Zoom, middle-drag = Pan, Shift+left = Rotate
  toolGroup.setToolActive(WindowLevelTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });
  // Shift+left-drag for rotation per spec
  toolGroup.setToolActive(TrackballRotateTool.toolName, {
    bindings: [{
      mouseButton: csToolsEnums.MouseBindings.Primary,
      modifierKey: csToolsEnums.KeyboardBindings.Shift,
    }],
  });
  // Mouse wheel for zoom (single images in MVP; switch to StackScroll in Phase 2)
  toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);
}

export function setActiveTool(toolName: string): void {
  const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  // All switchable tools that can be bound to primary mouse button
  const tools = [
    WindowLevelTool.toolName,
    ZoomTool.toolName,
    PanTool.toolName,
    TrackballRotateTool.toolName,
  ];

  for (const name of tools) {
    if (name === toolName) {
      toolGroup.setToolActive(name, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    } else {
      toolGroup.setToolPassive(name);
    }
  }
}

export { TOOL_GROUP_ID };
```

- [ ] **Step 3: Create useCornerstone hook**

Create `src/hooks/useCornerstone.ts`:

```typescript
import { useEffect, useState } from 'react';
import { initCornerstone } from '../core/cornerstoneSetup';
import { setupTools } from '../core/toolSetup';

export function useCornerstone(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initCornerstone();
        setupTools();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Cornerstone init failed',
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
```

- [ ] **Step 4: Verify no import errors**

```bash
npm run build
```

Expected: Build succeeds (may have unused variable warnings, that's OK).

- [ ] **Step 5: Commit**

```bash
git add src/core/cornerstoneSetup.ts src/core/toolSetup.ts src/hooks/useCornerstone.ts
git commit -m "feat: add Cornerstone3D initialization and tool setup"
```

---

## Task 5: Image Loader & Metadata Provider

**Files:**
- Create: `src/core/imageLoader.ts`, `src/core/metadataProvider.ts`
- Test: `tests/core/imageLoader.test.ts`, `tests/core/metadataProvider.test.ts`

- [ ] **Step 1: Write image loader tests**

Create `tests/core/imageLoader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isDicomFile } from '../../src/core/imageLoader';

describe('imageLoader', () => {
  it('should detect valid DICOM files by DICM magic bytes', () => {
    const buffer = new ArrayBuffer(132);
    const view = new Uint8Array(buffer);
    // DICM magic at offset 128
    view[128] = 0x44; // D
    view[129] = 0x49; // I
    view[130] = 0x43; // C
    view[131] = 0x4d; // M
    expect(isDicomFile(buffer)).toBe(true);
  });

  it('should reject non-DICOM files', () => {
    const buffer = new ArrayBuffer(132);
    expect(isDicomFile(buffer)).toBe(false);
  });

  it('should reject files too small to be DICOM', () => {
    const buffer = new ArrayBuffer(10);
    expect(isDicomFile(buffer)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/core/imageLoader.test.ts
```

Expected: FAIL — `isDicomFile` not found.

- [ ] **Step 3: Implement image loader**

Create `src/core/imageLoader.ts`:

```typescript
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

/**
 * Check if an ArrayBuffer contains a DICOM file by verifying
 * the DICM magic number at byte offset 128.
 */
export function isDicomFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 132) return false;
  const view = new Uint8Array(buffer, 128, 4);
  return (
    view[0] === 0x44 && // D
    view[1] === 0x49 && // I
    view[2] === 0x43 && // C
    view[3] === 0x4d    // M
  );
}

/**
 * Register local File objects with Cornerstone's fileManager
 * and return their imageIds.
 */
export function loadLocalFiles(files: File[]): string[] {
  return files
    .filter((f) => f.name.endsWith('.dcm') || f.name.endsWith('.DCM') || !f.name.includes('.'))
    .map((file) => cornerstoneDICOMImageLoader.wadouri.fileManager.add(file));
}

/**
 * Validate files by reading the first 132 bytes and checking DICM magic.
 * Returns { valid: File[], invalid: string[] }.
 */
export async function validateDicomFiles(
  files: File[],
): Promise<{ valid: File[]; invalid: string[] }> {
  const valid: File[] = [];
  const invalid: string[] = [];

  for (const file of files) {
    try {
      const header = await file.slice(0, 132).arrayBuffer();
      if (isDicomFile(header)) {
        valid.push(file);
      } else {
        invalid.push(file.name);
      }
    } catch {
      invalid.push(file.name);
    }
  }

  return { valid, invalid };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- tests/core/imageLoader.test.ts
```

Expected: PASS

- [ ] **Step 5: Write metadata provider tests**

Create `tests/core/metadataProvider.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../../src/core/metadataProvider';

describe('metadataProvider', () => {
  it('should return empty metadata for unknown imageId', () => {
    const meta = extractMetadata('unknown:123');
    expect(meta).toBeNull();
  });

  it('should store and retrieve metadata', async () => {
    const { storeMetadata, extractMetadata } = await import(
      '../../src/core/metadataProvider'
    );
    const testMeta = {
      patient: { name: 'Test', id: '001', birthDate: '2000-01-01', sex: 'M' },
      study: { date: '2026-01-01', description: 'CT', accessionNumber: 'A001' },
      series: { modality: 'CT', description: 'Axial', number: '1' },
      image: {
        rows: 512, columns: 512, bitsAllocated: 16, bitsStored: 12,
        windowCenter: 40, windowWidth: 400,
        transferSyntax: '1.2.840.10008.1.2.1',
        photometricInterpretation: 'MONOCHROME2',
        sopInstanceUid: '1.2.3.4.5',
      },
    };

    storeMetadata('test:1', testMeta);
    const result = extractMetadata('test:1');
    expect(result).toEqual(testMeta);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm run test:run -- tests/core/metadataProvider.test.ts
```

Expected: FAIL

- [ ] **Step 7: Implement metadata provider**

Create `src/core/metadataProvider.ts`:

```typescript
import type { DicomMetadata } from '../types/dicom';

const metadataStore = new Map<string, DicomMetadata>();

/**
 * Store parsed DICOM metadata keyed by imageId.
 */
export function storeMetadata(imageId: string, metadata: DicomMetadata): void {
  metadataStore.set(imageId, metadata);
}

/**
 * Retrieve stored metadata for an imageId.
 */
export function extractMetadata(imageId: string): DicomMetadata | null {
  return metadataStore.get(imageId) ?? null;
}

/**
 * Clear all stored metadata.
 */
export function clearMetadata(): void {
  metadataStore.clear();
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npm run test:run -- tests/core/metadataProvider.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/core/imageLoader.ts src/core/metadataProvider.ts tests/core/
git commit -m "feat: add image loader with DICOM validation and metadata store"
```

---

## Task 6: App Shell Layout

**Files:**
- Create: `src/components/Header.tsx`, `src/components/Header.module.css`, `src/App.tsx`

- [ ] **Step 1: Create Header component**

Create `src/components/Header.module.css`:

```css
.header {
  height: var(--header-height);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
  user-select: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.logoIcon {
  color: var(--accent);
}

.filename {
  flex: 1;
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 4px;
}

.iconButton {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.iconButton:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

Create `src/components/Header.tsx`:

```tsx
import { Maximize2, Minimize2, Activity } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  filename: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function Header({ filename, isFullscreen, onToggleFullscreen }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Activity size={18} className={styles.logoIcon} />
        <span>DICOM Viewer</span>
      </div>
      <div className={styles.filename}>
        {filename ?? 'ファイルを開いてください'}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.iconButton}
          onClick={onToggleFullscreen}
          title={isFullscreen ? '通常表示' : 'フルスクリーン'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create App shell with three-panel layout**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';

function App() {
  const { ready, error } = useCornerstone();
  const [filename, setFilename] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (error) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--accent-error)',
      }}>
        初期化エラー: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-secondary)',
      }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header
        filename={filename}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel - thumbnails */}
        {leftPanelOpen && (
          <div style={{
            width: 'var(--panel-left-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderRight: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}>
            {/* ThumbnailPanel placeholder */}
          </div>
        )}

        {/* Center - viewport */}
        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-deepest)' }}>
          {/* Viewport + DropZone placeholder */}
        </div>

        {/* Right panel - metadata */}
        {rightPanelOpen && (
          <div style={{
            width: 'var(--panel-right-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderLeft: '1px solid var(--border-subtle)',
            flexShrink: 0,
            overflow: 'auto',
          }}>
            {/* MetadataPanel placeholder */}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Verify layout renders**

```bash
npm run dev
```

Expected: Dark header bar with "DICOM Viewer" logo and fullscreen button. Three-panel layout below (left narrow, center wide, right medium). All dark themed.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/components/Header.module.css src/App.tsx
git commit -m "feat: add app shell with header and three-panel dark layout"
```

---

## Task 7: DropZone Component

**Files:**
- Create: `src/components/DropZone.tsx`, `src/components/DropZone.module.css`
- Test: `tests/components/DropZone.test.tsx`

- [ ] **Step 1: Write DropZone test**

Create `tests/components/DropZone.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropZone } from '../../src/components/DropZone';

describe('DropZone', () => {
  it('should render drop prompt when no images loaded', () => {
    render(<DropZone hasImages={false} onFilesSelected={vi.fn()} />);
    expect(screen.getByText(/ドラッグ&ドロップ/)).toBeInTheDocument();
  });

  it('should not render overlay when images are loaded', () => {
    render(<DropZone hasImages={true} onFilesSelected={vi.fn()} />);
    expect(screen.queryByText(/ドラッグ&ドロップ/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/components/DropZone.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement DropZone**

Create `src/components/DropZone.module.css`:

```css
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  background: var(--bg-deepest);
}

.dropActive {
  background: rgba(74, 158, 255, 0.05);
  border: 2px dashed var(--accent);
}

.icon {
  color: var(--text-secondary);
  opacity: 0.5;
}

.text {
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
  text-align: center;
}

.subtext {
  color: var(--text-disabled);
  font-size: var(--font-size-sm);
}

.fileInput {
  display: none;
}

.browseButton {
  padding: 8px 20px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  font-family: var(--font-family);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.browseButton:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(74, 158, 255, 0.05);
}
```

Create `src/components/DropZone.tsx`:

```tsx
import { useCallback, useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import styles from './DropZone.module.css';

interface DropZoneProps {
  hasImages: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function DropZone({ hasImages, onFilesSelected }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  if (hasImages) return null;

  return (
    <div
      className={`${styles.overlay} ${dragActive ? styles.dropActive : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <Upload size={48} className={styles.icon} />
      <div className={styles.text}>DICOMファイルをドラッグ&ドロップ</div>
      <div className={styles.subtext}>または</div>
      <button
        className={styles.browseButton}
        onClick={() => inputRef.current?.click()}
      >
        ファイルを選択
      </button>
      <input
        ref={inputRef}
        type="file"
        className={styles.fileInput}
        accept=".dcm,.DCM"
        multiple
        onChange={handleFileInput}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- tests/components/DropZone.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DropZone.tsx src/components/DropZone.module.css tests/components/DropZone.test.tsx
git commit -m "feat: add DropZone component with D&D and file picker"
```

---

## Task 8: Viewport Component (Cornerstone3D Integration)

**Files:**
- Create: `src/components/Viewport.tsx`, `src/components/Viewport.module.css`

- [ ] **Step 1: Create Viewport CSS**

Create `src/components/Viewport.module.css`:

```css
.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.viewport {
  width: 100%;
  height: 100%;
  outline: none;
}

.overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overlayBottomRight {
  position: absolute;
  bottom: 8px;
  right: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  pointer-events: none;
  text-align: right;
}
```

- [ ] **Step 2: Create Viewport component**

Create `src/components/Viewport.tsx`:

```tsx
import { useEffect, useRef, useCallback } from 'react';
import { RenderingEngine, Enums, type Types } from '@cornerstonejs/core';
import { createToolGroup } from '../core/toolSetup';
import styles from './Viewport.module.css';

const RENDERING_ENGINE_ID = 'dicomViewerEngine';
const VIEWPORT_ID = 'dicomViewerViewport';

interface ViewportProps {
  imageIds: string[];
  onVoiChange?: (windowCenter: number, windowWidth: number) => void;
}

export function Viewport({ imageIds, onVoiChange }: ViewportProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  const initViewport = useCallback(async () => {
    const element = elementRef.current;
    if (!element) return;

    if (!engineRef.current) {
      engineRef.current = new RenderingEngine(RENDERING_ENGINE_ID);
    }

    const engine = engineRef.current;

    const viewportInput: Types.PublicViewportInput = {
      viewportId: VIEWPORT_ID,
      element,
      type: Enums.ViewportType.STACK,
    };

    engine.enableElement(viewportInput);
    createToolGroup(VIEWPORT_ID, RENDERING_ENGINE_ID);
  }, []);

  // Initialize viewport on mount
  useEffect(() => {
    initViewport();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [initViewport]);

  // Load images when imageIds change
  useEffect(() => {
    if (imageIds.length === 0 || !engineRef.current) return;

    const viewport = engineRef.current.getViewport(VIEWPORT_ID) as Types.IStackViewport;
    if (!viewport) return;

    viewport.setStack(imageIds);
    viewport.render();
  }, [imageIds]);

  // Listen for VOI changes
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onVoiChange) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.range) {
        onVoiChange(
          (detail.range.lower + detail.range.upper) / 2,
          detail.range.upper - detail.range.lower,
        );
      }
    };

    element.addEventListener(Enums.Events.VOI_MODIFIED, handler);
    return () => element.removeEventListener(Enums.Events.VOI_MODIFIED, handler);
  }, [onVoiChange]);

  return (
    <div className={styles.container}>
      <div ref={elementRef} className={styles.viewport} />
    </div>
  );
}

export { VIEWPORT_ID, RENDERING_ENGINE_ID };
```

- [ ] **Step 3: Wire Viewport and DropZone into App**

Update `src/App.tsx` — replace the center panel placeholder:

```tsx
import { useState, useCallback } from 'react';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { Viewport } from './components/Viewport';
import { validateDicomFiles, loadLocalFiles } from './core/imageLoader';

function App() {
  const { ready, error } = useCornerstone();
  const [filename, setFilename] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelOpen] = useState(true);
  const [rightPanelOpen] = useState(true);
  const [windowCenter, setWindowCenter] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const { valid, invalid } = await validateDicomFiles(files);

    if (invalid.length > 0) {
      console.warn('Non-DICOM files skipped:', invalid);
    }

    if (valid.length === 0) return;

    const ids = loadLocalFiles(valid);
    setImageIds(ids);
    setFilename(valid.length === 1 ? valid[0].name : `${valid.length} files`);
  }, []);

  const handleVoiChange = useCallback((wc: number, ww: number) => {
    setWindowCenter(Math.round(wc));
    setWindowWidth(Math.round(ww));
  }, []);

  if (error) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--accent-error)',
      }}>
        初期化エラー: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-secondary)',
      }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header
        filename={filename}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {leftPanelOpen && (
          <div style={{
            width: 'var(--panel-left-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderRight: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }} />
        )}

        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-deepest)' }}>
          <Viewport imageIds={imageIds} onVoiChange={handleVoiChange} />
          <DropZone hasImages={imageIds.length > 0} onFilesSelected={handleFilesSelected} />
        </div>

        {rightPanelOpen && (
          <div style={{
            width: 'var(--panel-right-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderLeft: '1px solid var(--border-subtle)',
            flexShrink: 0,
            overflow: 'auto',
          }} />
        )}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Test end-to-end with a DICOM file**

```bash
npm run dev
```

Expected: App loads, shows DropZone. Dragging a DICOM file (.dcm) displays the image in the viewport. Right-drag adjusts WL/WW, left-drag zooms, middle-drag pans, Shift+left-drag rotates, scroll wheel scrolls through stack.

- [ ] **Step 5: Commit**

```bash
git add src/components/Viewport.tsx src/components/Viewport.module.css src/App.tsx
git commit -m "feat: integrate Cornerstone3D viewport with file loading and tool interactions"
```

---

## Task 9: Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`, `src/components/Toolbar.module.css`

- [ ] **Step 1: Create Toolbar CSS**

Create `src/components/Toolbar.module.css`:

```css
.toolbar {
  height: var(--toolbar-height);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 4px;
  user-select: none;
}

.separator {
  width: 1px;
  height: 24px;
  background: var(--border-default);
  margin: 0 8px;
}

.toolButton {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toolButton:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolButtonActive {
  background: var(--bg-active);
  border-color: var(--accent);
  color: var(--accent);
}

.voiDisplay {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 8px;
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.voiLabel {
  color: var(--text-secondary);
}

.voiValue {
  color: var(--text-primary);
  font-weight: 500;
  min-width: 48px;
}

.presetSelect {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  padding: 4px 8px;
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}

.presetSelect:hover,
.presetSelect:focus {
  border-color: var(--accent);
}

.spacer {
  flex: 1;
}

.panelToggle {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.panelToggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.panelToggleActive {
  color: var(--accent);
}
```

- [ ] **Step 2: Create Toolbar component**

Create `src/components/Toolbar.tsx`:

```tsx
import {
  Sun, Contrast, ZoomIn, Move, RotateCw,
  Maximize, PanelLeft, PanelRight,
} from 'lucide-react';
import { WL_PRESETS, type ActiveTool, type WLPreset } from '../types/dicom';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  activeTool: ActiveTool;
  windowCenter: number;
  windowWidth: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToolChange: (tool: ActiveTool) => void;
  onPresetSelect: (preset: WLPreset) => void;
  onFitToWindow: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

export function Toolbar({
  activeTool,
  windowCenter,
  windowWidth,
  leftPanelOpen,
  rightPanelOpen,
  onToolChange,
  onPresetSelect,
  onFitToWindow,
  onToggleLeftPanel,
  onToggleRightPanel,
}: ToolbarProps) {
  const toolBtn = (tool: ActiveTool, icon: React.ReactNode, title: string) => (
    <button
      className={`${styles.toolButton} ${activeTool === tool ? styles.toolButtonActive : ''}`}
      onClick={() => onToolChange(tool)}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={styles.toolbar}>
      {toolBtn('windowLevel', <Sun size={16} />, 'ウィンドウレベル (WL/WW)')}
      {toolBtn('zoom', <ZoomIn size={16} />, 'ズーム')}
      {toolBtn('pan', <Move size={16} />, 'パン')}
      {toolBtn('rotate', <RotateCw size={16} />, '回転')}

      <div className={styles.separator} />

      <button className={styles.toolButton} onClick={onFitToWindow} title="ウィンドウにフィット">
        <Maximize size={16} />
      </button>

      <div className={styles.separator} />

      <div className={styles.voiDisplay}>
        <span className={styles.voiLabel}>WL:</span>
        <span className={styles.voiValue}>{windowCenter}</span>
        <span className={styles.voiLabel}>WW:</span>
        <span className={styles.voiValue}>{windowWidth}</span>
      </div>

      <select
        className={styles.presetSelect}
        value=""
        onChange={(e) => {
          const preset = WL_PRESETS.find((p) => p.label === e.target.value);
          if (preset) onPresetSelect(preset);
        }}
      >
        <option value="" disabled>プリセット</option>
        {WL_PRESETS.map((p) => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
      </select>

      <div className={styles.spacer} />

      <button
        className={`${styles.panelToggle} ${leftPanelOpen ? styles.panelToggleActive : ''}`}
        onClick={onToggleLeftPanel}
        title="サムネイルパネル"
      >
        <PanelLeft size={16} />
      </button>
      <button
        className={`${styles.panelToggle} ${rightPanelOpen ? styles.panelToggleActive : ''}`}
        onClick={onToggleRightPanel}
        title="情報パネル"
      >
        <PanelRight size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire Toolbar into App**

Update `src/App.tsx` — add Toolbar between Header and the panel row. Add state for `activeTool`, `leftPanelOpen`, `rightPanelOpen`. Import `setActiveTool` from `toolSetup` and call it when tool changes. Add `onFitToWindow` that resets viewport. Add `onPresetSelect` that sets VOI on viewport.

Key additions to App:

```tsx
import { Toolbar } from './components/Toolbar';
import { setActiveTool } from './core/toolSetup';
import { RenderingEngine } from '@cornerstonejs/core';
import type { ActiveTool, WLPreset } from './types/dicom';
import { VIEWPORT_ID, RENDERING_ENGINE_ID } from './components/Viewport';
import { WindowLevelTool, ZoomTool, PanTool, TrackballRotateTool } from '@cornerstonejs/tools';

// Inside App component:
const [activeTool, setActiveToolState] = useState<ActiveTool>('windowLevel');
// Change leftPanelOpen/rightPanelOpen from const to state with setters

const handleToolChange = useCallback((tool: ActiveTool) => {
  const toolNameMap: Record<ActiveTool, string> = {
    windowLevel: WindowLevelTool.toolName,
    zoom: ZoomTool.toolName,
    pan: PanTool.toolName,
    rotate: TrackballRotateTool.toolName,
  };
  setActiveTool(toolNameMap[tool]);
  setActiveToolState(tool);
}, []);

const handlePresetSelect = useCallback((preset: WLPreset) => {
  // Get viewport and set VOI
  const engine = new RenderingEngine(RENDERING_ENGINE_ID); // Note: get existing, don't create new
  // Actual implementation will use cornerstone API to set VOI
}, []);

const handleFitToWindow = useCallback(() => {
  // Reset viewport to fit image
}, []);
```

Full `src/App.tsx` (complete replacement):

```tsx
import { useState, useCallback } from 'react';
import { getRenderingEngine, Enums, type Types } from '@cornerstonejs/core';
import { WindowLevelTool, ZoomTool, PanTool, TrackballRotateTool } from '@cornerstonejs/tools';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { DropZone } from './components/DropZone';
import { Viewport, VIEWPORT_ID, RENDERING_ENGINE_ID } from './components/Viewport';
import { validateDicomFiles, loadLocalFiles } from './core/imageLoader';
import { setActiveTool } from './core/toolSetup';
import type { ActiveTool, WLPreset } from './types/dicom';

function App() {
  const { ready, error } = useCornerstone();
  const [filename, setFilename] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTool, setActiveToolState] = useState<ActiveTool>('windowLevel');
  const [windowCenter, setWindowCenter] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const { valid, invalid } = await validateDicomFiles(files);
    if (invalid.length > 0) {
      console.warn('Non-DICOM files skipped:', invalid);
    }
    if (valid.length === 0) return;
    const ids = loadLocalFiles(valid);
    setImageIds(ids);
    setFilename(valid.length === 1 ? valid[0].name : `${valid.length} files`);
  }, []);

  const handleVoiChange = useCallback((wc: number, ww: number) => {
    setWindowCenter(Math.round(wc));
    setWindowWidth(Math.round(ww));
  }, []);

  const handleToolChange = useCallback((tool: ActiveTool) => {
    const toolNameMap: Record<ActiveTool, string> = {
      windowLevel: WindowLevelTool.toolName,
      zoom: ZoomTool.toolName,
      pan: PanTool.toolName,
      rotate: TrackballRotateTool.toolName,
    };
    setActiveTool(toolNameMap[tool]);
    setActiveToolState(tool);
  }, []);

  const handlePresetSelect = useCallback((preset: WLPreset) => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;
    if (!viewport) return;
    viewport.setProperties({
      voiRange: {
        lower: preset.windowCenter - preset.windowWidth / 2,
        upper: preset.windowCenter + preset.windowWidth / 2,
      },
    });
    viewport.render();
    setWindowCenter(preset.windowCenter);
    setWindowWidth(preset.windowWidth);
  }, []);

  const handleFitToWindow = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;
    if (!viewport) return;
    viewport.resetCamera();
    viewport.render();
  }, []);

  if (error) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--accent-error)',
      }}>
        初期化エラー: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-secondary)',
      }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header
        filename={filename}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <Toolbar
        activeTool={activeTool}
        windowCenter={windowCenter}
        windowWidth={windowWidth}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToolChange={handleToolChange}
        onPresetSelect={handlePresetSelect}
        onFitToWindow={handleFitToWindow}
        onToggleLeftPanel={() => setLeftPanelOpen((v) => !v)}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {leftPanelOpen && (
          <div style={{
            width: 'var(--panel-left-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderRight: '1px solid var(--border-subtle)',
            flexShrink: 0,
            transition: 'width var(--transition-normal)',
          }} />
        )}

        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-deepest)' }}>
          <Viewport imageIds={imageIds} onVoiChange={handleVoiChange} />
          <DropZone hasImages={imageIds.length > 0} onFilesSelected={handleFilesSelected} />
        </div>

        {rightPanelOpen && (
          <div style={{
            width: 'var(--panel-right-width)',
            background: 'linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-panel-end) 100%)',
            borderLeft: '1px solid var(--border-subtle)',
            flexShrink: 0,
            overflow: 'auto',
            transition: 'width var(--transition-normal)',
          }} />
        )}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Verify toolbar renders and tools switch**

```bash
npm run dev
```

Expected: Toolbar below header with tool icons, WL/WW display, preset dropdown, and panel toggles. Clicking tool buttons highlights them. Panel toggle buttons show/hide left and right panels.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.module.css src/App.tsx
git commit -m "feat: add toolbar with tool switching, WL/WW presets, and panel toggles"
```

---

## Task 10: Metadata Panel

**Files:**
- Create: `src/components/MetadataPanel.tsx`, `src/components/MetadataPanel.module.css`
- Test: `tests/components/MetadataPanel.test.tsx`

- [ ] **Step 1: Write MetadataPanel test**

Create `tests/components/MetadataPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import type { DicomMetadata } from '../../src/types/dicom';

const mockMetadata: DicomMetadata = {
  patient: { name: 'YAMADA^TARO', id: 'P001', birthDate: '19900101', sex: 'M' },
  study: { date: '20260101', description: 'CT CHEST', accessionNumber: 'A001' },
  series: { modality: 'CT', description: 'Axial 5mm', number: '1' },
  image: {
    rows: 512, columns: 512, bitsAllocated: 16, bitsStored: 12,
    windowCenter: 40, windowWidth: 400,
    transferSyntax: '1.2.840.10008.1.2.1',
    photometricInterpretation: 'MONOCHROME2',
    sopInstanceUid: '1.2.3.4.5',
  },
};

describe('MetadataPanel', () => {
  it('should display patient name', () => {
    render(<MetadataPanel metadata={mockMetadata} />);
    expect(screen.getByText('YAMADA^TARO')).toBeInTheDocument();
  });

  it('should display modality', () => {
    render(<MetadataPanel metadata={mockMetadata} />);
    expect(screen.getByText('CT')).toBeInTheDocument();
  });

  it('should show placeholder when no metadata', () => {
    render(<MetadataPanel metadata={null} />);
    expect(screen.getByText(/ファイルを読み込む/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/components/MetadataPanel.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Create MetadataPanel CSS**

Create `src/components/MetadataPanel.module.css`:

```css
.panel {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  font-size: var(--font-size-sm);
}

.section {
  margin-bottom: 16px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  cursor: pointer;
  user-select: none;
}

.sectionIcon {
  color: var(--accent);
}

.sectionTitle {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sectionContent {
  padding-left: 4px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 3px 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.label {
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-right: 8px;
}

.value {
  color: var(--text-primary);
  text-align: right;
  word-break: break-all;
}
```

- [ ] **Step 4: Implement MetadataPanel**

Create `src/components/MetadataPanel.tsx`:

```tsx
import { useState } from 'react';
import { User, FileText, Layers, Image } from 'lucide-react';
import type { DicomMetadata } from '../types/dicom';
import styles from './MetadataPanel.module.css';

interface MetadataPanelProps {
  metadata: DicomMetadata | null;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen(!open)}>
        <span className={styles.sectionIcon}>{icon}</span>
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      {open && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{String(value)}</span>
    </div>
  );
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  if (!metadata) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>ファイルを読み込むと情報が表示されます</div>
      </div>
    );
  }

  const { patient, study, series, image } = metadata;

  return (
    <div className={styles.panel}>
      <Section icon={<User size={14} />} title="Patient">
        <Row label="Name" value={patient.name} />
        <Row label="ID" value={patient.id} />
        <Row label="Birth Date" value={patient.birthDate} />
        <Row label="Sex" value={patient.sex} />
      </Section>

      <Section icon={<FileText size={14} />} title="Study">
        <Row label="Date" value={study.date} />
        <Row label="Description" value={study.description} />
        <Row label="Accession #" value={study.accessionNumber} />
      </Section>

      <Section icon={<Layers size={14} />} title="Series">
        <Row label="Modality" value={series.modality} />
        <Row label="Description" value={series.description} />
        <Row label="Number" value={series.number} />
      </Section>

      <Section icon={<Image size={14} />} title="Image">
        <Row label="Size" value={`${image.columns} x ${image.rows}`} />
        <Row label="Bits" value={`${image.bitsStored} / ${image.bitsAllocated}`} />
        <Row label="WL / WW" value={`${image.windowCenter} / ${image.windowWidth}`} />
        <Row label="Transfer Syntax" value={image.transferSyntax} />
        <Row label="Photometric" value={image.photometricInterpretation} />
      </Section>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:run -- tests/components/MetadataPanel.test.tsx
```

Expected: PASS

- [ ] **Step 6: Wire MetadataPanel into App**

In `src/App.tsx`, add state for `metadata`, import `MetadataPanel`, and render it inside the right panel div. Hook metadata extraction into the image loading flow using Cornerstone's metadata API.

Add import:
```tsx
import { MetadataPanel } from './components/MetadataPanel';
import { metaData } from '@cornerstonejs/core';
import type { DicomMetadata } from './types/dicom';
```

Add state:
```tsx
const [metadata, setMetadata] = useState<DicomMetadata | null>(null);
```

Add a metadata extraction function that listens for the IMAGE_LOADED event:
```tsx
// In App component, add a useEffect to listen for image load events:
useEffect(() => {
  const handleImageLoaded = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const imageId = detail?.image?.imageId;
    if (!imageId) return;

    try {
      const patient = metaData.get('patientModule', imageId);
      const study = metaData.get('generalStudyModule', imageId);
      const series = metaData.get('generalSeriesModule', imageId);
      const imagePixel = metaData.get('imagePixelModule', imageId);
      const voiLut = metaData.get('voiLutModule', imageId);
      const sopCommon = metaData.get('sopCommonModule', imageId);
      // Transfer Syntax is in the file meta info, retrieved via a separate metadata type
      const transferSyntaxMeta = metaData.get('transferSyntax', imageId);

      if (imagePixel) {
        setMetadata({
          patient: {
            name: patient?.patientName ?? '',
            id: patient?.patientId ?? '',
            birthDate: patient?.patientBirthDate ?? '',
            sex: patient?.patientSex ?? '',
          },
          study: {
            date: study?.studyDate ?? '',
            description: study?.studyDescription ?? '',
            accessionNumber: study?.accessionNumber ?? '',
          },
          series: {
            modality: series?.modality ?? '',
            description: series?.seriesDescription ?? '',
            number: series?.seriesNumber ?? '',
          },
          image: {
            rows: imagePixel.rows ?? 0,
            columns: imagePixel.columns ?? 0,
            bitsAllocated: imagePixel.bitsAllocated ?? 0,
            bitsStored: imagePixel.bitsStored ?? 0,
            windowCenter: voiLut?.windowCenter?.[0] ?? 0,
            windowWidth: voiLut?.windowWidth?.[0] ?? 0,
            transferSyntax: transferSyntaxMeta ?? '',
            photometricInterpretation: imagePixel.photometricInterpretation ?? '',
            sopInstanceUid: sopCommon?.sopInstanceUID ?? '',
          },
        });
      }
    } catch (e) {
      console.warn('Failed to extract metadata:', e);
    }
  };

  document.addEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);
  return () => document.removeEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);
}, []);
```

Replace the right panel placeholder with:
```tsx
<MetadataPanel metadata={metadata} />
```

- [ ] **Step 7: Verify metadata displays**

```bash
npm run dev
```

Expected: Load a DICOM file. Right panel shows Patient, Study, Series, Image sections with extracted DICOM tag values. Sections are collapsible.

- [ ] **Step 8: Commit**

```bash
git add src/components/MetadataPanel.tsx src/components/MetadataPanel.module.css tests/components/MetadataPanel.test.tsx src/App.tsx
git commit -m "feat: add metadata panel with DICOM tag display and collapsible sections"
```

---

## Task 11: Toast Notification System

**Files:**
- Create: `src/components/Toast.tsx`, `src/components/Toast.module.css`, `src/hooks/useToast.ts`

- [ ] **Step 1: Create toast hook**

Create `src/hooks/useToast.ts`:

```typescript
import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'error' | 'success';
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
```

- [ ] **Step 2: Create Toast component**

Create `src/components/Toast.module.css`:

```css
.container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  box-shadow: var(--shadow-dropdown);
  animation: slideIn 200ms ease-out;
  max-width: 360px;
  cursor: pointer;
}

.error {
  border-color: var(--accent-error);
  border-left: 3px solid var(--accent-error);
}

.success {
  border-color: var(--accent-success);
  border-left: 3px solid var(--accent-success);
}

.info {
  border-color: var(--accent);
  border-left: 3px solid var(--accent);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Create `src/components/Toast.tsx`:

```tsx
import type { ToastMessage } from '../hooks/useToast';
import styles from './Toast.module.css';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Integrate toast into App for error handling**

In `src/App.tsx`:

Add imports:
```tsx
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
```

Add hook:
```tsx
const { toasts, addToast, removeToast } = useToast();
```

Update `handleFilesSelected` to show toast for invalid files:
```tsx
if (invalid.length > 0) {
  addToast(
    `${invalid.length}件のファイルはDICOM形式ではありません`,
    'error',
  );
}
if (valid.length === 0) {
  addToast('有効なDICOMファイルが見つかりません', 'error');
  return;
}
```

Add `<ToastContainer toasts={toasts} onDismiss={removeToast} />` at the end of the root div.

- [ ] **Step 4: Verify toast notification**

```bash
npm run dev
```

Expected: Drop a non-DICOM file (e.g., .txt). Red toast notification appears at bottom-right and auto-dismisses after 4 seconds.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toast.tsx src/components/Toast.module.css src/hooks/useToast.ts src/App.tsx
git commit -m "feat: add toast notification system for error handling"
```

---

## Task 12: Thumbnail Panel

**Files:**
- Create: `src/components/ThumbnailPanel.tsx`, `src/components/ThumbnailPanel.module.css`

- [ ] **Step 1: Create ThumbnailPanel CSS**

Create `src/components/ThumbnailPanel.module.css`:

```css
.panel {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  color: var(--text-disabled);
  font-size: var(--font-size-xs);
}

.thumbnail {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-deepest);
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  font-size: var(--font-size-xs);
  transition: border-color var(--transition-fast);
}

.thumbnail:hover {
  border-color: var(--border-default);
}

.thumbnailActive {
  border-color: var(--accent);
}

.index {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  text-align: center;
  padding: 2px 0;
}
```

- [ ] **Step 2: Create ThumbnailPanel component**

Create `src/components/ThumbnailPanel.tsx`:

```tsx
import styles from './ThumbnailPanel.module.css';

interface ThumbnailPanelProps {
  imageIds: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ThumbnailPanel({ imageIds, activeIndex, onSelect }: ThumbnailPanelProps) {
  if (imageIds.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>画像</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {imageIds.map((_, index) => (
        <div key={index}>
          <div
            className={`${styles.thumbnail} ${index === activeIndex ? styles.thumbnailActive : ''}`}
            onClick={() => onSelect(index)}
          >
            {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire ThumbnailPanel into App**

In `src/App.tsx`:

Add import:
```tsx
import { ThumbnailPanel } from './components/ThumbnailPanel';
```

Add state:
```tsx
const [activeImageIndex, setActiveImageIndex] = useState(0);
```

Add handler:
```tsx
const handleThumbnailSelect = useCallback((index: number) => {
  setActiveImageIndex(index);
  const engine = getRenderingEngine(RENDERING_ENGINE_ID);
  if (!engine) return;
  const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;
  if (!viewport) return;
  viewport.setImageIdIndex(index);
  viewport.render();
}, []);
```

Replace left panel placeholder with:
```tsx
<ThumbnailPanel
  imageIds={imageIds}
  activeIndex={activeImageIndex}
  onSelect={handleThumbnailSelect}
/>
```

- [ ] **Step 4: Verify thumbnails work**

```bash
npm run dev
```

Expected: Load multiple DICOM files. Left panel shows numbered thumbnails. Clicking one switches the viewport to that image.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThumbnailPanel.tsx src/components/ThumbnailPanel.module.css src/App.tsx
git commit -m "feat: add thumbnail panel with image selection"
```

---

## Task 13: Rust Wasm Project Setup (Pixel Conversion + JPEG2000)

**Files:**
- Create: `wasm/Cargo.toml`, `wasm/src/lib.rs`, `wasm/src/pixel.rs`, `wasm/src/jpeg2000.rs`

- [ ] **Step 1: Create Rust project**

```bash
cd c:/Users/yukiv/develop/AntiGravity/Workspace/Was_trial/dicom-viewer
mkdir -p wasm/src
```

- [ ] **Step 2: Create Cargo.toml with openjpeg dependency**

Create `wasm/Cargo.toml`:

```toml
[package]
name = "dicom-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
openjp2 = "0.5"   # Pure Rust JPEG2000 decoder (MIT license, no C dependency)

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
```

Note: `openjp2` is a pure Rust port of OpenJPEG (MIT licensed), avoiding LGPL concerns. If it proves insufficient for some DICOM edge cases, it can be swapped for `openjpeg-sys` (LGPL) later.

- [ ] **Step 3: Create pixel.rs - pixel data conversion**

Create `wasm/src/pixel.rs`:

```rust
/// Convert 16-bit pixel data to 8-bit by applying window level/width.
/// This is useful for large datasets where JS would be slow.
pub fn apply_window_level(
    pixel_data: &[i16],
    window_center: f64,
    window_width: f64,
) -> Vec<u8> {
    let lower = window_center - window_width / 2.0;
    let upper = window_center + window_width / 2.0;
    let range = upper - lower;

    pixel_data
        .iter()
        .map(|&val| {
            let v = val as f64;
            if v <= lower {
                0u8
            } else if v >= upper {
                255u8
            } else {
                ((v - lower) / range * 255.0) as u8
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_level_basic() {
        let data: Vec<i16> = vec![-100, 0, 40, 100, 200];
        let result = apply_window_level(&data, 40.0, 400.0);
        // lower = -160, upper = 240, range = 400
        assert_eq!(result[0], 38);  // (-100 - (-160)) / 400 * 255 ≈ 38
        assert_eq!(result[2], 127); // (40 - (-160)) / 400 * 255 ≈ 127
    }

    #[test]
    fn test_window_level_clamp() {
        let data: Vec<i16> = vec![-1000, 1000];
        let result = apply_window_level(&data, 0.0, 100.0);
        assert_eq!(result[0], 0);
        assert_eq!(result[1], 255);
    }
}
```

- [ ] **Step 4: Create jpeg2000.rs - JPEG2000 decoder**

**IMPORTANT: Crate selection and API verification.** Before writing this file, run:

```bash
# Check available JPEG2000 crates and their APIs:
cargo search jpeg2000
cargo search openjpeg
# Try these candidates in order of preference:
# 1. `jpeg2000` crate (if available, pure Rust, MIT)
# 2. `openjpeg-sys` + safe wrapper (LGPL, well-tested)
# 3. `openjp2` (check actual API with `cargo doc --open`)
```

After selecting a crate, update `Cargo.toml` and write `jpeg2000.rs` implementing this contract:

```rust
/// Decode a JPEG2000 codestream (raw J2K or JP2 wrapped) into raw pixel data.
/// Returns (pixel_data_bytes, width, height, bits_per_sample, num_components).
pub fn decode_j2k(encoded: &[u8]) -> Result<(Vec<u8>, u32, u32, u32, u32), String>
```

Create `wasm/src/jpeg2000.rs` — **skeleton to fill after crate API is verified**:

```rust
// TODO: Replace with actual crate imports after verification in Step 4.
// The selected crate's decode function must:
// 1. Accept raw JPEG2000 codestream bytes (&[u8])
// 2. Return decoded pixel data with image dimensions and bit depth

/// Decode a JPEG2000 codestream into raw pixel data.
/// Returns (pixel_data_bytes, width, height, bits_per_sample, num_components).
pub fn decode_j2k(encoded: &[u8]) -> Result<(Vec<u8>, u32, u32, u32, u32), String> {
    // Step 1: Create decoder from the selected crate
    // Step 2: Feed encoded bytes
    // Step 3: Extract image properties (width, height, bits, components)
    // Step 4: Interleave component data into contiguous pixel buffer
    //   - For 8-bit: 1 byte per sample
    //   - For 16-bit: 2 bytes per sample (little-endian)
    // Step 5: Return (data, width, height, bits, components)

    Err("JPEG2000 decoder not yet implemented — complete after crate API verification".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_invalid_data() {
        let result = decode_j2k(&[0, 1, 2, 3]);
        assert!(result.is_err());
    }
}
```

**Concrete steps to complete this file:**
1. Run `cargo doc --open` for the selected crate to see the actual API
2. Find the decode function (typically: create decoder → set source → decode → get image)
3. Implement `decode_j2k` using the real API
4. Test with a real JPEG2000 file extracted from a DICOM dataset
5. If no pure-Rust crate works for Wasm target, fall back to Cornerstone3D's built-in `@cornerstonejs/codec-openjpeg` for MVP and revisit this in Phase 2

- [ ] **Step 5: Create lib.rs - Wasm entry point**

Create `wasm/src/lib.rs`:

```rust
mod pixel;
mod jpeg2000;

use wasm_bindgen::prelude::*;
use js_sys::{Int16Array, Uint8Array};

/// Convert 16-bit pixel data to 8-bit using window level/width.
#[wasm_bindgen]
pub fn convert_pixel_data(
    data: &Int16Array,
    window_center: f64,
    window_width: f64,
) -> Uint8Array {
    let input: Vec<i16> = data.to_vec();
    let output = pixel::apply_window_level(&input, window_center, window_width);
    let result = Uint8Array::new_with_length(output.len() as u32);
    result.copy_from(&output);
    result
}

/// Decode a JPEG2000 codestream. Returns a JsValue containing:
/// { data: Uint8Array, width: u32, height: u32, bitsPerSample: u32, numComponents: u32 }
#[wasm_bindgen]
pub fn decode_jpeg2000(encoded: &Uint8Array) -> Result<JsValue, JsValue> {
    let input = encoded.to_vec();
    let (data, width, height, bits, components) = jpeg2000::decode_j2k(&input)
        .map_err(|e| JsValue::from_str(&e))?;

    let obj = js_sys::Object::new();
    let pixel_data = Uint8Array::new_with_length(data.len() as u32);
    pixel_data.copy_from(&data);

    js_sys::Reflect::set(&obj, &"data".into(), &pixel_data)?;
    js_sys::Reflect::set(&obj, &"width".into(), &JsValue::from(width))?;
    js_sys::Reflect::set(&obj, &"height".into(), &JsValue::from(height))?;
    js_sys::Reflect::set(&obj, &"bitsPerSample".into(), &JsValue::from(bits))?;
    js_sys::Reflect::set(&obj, &"numComponents".into(), &JsValue::from(components))?;

    Ok(obj.into())
}

/// Returns the version string of the WASM module.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
```

- [ ] **Step 6: Run Rust tests**

```bash
cd c:/Users/yukiv/develop/AntiGravity/Workspace/Was_trial/dicom-viewer/wasm
cargo test
```

Expected: 3 tests pass (2 pixel + 1 jpeg2000 error case).

- [ ] **Step 7: Build Wasm**

```bash
cd c:/Users/yukiv/develop/AntiGravity/Workspace/Was_trial/dicom-viewer
npm run wasm:build
```

Expected: `wasm/pkg/` directory created with `.wasm` file and JS bindings.

- [ ] **Step 8: Commit**

```bash
git add wasm/Cargo.toml wasm/src/
git commit -m "feat: add Rust Wasm module with JPEG2000 decoder and pixel conversion"
```

---

## Task 14: Web Worker + Wasm Integration

**Files:**
- Create: `src/workers/decodeWorker.ts`
- Modify: `src/core/cornerstoneSetup.ts` (register custom codec)

- [ ] **Step 1: Create decode Web Worker**

Create `src/workers/decodeWorker.ts`:

```typescript
import init, { decode_jpeg2000, version } from '../../wasm/pkg/dicom_wasm';

let wasmReady = false;

async function initWasm() {
  if (wasmReady) return;
  await init();
  console.log(`DICOM Wasm decoder v${version()} ready`);
  wasmReady = true;
}

// Initialize Wasm on worker start
initWasm();

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    await initWasm();

    if (type === 'decode_jpeg2000') {
      const encoded = new Uint8Array(payload.data);
      const result = decode_jpeg2000(encoded);
      self.postMessage(
        { id, type: 'result', payload: result },
        // Transfer the pixel data buffer for zero-copy
        { transfer: [(result as any).data.buffer] } as any,
      );
    } else {
      self.postMessage({ id, type: 'error', error: `Unknown type: ${type}` });
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
```

- [ ] **Step 2: Test Wasm loads via Worker**

Add temporary code in `src/App.tsx`:

```typescript
// In a useEffect:
const worker = new Worker(
  new URL('./workers/decodeWorker.ts', import.meta.url),
  { type: 'module' },
);
worker.onmessage = (e) => console.log('Worker response:', e.data);
```

- [ ] **Step 3: Verify Worker + Wasm loads**

```bash
npm run dev
```

Expected: Console shows "DICOM Wasm decoder v0.1.0 ready".

- [ ] **Step 4: Remove temporary test code**

Remove temporary Worker test from App.tsx.

- [ ] **Step 5: Register Wasm decoder as custom codec in Cornerstone**

Modify `src/core/cornerstoneSetup.ts` to register the Wasm JPEG2000 decoder with Cornerstone's dicom-image-loader. This makes JPEG2000-compressed DICOM files use our Wasm decoder instead of the built-in one:

```typescript
import { init as coreInit } from '@cornerstonejs/core';
import {
  init as dicomImageLoaderInit,
  wadouri,
} from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

let initialized = false;

export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  await coreInit();
  await dicomImageLoaderInit();
  cornerstoneToolsInit();

  // Register custom Wasm JPEG2000 decoder
  // This overrides the built-in codec for JPEG2000 Transfer Syntaxes
  registerWasmCodec();

  initialized = true;
}

function registerWasmCodec(): void {
  // Create a decode worker
  const worker = new Worker(
    new URL('../workers/decodeWorker.ts', import.meta.url),
    { type: 'module' },
  );

  let requestId = 0;
  const pending = new Map<number, { resolve: Function; reject: Function }>();

  worker.onmessage = (e: MessageEvent) => {
    const { id, type, payload, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (type === 'result') {
      p.resolve(payload);
    } else {
      p.reject(new Error(error));
    }
  };

  function decodeViaWasm(compressedData: Uint8Array): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = requestId++;
      pending.set(id, { resolve, reject });
      worker.postMessage(
        { id, type: 'decode_jpeg2000', payload: { data: compressedData.buffer } },
        [compressedData.buffer],
      );
    });
  }

  // Register as external codec for JPEG2000 transfer syntaxes
  // The dicom-image-loader checks for external codecs before using built-in ones
  const externalCodecs = (wadouri as any).externalCodecs ?? {};
  // JPEG 2000 Lossless
  externalCodecs['1.2.840.10008.1.2.4.90'] = decodeViaWasm;
  // JPEG 2000 Lossy
  externalCodecs['1.2.840.10008.1.2.4.91'] = decodeViaWasm;
  (wadouri as any).externalCodecs = externalCodecs;
}
```

Note: The exact mechanism for registering external codecs with `@cornerstonejs/dicom-image-loader` may differ by version. If `wadouri.externalCodecs` is not available, check the library's codec registration API (e.g., `cornerstoneDICOMImageLoader.external.registerCodec()` or similar). The key contract: provide a function that takes compressed bytes and returns decoded pixel data. If registration proves too complex for MVP, fall back to using Cornerstone's built-in JPEG2000 codec (which already uses Wasm internally via `@cornerstonejs/codec-openjpeg`) and wire the custom Rust decoder in Phase 2.

- [ ] **Step 6: Verify JPEG2000 DICOM files decode**

```bash
npm run dev
```

Load a JPEG2000-compressed DICOM file. Expected: Image displays correctly, console may show "DICOM Wasm decoder v0.1.0 ready" from the Worker.

- [ ] **Step 7: Commit**

```bash
git add src/workers/decodeWorker.ts src/core/cornerstoneSetup.ts src/App.tsx
git commit -m "feat: wire Wasm JPEG2000 decoder into Cornerstone3D pipeline"
```

---

## Task 15: Error Handling for Unsupported Files

**Files:**
- Modify: `src/components/Viewport.tsx` (show error overlay for unsupported Transfer Syntax)
- Modify: `src/App.tsx` (handle decode errors)

- [ ] **Step 1: Add error overlay to Viewport**

Add to `src/components/Viewport.module.css`:

```css
.errorOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--accent-error);
  font-size: var(--font-size-md);
  background: rgba(10, 10, 15, 0.9);
  z-index: 5;
}

.errorDetail {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
```

- [ ] **Step 2: Add error state to Viewport**

Add an `error` prop to `ViewportProps`:

```typescript
interface ViewportProps {
  imageIds: string[];
  error: string | null;
  onVoiChange?: (windowCenter: number, windowWidth: number) => void;
}
```

Render error overlay when `error` is set:

```tsx
{error && (
  <div className={styles.errorOverlay}>
    <AlertCircle size={32} />
    <div>{error}</div>
  </div>
)}
```

- [ ] **Step 3: Handle decode errors in App**

In `handleFilesSelected`, wrap the loading in try/catch. On Cornerstone IMAGE_LOAD_FAILED event, set an error state and show toast:

```tsx
const [viewportError, setViewportError] = useState<string | null>(null);

useEffect(() => {
  const handleLoadFailed = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const error = detail?.error?.message ?? '画像の読み込みに失敗しました';
    if (error.includes('transfer syntax') || error.includes('codec')) {
      setViewportError(`未対応の圧縮形式です (${error})`);
    } else {
      addToast(error, 'error');
    }
  };

  document.addEventListener(Enums.Events.IMAGE_LOAD_FAILED, handleLoadFailed);
  return () => document.removeEventListener(Enums.Events.IMAGE_LOAD_FAILED, handleLoadFailed);
}, [addToast]);
```

Pass `viewportError` to `<Viewport error={viewportError} />`.

- [ ] **Step 4: Verify error handling**

```bash
npm run dev
```

Expected: Loading an unsupported Transfer Syntax shows error overlay in viewport area. Loading a non-DICOM file shows toast notification.

- [ ] **Step 5: Commit**

```bash
git add src/components/Viewport.tsx src/components/Viewport.module.css src/App.tsx
git commit -m "feat: add error handling for unsupported transfer syntax and corrupt files"
```

---

## Task 16: Final Polish & All Tests Pass

**Files:**
- Modify: Various files for polish

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds. Output in `dist/`.

- [ ] **Step 3: Test with real DICOM files**

Manual testing checklist:

1. Drop a single .dcm file → image displays
2. Drop a folder of .dcm files → all load, thumbnails appear
3. Drop a .txt file → error toast appears
4. Right-drag → WL/WW adjusts, toolbar values update
5. Left-drag → zoom in/out (default) or scroll wheel
6. Middle-drag → pan image
7. Click "ウィンドウにフィット" → image resets to fit
8. Select preset (肺野) → WL/WW changes to preset values
9. Toggle left panel → thumbnail panel shows/hides
10. Toggle right panel → metadata panel shows/hides
11. Click fullscreen → app goes fullscreen
12. Collapsible metadata sections → click to open/close

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: DICOM Viewer MVP complete - Cornerstone3D + Rust Wasm hybrid"
```

---

## Summary

| Task | Description | Key Output |
|------|-------------|------------|
| 1 | Project scaffolding | Vite + React + TS + Cornerstone3D deps |
| 2 | Design system | CSS custom properties, dark theme |
| 3 | Type definitions | DicomMetadata, WLPreset, ActiveTool types |
| 4 | Cornerstone3D init | Core + tools + dicom-image-loader setup |
| 5 | Image loader & metadata | File validation, metadata store |
| 6 | App shell layout | Header + three-panel layout |
| 7 | DropZone | Drag & drop + file picker |
| 8 | Viewport | Cornerstone3D rendering + tool interactions |
| 9 | Toolbar | Tool buttons, WL/WW display, presets |
| 10 | Metadata panel | DICOM tag display with collapsible sections |
| 11 | Toast notifications | Error/info notification system |
| 12 | Thumbnail panel | Image list with selection |
| 13 | Rust Wasm setup | JPEG2000 decoder + pixel conversion with tests |
| 14 | Web Worker + Wasm integration | Decode Worker, Wasm loads in browser |
| 15 | Error handling | Unsupported Transfer Syntax, corrupt files |
| 16 | Final polish | All tests pass, manual testing |
