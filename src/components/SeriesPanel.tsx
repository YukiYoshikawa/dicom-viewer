import { Layers } from 'lucide-react';
import type { SeriesInfo } from '../types/dicom';
import styles from './SeriesPanel.module.css';

interface SeriesPanelProps {
  seriesList: SeriesInfo[];
  activeSeriesIndex: number;
  activeSliceIndex: number;
  onSeriesSelect: (index: number) => void;
  onSliceSelect: (index: number) => void;
}

export function SeriesPanel({
  seriesList,
  activeSeriesIndex,
  activeSliceIndex,
  onSeriesSelect,
  onSliceSelect,
}: SeriesPanelProps) {
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

      {/* Bottom: slice list for active series */}
      <div className={styles.sliceList} role="listbox" aria-label="スライス一覧">
        {activeSeries && activeSeries.imageCount > 0 && (
          <>
            <div className={styles.sliceListHeader}>スライス</div>
            {activeSeries.imageIds.map((_, sliceIdx) => {
              const isActiveSlice = sliceIdx === activeSliceIndex;
              return (
                <button
                  key={sliceIdx}
                  className={`${styles.sliceItem} ${isActiveSlice ? styles.activeSlice : ''}`}
                  onClick={() => onSliceSelect(sliceIdx)}
                  role="option"
                  aria-selected={isActiveSlice}
                  title={`スライス ${sliceIdx + 1}`}
                >
                  <span className={styles.sliceNumber}>{sliceIdx + 1}</span>
                  <span className={styles.sliceDot} />
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
