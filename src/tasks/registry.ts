import type { Bi } from '../lib/i18n';
import type { Domain, TaskId } from '../lib/types';

export interface DomainMeta {
  id: Domain;
  icon: string;
  color: string; // css var
  name: Bi;
  desc: Bi;
}

export const DOMAINS: DomainMeta[] = [
  {
    id: 'alertness',
    icon: 'bolt',
    color: 'var(--d1)',
    name: { zh: '警觉度', en: 'Alertness' },
    desc: {
      zh: '大脑的"唤醒"水平：对突然出现的事件能多快、多稳地反应。对睡眠和疲劳极其敏感。',
      en: 'How fast and reliably you react to sudden events. Extremely sensitive to sleep and fatigue.',
    },
  },
  {
    id: 'sustained',
    icon: 'eye',
    color: 'var(--d2)',
    name: { zh: '持续注意', en: 'Sustained attention' },
    desc: {
      zh: '长时间把注意力保持在单调任务上、不进入"自动驾驶"的能力——走神的主要战场。',
      en: 'Keeping attention on a monotonous task without slipping into autopilot — where mind-wandering lives.',
    },
  },
  {
    id: 'inhibition',
    icon: 'filter',
    color: 'var(--d3)',
    name: { zh: '抗干扰', en: 'Interference control' },
    desc: {
      zh: '忽略干扰信息、压制冲动反应，只对重要的东西作出反应（选择性注意 + 抑制控制）。',
      en: 'Ignoring distracting information and overriding impulsive responses (selective attention + inhibition).',
    },
  },
  {
    id: 'memory',
    icon: 'layers',
    color: 'var(--d4)',
    name: { zh: '工作记忆', en: 'Working memory' },
    desc: {
      zh: '在脑中同时保持并不断更新信息的"心智工作台"，决定你能同时处理多少东西。',
      en: 'Your mental workbench: holding and updating information in mind at the same time.',
    },
  },
  {
    id: 'flexibility',
    icon: 'shuffle',
    color: 'var(--d5)',
    name: { zh: '切换灵活性', en: 'Cognitive flexibility' },
    desc: {
      zh: '在不同任务规则之间快速、准确切换的能力。切换代价越小，被打断后越快回到状态。',
      en: 'Switching between task rules quickly and accurately. A smaller switch cost means faster recovery after interruptions.',
    },
  },
  {
    id: 'tracking',
    icon: 'scan',
    color: 'var(--d6)',
    name: { zh: '注意广度', en: 'Attentional breadth' },
    desc: {
      zh: '同时追踪多个目标、高效扫描视野的能力。',
      en: 'Tracking several objects at once and scanning a visual field efficiently.',
    },
  },
  {
    id: 'awareness',
    icon: 'wind',
    color: 'var(--d7)',
    name: { zh: '元觉察', en: 'Meta-awareness' },
    desc: {
      zh: '察觉"我走神了"并温和地把注意力带回来的能力——正念训练的核心，也是日常专注最可迁移的技能。',
      en: 'Noticing that your mind has wandered and gently bringing it back — the core of mindfulness and the most transferable focus skill.',
    },
  },
];

export const domainMeta = (d: Domain) => DOMAINS.find((x) => x.id === d)!;

export type MetricFormat = 'ms' | 'pct' | 'num1' | 'num2' | 'int' | 's';

export interface MetricDef {
  key: string;
  label: Bi;
  fmt: MetricFormat;
  better: 'low' | 'high' | 'none';
  hint?: Bi;
  primary?: boolean;
}

export interface TaskMeta {
  id: TaskId;
  domain: Domain;
  icon: string;
  name: Bi;
  tagline: Bi;
  why: Bi;
  how: { zh: string[]; en: string[] };
  keys: Bi;
  minutes: number;
  assessMinutes?: number;
  maxLevel: number;
  levelLabel: (level: number, lang: 'zh' | 'en') => string;
  metrics: MetricDef[];
  basedOn: string;
}

const lv = (zh: string, en: string) => (_l: number, lang: 'zh' | 'en') => (lang === 'zh' ? zh : en);

export const TASKS: TaskMeta[] = [
  {
    id: 'pvt',
    domain: 'alertness',
    icon: 'bolt',
    name: { zh: '警觉反应 PVT', en: 'Vigilance (PVT)' },
    tagline: { zh: '数字一出现就按——测你此刻的清醒度', en: 'Hit the moment the counter appears — your alertness right now' },
    why: {
      zh: '精神运动警觉任务（PVT）是 NASA 与睡眠研究中衡量警觉度的金标准。它几乎没有学习效应，所以更像一个"状态体温计"：反应变慢、"走神失误"（反应 ≥500ms）增多，往往意味着睡眠不足或疲劳。每天做一次，你会清楚看到睡眠、咖啡因、时段如何影响你的专注。',
      en: 'The Psychomotor Vigilance Task is the gold-standard alertness measure in sleep research and at NASA. It has almost no practice effect, so it works like a thermometer for your state: slower responses and more lapses (≥500 ms) usually mean sleep debt or fatigue. Do it daily and you will see exactly how sleep, caffeine and time of day shape your focus.',
    },
    how: {
      zh: ['盯住屏幕中央的方框。', '红色毫秒计数器一出现，立刻按空格键（或点击屏幕）。', '别提前按——抢跑会被记录。', '每次出现的间隔是随机的，保持准备状态。'],
      en: ['Watch the box in the center.', 'As soon as the red millisecond counter appears, press Space (or tap).', 'Don’t anticipate — false starts are recorded.', 'The delay is random, so stay ready.'],
    },
    keys: { zh: '空格 / 点击', en: 'Space / tap' },
    minutes: 2,
    assessMinutes: 3,
    maxLevel: 1,
    levelLabel: lv('标准', 'Standard'),
    basedOn: 'PVT (Dinges & Powell, 1985); PVT-B (Basner et al., 2011)',
    metrics: [
      { key: 'medianRT', label: { zh: '反应时中位数', en: 'Median RT' }, fmt: 'ms', better: 'low', primary: true },
      { key: 'lapses', label: { zh: '走神失误', en: 'Lapses' }, fmt: 'int', better: 'low', hint: { zh: '反应 ≥500ms 的次数', en: 'Responses of 500 ms or slower' } },
      { key: 'falseStarts', label: { zh: '抢跑', en: 'False starts' }, fmt: 'int', better: 'low' },
      { key: 'fastest10', label: { zh: '最快 10%', en: 'Fastest 10%' }, fmt: 'ms', better: 'low' },
      { key: 'slowest10', label: { zh: '最慢 10%', en: 'Slowest 10%' }, fmt: 'ms', better: 'low', hint: { zh: '最慢的反应最能反映疲劳', en: 'Your slowest responses are the best fatigue signal' } },
      { key: 'trials', label: { zh: '试次', en: 'Trials' }, fmt: 'int', better: 'none' },
    ],
  },
  {
    id: 'sart',
    domain: 'sustained',
    icon: 'eye',
    name: { zh: '持续注意 SART', en: 'Sustained attention (SART)' },
    tagline: { zh: '每个数字都按，唯独 3 不按', en: 'Respond to every digit — except 3' },
    why: {
      zh: 'SART 专门捕捉"自动驾驶"式走神：节奏单调，你会不知不觉进入惯性按键，在 3 出现时来不及刹车。错按 3 的比例和反应时的波动（变异系数）是走神最灵敏的行为指标。训练目标不是更快，而是更稳——保持每一次都"在场"。',
      en: 'SART is designed to catch autopilot. The rhythm is monotonous, so you slide into habitual pressing and fail to stop when a 3 appears. Commission errors and reaction-time variability are among the most sensitive behavioral markers of mind-wandering. The goal is not speed but steadiness — being present on every trial.',
    },
    how: {
      zh: ['数字 1–9 会快速依次出现。', '看到除 3 以外的任何数字，按空格（或点击）。', '看到 3 时，什么都不要按。', '准确与速度同等重要；保持稳定节奏。'],
      en: ['Digits 1–9 flash one after another.', 'Press Space (or tap) for every digit except 3.', 'When you see a 3, do nothing.', 'Accuracy matters as much as speed; keep a steady rhythm.'],
    },
    keys: { zh: '空格 / 点击', en: 'Space / tap' },
    minutes: 3,
    assessMinutes: 4.5,
    maxLevel: 8,
    levelLabel: (l, lang) => (lang === 'zh' ? `节奏 ${l}` : `Pace ${l}`),
    basedOn: 'SART (Robertson et al., 1997)',
    metrics: [
      { key: 'commissionRate', label: { zh: '错按 3', en: 'Commission errors' }, fmt: 'pct', better: 'low', primary: true, hint: { zh: '在 3 上按键的比例（走神指标）', en: 'Share of 3s you pressed on (autopilot marker)' } },
      { key: 'omissionRate', label: { zh: '漏按', en: 'Omissions' }, fmt: 'pct', better: 'low' },
      { key: 'rtCV', label: { zh: '反应波动', en: 'RT variability' }, fmt: 'num2', better: 'low', hint: { zh: '反应时变异系数，越低越稳定', en: 'Coefficient of variation — lower is steadier' } },
      { key: 'meanRT', label: { zh: '平均反应时', en: 'Mean RT' }, fmt: 'ms', better: 'none' },
    ],
  },
  {
    id: 'flanker',
    domain: 'inhibition',
    icon: 'filter',
    name: { zh: '箭头侧抑制 Flanker', en: 'Arrow flanker' },
    tagline: { zh: '只看中间的箭头，忽略两边的', en: 'Follow the middle arrow, ignore the rest' },
    why: {
      zh: 'Flanker 任务训练"聚光灯"式的选择性注意：两侧箭头方向相反时（冲突），大脑必须压制干扰才能正确反应。冲突代价（不一致 − 一致的反应时）越小，你越能在嘈杂环境、多窗口下守住焦点。',
      en: 'The flanker task trains your attentional spotlight: when the side arrows point the other way, your brain must suppress them. The smaller your conflict cost (incongruent − congruent RT), the better you hold focus amid noise and open tabs.',
    },
    how: {
      zh: ['屏幕会出现一排 5 个箭头。', '只判断正中间那个箭头的方向。', '向左按 ← 或 F，向右按 → 或 J（手机点击左右按钮）。', '又快又准；等级越高反应窗口越短。'],
      en: ['A row of five arrows appears.', 'Judge only the direction of the center arrow.', 'Left: ← or F. Right: → or J (or tap the buttons).', 'Be fast and accurate; higher levels shorten the response window.'],
    },
    keys: { zh: '← → 或 F J', en: '← → or F J' },
    minutes: 2,
    assessMinutes: 2.5,
    maxLevel: 10,
    levelLabel: (l, lang) => (lang === 'zh' ? `等级 ${l}` : `Level ${l}`),
    basedOn: 'Eriksen & Eriksen (1974)',
    metrics: [
      { key: 'interference', label: { zh: '冲突代价', en: 'Conflict cost' }, fmt: 'ms', better: 'low', primary: true, hint: { zh: '不一致比一致慢多少', en: 'How much slower incongruent trials are' } },
      { key: 'accuracy', label: { zh: '正确率', en: 'Accuracy' }, fmt: 'pct', better: 'high' },
      { key: 'meanRT', label: { zh: '平均反应时', en: 'Mean RT' }, fmt: 'ms', better: 'low' },
      { key: 'accIncongruent', label: { zh: '冲突试次正确率', en: 'Incongruent accuracy' }, fmt: 'pct', better: 'high' },
    ],
  },
  {
    id: 'stroop',
    domain: 'inhibition',
    icon: 'palette',
    name: { zh: '色词干扰 Stroop', en: 'Color-word Stroop' },
    tagline: { zh: '说出字的颜色，而不是字本身', en: 'Name the ink, not the word' },
    why: {
      zh: '阅读是高度自动化的习惯。Stroop 任务要求你压制"读字"的冲动，只报告墨水颜色——这正是抵抗习惯性冲动（比如下意识拿起手机）所需的抑制控制。',
      en: 'Reading is deeply automatic. Stroop makes you override the urge to read and report only the ink color — the same inhibitory control you need to resist habits like reflexively reaching for your phone.',
    },
    how: {
      zh: ['屏幕会出现一个颜色词，例如用蓝色写的"红"。', '按墨水的颜色作答，忽略字义。', '按键：D 红 · F 绿 · J 蓝 · K 黄（或 1–4，或点击按钮）。'],
      en: ['A color word appears, e.g. "RED" printed in blue.', 'Respond to the ink color and ignore the word.', 'Keys: D red · F green · J blue · K yellow (or 1–4, or tap).'],
    },
    keys: { zh: 'D F J K / 1–4', en: 'D F J K / 1–4' },
    minutes: 2,
    assessMinutes: 2.5,
    maxLevel: 10,
    levelLabel: (l, lang) => (lang === 'zh' ? `等级 ${l}` : `Level ${l}`),
    basedOn: 'Stroop (1935)',
    metrics: [
      { key: 'interference', label: { zh: '干扰代价', en: 'Interference cost' }, fmt: 'ms', better: 'low', primary: true },
      { key: 'accuracy', label: { zh: '正确率', en: 'Accuracy' }, fmt: 'pct', better: 'high' },
      { key: 'meanRT', label: { zh: '平均反应时', en: 'Mean RT' }, fmt: 'ms', better: 'low' },
      { key: 'accIncongruent', label: { zh: '冲突试次正确率', en: 'Incongruent accuracy' }, fmt: 'pct', better: 'high' },
    ],
  },
  {
    id: 'switch',
    domain: 'flexibility',
    icon: 'shuffle',
    name: { zh: '规则切换', en: 'Task switching' },
    tagline: { zh: '按提示在"奇偶"和"大小"之间切换', en: 'Switch between odd/even and high/low on cue' },
    why: {
      zh: '每次从一件事切到另一件事，大脑都要"重新加载规则"，这就是切换代价。它解释了为什么频繁看消息让你效率骤降。练习可以缩小切换代价，同时让你亲身感受多任务的真实成本。',
      en: 'Every switch forces your brain to reload task rules — the switch cost. It is why checking messages wrecks productivity. Practice shrinks the cost, and lets you feel the true price of multitasking.',
    },
    how: {
      zh: ['先出现提示（奇偶 或 大小），然后出现一个数字。', '奇偶：奇数按左，偶数按右。', '大小：小于 5 按左，大于 5 按右。', '左：← 或 F；右：→ 或 J。'],
      en: ['A cue (ODD/EVEN or HIGH/LOW) appears, then a digit.', 'ODD/EVEN: odd → left, even → right.', 'HIGH/LOW: below 5 → left, above 5 → right.', 'Left: ← or F. Right: → or J.'],
    },
    keys: { zh: '← → 或 F J', en: '← → or F J' },
    minutes: 2.5,
    assessMinutes: 3,
    maxLevel: 10,
    levelLabel: (l, lang) => (lang === 'zh' ? `等级 ${l}` : `Level ${l}`),
    basedOn: 'Monsell (2003); Rogers & Monsell (1995)',
    metrics: [
      { key: 'switchCost', label: { zh: '切换代价', en: 'Switch cost' }, fmt: 'ms', better: 'low', primary: true, hint: { zh: '切换试次比重复试次慢多少', en: 'How much slower switch trials are than repeats' } },
      { key: 'accuracy', label: { zh: '正确率', en: 'Accuracy' }, fmt: 'pct', better: 'high' },
      { key: 'meanRT', label: { zh: '平均反应时', en: 'Mean RT' }, fmt: 'ms', better: 'low' },
      { key: 'accSwitch', label: { zh: '切换试次正确率', en: 'Switch-trial accuracy' }, fmt: 'pct', better: 'high' },
    ],
  },
  {
    id: 'nback',
    domain: 'memory',
    icon: 'layers',
    name: { zh: 'N-Back 工作记忆', en: 'N-Back' },
    tagline: { zh: '判断当前刺激是否与 N 步之前相同', en: 'Does this match what came N steps back?' },
    why: {
      zh: 'N-back 让工作记忆持续满载：不断记住新的、丢掉旧的、比对 N 步之前。难度会自动调整到你的极限边缘（约 80% 正确率），这是训练最有效的区间。诚实地说：它对"更聪明"的远迁移证据有限，但对需要在脑中操作信息的任务直接有效，也是极好的专注"负重训练"。',
      en: 'N-back keeps working memory at full load: hold the new, drop the old, compare with N steps back. Difficulty adapts to the edge of your ability (~80% correct), the most effective training zone. Honestly: far transfer to general intelligence is weak, but it directly exercises holding information in mind and is a great "weighted vest" for focus.',
    },
    how: {
      zh: ['方块会在 3×3 网格的某个位置出现，同时会读出一个字母（双任务）。', '如果位置与 N 步之前相同，按 A（或点"位置"）。', '如果字母与 N 步之前相同，按 L（或点"声音"）。', '每轮结束后自动调整 N：错误少则升级，错误多则降级。'],
      en: ['A square appears in a 3×3 grid while a letter is spoken (dual mode).', 'If the position matches N steps back, press A (or tap Position).', 'If the letter matches N steps back, press L (or tap Sound).', 'N adapts after every block: few errors → up, many errors → down.'],
    },
    keys: { zh: 'A 位置 · L 声音', en: 'A position · L sound' },
    minutes: 3.5,
    assessMinutes: 3.5,
    maxLevel: 9,
    levelLabel: (l) => `${l}-back`,
    basedOn: 'Jaeggi et al. (2008)',
    metrics: [
      { key: 'meanN', label: { zh: '平均 N', en: 'Mean N' }, fmt: 'num1', better: 'high', primary: true },
      { key: 'accuracy', label: { zh: '正确率', en: 'Accuracy' }, fmt: 'pct', better: 'high' },
      { key: 'dPrime', label: { zh: '辨别力 d′', en: 'Sensitivity d′' }, fmt: 'num2', better: 'high', hint: { zh: '区分匹配与不匹配的能力', en: 'Ability to tell matches from non-matches' } },
      { key: 'maxN', label: { zh: '最高 N', en: 'Max N' }, fmt: 'int', better: 'high' },
    ],
  },
  {
    id: 'mot',
    domain: 'tracking',
    icon: 'scan',
    name: { zh: '多目标追踪', en: 'Multiple object tracking' },
    tagline: { zh: '在一群移动的小球里，盯住被标记的那几个', en: 'Keep your eyes on the marked balls as they move' },
    why: {
      zh: '多目标追踪测量注意力能同时"抓住"多少个移动物体。它被用于训练运动员和飞行员的态势感知。追踪时，你必须持续分配注意力，一走神目标就丢——非常直观的专注反馈。',
      en: 'Multiple object tracking measures how many moving things attention can hold at once. It is used to train situational awareness in athletes and pilots. Drift for a second and you lose a target — immediate, honest feedback on focus.',
    },
    how: {
      zh: ['几个小球会先闪烁标记为目标。', '随后所有小球外观一致并开始移动。', '一直用注意力追踪目标（眼睛可以看中间）。', '停止后，点出所有目标。全部正确会增加难度。'],
      en: ['Some balls flash to mark them as targets.', 'Then all balls look identical and start moving.', 'Keep tracking the targets (you can fix your eyes at the center).', 'When they stop, click every target. Perfect rounds raise the difficulty.'],
    },
    keys: { zh: '鼠标 / 触摸', en: 'Mouse / touch' },
    minutes: 2.5,
    maxLevel: 15,
    levelLabel: (l, lang) => {
      const k = 2 + Math.floor((l - 1) / 3);
      const sp = ((l - 1) % 3) + 1;
      return lang === 'zh' ? `${k} 个目标 · 速度 ${sp}` : `${k} targets · speed ${sp}`;
    },
    basedOn: 'Pylyshyn & Storm (1988)',
    metrics: [
      { key: 'capacity', label: { zh: '追踪容量', en: 'Tracking capacity' }, fmt: 'num1', better: 'high', primary: true, hint: { zh: '经猜测校正的平均追踪目标数', en: 'Guess-corrected number of objects tracked' } },
      { key: 'accuracy', label: { zh: '选中正确率', en: 'Selection accuracy' }, fmt: 'pct', better: 'high' },
      { key: 'maxTargets', label: { zh: '最多目标', en: 'Most targets' }, fmt: 'int', better: 'high' },
      { key: 'perfectRounds', label: { zh: '全对轮数', en: 'Perfect rounds' }, fmt: 'int', better: 'high' },
    ],
  },
  {
    id: 'schulte',
    domain: 'tracking',
    icon: 'grid',
    name: { zh: '舒尔特方格', en: 'Schulte table' },
    tagline: { zh: '按顺序尽快点出 1 到 25', en: 'Find 1 to 25 in order, fast' },
    why: {
      zh: '舒尔特方格训练视觉搜索效率与注意稳定：目光保持在中心，用余光扩大"注意视野"。它短小、可量化，适合作为专注热身。',
      en: 'Schulte tables train visual search and steady attention: keep your gaze near the center and use peripheral vision to widen your attentional field. Short, measurable and a great warm-up.',
    },
    how: {
      zh: ['方格中打乱排列着数字。', '从 1 开始按顺序依次点击。', '尽量把视线固定在中心，用余光寻找。', '一共 3 张表，取平均用时。'],
      en: ['Numbers are scattered in a grid.', 'Click them in ascending order starting from 1.', 'Try to keep your gaze at the center and find numbers peripherally.', 'Three tables; your average time counts.'],
    },
    keys: { zh: '鼠标 / 触摸', en: 'Mouse / touch' },
    minutes: 2,
    maxLevel: 7,
    levelLabel: (l) => `${l}×${l}`,
    basedOn: 'Schulte tables (Gorbov variant classics)',
    metrics: [
      { key: 'meanTime', label: { zh: '平均用时', en: 'Average time' }, fmt: 's', better: 'low', primary: true },
      { key: 'bestTime', label: { zh: '最佳用时', en: 'Best time' }, fmt: 's', better: 'low' },
      { key: 'spi', label: { zh: '每格秒数', en: 'Seconds per cell' }, fmt: 'num2', better: 'low' },
      { key: 'errors', label: { zh: '点错', en: 'Mis-clicks' }, fmt: 'int', better: 'low' },
    ],
  },
  {
    id: 'breath',
    domain: 'awareness',
    icon: 'wind',
    name: { zh: '数息练习', en: 'Breath counting' },
    tagline: { zh: '数呼吸 1 到 9——可测量的正念', en: 'Count breaths 1 to 9 — mindfulness you can measure' },
    why: {
      zh: '数息是威斯康星大学验证过的客观正念测量：数错代表走神，主动重置代表你"抓住"了走神。研究发现，短短两周的正念训练就能减少走神、提升工作记忆与阅读理解成绩。这是本应用里对日常专注最可能产生真实迁移的练习。',
      en: 'Breath counting is a validated, objective mindfulness measure (University of Wisconsin): miscounts reveal mind-wandering, and resets show you caught it. Two weeks of mindfulness training has been shown to reduce mind-wandering and improve working memory and reading scores. This is the exercise in the app most likely to transfer to everyday focus.',
    },
    how: {
      zh: ['坐好，闭上眼或目光柔和地落在前方。', '自然呼吸。每次呼气时，在心里数一个数。', '第 1–8 次呼气按空格（或点左侧大区域）；第 9 次按回车（或点右侧）。然后从 1 重新开始。', '如果发现自己数丢了，按 R（或点"重置"），从 1 重新开始——这不是失败，而是一次成功的觉察。'],
      en: ['Sit comfortably, eyes closed or softly gazing ahead.', 'Breathe naturally. Count each out-breath silently.', 'On breaths 1–8 press Space (or tap the left area); on breath 9 press Enter (or tap the right). Then start again at 1.', 'If you notice you lost count, press R (or tap Reset) and start again at 1 — that is not a failure, it is a moment of awareness.'],
    },
    keys: { zh: '空格 1–8 · 回车 9 · R 重置', en: 'Space 1–8 · Enter 9 · R reset' },
    minutes: 5,
    maxLevel: 1,
    levelLabel: lv('标准', 'Standard'),
    basedOn: 'Levinson et al. (2014)',
    metrics: [
      { key: 'accuracy', label: { zh: '计数准确率', en: 'Count accuracy' }, fmt: 'pct', better: 'high', primary: true },
      { key: 'correct', label: { zh: '正确循环', en: 'Correct cycles' }, fmt: 'int', better: 'high' },
      { key: 'miscounts', label: { zh: '数错', en: 'Miscounts' }, fmt: 'int', better: 'low' },
      { key: 'resets', label: { zh: '觉察重置', en: 'Self-caught resets' }, fmt: 'int', better: 'none', hint: { zh: '主动发现走神的次数', en: 'Times you noticed you drifted' } },
      { key: 'bpm', label: { zh: '呼吸 / 分钟', en: 'Breaths / min' }, fmt: 'num1', better: 'none' },
    ],
  },
];

export const taskMeta = (id: TaskId) => TASKS.find((t) => t.id === id)!;

export const DEFAULT_LEVEL: Record<TaskId, number> = {
  pvt: 1,
  sart: 1,
  flanker: 1,
  stroop: 1,
  switch: 1,
  nback: 2,
  mot: 1,
  schulte: 5,
  breath: 1,
};

/** Standardized parameters used by the assessment battery so results stay comparable over time. */
export const ASSESS_LEVEL: Partial<Record<TaskId, number>> = {
  pvt: 1,
  sart: 1,
  flanker: 3,
  switch: 3,
  nback: 2,
};

export const ASSESSMENT: TaskId[] = ['pvt', 'sart', 'flanker', 'switch', 'nback'];
