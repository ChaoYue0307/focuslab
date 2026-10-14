import type { Bi } from '../lib/i18n';

export type Evidence = 'strong' | 'moderate' | 'mixed' | 'practice';

export const EVIDENCE_LABEL: Record<Evidence, Bi> = {
  strong: { zh: '证据充分', en: 'Strong evidence' },
  moderate: { zh: '中等证据', en: 'Moderate evidence' },
  mixed: { zh: '证据不一', en: 'Mixed evidence' },
  practice: { zh: '实践经验', en: 'Practice-based' },
};

export interface Habit {
  icon: string;
  title: Bi;
  evidence: Evidence;
  why: Bi;
  how: Bi;
}

export const HABITS: Habit[] = [
  {
    icon: 'moon',
    title: { zh: '睡足 7–9 小时', en: 'Sleep 7–9 hours' },
    evidence: 'strong',
    why: {
      zh: '连续两周每晚只睡 6 小时，警觉度下降的程度相当于整夜不睡一到两晚——而当事人往往察觉不到自己变差了。睡眠是专注力的地基。',
      en: 'Two weeks of 6-hour nights impairs vigilance about as much as one to two nights of total sleep deprivation — and people barely notice their own decline. Sleep is the foundation.',
    },
    how: {
      zh: '固定起床时间（包括周末）。用每日 PVT 观察睡眠对你的真实影响。',
      en: 'Keep a fixed wake time, weekends included. Use the daily PVT to see what sleep actually does to you.',
    },
  },
  {
    icon: 'phone',
    title: { zh: '让手机离开视线', en: 'Put your phone out of sight' },
    evidence: 'mixed',
    why: {
      zh: '有研究发现手机仅仅放在桌上就会占用认知资源；后续重复研究结果不一。但手机带来的通知和"顺手一刷"确实会打断你——把它放远几乎零成本。',
      en: 'One well-known study found a phone merely on the desk drains cognitive capacity; replications are mixed. But notifications and reflexive checking certainly interrupt you — moving it away costs nothing.',
    },
    how: {
      zh: '专注时段里把手机放进另一个房间或包里，开启勿扰模式。',
      en: 'During focus sessions, leave the phone in another room or a bag, with Do Not Disturb on.',
    },
  },
  {
    icon: 'shuffle',
    title: { zh: '单任务 + 批量处理消息', en: 'Single-task and batch messages' },
    evidence: 'strong',
    why: {
      zh: '每次切换任务都有"切换代价"，而且上一个任务的"注意力残留"会持续拖累下一个任务。频繁查看消息等于不停地付这笔税。',
      en: 'Every task switch carries a switch cost, and "attention residue" from the previous task keeps dragging on the next. Constant message-checking means paying that tax all day.',
    },
    how: {
      zh: '固定时间处理消息（例如每 60–90 分钟一次）；专注时只保留当前任务需要的窗口。',
      en: 'Check messages at set times (e.g. every 60–90 minutes); keep only the windows the current task needs.',
    },
  },
  {
    icon: 'wind',
    title: { zh: '每天 10 分钟正念', en: '10 minutes of mindfulness a day' },
    evidence: 'moderate',
    why: {
      zh: '一项随机对照研究中，两周正念训练减少了走神，并提升了工作记忆和 GRE 阅读成绩。正念训练的是"发现走神并回来"——日常专注最核心的技能。',
      en: 'In a randomized trial, two weeks of mindfulness training reduced mind-wandering and improved working memory and GRE reading scores. It trains noticing drift and coming back — the core everyday focus skill.',
    },
    how: {
      zh: '每天做一次数息练习（本应用内置），并逐步从 5 分钟延长到 10–15 分钟。',
      en: 'Do a daily breath-counting session (built in), gradually extending from 5 to 10–15 minutes.',
    },
  },
  {
    icon: 'run',
    title: { zh: '在深度工作前动一动', en: 'Move before deep work' },
    evidence: 'moderate',
    why: {
      zh: '元分析显示，一次中等强度的有氧运动后，执行功能和注意力会有小幅但可靠的短时提升；长期规律运动与更好的执行功能相关。',
      en: 'Meta-analyses show small but reliable short-term boosts to executive function after a bout of moderate aerobic exercise; regular exercise is linked to better executive function over time.',
    },
    how: {
      zh: '在最重要的工作前快走或骑车 10–20 分钟。',
      en: 'Walk briskly or cycle for 10–20 minutes before your most important work block.',
    },
  },
  {
    icon: 'target',
    title: { zh: '开始前写下具体意图', en: 'Write a concrete intention first' },
    evidence: 'strong',
    why: {
      zh: '"如果……就……"式的执行意图对目标达成有中到大的效果。具体可检验的目标让大脑知道什么是"相关"、什么是"干扰"。',
      en: '"If–then" implementation intentions have medium-to-large effects on goal attainment. A concrete, checkable goal tells your brain what is relevant and what is noise.',
    },
    how: {
      zh: '每次专注时段开始前写一句：要完成什么？如果想刷手机，我就……',
      en: 'Before each focus session write one line: what will be done? If I want to check my phone, I will…',
    },
  },
  {
    icon: 'pencil',
    title: { zh: '把干扰"停车"', en: 'Park distractions' },
    evidence: 'moderate',
    why: {
      zh: '研究发现，被打断时先快速记下"回来后要做什么"，可以显著减少注意力残留。同理，把突然冒出的念头写下来，大脑就不必一直惦记它。',
      en: 'Research shows that jotting a quick "ready-to-resume" plan when interrupted reduces attention residue. Likewise, writing down an intrusive thought lets your brain stop holding on to it.',
    },
    how: {
      zh: '专注时段里按 D 键记录干扰，然后立刻回到任务；结束后统一处理。',
      en: 'In a focus session press D to log a distraction and return immediately; deal with the list afterwards.',
    },
  },
  {
    icon: 'leaf',
    title: { zh: '休息时远离屏幕', en: 'Take screen-free breaks' },
    evidence: 'mixed',
    why: {
      zh: '注意力恢复理论认为，自然环境能让定向注意得到休息；部分研究发现散步于自然环境后注意力测验成绩提升，但并非所有研究都能复现。刷手机式的休息则几乎肯定无法恢复注意力。',
      en: 'Attention Restoration Theory proposes that nature rests directed attention; some studies found better attention after a nature walk, though not all replicate. Phone-scrolling breaks almost certainly don’t restore anything.',
    },
    how: {
      zh: '每 25–50 分钟休息 5 分钟：站起来、看远处、喝水、走到窗边或户外。',
      en: 'Every 25–50 minutes take 5: stand, look into the distance, drink water, get to a window or outside.',
    },
  },
  {
    icon: 'coffee',
    title: { zh: '聪明地用咖啡因', en: 'Use caffeine wisely' },
    evidence: 'moderate',
    why: {
      zh: '咖啡因能提升警觉，但睡前 6 小时摄入仍会让睡眠减少一个多小时——第二天专注力的损失可能超过咖啡带来的收益。',
      en: 'Caffeine boosts alertness, but even 6 hours before bed it can cut sleep by over an hour — next-day focus losses may outweigh the gains.',
    },
    how: {
      zh: '设置一个咖啡因截止时间（睡前至少 8 小时）。用打卡数据看咖啡因对你是否真的有帮助。',
      en: 'Set a caffeine cut-off at least 8 hours before bed. Use your check-ins to see if it really helps you.',
    },
  },
  {
    icon: 'sun',
    title: { zh: '在你的黄金时段做最难的事', en: 'Do hard things in your peak window' },
    evidence: 'moderate',
    why: {
      zh: '认知表现随昼夜节律起伏，而且因人而异（"早鸟"与"夜猫子"）。在自己的高峰时段做深度工作，事半功倍。',
      en: 'Cognitive performance rises and falls with your circadian rhythm, which differs between people (larks vs owls). Deep work in your own peak window pays double.',
    },
    how: {
      zh: '在不同时段训练一周后，查看"进展"页的时段分析，找到你的黄金时段。',
      en: 'Train at different times for a week, then check the time-of-day analysis on the Progress page.',
    },
  },
  {
    icon: 'volume',
    title: { zh: '管理声音环境', en: 'Manage your sound environment' },
    evidence: 'mixed',
    why: {
      zh: '可理解的人声最容易打断思考。稳定的背景噪音（如棕噪音）可以掩盖人声，对部分人有帮助，对另一些人则是干扰。',
      en: 'Intelligible speech is the most disruptive sound. Steady background noise (e.g. brown noise) can mask it and helps some people while distracting others.',
    },
    how: {
      zh: '在专注时段里分别试试安静和棕噪音，比较结束后的专注自评。',
      en: 'Try silence vs brown noise across focus sessions and compare your end-of-session focus ratings.',
    },
  },
  {
    icon: 'trophy',
    title: { zh: '循序渐进延长专注时长', en: 'Extend focus gradually' },
    evidence: 'practice',
    why: {
      zh: '像练耐力一样练专注：从能稳定完成的时长开始，成功后再小幅延长，比一开始就硬撑 2 小时更可持续。',
      en: 'Train focus like endurance: start with a duration you can reliably complete, then extend slightly after successes — more sustainable than forcing 2-hour marathons.',
    },
    how: {
      zh: '从 25 分钟开始；连续 3 次完成且自评 ≥4 分后，延长 5–10 分钟，逐步走向 50–90 分钟。',
      en: 'Start at 25 minutes; after 3 completed sessions rated ≥4, add 5–10 minutes, working toward 50–90.',
    },
  },
];

export const TOOLKIT: { icon: string; title: Bi; body: Bi }[] = [
  {
    icon: 'eye',
    title: { zh: '觉察 · 命名 · 回来', en: 'Notice · Name · Return' },
    body: {
      zh: '发现走神时，不批评自己，只在心里轻轻说一声"想事情了"，然后回到任务。每一次回来都是一次训练——这就是数息练习在真实工作中的用法。',
      en: 'When you notice drifting, don’t judge — just label it "thinking" and return. Every return is a rep. This is breath counting applied to real work.',
    },
  },
  {
    icon: 'wind',
    title: { zh: '生理性叹息', en: 'Physiological sigh' },
    body: {
      zh: '用鼻子吸气，再补吸一小口，然后用嘴长长地呼气。重复 1–5 分钟。研究显示每天练习这种呼吸能改善情绪、降低焦虑，适合在紧张或烦躁时快速调整。',
      en: 'Inhale through the nose, top up with a second short inhale, then exhale slowly through the mouth. Repeat for 1–5 minutes. Daily practice has been shown to improve mood and reduce anxiety — useful when tense or restless.',
    },
  },
  {
    icon: 'pencil',
    title: { zh: '写下来，再回来', en: 'Write it down, then return' },
    body: {
      zh: '突然想起要回的消息、要买的东西？写进停车场（专注时段中按 D），大脑就能放下它。',
      en: 'Suddenly remembered a message to send or something to buy? Put it in the parking lot (press D during a focus session) so your mind can let go.',
    },
  },
  {
    icon: 'target',
    title: { zh: '缩小到下一步', en: 'Shrink to the next step' },
    body: {
      zh: '卡住时注意力最容易逃跑。把任务缩小到"接下来 2 分钟要做的具体动作"，例如"打开文档写下第一句话"。',
      en: 'Attention escapes most when you’re stuck. Shrink the task to the next physical 2-minute action, like "open the doc and write the first sentence".',
    },
  },
  {
    icon: 'monitor',
    title: { zh: '20-20-20 护眼', en: '20-20-20 for your eyes' },
    body: {
      zh: '每 20 分钟看 20 英尺（约 6 米）外的东西 20 秒，缓解视疲劳，也是一次微型注意力复位。',
      en: 'Every 20 minutes look at something 20 feet (~6 m) away for 20 seconds. It eases eye strain and doubles as a micro-reset for attention.',
    },
  },
];

export interface Ref {
  cite: string;
  title: string;
}

export const REFERENCES: Ref[] = [
  { cite: 'Posner, M. I., & Petersen, S. E. (1990). Annual Review of Neuroscience, 13, 25–42.', title: 'The attention system of the human brain' },
  { cite: 'Dinges, D. F., & Powell, J. W. (1985). Behavior Research Methods, Instruments, & Computers, 17(6), 652–655.', title: 'Microcomputer analyses of performance on a portable, simple visual RT task during sustained operations' },
  { cite: 'Basner, M., Mollicone, D., & Dinges, D. F. (2011). Acta Astronautica, 69, 949–959.', title: 'Validity and sensitivity of a brief psychomotor vigilance test (PVT-B) to total and partial sleep deprivation' },
  { cite: 'Robertson, I. H., Manly, T., Andrade, J., Baddeley, B. T., & Yiend, J. (1997). Neuropsychologia, 35(6), 747–758.', title: "'Oops!': Performance correlates of everyday attentional failures in traumatic brain injured and normal subjects" },
  { cite: 'Esterman, M., Noonan, S. K., Rosenberg, M., & DeGutis, J. (2013). Cerebral Cortex, 23(11), 2712–2723.', title: 'In the zone or zoning out? Tracking behavioral and neural fluctuations during sustained attention' },
  { cite: 'Eriksen, B. A., & Eriksen, C. W. (1974). Perception & Psychophysics, 16(1), 143–149.', title: 'Effects of noise letters upon the identification of a target letter in a nonsearch task' },
  { cite: 'Stroop, J. R. (1935). Journal of Experimental Psychology, 18(6), 643–662.', title: 'Studies of interference in serial verbal reactions' },
  { cite: 'Monsell, S. (2003). Trends in Cognitive Sciences, 7(3), 134–140.', title: 'Task switching' },
  { cite: 'Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J. (2008). PNAS, 105(19), 6829–6833.', title: 'Improving fluid intelligence with training on working memory' },
  { cite: 'Melby-Lervåg, M., & Hulme, C. (2013). Developmental Psychology, 49(2), 270–291.', title: 'Is working memory training effective? A meta-analytic review' },
  { cite: 'Simons, D. J., et al. (2016). Psychological Science in the Public Interest, 17(3), 103–186.', title: 'Do "brain-training" programs work?' },
  { cite: 'Pylyshyn, Z. W., & Storm, R. W. (1988). Spatial Vision, 3(3), 179–197.', title: 'Tracking multiple independent targets: Evidence for a parallel tracking mechanism' },
  { cite: 'Levinson, D. B., Stoll, E. L., Kindy, S. D., Merry, H. L., & Davidson, R. J. (2014). Frontiers in Psychology, 5, 1202.', title: 'A mind you can count on: validating breath counting as a behavioral measure of mindfulness' },
  { cite: 'Mrazek, M. D., Franklin, M. S., Phillips, D. T., Baird, B., & Schooler, J. W. (2013). Psychological Science, 24(5), 776–781.', title: 'Mindfulness training improves working memory capacity and GRE performance while reducing mind wandering' },
  { cite: 'Killingsworth, M. A., & Gilbert, D. T. (2010). Science, 330(6006), 932.', title: 'A wandering mind is an unhappy mind' },
  { cite: 'Van Dongen, H. P. A., Maislin, G., Mullington, J. M., & Dinges, D. F. (2003). Sleep, 26(2), 117–126.', title: 'The cumulative cost of additional wakefulness' },
  { cite: 'Ward, A. F., Duke, K., Gneezy, A., & Bos, M. W. (2017). Journal of the Association for Consumer Research, 2(2), 140–154.', title: "Brain drain: The mere presence of one's own smartphone reduces available cognitive capacity" },
  { cite: 'Leroy, S. (2009). Organizational Behavior and Human Decision Processes, 109(2), 168–181.', title: 'Why is it so hard to do my work? The challenge of attention residue when switching between work tasks' },
  { cite: 'Leroy, S., & Glomb, T. M. (2018). Organization Science, 29(3), 380–397.', title: 'Tasks interrupted: How anticipating time pressure on resumption of an interrupted task causes attention residue and low performance' },
  { cite: 'Gollwitzer, P. M., & Sheeran, P. (2006). Advances in Experimental Social Psychology, 38, 69–119.', title: 'Implementation intentions and goal achievement: A meta-analysis of effects and processes' },
  { cite: 'Chang, Y. K., Labban, J. D., Gapin, J. I., & Etnier, J. L. (2012). Brain Research, 1453, 87–101.', title: 'The effects of acute exercise on cognitive performance: a meta-analysis' },
  { cite: 'Berman, M. G., Jonides, J., & Kaplan, S. (2008). Psychological Science, 19(12), 1207–1212.', title: 'The cognitive benefits of interacting with nature' },
  { cite: 'Drake, C., Roehrs, T., Shambroom, J., & Roth, T. (2013). Journal of Clinical Sleep Medicine, 9(11), 1195–1200.', title: 'Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed' },
  { cite: 'Balban, M. Y., et al. (2023). Cell Reports Medicine, 4(1), 100895.', title: 'Brief structured respiration practices enhance mood and reduce physiological arousal' },
  { cite: 'Ophir, E., Nass, C., & Wagner, A. D. (2009). PNAS, 106(37), 15583–15587.', title: 'Cognitive control in media multitaskers' },
  { cite: 'Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). Psychological Review, 100(3), 363–406.', title: 'The role of deliberate practice in the acquisition of expert performance' },
];

export const scholar = (title: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${title}"`)}`;
