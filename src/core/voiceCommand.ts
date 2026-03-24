// Voice Command module using Web Speech API
// Supports Japanese (ja-JP) continuous recognition

export type VoiceCommandCallback = (command: string) => void;

// Web Speech API type declarations
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  resultIndex: number;
  results: SpeechRecognitionResult[];
  [index: number]: SpeechRecognitionResult;
}

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList & {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
  message: string;
};

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

// Augment window type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
    webkitSpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;
let activeCallback: VoiceCommandCallback | null = null;
let running = false;

export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 30+ command mappings: Japanese & English triggers → normalized command name
const COMMAND_MAP: { patterns: RegExp; command: string }[] = [
  // Navigation
  { patterns: /次|next|ねくすと/, command: 'next' },
  { patterns: /前|previous|まえ|ぜん/, command: 'prev' },
  { patterns: /最初|first|さいしょ|はじめ/, command: 'first' },
  { patterns: /最後|last|さいご|おわり/, command: 'last' },
  { patterns: /上|up|うえ/, command: 'up' },
  { patterns: /下|down|した/, command: 'down' },
  // Tools
  { patterns: /ズーム|zoom|ずーむ/, command: 'zoom' },
  { patterns: /パン|pan|ぱん|移動/, command: 'pan' },
  { patterns: /回転|rotate|かいてん/, command: 'rotate' },
  { patterns: /ウィンドウ|window level|ういんどう|WL|WW/, command: 'windowLevel' },
  { patterns: /計測|measure|けいそく|長さ|ruler/, command: 'length' },
  { patterns: /角度|angle|かくど/, command: 'angle' },
  { patterns: /矩形|rectangle|くけい/, command: 'rectangleROI' },
  { patterns: /円|circle|えん/, command: 'circleROI' },
  { patterns: /楕円|ellipse|だえん/, command: 'ellipticalROI' },
  { patterns: /フリーハンド|freehand|ふりーはんど/, command: 'freehandROI' },
  { patterns: /プローブ|probe|ぷろーべ/, command: 'probe' },
  { patterns: /矢印|arrow|やじるし/, command: 'arrowAnnotate' },
  // Actions
  { patterns: /リセット|reset|りせっと/, command: 'reset' },
  { patterns: /フィット|fit|ふぃっと|合わせ/, command: 'fit' },
  { patterns: /反転|invert|はんてん|ネガ/, command: 'invert' },
  { patterns: /フリップ|flip|ふりっぷ/, command: 'flipH' },
  { patterns: /上下反転|flip vertical|じょうげはんてん/, command: 'flipV' },
  { patterns: /スクリーンショット|screenshot|すくりーんしょっと/, command: 'screenshot' },
  { patterns: /印刷|print|いんさつ/, command: 'print' },
  { patterns: /シネ|cine|しね|再生|停止/, command: 'cine' },
  { patterns: /オート|auto|おーと|自動/, command: 'autoWL' },
  { patterns: /時計回り|clockwise|右回転/, command: 'rotateCW' },
  { patterns: /反時計|counterclockwise|左回転/, command: 'rotateCCW' },
  { patterns: /キーフレーム|keyframe|きーふれーむ/, command: 'nextKeyframe' },
  { patterns: /AIスカウト|ai scout|えーあいすかうと|変化マップ/, command: 'aiScout' },
  { patterns: /音声|voice|おんせい|マイク/, command: 'voice' },
];

function parseCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  for (const { patterns, command } of COMMAND_MAP) {
    if (patterns.test(lower) || patterns.test(transcript)) {
      return command;
    }
  }
  return null;
}

export function startVoiceRecognition(callback: VoiceCommandCallback): void {
  if (!isSpeechRecognitionSupported()) {
    console.warn('SpeechRecognition not supported in this browser');
    return;
  }

  activeCallback = callback;
  running = true;

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognitionClass!();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript;
          const cmd = parseCommand(transcript);
          if (cmd && activeCallback) {
            activeCallback(cmd);
            break;
          }
        }
      }
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      console.error('Voice recognition permission denied:', event.error);
      running = false;
      return;
    }
    console.warn('Voice recognition error:', event.error);
  };

  recognition.onend = () => {
    // Auto-restart unless explicitly stopped
    if (running) {
      try {
        recognition.start();
      } catch {
        // Already starting
      }
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('Failed to start voice recognition:', e);
  }
}

export function stopVoiceRecognition(): void {
  running = false;
  activeCallback = null;
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Ignore
    }
    recognition = null;
  }
}
