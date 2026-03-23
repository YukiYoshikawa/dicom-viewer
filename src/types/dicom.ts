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

export type ActiveTool = 'windowLevel' | 'zoom' | 'pan' | 'rotate';
