import { useEffect, useRef, useCallback } from 'react';
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
  onImageRendered?: (imageId: string) => void;
  onImageLoadFailed?: (errorMessage: string) => void;
  error?: string | null;
}

export function Viewport({ imageIds, onVoiChange, onImageRendered, onImageLoadFailed, error }: ViewportProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  // Store latest callbacks in refs so the init useEffect doesn't re-run
  const onImageRenderedRef = useRef(onImageRendered);
  onImageRenderedRef.current = onImageRendered;
  const onImageLoadFailedRef = useRef(onImageLoadFailed);
  onImageLoadFailedRef.current = onImageLoadFailed;
  const onVoiChangeRef = useRef(onVoiChange);
  onVoiChangeRef.current = onVoiChange;

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
  const loadImages = useCallback(async () => {
    if (!imageIds.length) return;

    const engine = engineRef.current;
    if (!engine) return;

    const viewport = engine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;

    try {
      await viewport.setStack(imageIds, 0);
      viewport.render();

      // Notify parent with the loaded imageId
      const currentImageId = imageIds[0];
      if (onImageRenderedRef.current) {
        onImageRenderedRef.current(currentImageId);
      }

      // Report initial VOI
      try {
        const voiRange = viewport.getProperties().voiRange;
        if (voiRange && onVoiChangeRef.current) {
          const ww = voiRange.upper - voiRange.lower;
          const wc = voiRange.lower + ww / 2;
          onVoiChangeRef.current(wc, ww);
        }
      } catch {
        // VOI not yet available
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (onImageLoadFailedRef.current) {
        onImageLoadFailedRef.current(msg);
      }
    }
  }, [imageIds]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

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
