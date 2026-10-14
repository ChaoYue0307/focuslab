import { TASKS } from '../tasks/registry';
import { streak } from './analytics';
import type { Bi } from './i18n';
import type { AppData } from './types';

export interface Achievement {
  id: string;
  icon: string;
  title: Bi;
  desc: Bi;
  test: (d: AppData, best: number) => boolean;
}

const focusHours = (d: AppData) => d.sessions.reduce((a, s) => a + s.focusMs, 0) / 3600000;
const maxMetric = (d: AppData, task: string, key: string) => Math.max(0, ...d.results.filter((r) => r.task === task).map((r) => r.metrics[key] ?? 0));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: 'play', title: { zh: '第一步', en: 'First step' }, desc: { zh: '完成第一次训练', en: 'Complete your first exercise' }, test: (d) => d.results.length >= 1 },
  {
    id: 'baseline',
    icon: 'clipboard',
    title: { zh: '建立基线', en: 'Baseline set' },
    desc: { zh: '完成一次完整评估', en: 'Complete a full assessment' },
    test: (d) => new Set(d.results.filter((r) => r.mode === 'assessment').map((r) => r.task)).size >= 5,
  },
  {
    id: 'retest',
    icon: 'refresh',
    title: { zh: '用数据说话', en: 'Measured progress' },
    desc: { zh: '在基线 10 天后再次评估', en: 'Retake the assessment 10+ days after your baseline' },
    test: (d) => {
      const a = d.results.filter((r) => r.mode === 'assessment').map((r) => r.startedAt);
      return a.length >= 2 && Math.max(...a) - Math.min(...a) >= 10 * 86400000;
    },
  },
  { id: 'explorer', icon: 'grid', title: { zh: '全能选手', en: 'All-rounder' }, desc: { zh: '尝试全部 9 个练习', en: 'Try all 9 exercises' }, test: (d) => TASKS.every((t) => d.results.some((r) => r.task === t.id)) },
  { id: 'streak3', icon: 'flame', title: { zh: '三天热身', en: 'Warming up' }, desc: { zh: '连续 3 天练习', en: '3-day streak' }, test: (_d, b) => b >= 3 },
  { id: 'streak7', icon: 'flame', title: { zh: '一周不断', en: 'One full week' }, desc: { zh: '连续 7 天练习', en: '7-day streak' }, test: (_d, b) => b >= 7 },
  { id: 'streak21', icon: 'flame', title: { zh: '习惯成形', en: 'Habit formed' }, desc: { zh: '连续 21 天练习', en: '21-day streak' }, test: (_d, b) => b >= 21 },
  { id: 'streak60', icon: 'flame', title: { zh: '专注生活方式', en: 'A focused life' }, desc: { zh: '连续 60 天练习', en: '60-day streak' }, test: (_d, b) => b >= 60 },
  { id: 'deep25', icon: 'timer', title: { zh: '进入深水区', en: 'Into deep water' }, desc: { zh: '完成一段 ≥25 分钟的专注', en: 'Complete a 25+ minute focus session' }, test: (d) => d.sessions.some((s) => s.completed && s.plannedMin >= 25) },
  { id: 'deep90', icon: 'timer', title: { zh: '九十分钟', en: 'Ninety minutes' }, desc: { zh: '完成一段 90 分钟专注', en: 'Complete a 90-minute focus session' }, test: (d) => d.sessions.some((s) => s.completed && s.plannedMin >= 90) },
  { id: 'hours10', icon: 'clock', title: { zh: '十小时', en: 'Ten hours' }, desc: { zh: '累计深度专注 10 小时', en: '10 hours of deep focus' }, test: (d) => focusHours(d) >= 10 },
  { id: 'hours100', icon: 'trophy', title: { zh: '百小时匠人', en: 'Hundred-hour craftsman' }, desc: { zh: '累计深度专注 100 小时', en: '100 hours of deep focus' }, test: (d) => focusHours(d) >= 100 },
  { id: 'nback3', icon: 'layers', title: { zh: '三步之遥', en: 'Three back' }, desc: { zh: 'N-Back 达到 3-back', en: 'Reach 3-back' }, test: (d) => maxMetric(d, 'nback', 'maxN') >= 3 },
  { id: 'nback5', icon: 'layers', title: { zh: '记忆大师', en: 'Memory master' }, desc: { zh: 'N-Back 达到 5-back', en: 'Reach 5-back' }, test: (d) => maxMetric(d, 'nback', 'maxN') >= 5 },
  {
    id: 'steady',
    icon: 'eye',
    title: { zh: '稳如磐石', en: 'Rock steady' },
    desc: { zh: 'SART 错按率 ≤10%（节奏 ≥3）', en: 'SART commission errors ≤10% at pace 3+' },
    test: (d) => d.results.some((r) => r.task === 'sart' && r.level >= 3 && r.metrics.commissionRate <= 0.1),
  },
  {
    id: 'zen',
    icon: 'wind',
    title: { zh: '心如止水', en: 'Still water' },
    desc: { zh: '10 分钟数息准确率 ≥90%', en: '≥90% accuracy in a 10-minute breath count' },
    test: (d) => d.results.some((r) => r.task === 'breath' && r.metrics.minutes >= 10 && r.metrics.accuracy >= 0.9),
  },
  {
    id: 'aware',
    icon: 'sparkles',
    title: { zh: '觉察者', en: 'The noticer' },
    desc: { zh: '在专注抽查中诚实报告走神 10 次', en: 'Honestly report mind-wandering in 10 probes' },
    test: (d) => d.sessions.reduce((a, s) => a + (s.probes || []).filter((p) => p.state === 'mw').length, 0) >= 10,
  },
  { id: 'checkin7', icon: 'heart', title: { zh: '了解自己', en: 'Know thyself' }, desc: { zh: '累计 7 次状态打卡', en: '7 daily check-ins' }, test: (d) => d.checkins.length >= 7 },
  { id: 'scientist', icon: 'brain', title: { zh: '个人科学家', en: 'Personal scientist' }, desc: { zh: '完成一次 14 天个人实验', en: 'Finish a 14-day personal experiment' }, test: (d) => d.experiments.some((e) => e.status === 'done') },
  { id: 'reviewer', icon: 'calendar', title: { zh: '复盘者', en: 'Reflective' }, desc: { zh: '完成一次周回顾', en: 'Complete a weekly review' }, test: (d) => d.reviews.length >= 1 },
  { id: 'century', icon: 'trophy', title: { zh: '百炼成钢', en: 'Centurion' }, desc: { zh: '完成 100 次训练', en: 'Complete 100 exercises' }, test: (d) => d.results.length >= 100 },
];

/** IDs whose conditions are met but which aren't recorded as unlocked yet. */
export function newlyUnlocked(d: AppData): string[] {
  const best = streak(d).best;
  return ACHIEVEMENTS.filter((a) => !d.achievements[a.id] && a.test(d, best)).map((a) => a.id);
}

export const achievementMeta = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
