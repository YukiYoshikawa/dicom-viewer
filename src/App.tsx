import { useState, useCallback } from 'react';
import { getRenderingEngine } from '@cornerstonejs/core';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Viewport, VIEWPORT_ID, RENDERING_ENGINE_ID } from './components/Viewport';
import { DropZone } from './components/DropZone';
import { validateDicomFiles, loadLocalFiles } from './core/imageLoader';
import { setActiveTool } from './core/toolSetup';
import type { ActiveTool, WLPreset } from './types/dicom';
import './styles/globals.css';

const appStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  background: 'var(--bg-deepest)',
  overflow: 'hidden',
};

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  width: 'var(--panel-left-width)',
  background: 'var(--bg-panel)',
  borderRight: '1px solid var(--border-subtle)',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const centerPanelStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: 'var(--bg-deepest)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
};

const rightPanelStyle: React.CSSProperties = {
  width: 'var(--panel-right-width)',
  background: 'var(--bg-panel)',
  borderLeft: '1px solid var(--border-subtle)',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-deepest)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-md)',
  zIndex: 100,
};

const errorStyle: React.CSSProperties = {
  ...overlayStyle,
  color: 'var(--accent-error)',
};

function App() {
  const { ready, error } = useCornerstone();
  const [filename, setFilename] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [windowCenter, setWindowCenter] = useState<number>(40);
  const [windowWidth, setWindowWidth] = useState<number>(400);
  const [activeTool, setActiveToolState] = useState<ActiveTool>('windowLevel');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const { valid, invalid } = await validateDicomFiles(files);
    if (invalid.length > 0) {
      console.warn('Invalid DICOM files:', invalid);
    }
    if (valid.length === 0) return;

    const ids = loadLocalFiles(valid);
    setImageIds(ids);

    if (valid.length === 1) {
      setFilename(valid[0].name);
    } else {
      setFilename(`${valid[0].name} (+${valid.length - 1})`);
    }
  }, []);

  const handleVoiChange = useCallback((wc: number, ww: number) => {
    setWindowCenter(wc);
    setWindowWidth(ww);
  }, []);

  const handleToolChange = useCallback((tool: ActiveTool) => {
    const toolNameMap: Record<ActiveTool, string> = {
      windowLevel: 'WindowLevel',
      zoom: 'Zoom',
      pan: 'Pan',
      rotate: 'TrackballRotate',
    };
    setActiveTool(toolNameMap[tool]);
    setActiveToolState(tool);
  }, []);

  const handlePresetSelect = useCallback((preset: WLPreset) => {
    setWindowCenter(preset.windowCenter);
    setWindowWidth(preset.windowWidth);
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;
    viewport.setProperties({
      voiRange: {
        lower: preset.windowCenter - preset.windowWidth / 2,
        upper: preset.windowCenter + preset.windowWidth / 2,
      },
    });
    viewport.render();
  }, []);

  const handleFitToWindow = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;
    viewport.resetCamera();
    viewport.render();
  }, []);

  const handleToggleLeftPanel = useCallback(() => {
    setLeftPanelOpen((prev) => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev);
  }, []);

  if (error) {
    return (
      <div style={errorStyle}>
        初期化エラー: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={overlayStyle}>
        初期化中...
      </div>
    );
  }

  return (
    <div style={appStyle}>
      <Header
        filename={filename}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
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
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
      />
      <div style={bodyStyle}>
        {leftPanelOpen && (
          <aside style={leftPanelStyle}>
            {/* Thumbnail panel - Task 12 */}
          </aside>
        )}
        <main style={centerPanelStyle}>
          {ready && (
            <Viewport
              imageIds={imageIds}
              onVoiChange={handleVoiChange}
            />
          )}
          <DropZone
            hasImages={imageIds.length > 0}
            onFilesSelected={handleFilesSelected}
          />
        </main>
        {rightPanelOpen && (
          <aside style={rightPanelStyle}>
            {/* Metadata panel - Task 10 */}
            {imageIds.length > 0 && (
              <div style={{
                padding: '12px',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <div>WC: {Math.round(windowCenter)}</div>
                <div>WW: {Math.round(windowWidth)}</div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
