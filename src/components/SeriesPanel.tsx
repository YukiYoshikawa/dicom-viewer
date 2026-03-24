import { useRef, useEffect, useState, useCallback } from 'react';
import { Layers } from 'lucide-react';
import type { SeriesInfo } from '../types/dicom';
import styles from './SeriesPanel.module.css';

interface SeriesPanelProps {
  seriesList: SeriesInfo[];
  activeSeriesIndex: number;
  activeSliceIndex: number;
  onSeriesSelect: (index: number) => void;
  onSliceSelect: (index: number) => void;
  importanceScores?: number[];
}

const ITEM_HEIGHT = 30;
const OVERSCAN = 10;

function getScoreColor(score: number): string {
  if (score > 0.7) return 'var(--accent-error, #ff6b6b)';
  if (score > 0.4) return 'var(--accent, #4a9eff)';
  return 'var(--border-default, #3a3a4a)';
}

export function SeriesPanel({
  seriesList,
  activeSeriesIndex,
  activeSliceIndex,
  onSeriesSelect,
  onSliceSelect,
  importanceScores,
}: SeriesPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(300);
  const [scrollTop, setScrollTop] = useState(0);

  // ResizeObserver for virtual scroll container height
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  if (seriesList.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>
          <Layers size={28} className={styles.placeholderIcon} />
          <span>画像を読み込むとシリーズが表示されます</span>
        </div>
      </div>
    );
  }

  const activeSeries = seriesList[activeSeriesIndex];
  const totalSlices = activeSeries ? activeSeries.imageCount : 0;
  const totalHeight = totalSlices * ITEM_HEIGHT;

  // Compute visible range
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(totalSlices, startIdx + visibleCount);

  return (
    <div className={styles.panel}>
      {/* Top: series list */}
      <div className={styles.seriesList} role="listbox" aria-label="シリーズ一覧">
        {seriesList.map((series, idx) => {
          const isActive = idx === activeSeriesIndex;
          const desc = series.seriesDescription || `Series ${series.seriesNumber || idx + 1}`;
          return (
            <button
              key={series.seriesInstanceUid}
              className={`${styles.seriesCard} ${isActive ? styles.activeSeries : ''}`}
              onClick={() => onSeriesSelect(idx)}
              role="option"
              aria-selected={isActive}
              title={desc}
            >
              <div className={styles.seriesHeader}>
                {series.modality && (
                  <span className={styles.modalityBadge}>{series.modality}</span>
                )}
                <span className={styles.seriesDescription}>{desc}</span>
                <span className={styles.seriesCount}>{series.imageCount}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom: slice list for active series — virtual scrolling */}
      <div
        ref={scrollContainerRef}
        className={styles.sliceList}
        role="listbox"
        aria-label="スライス一覧"
        onScroll={handleScroll}
        style={{ position: 'relative', overflowY: 'auto', flex: 1 }}
      >
        {activeSeries && totalSlices > 0 && (
          <>
            <div className={styles.sliceListHeader}>スライス</div>
            {/* Total height spacer */}
            <div style={{ height: totalHeight, position: 'relative' }}>
              {Array.from({ length: endIdx - startIdx }, (_, i) => {
                const sliceIdx = startIdx + i;
                const isActiveSlice = sliceIdx === activeSliceIndex;
                const score = importanceScores?.[sliceIdx];
                const scoreColor = score !== undefined ? getScoreColor(score) : undefined;

                return (
                  <button
                    key={sliceIdx}
                    className={`${styles.sliceItem} ${isActiveSlice ? styles.activeSlice : ''}`}
                    onClick={() => onSliceSelect(sliceIdx)}
                    role="option"
                    aria-selected={isActiveSlice}
                    title={`スライス ${sliceIdx + 1}${score !== undefined ? ` (重要度: ${score.toFixed(2)})` : ''}`}
                    style={{
                      position: 'absolute',
                      top: sliceIdx * ITEM_HEIGHT,
                      left: 0,
                      right: 0,
                      height: ITEM_HEIGHT,
                    }}
                  >
                    <span className={styles.sliceNumber}>{sliceIdx + 1}</span>
                    {score !== undefined ? (
                      <span
                        className={styles.scoreBar}
                        style={{
                          width: `${Math.round(score * 100)}%`,
                          background: scoreColor,
                        }}
                        title={`重要度: ${score.toFixed(2)}`}
                      />
                    ) : (
                      <span className={styles.sliceDot} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
