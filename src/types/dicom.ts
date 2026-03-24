export interface PatientMetadata {
  name: string;
  id: string;
  birthDate: string;
  sex: string;
}

export interface StudyMetadata {
  date: string;
  description: string;
  accessionNumber: string;
}

export interface SeriesMetadata {
  modality: string;
  description: string;
  number: string;
}

export interface ImageMetadata {
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  windowCenter: number;
  windowWidth: number;
  transferSyntax: string;
  photometricInterpretation: string;
  sopInstanceUid: string;
}

export interface DicomMetadata {
  patient: PatientMetadata;
  study: StudyMetadata;
  series: SeriesMetadata;
  image: ImageMetadata;
}

export interface WLPreset {
  label: string;
  windowCenter: number;
  windowWidth: number;
}

export const WL_PRESETS: WLPreset[] = [
  { label: '軟部組織', windowCenter: 40, windowWidth: 400 },
  { label: '肺野', windowCenter: -600, windowWidth: 1500 },
  { label: '骨', windowCenter: 300, windowWidth: 1500 },
  { label: '脳', windowCenter: 40, windowWidth: 80 },
  { label: '腹部', windowCenter: 60, windowWidth: 400 },
];

export type ActiveTool =
  | 'windowLevel' | 'zoom' | 'pan' | 'rotate'
  | 'length' | 'angle' | 'arrowAnnotate'
  | 'circleROI' | 'ellipticalROI' | 'rectangleROI' | 'freehandROI' | 'probe' | 'bidirectional';

export type LayoutType = '1x1' | '1x2' | '2x2';

export const MODALITY_PRESETS: Record<string, { wc: number; ww: number }> = {
  CT: { wc: 40, ww: 400 },
  MR: { wc: 500, ww: 1000 },
  CR: { wc: 2048, ww: 4096 },
  DX: { wc: 2048, ww: 4096 },
  XA: { wc: 1500, ww: 3000 },
  MG: { wc: 3000, ww: 6000 },
  US: { wc: 128, ww: 256 },
  PT: { wc: 5000, ww: 10000 },
  NM: { wc: 500, ww: 1000 },
};

export interface SeriesInfo {
  seriesInstanceUid: string;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  imageIds: string[];
  imageCount: number;
}
