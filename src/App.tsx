import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getRenderingEngine, metaData } from '@cornerstonejs/core';
import { annotation } from '@cornerstonejs/tools';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Viewport, VIEWPORT_ID, RENDERING_ENGINE_ID } from './components/Viewport';
import { DropZone } from './components/DropZone';
import { MetadataPanel } from './components/MetadataPanel';
import { MeasurementPanel } from './components/MeasurementPanel';
import { ViewportLayout } from './components/ViewportLayout';
import { ToastContainer } from './components/Toast';
import { SeriesPanel } from './components/SeriesPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadAndGroupFiles } from './core/seriesManager';
import { setActiveTool } from './core/toolSetup';
import { undo, redo, clearHistory } from './core/annotationHistory';
import { computeSliceImportanceDownsampled } from './core/wasmBridge';
import { startVoiceRecognition, stopVoiceRecognition, isSpeechRecognitionSupported } from './core/voiceCommand';
import { useToast } from './hooks/useToast';
import type { ActiveTool, WLPreset, DicomMetadata, SeriesInfo, LayoutType } from './types/dicom';
import { MODALITY_PRESETS } from './types/dicom';
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

const MIN_FPS = 1;
const MAX_FPS = 60;

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
  const [viewportError, setViewportError] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  // Series management state
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);

  // Groups 3-4
  const [layout, setLayout] = useState<LayoutType>('1x1');
  const [cineActive, setCineActive] = useState(false);
  const [cineFps, setCineFps] = useState(10);
  const [invertActive, setInvertActive] = useState(false);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rotation, setRotation] = useState(0);

  // スライス差分マップ
  const [aiScoutEnabled, setAiScoutEnabled] = useState(false);

  // スライス重要度
  const [smartReadingScores, setSmartReadingScores] = useState<number[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  // Group 8: Voice Commands
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceSupported = isSpeechRecognitionSupported();

  const cineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cineFpsRef = useRef(cineFps);
  cineFpsRef.current = cineFps;
  const cineActiveRef = useRef(cineActive);
  cineActiveRef.current = cineActive;

  // Helper: get the active viewport
  const getViewport = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return null;
    return engine.getStackViewport(VIEWPORT_ID);
  }, []);

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
    const UNSUPPORTED_TRANSFER_SYNTAXES = [
      '1.2.840.10008.1.2.4.90',
      '1.2.840.10008.1.2.4.91',
      '1.2.840.10008.1.2.4.57',
      '1.2.840.10008.1.2.4.70',
      '1.2.840.10008.1.2.5',
    ];
    const isTransferSyntaxError =
      errorMsg.includes('transfer syntax') ||
      errorMsg.includes('TransferSyntax') ||
      UNSUPPORTED_TRANSFER_SYNTAXES.some((uid) => errorMsg.includes(uid));

    if (isTransferSyntaxError) {
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

  // Apply modality preset automatically when series is selected
  const applyModalityPreset = useCallback((modality: string) => {
    const preset = MODALITY_PRESETS[modality];
    if (!preset) return;
    setWindowCenter(preset.wc);
    setWindowWidth(preset.ww);
    const viewport = getViewport();
    if (!viewport) return;
    viewport.setProperties({
      voiRange: {
        lower: preset.wc - preset.ww / 2,
        upper: preset.wc + preset.ww / 2,
      },
    });
    viewport.render();
  }, [getViewport]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const { seriesList: newSeriesList, skipped } = await loadAndGroupFiles(files);

    if (skipped.length > 0) {
      addToast(`スキップされたファイル: ${skipped.join(', ')}`, 'error');
    }
    if (newSeriesList.length === 0) {
      addToast('有効なDICOMファイルが見つかりません', 'error');
      return;
    }

    setSeriesList(newSeriesList);
    setActiveSeriesIndex(0);
    setCurrentSlice(0);
    setTotalSlices(newSeriesList[0].imageCount);
    setImageIds(newSeriesList[0].imageIds);
    setMetadata(null);
    setViewportError(null);
    setSmartReadingScores([]);
    clearHistory();

    const totalFiles = newSeriesList.reduce((sum, s) => sum + s.imageCount, 0);
    if (files.length === 1) {
      setFilename(files[0].name);
    } else {
      setFilename(`${files[0].name} (+${totalFiles - 1})`);
    }

    // Auto-apply modality preset
    const firstModality = newSeriesList[0].modality;
    if (firstModality && MODALITY_PRESETS[firstModality]) {
      // defer to after viewport is ready
      setTimeout(() => applyModalityPreset(firstModality), 500);
    }
  }, [addToast, applyModalityPreset]);

  const handleSeriesSelect = useCallback((index: number) => {
    setActiveSeriesIndex(index);
    const series = seriesList[index];
    if (!series) return;
    setImageIds(series.imageIds);
    setCurrentSlice(0);
    setTotalSlices(series.imageCount);
    setMetadata(null);
    setViewportError(null);
    setSmartReadingScores([]);

    // Auto-apply modality preset
    if (series.modality && MODALITY_PRESETS[series.modality]) {
      setTimeout(() => applyModalityPreset(series.modality), 200);
    }
  }, [seriesList, applyModalityPreset]);

  const handleSliceChange = useCallback((currentIndex: number, total: number) => {
    setCurrentSlice(currentIndex);
    setTotalSlices(total);
  }, []);

  const handlePrevSlice = useCallback(() => {
    if (currentSlice <= 0) return;
    const newIdx = currentSlice - 1;
    const viewport = getViewport();
    if (!viewport) return;
    viewport.setImageIdIndex(newIdx).then(() => {
      viewport.render();
    }).catch(console.error);
  }, [currentSlice, getViewport]);

  const handleNextSlice = useCallback(() => {
    if (currentSlice >= totalSlices - 1) return;
    const newIdx = currentSlice + 1;
    const viewport = getViewport();
    if (!viewport) return;
    viewport.setImageIdIndex(newIdx).then(() => {
      viewport.render();
    }).catch(console.error);
  }, [currentSlice, totalSlices, getViewport]);

  const handleReset = useCallback(() => {
    try {
      annotation.state.removeAllAnnotations();
    } catch (e) {
      console.warn('Failed to remove annotations:', e);
    }
    clearHistory();
    setFlipH(false);
    setFlipV(false);
    setRotation(0);
    setInvertActive(false);
    const viewport = getViewport();
    if (!viewport) return;
    viewport.resetCamera();
    viewport.setProperties({ invert: false });
    (viewport as unknown as { setRotation: (r: number) => void }).setRotation(0);
    viewport.setCamera({ flipHorizontal: false, flipVertical: false });
    viewport.render();
  }, [getViewport]);

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
      length: 'Length',
      angle: 'Angle',
      arrowAnnotate: 'ArrowAnnotate',
      circleROI: 'CircleROI',
      ellipticalROI: 'EllipticalROI',
      rectangleROI: 'RectangleROI',
      freehandROI: 'PlanarFreehandROI',
      probe: 'Probe',
      bidirectional: 'Bidirectional',
    };
    setActiveTool(toolNameMap[tool]);
    setActiveToolState(tool);
  }, []);

  const handlePresetSelect = useCallback((preset: WLPreset) => {
    setWindowCenter(preset.windowCenter);
    setWindowWidth(preset.windowWidth);
    const viewport = getViewport();
    if (!viewport) return;
    viewport.setProperties({
      voiRange: {
        lower: preset.windowCenter - preset.windowWidth / 2,
        upper: preset.windowCenter + preset.windowWidth / 2,
      },
    });
    viewport.render();
  }, [getViewport]);

  const handleFitToWindow = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    viewport.resetCamera();
    viewport.render();
  }, [getViewport]);

  const handleToggleLeftPanel = useCallback(() => {
    setLeftPanelOpen((prev) => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev);
  }, []);

  const handleSliceSelect = useCallback((index: number) => {
    setCurrentSlice(index);
    const viewport = getViewport();
    if (!viewport) return;
    viewport.setImageIdIndex(index).then(() => {
      viewport.render();
    }).catch(console.error);
  }, [getViewport]);

  // Group 3: Image Manipulation handlers
  const handleFlipH = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const newFlipH = !flipH;
    setFlipH(newFlipH);
    viewport.setCamera({ flipHorizontal: newFlipH });
    viewport.render();
  }, [flipH, getViewport]);

  const handleFlipV = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const newFlipV = !flipV;
    setFlipV(newFlipV);
    viewport.setCamera({ flipVertical: newFlipV });
    viewport.render();
  }, [flipV, getViewport]);

  const handleRotateCW = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    (viewport as unknown as { setRotation: (r: number) => void }).setRotation(newRotation);
    viewport.render();
  }, [rotation, getViewport]);

  const handleRotateCCW = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const newRotation = (rotation - 90 + 360) % 360;
    setRotation(newRotation);
    (viewport as unknown as { setRotation: (r: number) => void }).setRotation(newRotation);
    viewport.render();
  }, [rotation, getViewport]);

  const handleInvert = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const newInvert = !invertActive;
    setInvertActive(newInvert);
    viewport.setProperties({ invert: newInvert });
    viewport.render();
  }, [invertActive, getViewport]);

  const stopCine = useCallback(() => {
    if (cineIntervalRef.current) {
      clearInterval(cineIntervalRef.current);
      cineIntervalRef.current = null;
    }
    setCineActive(false);
  }, []);

  const startCine = useCallback(() => {
    if (cineIntervalRef.current) {
      clearInterval(cineIntervalRef.current);
    }
    const interval = Math.round(1000 / cineFpsRef.current);
    cineIntervalRef.current = setInterval(() => {
      const viewport = getViewport();
      if (!viewport) return;
      const ids = viewport.getImageIds();
      if (ids.length === 0) return;
      const idx = viewport.getCurrentImageIdIndex();
      const next = (idx + 1) % ids.length;
      viewport.setImageIdIndex(next).then(() => viewport.render()).catch(() => {});
    }, interval);
    setCineActive(true);
  }, [getViewport]);

  const handleCineToggle = useCallback(() => {
    if (cineActiveRef.current) {
      stopCine();
    } else {
      startCine();
    }
  }, [startCine, stopCine]);

  const handleCineFpsIncrease = useCallback(() => {
    setCineFps((prev) => {
      const next = Math.min(prev + 5, MAX_FPS);
      cineFpsRef.current = next;
      if (cineActiveRef.current) {
        if (cineIntervalRef.current) clearInterval(cineIntervalRef.current);
        const interval = Math.round(1000 / next);
        cineIntervalRef.current = setInterval(() => {
          const viewport = getViewport();
          if (!viewport) return;
          const ids = viewport.getImageIds();
          if (ids.length === 0) return;
          const idx = viewport.getCurrentImageIdIndex();
          const nextIdx = (idx + 1) % ids.length;
          viewport.setImageIdIndex(nextIdx).then(() => viewport.render()).catch(() => {});
        }, interval);
      }
      return next;
    });
  }, [getViewport]);

  const handleCineFpsDecrease = useCallback(() => {
    setCineFps((prev) => {
      const next = Math.max(prev - 5, MIN_FPS);
      cineFpsRef.current = next;
      if (cineActiveRef.current) {
        if (cineIntervalRef.current) clearInterval(cineIntervalRef.current);
        const interval = Math.round(1000 / next);
        cineIntervalRef.current = setInterval(() => {
          const viewport = getViewport();
          if (!viewport) return;
          const ids = viewport.getImageIds();
          if (ids.length === 0) return;
          const idx = viewport.getCurrentImageIdIndex();
          const nextIdx = (idx + 1) % ids.length;
          viewport.setImageIdIndex(nextIdx).then(() => viewport.render()).catch(() => {});
        }, interval);
      }
      return next;
    });
  }, [getViewport]);

  const handleAutoWL = useCallback(() => {
    addToast('自動WL/WW: Wasm連携は後ほど実装されます', 'error');
  }, [addToast]);

  const handleScreenshot = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) {
      addToast('ビューポートが利用できません', 'error');
      return;
    }
    try {
      const canvas = viewport.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'dicom-screenshot.png';
      a.click();
    } catch (e) {
      addToast('スクリーンショットの取得に失敗しました', 'error');
      console.error(e);
    }
  }, [getViewport, addToast]);

  const handlePrint = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) {
      addToast('ビューポートが利用できません', 'error');
      return;
    }
    try {
      const canvas = viewport.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const patientName = metadata?.patient.name ?? '';
      const patientId = metadata?.patient.id ?? '';
      const studyDate = metadata?.study.date ?? '';
      const win = window.open('', '_blank');
      if (!win) {
        addToast('ポップアップがブロックされました', 'error');
        return;
      }
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DICOM Print</title>
          <style>
            body { margin: 0; padding: 20px; font-family: sans-serif; background: #fff; color: #000; }
            .info { margin-bottom: 12px; font-size: 13px; }
            img { max-width: 100%; display: block; }
          </style>
        </head>
        <body>
          <div class="info">
            <b>患者:</b> ${patientName} (ID: ${patientId})
            &nbsp;&nbsp;
            <b>検査日:</b> ${studyDate}
          </div>
          <img src="${dataUrl}" />
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      addToast('印刷の準備に失敗しました', 'error');
      console.error(e);
    }
  }, [getViewport, metadata, addToast]);

  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    stopCine();
    setLayout(newLayout);
  }, [stopCine]);

  // Group 6: AI Scout toggle
  const handleToggleAiScout = useCallback(() => {
    setAiScoutEnabled((prev) => !prev);
  }, []);

  // Group 7: Smart Reading - compute all slice scores
  const computeAllSliceScores = useCallback(async () => {
    const activeSeries = seriesList[activeSeriesIndex];
    if (!activeSeries || activeSeries.imageCount === 0) return;

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;

    const ids = activeSeries.imageIds;
    setLoadingProgress(0);
    const scores: number[] = new Array(ids.length).fill(0);

    for (let i = 0; i < ids.length; i++) {
      try {
        // Try to get pixel data from the cornerstone canvas
        const canvas = viewport.getCanvas();
        const w = canvas.width;
        const h = canvas.height;
        if (w > 0 && h > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, w, h);
            const gray = new Uint8Array(w * h);
            for (let j = 0; j < w * h; j++) {
              gray[j] = imageData.data[j * 4];
            }
            scores[i] = await computeSliceImportanceDownsampled(gray, w, h);
          }
        }
      } catch (e) {
        console.warn(`Failed to compute score for slice ${i}:`, e);
        scores[i] = 0;
      }
      const progress = Math.round(((i + 1) / ids.length) * 100);
      setLoadingProgress(progress);
      setSmartReadingScores([...scores]);
    }

    setLoadingProgress(null);
    addToast(`スライス重要度解析完了: ${ids.length}スライス`, 'info');
  }, [seriesList, activeSeriesIndex, addToast]);

  // Compute keyframe slices: local peaks with minimum gap of 3
  const keyframeSlices = useMemo(() => {
    if (smartReadingScores.length < 3) return [];
    const MIN_GAP = 3;
    const peaks: number[] = [];
    for (let i = 1; i < smartReadingScores.length - 1; i++) {
      if (
        smartReadingScores[i] > smartReadingScores[i - 1] &&
        smartReadingScores[i] > smartReadingScores[i + 1]
      ) {
        // Check minimum gap from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= MIN_GAP) {
          peaks.push(i);
        }
      }
    }
    return peaks;
  }, [smartReadingScores]);

  const handleNextKeyframe = useCallback(() => {
    if (keyframeSlices.length === 0) {
      // No scores yet — trigger computation
      computeAllSliceScores();
      return;
    }
    // Find next keyframe after current slice
    const next = keyframeSlices.find((idx) => idx > currentSlice);
    const targetIdx = next !== undefined ? next : keyframeSlices[0];
    handleSliceSelect(targetIdx);
  }, [keyframeSlices, currentSlice, handleSliceSelect, computeAllSliceScores]);

  // Group 8: Voice Commands
  const handleToggleVoice = useCallback(() => {
    if (voiceActive) {
      stopVoiceRecognition();
      setVoiceActive(false);
      addToast('音声コマンド停止', 'info');
    } else {
      startVoiceRecognition((cmd) => {
        switch (cmd) {
          case 'next': handleNextSlice(); break;
          case 'prev': handlePrevSlice(); break;
          case 'first': handleSliceSelect(0); break;
          case 'last': handleSliceSelect(totalSlices - 1); break;
          case 'zoom': handleToolChange('zoom'); break;
          case 'pan': handleToolChange('pan'); break;
          case 'rotate': handleToolChange('rotate'); break;
          case 'windowLevel': handleToolChange('windowLevel'); break;
          case 'length': handleToolChange('length'); break;
          case 'angle': handleToolChange('angle'); break;
          case 'rectangleROI': handleToolChange('rectangleROI'); break;
          case 'circleROI': handleToolChange('circleROI'); break;
          case 'ellipticalROI': handleToolChange('ellipticalROI'); break;
          case 'freehandROI': handleToolChange('freehandROI'); break;
          case 'probe': handleToolChange('probe'); break;
          case 'arrowAnnotate': handleToolChange('arrowAnnotate'); break;
          case 'reset': handleReset(); break;
          case 'fit': handleFitToWindow(); break;
          case 'invert': handleInvert(); break;
          case 'flipH': handleFlipH(); break;
          case 'flipV': handleFlipV(); break;
          case 'screenshot': handleScreenshot(); break;
          case 'print': handlePrint(); break;
          case 'cine': handleCineToggle(); break;
          case 'autoWL': handleAutoWL(); break;
          case 'rotateCW': handleRotateCW(); break;
          case 'rotateCCW': handleRotateCCW(); break;
          case 'nextKeyframe': handleNextKeyframe(); break;
          case 'aiScout': handleToggleAiScout(); break;
          default: break;
        }
      });
      setVoiceActive(true);
      addToast('音声コマンド開始 (日本語)', 'info');
    }
  }, [
    voiceActive, addToast,
    handleNextSlice, handlePrevSlice, handleSliceSelect, totalSlices,
    handleToolChange, handleReset, handleFitToWindow, handleInvert,
    handleFlipH, handleFlipV, handleScreenshot, handlePrint,
    handleCineToggle, handleAutoWL, handleRotateCW, handleRotateCCW,
    handleNextKeyframe, handleToggleAiScout,
  ]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      if (voiceActive) stopVoiceRecognition();
    };
  }, [voiceActive]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h': handleFlipH(); break;
        case 'v': handleFlipV(); break;
        case 'i': handleInvert(); break;
        case ' ':
          e.preventDefault();
          handleCineToggle();
          break;
        case '+':
        case '=':
          handleCineFpsIncrease();
          break;
        case '-':
          handleCineFpsDecrease();
          break;
        case 's': handleScreenshot(); break;
        case '1': handleLayoutChange('1x1'); break;
        case '2': handleLayoutChange('1x2'); break;
        case '4': handleLayoutChange('2x2'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleFlipH, handleFlipV, handleInvert, handleCineToggle,
    handleCineFpsIncrease, handleCineFpsDecrease, handleScreenshot,
    handleLayoutChange,
  ]);

  // Cleanup cine on unmount
  useEffect(() => {
    return () => {
      if (cineIntervalRef.current) clearInterval(cineIntervalRef.current);
    };
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
        currentSlice={currentSlice}
        totalSlices={totalSlices}
        cineActive={cineActive}
        cineFps={cineFps}
        layout={layout}
        aiScoutEnabled={aiScoutEnabled}
        voiceActive={voiceActive}
        voiceSupported={voiceSupported}
        loadingProgress={loadingProgress}
        onToolChange={handleToolChange}
        onPresetSelect={handlePresetSelect}
        onFitToWindow={handleFitToWindow}
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
        onPrevSlice={handlePrevSlice}
        onNextSlice={handleNextSlice}
        onReset={handleReset}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
        onRotateCW={handleRotateCW}
        onRotateCCW={handleRotateCCW}
        onInvert={handleInvert}
        onCineToggle={handleCineToggle}
        onCineFpsIncrease={handleCineFpsIncrease}
        onCineFpsDecrease={handleCineFpsDecrease}
        onAutoWL={handleAutoWL}
        onScreenshot={handleScreenshot}
        onPrint={handlePrint}
        onLayoutChange={handleLayoutChange}
        onToggleAiScout={handleToggleAiScout}
        onNextKeyframe={handleNextKeyframe}
        onToggleVoice={handleToggleVoice}
      />
      <div style={bodyStyle}>
        {leftPanelOpen && (
          <aside style={leftPanelStyle}>
            <SeriesPanel
              seriesList={seriesList}
              activeSeriesIndex={activeSeriesIndex}
              activeSliceIndex={currentSlice}
              onSeriesSelect={handleSeriesSelect}
              onSliceSelect={handleSliceSelect}
              importanceScores={smartReadingScores.length > 0 ? smartReadingScores : undefined}
            />
          </aside>
        )}
        <main style={centerPanelStyle}>
          <ErrorBoundary>
            {ready && layout === '1x1' && (
              <Viewport
                imageIds={imageIds}
                onVoiChange={handleVoiChange}
                onImageRendered={handleImageRendered}
                onImageLoadFailed={handleImageLoadFailed}
                onSliceChange={handleSliceChange}
                error={viewportError}
                metadata={metadata}
                windowCenter={windowCenter}
                windowWidth={windowWidth}
                aiScoutEnabled={aiScoutEnabled}
              />
            )}
            {ready && layout !== '1x1' && (
              <ViewportLayout
                layout={layout}
                seriesList={seriesList}
                onVoiChange={handleVoiChange}
                onImageRendered={handleImageRendered}
              />
            )}
          </ErrorBoundary>
          <DropZone
            hasImages={imageIds.length > 0}
            onFilesSelected={handleFilesSelected}
          />
        </main>
        {rightPanelOpen && (
          <aside style={rightPanelStyle}>
            <MetadataPanel metadata={metadata} />
            <MeasurementPanel />
          </aside>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
