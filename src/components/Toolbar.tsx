import {
  Sun, ZoomIn, Move, RotateCw, PanelLeft, PanelRight, Maximize,
  Ruler, Compass, ArrowUpRight, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { ActiveTool, WLPreset } from '../types/dicom';
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
  onToolChange: (tool: ActiveTool) => void;
  onPresetSelect: (preset: WLPreset) => void;
  onFitToWindow: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onPrevSlice: () => void;
  onNextSlice: () => void;
  onReset: () => void;
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
];

export function Toolbar({
  activeTool,
  windowCenter,
  windowWidth,
  leftPanelOpen,
  rightPanelOpen,
  currentSlice,
  totalSlices,
  onToolChange,
  onPresetSelect,
  onFitToWindow,
  onToggleLeftPanel,
  onToggleRightPanel,
  onPrevSlice,
  onNextSlice,
  onReset,
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
