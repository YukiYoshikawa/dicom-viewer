import { useRef, useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import styles from './DropZone.module.css';

interface DropZoneProps {
  hasImages: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function DropZone({ hasImages, onFilesSelected }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset so same files can be selected again
      e.target.value = '';
    },
    [onFilesSelected],
  );

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleOverlayClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (hasImages) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay} ${isDragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleOverlayClick}
    >
      <Upload size={40} className={styles.icon} />
      <div className={styles.text}>
        DICOMファイルをドラッグ&ドロップ
        <br />
        <span className={styles.subtext}>または</span>
      </div>
      <button className={styles.fileButton} onClick={handleButtonClick}>
        ファイルを選択
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className={styles.fileInput}
        accept=".dcm,.DCM"
        multiple
        onChange={handleFileInputChange}
      />
    </div>
  );
}
