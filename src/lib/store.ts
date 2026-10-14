import { useSyncExternalStore } from 'react';
import { DEFAULT_LANG, isLang } from './langs';
import type { AppData, Settings } from './types';

const KEY = 'focuslab:v1';

export function defaultSettings(): Settings {
  return {
    lang: DEFAULT_LANG,
    theme: 'system',
    sound: true,
    volume: 0.6,
    nbackDual: true,
    nbackAudio: true,
    focusMin: 25,
    breakMin: 5,
    dailyFocusGoalMin: 120,
    noise: 'off',
    noiseVolume: 0.35,
    breathMin: 5,
    notify: false,
    schulteSize: 5,
    probes: true,
    probeMin: 10,
    stroopCvd: false,
    customTags: [],
    reminderTime: '08:30',
  };
}

export function emptyData(): AppData {
  return {
    version: 1,
    createdAt: Date.now(),
    onboarded: false,
    settings: defaultSettings(),
    results: [],
    checkins: [],
    sessions: [],
    parking: [],
    levels: {},
    practiced: [],
    experiments: [],
    reviews: [],
    achievements: {},
    lastExportAt: null,
    dismissed: {},
  };
}

/** Merge unknown/older JSON into a well-formed AppData. */
export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppData>;
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...base.settings, ...(r.settings || {}), ...(r.settings && !isLang(r.settings.lang) ? { lang: base.settings.lang } : {}) },
    results: Array.isArray(r.results) ? r.results : [],
    checkins: Array.isArray(r.checkins) ? r.checkins : [],
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
    parking: Array.isArray(r.parking) ? r.parking : [],
    levels: r.levels && typeof r.levels === 'object' ? r.levels : {},
    practiced: Array.isArray(r.practiced) ? r.practiced : [],
    experiments: Array.isArray(r.experiments) ? r.experiments : [],
    reviews: Array.isArray(r.reviews) ? r.reviews : [],
    achievements: r.achievements && typeof r.achievements === 'object' ? r.achievements : {},
    lastExportAt: typeof r.lastExportAt === 'number' ? r.lastExportAt : null,
    dismissed: r.dismissed && typeof r.dismissed === 'object' ? r.dismissed : {},
  };
}

function load(): AppData {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalize(JSON.parse(s)) : emptyData();
  } catch {
    return emptyData();
  }
}

let data: AppData = typeof localStorage !== 'undefined' ? load() : emptyData();
const listeners = new Set<() => void>();
let saveError = false;
let onSaveError: (() => void) | null = null;

/** Called once each time saving starts failing (e.g. storage full or blocked). */
export function setSaveErrorHandler(fn: (() => void) | null) {
  onSaveError = fn;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    saveError = false;
  } catch {
    if (!saveError) onSaveError?.();
    saveError = true;
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getData(): AppData {
  return data;
}

export function hasSaveError() {
  return saveError;
}

/** Mutate a draft copy of the data; changes are persisted and broadcast. */
export function update(fn: (d: AppData) => void) {
  const draft = structuredClone(data);
  fn(draft);
  data = draft;
  persist();
  emit();
}

export function replaceData(next: AppData) {
  data = normalize(next);
  persist();
  emit();
}

export function updateSettings(patch: Partial<Settings>) {
  update((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData);
}

export function useSettings(): Settings {
  return useData().settings;
}

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        data = normalize(JSON.parse(e.newValue));
        emit();
      } catch {
        /* ignore malformed */
      }
    }
  });
}

export function exportJSON(): string {
  return JSON.stringify(data, null, 2);
}
