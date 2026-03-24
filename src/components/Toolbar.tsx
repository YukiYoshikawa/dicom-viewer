import {
  Sun, ZoomIn, Move, RotateCw, PanelLeft, PanelRight, Maximize,
  Ruler, Compass, ArrowUpRight, RotateCcw, ChevronLeft, ChevronRight,
  FlipHorizontal2, FlipVertical2, Layers, Play, Pause, Plus, Minus,
  Camera, Printer, Circle, RectangleHorizontal, Pencil, Crosshair,
  ArrowLeftRight, Zap, LayoutGrid, Layout,
} from 'lucide-react';
import type { ActiveTool, WLPreset, LayoutType } from '../types/dicom';
import { WL_PRESETS } from '../types/dicom';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  activeTool: ActiveTool;
  windowCenter: number;
  windowWidth: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  currentSlice: number;
  totalSlices: number;
  cineActive: boolean;
  cineFps: number;
  layout: LayoutType;
  onToolChange: (tool: ActiveTool) => void;
  onPresetSelect: (preset: WLPreset) => void;
  onFitToWindow: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onPrevSlice: () => void;
  onNextSlice: () => void;
  onReset: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onInvert: () => void;
  onCineToggle: () => void;
  onCineFpsIncrease: () => void;
  onCineFpsDecrease: () => void;
  onAutoWL: () => void;
  onScreenshot: () => void;
  onPrint: () => void;
  onLayoutChange: (layout: LayoutType) => void;
}

const NAV_TOOL_BUTTONS: { tool: ActiveTool; Icon: React.ElementType; title: string }[] = [
  { tool: 'windowLevel', Icon: Sun, title: 'Window/Level (W)' },
  { tool: 'zoom', Icon: ZoomIn, title: 'Zoom (Z)' },
  { tool: 'pan', Icon: Move, title: 'Pan (P)' },
  { tool: 'rotate', Icon: RotateCw, title: 'Rotate (R)' },
];

const MEASURE_TOOL_BUTTONS: { tool: ActiveTool; Icon: React.ElementType; title: string }[] = [
  { tool: 'length', Icon: Ruler, title: '長さ計測 (L)' },
  { tool: 'angle', Icon: Compass, title: '角度計測 (A)' },
  { tool: 'arrowAnnotate', Icon: ArrowUpRight, title: 'アノテーション矢印' },
  { tool: 'circleROI', Icon: Circle, title: '円ROI' },
  { tool: 'ellipticalROI', Icon: Layers, title: '楕円ROI' },
  { tool: 'rectangleROI', Icon: RectangleHorizontal, title: '矩形ROI' },
  { tool: 'freehandROI', Icon: Pencil, title: 'フリーハンドROI' },
  { tool: 'probe', Icon: Crosshair, title: 'プローブ' },
  { tool: 'bidirectional', Icon: ArrowLeftRight, title: '双方向計測' },
];

export function Toolbar({
  activeTool,
  windowCenter,
  windowWidth,
  leftPanelOpen,
  rightPanelOpen,
  currentSlice,
  totalSlices,
  cineActive,
  cineFps,
  layout,
  onToolChange,
  onPresetSelect,
  onFitToWindow,
  onToggleLeftPanel,
  onToggleRightPanel,
  onPrevSlice,
  onNextSlice,
  onReset,
  onFlipH,
  onFlipV,
  onRotateCW,
  onRotateCCW,
  onInvert,
  onCineToggle,
  onCineFpsIncrease,
  onCineFpsDecrease,
  onAutoWL,
  onScreenshot,
  onPrint,
  onLayoutChange,
}: ToolbarProps) {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && WL_PRESETS[idx]) {
      onPresetSelect(WL_PRESETS[idx]);
    }
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="ビューアツールバー">
      {/* Panel toggle — left */}
      <div className={styles.group}>
        <button
          className={`${styles.panelButton} ${leftPanelOpen ? styles.panelOpen : ''}`}
          onClick={onToggleLeftPanel}
          title="左パネルを切り替え"
          aria-pressed={leftPanelOpen}
        >
          <PanelLeft size={16} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Navigation tool buttons */}
      <div className={styles.group}>
        {NAV_TOOL_BUTTONS.map(({ tool, Icon, title }) => (
          <button
            key={tool}
            className={`${styles.toolButton} ${activeTool === tool ? styles.active : ''}`}
            onClick={() => onToolChange(tool)}
            title={title}
            aria-pressed={activeTool === tool}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      <div className={styles.separator} />

      {/* Measurement tool buttons */}
      <div className={styles.group}>
        {MEASURE_TOOL_BUTTONS.map(({ tool, Icon, title }) => (
          <button
            key={tool}
            className={`${styles.toolButton} ${activeTool === tool ? styles.active : ''}`}
            onClick={() => onToolChange(tool)}
            title={title}
            aria-pressed={activeTool === tool}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      <div className={styles.separator} />

      {/* Fit to window + Reset */}
      <div className={styles.group}>
        <button
          className={styles.toolButton}
          onClick={onFitToWindow}
          title="ウィンドウに合わせる"
        >
          <Maximize size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onReset}
          title="リセット (アノテーション・カメラ)"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Image manipulation: Flip / Rotate / Invert */}
      <div className={styles.group}>
        <button
          className={styles.toolButton}
          onClick={onFlipH}
          title="左右反転 (H)"
        >
          <FlipHorizontal2 size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onFlipV}
          title="上下反転 (V)"
        >
          <FlipVertical2 size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onRotateCW}
          title="90°時計回り"
        >
          <RotateCw size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onRotateCCW}
          title="90°反時計回り"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onInvert}
          title="ネガ反転 (I)"
        >
          <Layers size={16} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Cine controls */}
      <div className={styles.group}>
        <button
          className={`${styles.toolButton} ${cineActive ? styles.active : ''}`}
          onClick={onCineToggle}
          title={cineActive ? '一時停止 (Space)' : 'シネ再生 (Space)'}
        >
          {cineActive ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          className={styles.toolButton}
          onClick={onCineFpsDecrease}
          title="FPS 下げる (-)"
        >
          <Minus size={14} />
        </button>
        <div className={styles.fpsDisplay} title="FPS">
          {cineFps} fps
        </div>
        <button
          className={styles.toolButton}
          onClick={onCineFpsIncrease}
          title="FPS 上げる (+)"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Auto WL / Screenshot / Print */}
      <div className={styles.group}>
        <button
          className={styles.toolButton}
          onClick={onAutoWL}
          title="自動WL/WW"
        >
          <Zap size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onScreenshot}
          title="スクリーンショット (S)"
        >
          <Camera size={16} />
        </button>
        <button
          className={styles.toolButton}
          onClick={onPrint}
          title="印刷"
        >
          <Printer size={16} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* WL/WW display */}
      <div className={styles.group}>
        <div className={styles.voiDisplay}>
          <span className={styles.voiLabel}>WC</span>
          <span className={styles.voiValue}>{Math.round(windowCenter)}</span>
          <span className={styles.voiLabel}>WW</span>
          <span className={styles.voiValue}>{Math.round(windowWidth)}</span>
        </div>
      </div>

      <div className={styles.separator} />

      {/* Preset selector */}
      <div className={styles.group}>
        <select
          className={styles.presetSelect}
          onChange={handlePresetChange}
          defaultValue=""
          title="WL/WWプリセット"
          aria-label="WL/WWプリセット"
        >
          <option value="" disabled>プリセット</option>
          {WL_PRESETS.map((preset, idx) => (
            <option key={preset.label} value={idx}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Spacer pushes right controls to far right */}
      <div className={styles.spacer} />

      {/* Layout toggle */}
      <div className={styles.group}>
        <button
          className={`${styles.toolButton} ${layout === '1x1' ? styles.active : ''}`}
          onClick={() => onLayoutChange('1x1')}
          title="1画面 (1)"
        >
          <Layout size={16} />
        </button>
        <button
          className={`${styles.toolButton} ${layout === '1x2' ? styles.active : ''}`}
          onClick={() => onLayoutChange('1x2')}
          title="2画面 (2)"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`${styles.toolButton} ${layout === '2x2' ? styles.active : ''}`}
          onClick={() => onLayoutChange('2x2')}
          title="4画面 (4)"
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Slice navigation */}
      {totalSlices > 1 && (
        <>
          <div className={styles.group}>
            <button
              className={styles.toolButton}
              onClick={onPrevSlice}
              title="前のスライス"
              disabled={currentSlice <= 0}
            >
              <ChevronLeft size={16} />
            </button>
            <div className={styles.sliceIndicator} aria-live="polite" aria-atomic="true">
              {currentSlice + 1} / {totalSlices}
            </div>
            <button
              className={styles.toolButton}
              onClick={onNextSlice}
              title="次のスライス"
              disabled={currentSlice >= totalSlices - 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.separator} />
        </>
      )}

      {/* Panel toggle — right */}
      <div className={styles.group}>
        <button
          className={`${styles.panelButton} ${rightPanelOpen ? styles.panelOpen : ''}`}
          onClick={onToggleRightPanel}
          title="右パネルを切り替え"
          aria-pressed={rightPanelOpen}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </div>
  );
}
