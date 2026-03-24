import { useState, useMemo, memo } from 'react';
import { User, FileText, Layers, Image, ChevronRight, FileX, Search } from 'lucide-react';
import type { DicomMetadata } from '../types/dicom';
import styles from './MetadataPanel.module.css';

interface MetadataPanelProps {
  metadata: DicomMetadata | null;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ icon, title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button
        className={styles.sectionHeader}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className={styles.sectionIcon}>{icon}</span>
        <span className={styles.sectionTitle}>{title}</span>
        <ChevronRight
          size={12}
          className={`${styles.chevron} ${open ? styles.open : ''}`}
        />
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

interface RowProps {
  label: string;
  value: string | number | undefined | null;
  dimmed?: boolean;
  highlight?: boolean;
}

function Row({ label, value, dimmed = false, highlight = false }: RowProps) {
  const displayValue = value !== undefined && value !== null && value !== ''
    ? String(value)
    : '—';

  return (
    <div className={`${styles.row} ${highlight ? styles.rowHighlight : ''}`}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${dimmed ? styles.dimmed : ''}`}>
        {displayValue}
      </span>
    </div>
  );
}

function formatDate(raw: unknown): string {
  if (!raw) return '—';
  if (typeof raw === 'object' && raw !== null && 'year' in raw) {
    const d = raw as { year: number; month: number; day: number };
    return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  }
  if (typeof raw !== 'string') return String(raw);
  if (raw.length === 8) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return raw || '—';
}

function formatSex(sex: string): string {
  if (sex === 'M') return 'M (男性)';
  if (sex === 'F') return 'F (女性)';
  if (sex === 'O') return 'O (その他)';
  return sex || '—';
}

export const MetadataPanel = memo(function MetadataPanel({ metadata }: MetadataPanelProps) {
  const [searchText, setSearchText] = useState('');

  const lowerSearch = useMemo(() => searchText.toLowerCase().trim(), [searchText]);

  // Determine if a label/value pair matches the search
  const matches = useMemo(() => {
    if (!lowerSearch || !metadata) return () => false;
    return (label: string, value: unknown): boolean => {
      const v = value !== undefined && value !== null ? String(value) : '';
      return (
        label.toLowerCase().includes(lowerSearch) ||
        v.toLowerCase().includes(lowerSearch)
      );
    };
  }, [lowerSearch, metadata]);

  if (!metadata) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>
          <FileX size={32} className={styles.placeholderIcon} />
          <span>ファイルを読み込むとDICOMタグが表示されます</span>
        </div>
      </div>
    );
  }

  const { patient, study, series, image } = metadata;

  return (
    <div className={styles.panel}>
      {/* Search box */}
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}><Search size={12} /></span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="タグを検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="メタデータ検索"
        />
      </div>

      <Section icon={<User size={12} />} title="患者情報">
        <Row label="氏名" value={patient.name} highlight={matches('氏名', patient.name)} />
        <Row label="患者ID" value={patient.id} highlight={matches('患者ID', patient.id)} />
        <Row label="生年月日" value={formatDate(patient.birthDate)} highlight={matches('生年月日', patient.birthDate)} />
        <Row label="性別" value={formatSex(patient.sex)} highlight={matches('性別', patient.sex)} />
      </Section>

      <Section icon={<FileText size={12} />} title="検査情報">
        <Row label="検査日" value={formatDate(study.date)} highlight={matches('検査日', study.date)} />
        <Row label="検査内容" value={study.description} highlight={matches('検査内容', study.description)} />
        <Row label="受付番号" value={study.accessionNumber} highlight={matches('受付番号', study.accessionNumber)} />
      </Section>

      <Section icon={<Layers size={12} />} title="シリーズ情報">
        <Row label="モダリティ" value={series.modality} highlight={matches('モダリティ', series.modality)} />
        <Row label="説明" value={series.description} highlight={matches('説明', series.description)} />
        <Row label="シリーズ番号" value={series.number} highlight={matches('シリーズ番号', series.number)} />
      </Section>

      <Section icon={<Image size={12} />} title="画像情報">
        <Row label="行×列" value={`${image.rows} × ${image.columns}`} highlight={matches('行×列', `${image.rows} × ${image.columns}`)} />
        <Row label="ビット深度" value={`${image.bitsAllocated}bit (${image.bitsStored}stored)`} highlight={matches('ビット深度', '')} />
        <Row label="WC" value={image.windowCenter} highlight={matches('WC', image.windowCenter)} />
        <Row label="WW" value={image.windowWidth} highlight={matches('WW', image.windowWidth)} />
        <Row label="測光解釈" value={image.photometricInterpretation} highlight={matches('測光解釈', image.photometricInterpretation)} />
        <Row label="転送構文" value={image.transferSyntax} dimmed highlight={matches('転送構文', image.transferSyntax)} />
        <Row label="SOP UID" value={image.sopInstanceUid} dimmed highlight={matches('SOP UID', image.sopInstanceUid)} />
      </Section>
    </div>
  );
});
