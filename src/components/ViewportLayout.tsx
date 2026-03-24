import { useState, useRef, useEffect, useCallback } from 'react';
import { RenderingEngine, Enums } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { createToolGroup } from '../core/toolSetup';
import type { LayoutType, SeriesInfo } from '../types/dicom';
import styles from './ViewportLayout.module.css';

interface ViewportLayoutProps {
  layout: LayoutType;
  seriesList: SeriesInfo[];
  onVoiChange?: (windowCenter: number, windowWidth: number) => void;
  onImageRendered?: (imageId: string) => void;
}

const LAYOUT_CONFIGS: Record<LayoutType, { rows: number; cols: number }> = {
  '1x1': { rows: 1, cols: 1 },
  '1x2': { rows: 1, cols: 2 },
  '2x2': { rows: 2, cols: 2 },
};

function getCellCount(layout: LayoutType): number {
  const { rows, cols } = LAYOUT_CONFIGS[layout];
  return rows * cols;
}

export const MULTI_RENDERING_ENGINE_ID = 'multiViewportEngine';

export function ViewportLayout({
  layout,
  seriesList,
  onVoiChange,
  onImageRendered,
}: ViewportLayoutProps) {
  const [activeCell, setActiveCell] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<RenderingEngine | null>(null);
  const onVoiChangeRef = useRef(onVoiChange);
  onVoiChangeRef.current = onVoiChange;
  const onImageRenderedRef = useRef(onImageRendered);
  onImageRenderedRef.current = onImageRendered;

  const cellCount = getCellCount(layout);
  const { rows, cols } = LAYOUT_CONFIGS[layout];

  // Create/destroy rendering engine when layout changes
  useEffect(() => {
    // Destroy any existing engine
    if (engineRef.current) {
      try {
        engineRef.current.destroy();
      } catch {
        // ignore
      }
      engineRef.current = null;
    }

    const renderingEngine = new RenderingEngine(MULTI_RENDERING_ENGINE_ID);
    engineRef.current = renderingEngine;

    const viewportInputs: Types.PublicViewportInput[] = [];
    for (let i = 0; i < cellCount; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const viewportId = `multiViewport_${i}`;
      viewportInputs.push({
        viewportId,
        type: Enums.ViewportType.STACK,
        element: el as HTMLDivElement,
      });
    }

    if (viewportInputs.length > 0) {
      renderingEngine.setViewports(viewportInputs);
    }

    for (let i = 0; i < cellCount; i++) {
      const viewportId = `multiViewport_${i}`;
      createToolGroup(viewportId, MULTI_RENDERING_ENGINE_ID);
    }

    // Load series into viewports
    for (let i = 0; i < cellCount; i++) {
      const series = seriesList[i % Math.max(seriesList.length, 1)];
      if (!series) continue;
      const viewportId = `multiViewport_${i}`;
      const viewport = renderingEngine.getStackViewport(viewportId);
      if (!viewport) continue;
      viewport.setStack(series.imageIds, 0).then(() => {
        viewport.render();
      }).catch(console.error);
    }

    // Attach event listeners
    const handlers: Array<{ el: HTMLDivElement; fn: () => void }> = [];
    for (let i = 0; i < cellCount; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const viewportId = `multiViewport_${i}`;
      const fn = () => {
        const engine = engineRef.current;
        if (!engine) return;
        const viewport = engine.getStackViewport(viewportId);
        if (!viewport) return;
        const imageId = viewport.getCurrentImageId();
        if (imageId && onImageRenderedRef.current) {
          onImageRenderedRef.current(imageId);
        }
        try {
          const voiRange = viewport.getProperties().voiRange;
          if (voiRange && onVoiChangeRef.current) {
            const ww = voiRange.upper - voiRange.lower;
            const wc = voiRange.lower + ww / 2;
            onVoiChangeRef.current(wc, ww);
          }
        } catch {
          // ignore
        }
      };
      el.addEventListener(Enums.Events.IMAGE_RENDERED, fn);
      handlers.push({ el, fn });
    }

    return () => {
      for (const { el, fn } of handlers) {
        el.removeEventListener(Enums.Events.IMAGE_RENDERED, fn);
      }
      if (engineRef.current) {
        try {
          engineRef.current.destroy();
        } catch {
          // ignore
        }
        engineRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, cellCount]);

  // Reload series when seriesList changes (without recreating engine)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (let i = 0; i < cellCount; i++) {
      const series = seriesList[i % Math.max(seriesList.length, 1)];
      if (!series) continue;
      const viewportId = `multiViewport_${i}`;
      const viewport = engine.getStackViewport(viewportId);
      if (!viewport) continue;
      viewport.setStack(series.imageIds, 0).then(() => {
        viewport.render();
      }).catch(console.error);
    }
  }, [seriesList, cellCount]);

  const handleCellClick = useCallback((index: number) => {
    setActiveCell(index);
  }, []);

  const setRef = useCallback((el: HTMLDivElement | null, index: number) => {
    cellRefs.current[index] = el;
  }, []);

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: cellCount }).map((_, i) => (
        <div
          key={i}
          className={`${styles.cell} ${activeCell === i ? styles.active : ''}`}
          onClick={() => handleCellClick(i)}
        >
          <div
            ref={(el) => setRef(el, i)}
            className={styles.viewport}
            tabIndex={-1}
          />
          <div className={styles.cellLabel}>
            {seriesList[i % Math.max(seriesList.length, 1)]?.seriesDescription ?? `ビューポート ${i + 1}`}
          </div>
        </div>
      ))}
    </div>
  );
}
