import { useState, useCallback, useEffect } from 'react';
import { getRenderingEngine, Enums, metaData } from '@cornerstonejs/core';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Viewport, VIEWPORT_ID, RENDERING_ENGINE_ID } from './components/Viewport';
import { DropZone } from './components/DropZone';
import { MetadataPanel } from './components/MetadataPanel';
import { ToastContainer } from './components/Toast';
import { ThumbnailPanel } from './components/ThumbnailPanel';
import { validateDicomFiles, loadLocalFiles } from './core/imageLoader';
import { extractMetadata } from './core/metadataProvider';
import { setActiveTool } from './core/toolSetup';
import { useToast } from './hooks/useToast';
import type { ActiveTool, WLPreset, DicomMetadata } from './types/dicom';
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

// Known transfer syntax UIDs that require unsupported codecs
const UNSUPPORTED_TRANSFER_SYNTAXES = [
  '1.2.840.10008.1.2.4.90', // JPEG 2000 Lossless
  '1.2.840.10008.1.2.4.91', // JPEG 2000
  '1.2.840.10008.1.2.4.57', // JPEG Lossless
  '1.2.840.10008.1.2.4.70', // JPEG Lossless (Default)
  '1.2.840.10008.1.2.5',    // RLE Lossless
];

function isTransferSyntaxError(message: string): boolean {
  return (
    message.includes('transfer syntax') ||
    message.includes('TransferSyntax') ||
    UNSUPPORTED_TRANSFER_SYNTAXES.some((uid) => message.includes(uid))
  );
}

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
  const [metadata, setMetadata] = useState<DicomMetadata | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewportError, setViewportError] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  // Callbacks from Viewport component
  const handleImageRendered = useCallback((imageId: string) => {
    setViewportError(null);

    try {
      const patient = metaData.get('patientModule', imageId);
      const study = metaData.get('generalStudyModule', imageId);
      const series = metaData.get('generalSeriesModule', imageId);
      const imagePixel = metaData.get('imagePixelModule', imageId);
      const voiLut = metaData.get('voiLutModule', imageId);
      const sopCommon = metaData.get('sopCommonModule', imageId);
      const transferSyntaxMeta = metaData.get('transferSyntax', imageId);

      const meta: DicomMetadata = {
        patient: {
          name: patient?.patientName?.Alphabetic ?? patient?.patientName ?? '',
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
          number: String(series?.seriesNumber ?? ''),
        },
        image: {
          rows: imagePixel?.rows ?? 0,
          columns: imagePixel?.columns ?? 0,
          bitsAllocated: imagePixel?.bitsAllocated ?? 0,
          bitsStored: imagePixel?.bitsStored ?? 0,
          windowCenter: Array.isArray(voiLut?.windowCenter)
            ? voiLut.windowCenter[0] : (voiLut?.windowCenter ?? 0),
          windowWidth: Array.isArray(voiLut?.windowWidth)
            ? voiLut.windowWidth[0] : (voiLut?.windowWidth ?? 0),
          transferSyntax: transferSyntaxMeta ?? '',
          photometricInterpretation: imagePixel?.photometricInterpretation ?? '',
          sopInstanceUid: sopCommon?.sopInstanceUID ?? '',
        },
      };
      setMetadata(meta);
    } catch (e) {
      console.warn('Failed to extract metadata:', e);
    }
  }, []);

  const handleImageLoadFailed = useCallback((errorMsg: string) => {
    if (isTransferSyntaxError(errorMsg)) {
      setViewportError(`非対応の転送構文です: ${errorMsg}`);
    } else {
      setViewportError(null);
      addToast(`画像の読み込みに失敗しました: ${errorMsg}`, 'error');
    }
  }, [addToast]);

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
      addToast(
        `無効なDICOMファイル: ${invalid.join(', ')}`,
        'error',
      );
    }
    if (valid.length === 0) {
      addToast('有効なDICOMファイルが見つかりません', 'error');
      return;
    }

    const ids = loadLocalFiles(valid);
    setImageIds(ids);
    setMetadata(null);
    setActiveImageIndex(0);
    setViewportError(null);

    if (valid.length === 1) {
      setFilename(valid[0].name);
    } else {
      setFilename(`${valid[0].name} (+${valid.length - 1})`);
    }
  }, [addToast]);

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

  const handleThumbnailSelect = useCallback((index: number) => {
    setActiveImageIndex(index);
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;
    viewport.setImageIdIndex(index).then(() => {
      viewport.render();
    }).catch(console.error);
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
            <ThumbnailPanel
              imageIds={imageIds}
              activeIndex={activeImageIndex}
              onSelect={handleThumbnailSelect}
            />
          </aside>
        )}
        <main style={centerPanelStyle}>
          {ready && (
            <Viewport
              imageIds={imageIds}
              onVoiChange={handleVoiChange}
              onImageRendered={handleImageRendered}
              onImageLoadFailed={handleImageLoadFailed}
              error={viewportError}
            />
          )}
          <DropZone
            hasImages={imageIds.length > 0}
            onFilesSelected={handleFilesSelected}
          />
        </main>
        {rightPanelOpen && (
          <aside style={rightPanelStyle}>
            <MetadataPanel metadata={metadata} />
          </aside>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
