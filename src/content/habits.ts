import type { Bi } from '../lib/i18n';
import type { DistractionKind } from '../lib/types';

/** Daily habit tags logged in the check-in. Insights estimate each one's effect on your focus. */
export interface TagDef {
  id: string;
  icon: string;
  label: Bi;
}

export const TAGS: TagDef[] = [
  { id: 'phone_away', icon: 'phone', label: { zh: '专注时手机放在别处', en: 'Phone away while focusing' } },
  { id: 'meditation', icon: 'wind', label: { zh: '额外冥想 10 分钟', en: '10 min extra meditation' } },
  { id: 'outdoor', icon: 'leaf', label: { zh: '户外 / 自然时间', en: 'Time outdoors' } },
  { id: 'move_first', icon: 'run', label: { zh: '深度工作前运动', en: 'Exercise before deep work' } },
  { id: 'no_social', icon: 'shield', label: { zh: '中午前不刷社交媒体', en: 'No social media before noon' } },
  { id: 'nap', icon: 'moon', label: { zh: '午睡', en: 'Nap' } },
  { id: 'alcohol', icon: 'coffee', label: { zh: '昨晚饮酒', en: 'Alcohol last night' } },
  { id: 'late_screen', icon: 'monitor', label: { zh: '睡前 1 小时看屏幕', en: 'Screens in the hour before bed' } },
];

export const tagLabel = (id: string, lang: 'zh' | 'en') => {
  if (id.startsWith('c:')) return id.slice(2);
  return TAGS.find((t) => t.id === id)?.label[lang] ?? id;
};

/** Templates for 14-day personal experiments with randomized ON/OFF days. */
export interface ExperimentTemplate {
  id: string;
  tag: string;
  icon: string;
  title: Bi;
  on: Bi;
  off: Bi;
  why: Bi;
}

export const EXPERIMENTS: ExperimentTemplate[] = [
  {
    id: 'phone_away',
    tag: 'phone_away',
    icon: 'phone',
    title: { zh: '手机离开房间', en: 'Phone out of the room' },
    on: { zh: '今天每段专注时，把手机放到另一个房间。', en: 'Today, put your phone in another room for every focus session.' },
    off: { zh: '今天照常放置手机（对照日）。', en: 'Keep your phone wherever you usually do (control day).' },
    why: { zh: '检验手机的存在对你的分心次数和专注自评有多大影响。', en: 'Tests how much your phone’s presence affects your distractions and focus ratings.' },
  },
  {
    id: 'outdoor',
    tag: 'outdoor',
    icon: 'leaf',
    title: { zh: '户外休息', en: 'Outdoor breaks' },
    on: { zh: '今天至少一次休息到户外走 15 分钟，不看手机。', en: 'Today, take at least one 15-minute outdoor walk break without your phone.' },
    off: { zh: '今天照常休息（对照日）。', en: 'Take breaks as usual (control day).' },
    why: { zh: '检验注意力恢复理论在你身上是否成立。', en: 'Tests whether attention restoration works for you.' },
  },
  {
    id: 'meditation',
    tag: 'meditation',
    icon: 'wind',
    title: { zh: '额外 10 分钟正念', en: '10 extra minutes of mindfulness' },
    on: { zh: '今天额外做一次 10 分钟数息练习或冥想。', en: 'Today, do an extra 10-minute breath-counting or meditation session.' },
    off: { zh: '今天只做常规训练（对照日）。', en: 'Only your regular training today (control day).' },
    why: { zh: '检验更多正念练习是否当天就能减少你的走神。', en: 'Tests whether extra mindfulness reduces your mind-wandering the same day.' },
  },
  {
    id: 'move_first',
    tag: 'move_first',
    icon: 'run',
    title: { zh: '先运动再专注', en: 'Move before focusing' },
    on: { zh: '今天在第一段深度工作前快走或运动 10–20 分钟。', en: 'Today, walk briskly or exercise for 10–20 minutes before your first deep-work block.' },
    off: { zh: '今天直接开始工作（对照日）。', en: 'Start working directly today (control day).' },
    why: { zh: '检验急性运动对你执行功能的短时提升。', en: 'Tests the short-term executive-function boost from a bout of exercise.' },
  },
  {
    id: 'no_social',
    tag: 'no_social',
    icon: 'shield',
    title: { zh: '上午远离社交媒体', en: 'Social-media-free mornings' },
    on: { zh: '今天中午 12 点前不打开任何社交媒体和短视频。', en: 'Today, no social media or short videos before noon.' },
    off: { zh: '今天照常使用（对照日）。', en: 'Use them as usual today (control day).' },
    why: { zh: '检验早上的碎片化输入是否拖累你一整天的专注。', en: 'Tests whether fragmented morning input drags down your focus all day.' },
  },
];

export const templateOf = (id: string) => EXPERIMENTS.find((e) => e.id === id);

export const DISTRACTION_KINDS: { id: DistractionKind; icon: string; label: Bi; advice: Bi }[] = [
  {
    id: 'thought',
    icon: 'brain',
    label: { zh: '冒出的念头', en: 'A thought' },
    advice: {
      zh: '你的分心大多来自内部念头。开始前写下"停车场"清单，并在专注中用"觉察 · 命名 · 回来"；数息练习正是在训练这个能力。',
      en: 'Most of your distractions are internal thoughts. Empty your head into the parking lot before starting and use Notice · Name · Return — breath counting trains exactly this.',
    },
  },
  {
    id: 'phone',
    icon: 'phone',
    label: { zh: '想看手机', en: 'Phone urge' },
    advice: {
      zh: '你的分心主要是想看手机。最有效的办法是物理隔离：专注时把手机放到另一个房间——可以用"个人实验"检验效果。',
      en: 'Your top distraction is the urge to check your phone. Physical distance works best: put it in another room while focusing — test it with a personal experiment.',
    },
  },
  {
    id: 'people',
    icon: 'heart',
    label: { zh: '被人打断', en: 'Someone interrupted' },
    advice: {
      zh: '你常被他人打断。试试在日历上标出专注时段、戴耳机作为"请勿打扰"信号，并约定统一的沟通时间。',
      en: 'People interrupt you often. Block focus time on your calendar, use headphones as a do-not-disturb signal, and agree on set times for questions.',
    },
  },
  {
    id: 'notification',
    icon: 'bell',
    label: { zh: '通知 / 消息', en: 'Notification' },
    advice: {
      zh: '通知是你的主要干扰源。专注时开启勿扰模式，关闭桌面通知，把消息集中到固定时间处理。',
      en: 'Notifications are your main interrupter. Turn on Do Not Disturb, disable desktop alerts, and batch messages at set times.',
    },
  },
  {
    id: 'other',
    icon: 'more',
    label: { zh: '其他', en: 'Other' },
    advice: { zh: '', en: '' },
  },
];
