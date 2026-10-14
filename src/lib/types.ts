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
  tags?: string[]; // habit tags for the day (built-in ids or "c:<custom>")
  createdAt: number;
  sleep: number; // hours
  sleepQuality: number; // 1-5
  energy: number; // 1-5
  mood: number; // 1-5
  stress: number; // 1-5
  caffeine: number; // cups so far today
  exercise: boolean; // exercised in last 24h
}

export type DistractionKind = 'thought' | 'phone' | 'people' | 'notification' | 'other';

export interface Distraction {
  t: number; // ms since session start
  text: string;
  kind?: DistractionKind;
}

/** Experience-sampling probe: where was attention when the chime sounded? */
export type ProbeState = 'on' | 'mw' | 'ext' | 'missed';
export interface Probe {
  t: number; // ms since session start
  state: ProbeState;
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
  probes?: Probe[];
  noise?: NoiseType;
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
  probes: boolean; // attention probes during focus sessions
  probeMin: number; // average minutes between probes
  stroopCvd: boolean; // colour-vision-friendly Stroop palette
  customTags: string[];
  reminderTime: string; // HH:MM for the calendar reminder
}

/** A personal n-of-1 experiment: randomized ON/OFF days for one habit. */
export interface Experiment {
  id: string;
  template: string;
  tag: string;
  startDate: string;
  schedule: boolean[]; // true = ON day
  log?: Record<string, boolean>; // date → actually did the habit
  status: 'active' | 'done' | 'stopped';
  endedAt?: number;
}

export interface WeeklyReview {
  id: string;
  weekEnd: string;
  createdAt: number;
  wins: string;
  obstacle: string;
  nextChange: string;
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
  practiced: TaskId[];
  experiments: Experiment[];
  reviews: WeeklyReview[];
  achievements: Record<string, number>; // id → unlocked at
  lastExportAt: number | null;
  dismissed: Record<string, string>; // reminder id → day dismissed
}

/** One trial for the within-session timeline (not persisted). */
export interface TrialPoint {
  rt: number | null;
  ok: boolean;
  kind?: 'lapse' | 'commission' | 'omission' | 'timeout' | 'false';
}

/** What a task component reports when it finishes. */
export interface TaskOutcome {
  metrics: Record<string, number>;
  perf: number;
  score: number;
  level: number;
  nextLevel: number;
  durationMs: number;
  series?: TrialPoint[];
}

export interface TaskProps {
  level: number;
  mode: Mode;
  settings: Settings;
  lang: Lang;
  onComplete: (o: TaskOutcome) => void;
  onProgress: (fraction: number) => void;
  practice?: boolean;
}
