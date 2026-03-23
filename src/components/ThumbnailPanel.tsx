import { Images } from 'lucide-react';
import styles from './ThumbnailPanel.module.css';

interface ThumbnailPanelProps {
  imageIds: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ThumbnailPanel({ imageIds, activeIndex, onSelect }: ThumbnailPanelProps) {
  if (imageIds.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>
          <Images size={28} className={styles.placeholderIcon} />
          <span>画像を読み込むとサムネイルが表示されます</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} role="listbox" aria-label="画像サムネイル一覧">
      {imageIds.map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={index}
            className={`${styles.thumbnail} ${isActive ? styles.active : ''}`}
            onClick={() => onSelect(index)}
            role="option"
            aria-selected={isActive}
            aria-label={`画像 ${index + 1}`}
            title={`画像 ${index + 1}`}
          >
            <div className={styles.thumbnailBox}>
              <span>{index + 1}</span>
            </div>
            <span className={styles.thumbnailLabel}>{index + 1} / {imageIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}
