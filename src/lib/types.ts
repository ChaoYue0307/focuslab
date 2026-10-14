export type Lang = 'zh' | 'en';
export type ThemePref = 'system' | 'light' | 'dark';
export type NoiseType = 'off' | 'brown' | 'pink' | 'white' | 'rain';

export type TaskId =
  | 'pvt'
  | 'sart'
  | 'flanker'
  | 'stroop'
  | 'switch'
  | 'nback'
  | 'mot'
  | 'schulte'
  | 'breath';

export type Domain =
  | 'alertness'
  | 'sustained'
  | 'inhibition'
  | 'memory'
  | 'flexibility'
  | 'tracking'
  | 'awareness';

export type Mode = 'training' | 'assessment';

export interface TaskResult {
  id: string;
  task: TaskId;
  mode: Mode;
  startedAt: number;
  date: string; // local YYYY-MM-DD
  hour: number; // local hour at start
  durationMs: number;
  level: number; // difficulty used
  nextLevel: number; // difficulty for next time
  perf: number; // 0-100 performance at the level used
  score: number; // 0-100 level-adjusted training score
  metrics: Record<string, number>;
}

export interface CheckIn {
  date: string;
  createdAt: number;
  sleep: number; // hours
  sleepQuality: number; // 1-5
  energy: number; // 1-5
  mood: number; // 1-5
  stress: number; // 1-5
  caffeine: number; // cups so far today
  exercise: boolean; // exercised in last 24h
}

export interface Distraction {
  t: number; // ms since session start
  text: string;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  date: string;
  hour: number;
  plannedMin: number;
  focusMs: number; // time actually spent in the session (excluding pauses)
  intention: string;
  distractions: Distraction[];
  awayCount: number; // times the user left the tab/window
  awayMs: number;
  pauses: number;
  completed: boolean; // ran to planned end
  rating?: number; // self-rated focus 1-5
  outcome?: 'done' | 'partial' | 'no';
}

export interface ParkingItem {
  id: string;
  text: string;
  createdAt: number;
  done: boolean;
}

export interface Settings {
  lang: Lang;
  theme: ThemePref;
  sound: boolean;
  volume: number; // 0-1
  nbackDual: boolean;
  nbackAudio: boolean; // speak letters (else show them visually)
  focusMin: number;
  breakMin: number;
  dailyFocusGoalMin: number;
  noise: NoiseType;
  noiseVolume: number; // 0-1
  breathMin: number;
  notify: boolean;
  schulteSize: number;
}

export interface AppData {
  version: 1;
  createdAt: number;
  onboarded: boolean;
  settings: Settings;
  results: TaskResult[];
  checkins: CheckIn[];
  sessions: FocusSession[];
  parking: ParkingItem[];
  levels: Partial<Record<TaskId, number>>;
}

/** What a task component reports when it finishes. */
export interface TaskOutcome {
  metrics: Record<string, number>;
  perf: number;
  score: number;
  level: number;
  nextLevel: number;
  durationMs: number;
}

export interface TaskProps {
  level: number;
  mode: Mode;
  settings: Settings;
  lang: Lang;
  onComplete: (o: TaskOutcome) => void;
  onProgress: (fraction: number) => void;
}
