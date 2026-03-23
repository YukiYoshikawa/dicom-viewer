import { useEffect, useRef } from 'react';
import { RenderingEngine, Enums } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { AlertCircle } from 'lucide-react';
import { createToolGroup } from '../core/toolSetup';
import styles from './Viewport.module.css';

export const VIEWPORT_ID = 'dicomViewport';
export const RENDERING_ENGINE_ID = 'dicomRenderingEngine';

interface ViewportProps {
  imageIds: string[];
  onVoiChange?: (windowCenter: number, windowWidth: number) => void;
  error?: string | null;
}

export function Viewport({ imageIds, onVoiChange, error }: ViewportProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  // Create the rendering engine and enable the element on mount
  useEffect(() => {
    const element = divRef.current;
    if (!element) return;

    const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
    engineRef.current = renderingEngine;

    const viewportInput: Types.PublicViewportInput = {
      viewportId: VIEWPORT_ID,
      type: Enums.ViewportType.STACK,
      element: element as HTMLDivElement,
    };

    renderingEngine.enableElement(viewportInput);
    createToolGroup(VIEWPORT_ID, RENDERING_ENGINE_ID);

    return () => {
      renderingEngine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Load images whenever imageIds change
  useEffect(() => {
    if (!imageIds.length) return;

    const engine = engineRef.current;
    if (!engine) return;

    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;

    viewport.setStack(imageIds, 0).then(() => {
      viewport.render();

      // Report initial VOI if callback provided
      if (onVoiChange) {
        try {
          const voiRange = viewport.getProperties().voiRange;
          if (voiRange) {
            const windowWidth = voiRange.upper - voiRange.lower;
            const windowCenter = voiRange.lower + windowWidth / 2;
            onVoiChange(windowCenter, windowWidth);
          }
        } catch {
          // VOI not yet available; ignore
        }
      }
    }).catch(console.error);
  }, [imageIds, onVoiChange]);

  return (
    <div className={styles.container}>
      <div
        ref={divRef}
        className={styles.viewport}
        tabIndex={-1}
      />
      {error && (
        <div className={styles.errorOverlay} role="alert">
          <AlertCircle size={32} />
          <span>画像の読み込みに失敗しました</span>
          <span className={styles.errorDetail}>{error}</span>
        </div>
      )}
    </div>
  );
}
