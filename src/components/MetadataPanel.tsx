import { useState } from 'react';
import { User, FileText, Layers, Image, ChevronRight, FileX } from 'lucide-react';
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
}

function Row({ label, value, dimmed = false }: RowProps) {
  const displayValue = value !== undefined && value !== null && value !== ''
    ? String(value)
    : '—';

  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${dimmed ? styles.dimmed : ''}`}>
        {displayValue}
      </span>
    </div>
  );
}

function formatDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || '—';
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function formatSex(sex: string): string {
  if (sex === 'M') return 'M (男性)';
  if (sex === 'F') return 'F (女性)';
  if (sex === 'O') return 'O (その他)';
  return sex || '—';
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
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
      <Section icon={<User size={12} />} title="患者情報">
        <Row label="氏名" value={patient.name} />
        <Row label="患者ID" value={patient.id} />
        <Row label="生年月日" value={formatDate(patient.birthDate)} />
        <Row label="性別" value={formatSex(patient.sex)} />
      </Section>

      <Section icon={<FileText size={12} />} title="検査情報">
        <Row label="検査日" value={formatDate(study.date)} />
        <Row label="検査内容" value={study.description} />
        <Row label="受付番号" value={study.accessionNumber} />
      </Section>

      <Section icon={<Layers size={12} />} title="シリーズ情報">
        <Row label="モダリティ" value={series.modality} />
        <Row label="説明" value={series.description} />
        <Row label="シリーズ番号" value={series.number} />
      </Section>

      <Section icon={<Image size={12} />} title="画像情報">
        <Row label="行×列" value={`${image.rows} × ${image.columns}`} />
        <Row label="ビット深度" value={`${image.bitsAllocated}bit (${image.bitsStored}stored)`} />
        <Row label="WC" value={image.windowCenter} />
        <Row label="WW" value={image.windowWidth} />
        <Row label="測光解釈" value={image.photometricInterpretation} />
        <Row label="転送構文" value={image.transferSyntax} dimmed />
        <Row label="SOP UID" value={image.sopInstanceUid} dimmed />
      </Section>
    </div>
  );
}
