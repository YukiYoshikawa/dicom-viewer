import { Maximize2, Minimize2, Activity } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  filename: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function Header({ filename, isFullscreen, onToggleFullscreen }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Activity size={18} className={styles.logoIcon} />
        <span>DICOM Viewer</span>
      </div>
      <div className={styles.filename}>
        {filename ?? 'ファイルを開いてください'}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.iconButton}
          onClick={onToggleFullscreen}
          title={isFullscreen ? '通常表示' : 'フルスクリーン'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </header>
  );
}
