import type { Bi, Vars } from '../lib/i18n';
import { NORMS } from '../lib/scoring';
import type { TaskId } from '../lib/types';

export interface Tip {
  tone: 'good' | 'warn' | 'info';
  text: Bi;
  vars?: Vars;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Plain-language interpretation of a session plus a concrete strategy to try next time. */
export function interpret(task: TaskId, m: Record<string, number>): Tip[] {
  const out: Tip[] = [];
  const add = (tone: Tip['tone'], text: Bi, vars?: Vars) => out.push({ tone, text, vars });

  switch (task) {
    case 'pvt':
      if (m.lapses >= 3)
        add(
          'warn',
          { zh: '本次有 {n} 次走神失误（≥500ms）。这通常意味着睡眠不足或疲劳——今天适合先处理轻量任务，或小睡 10–20 分钟。', en: '{n} lapses (≥500 ms) this time. That usually signals sleep debt or fatigue — consider lighter work first, or a 10–20 minute nap.' },
          { n: m.lapses },
        );
      else if (m.medianRT > 0 && m.medianRT < 290 && m.lapses <= 1)
        add('good', { zh: '反应快且稳定：你此刻处于很好的警觉状态。把最难的工作安排在接下来的 1–2 小时。', en: 'Fast and stable: you are highly alert right now. Put your hardest work in the next 1–2 hours.' });
      else add('info', { zh: '把 PVT 当作每日"状态体温计"。持续记录几天后，你会看到睡眠和时段如何影响它。', en: 'Treat the PVT as a daily state thermometer. After a few days you will see how sleep and time of day move it.' });
      if (m.falseStarts >= 3) add('info', { zh: '抢跑 {n} 次：你在预判刺激。放松等待，看到再按。', en: '{n} false starts: you are anticipating. Relax and respond only when you see it.' }, { n: m.falseStarts });
      break;
    case 'sart':
      if (m.commissionRate > 0.5)
        add(
          'warn',
          { zh: '有 {p} 的 3 你没刹住——典型的"自动驾驶"。策略：每个数字出现时在心里轻轻念出它，让每一次按键都是有意识的决定。', en: 'You pressed on {p} of the 3s — classic autopilot. Strategy: silently name each digit as it appears so every press is a conscious decision.' },
          { p: pct(m.commissionRate) },
        );
      else if (m.commissionRate <= 0.2) add('good', { zh: '只错按了 {p} 的 3，抑制控制非常出色。', en: 'Only {p} commission errors — excellent inhibitory control.' }, { p: pct(m.commissionRate) });
      if (m.meanRT > 0 && m.meanRT < 320 && m.commissionRate > 0.35)
        add('info', { zh: '你按得很快，但错误也多：这是速度换准确。稍微放慢节奏，错误通常会明显减少。', en: 'You are fast but error-prone — a speed–accuracy trade-off. Slowing down slightly usually cuts errors sharply.' });
      if (m.rtCV > 0.3)
        add(
          'info',
          { zh: '反应时波动较大（{cv}），说明注意力时进时出。目标是让每一次反应的节奏都一样。', en: 'Your response timing is variable ({cv}), a sign of attention drifting in and out. Aim for the same rhythm every trial.' },
          { cv: m.rtCV.toFixed(2) },
        );
      break;
    case 'flanker':
    case 'stroop': {
      const cap = NORMS[task].costMax;
      if (m.accuracy < 0.85) add('warn', { zh: '正确率 {p} 偏低。先求准、再求快——准确的习惯会自动带来速度。', en: 'Accuracy was {p}. Get accurate first; speed follows good habits.' }, { p: pct(m.accuracy) });
      if (m.interference > cap * 0.6)
        add(
          'info',
          task === 'flanker'
            ? { zh: '冲突代价 {ms}ms 较大：两侧干扰对你影响明显。试着把注意力"收窄"到正中间，像聚光灯一样。', en: 'A {ms} ms conflict cost is large: the flankers pull at you. Narrow your attention to the center like a spotlight.' }
            : { zh: '干扰代价 {ms}ms 较大：读字的冲动很强。试着把视线落在字的边缘，只关注颜色。', en: 'A {ms} ms interference cost is large: the urge to read is strong. Rest your gaze on the edge of the word and attend only to color.' },
          { ms: m.interference },
        );
      else if (m.accuracy >= 0.9) add('good', { zh: '干扰控制良好，继续保持。系统会自动缩短反应窗口来增加挑战。', en: 'Good interference control. The response window will shrink automatically to keep it challenging.' });
      if (m.timeouts >= 4) add('info', { zh: '有 {n} 次超时。如果持续发生，系统会自动降低难度。', en: '{n} timeouts. If this keeps happening, difficulty will drop automatically.' }, { n: m.timeouts });
      break;
    }
    case 'switch':
      if (m.switchCost > 250)
        add(
          'info',
          { zh: '切换代价 {ms}ms：大脑每次换规则都要"重新加载"。这正是频繁切换任务（看消息、切窗口）让你变慢的原因。', en: 'A {ms} ms switch cost: your brain "reloads" every time the rule changes. This is exactly why checking messages and switching windows slows you down.' },
          { ms: m.switchCost },
        );
      else if (m.switchCost < 120 && m.accuracy >= 0.9) add('good', { zh: '切换代价很小，规则切换流畅。', en: 'Very small switch cost — smooth rule switching.' });
      if (m.accSwitch < m.accRepeat - 0.08)
        add('warn', { zh: '切换试次更容易出错。看到提示时，先在心里说出规则（"奇偶"或"大小"），再看数字。', en: 'You make more errors on switch trials. When the cue appears, say the rule to yourself ("odd/even" or "low/high") before the digit arrives.' });
      break;
    case 'nback':
      if (m.maxN > 0 && m.accuracy >= 0.8) add('good', { zh: '最高达到 {n}-back。保持在"有点难"的区间是最有效的训练。', en: 'You reached {n}-back. Staying at "slightly too hard" is where training works.' }, { n: m.maxN });
      if (m.falseAlarmRate > 0.2) add('info', { zh: '误按较多。没有把握时宁可不按——漏按的代价和误按一样。', en: 'Many false alarms. When unsure, don’t press — a miss costs the same as a false alarm.' });
      if (m.accuracy < 0.65) add('info', { zh: '这个难度对你还偏高，这完全正常。策略：在心里默念最近 N 个位置/字母，像一个滚动的队列。', en: 'This level is still hard for you — that is normal. Strategy: rehearse the last N items silently like a rolling queue.' });
      break;
    case 'mot':
      if (m.accuracy < 0.7)
        add('info', { zh: '策略：不要逐个盯目标，而是把它们想象成一个会变形的多边形"整体"来追踪；眼睛可以停在中心。', en: 'Strategy: don’t chase targets one by one — track them as the corners of one shape-shifting polygon, eyes resting near the center.' });
      else add('good', { zh: '追踪容量约 {c} 个目标。难度会随着全对的轮次自动提升。', en: 'Tracking capacity ≈ {c} objects. Difficulty rises after each perfect round.' }, { c: m.capacity.toFixed(1) });
      break;
    case 'schulte':
      if (m.spi < 1.0) add('good', { zh: '每格仅 {s} 秒，非常快。表现稳定后会自动升级到更大的方格。', en: 'Only {s} s per cell — very fast. You will move to a larger grid once it is consistent.' }, { s: m.spi.toFixed(2) });
      if (m.errors > 4) add('info', { zh: '点错 {n} 次。速度来自稳定的扫视，而不是猜测。', en: '{n} mis-clicks. Speed comes from steady scanning, not guessing.' }, { n: m.errors });
      add('info', { zh: '试着把视线固定在中心红点，用余光寻找数字——这会逐步扩大你的有效注意视野。', en: 'Try fixing your gaze on the red center dot and finding numbers peripherally — this gradually widens your useful field of view.' });
      break;
    case 'breath':
      if (m.correct + m.miscounts === 0)
        add('warn', { zh: '没有完成完整的 9 次循环。记得在第 9 次呼气时按回车（或右侧区域）。', en: 'No complete 9-breath cycles were recorded. Remember to press Enter (or the right side) on the 9th breath.' });
      else if (m.accuracy >= 0.85) add('good', { zh: '计数准确率 {p}：注意力非常稳定地停留在呼吸上。', en: '{p} count accuracy: your attention stayed with the breath very steadily.' }, { p: pct(m.accuracy) });
      else add('info', { zh: '准确率 {p}。数错并不是失败——每次你发现并回到呼吸，都是在锻炼"觉察肌肉"。', en: '{p} accuracy. Miscounts aren’t failure — each time you notice and return, you train the awareness muscle.' }, { p: pct(m.accuracy) });
      if (m.resets >= 1) add('good', { zh: '你主动发现了 {n} 次走神并重置。这正是日常专注最需要的能力。', en: 'You caught yourself drifting {n} time(s) and reset. That is exactly the skill everyday focus needs.' }, { n: m.resets });
      if (m.bpm > 30)
        add(
          'warn',
          { zh: '按键频率 {n} 次/分远超正常呼吸（约 6–20 次/分），本次分数已相应降低。每次按键应对应一次真实的呼气。', en: '{n} presses/min is far above natural breathing (~6–20/min), so this score was reduced. Each press should match a real out-breath.' },
          { n: m.bpm.toFixed(0) },
        );
      else if (m.bpm > 20) add('info', { zh: '按键频率 {n} 次/分偏快。确保每次按键对应一次真实、自然的呼气。', en: '{n} presses/min is fast. Make sure each press matches a real, natural out-breath.' }, { n: m.bpm.toFixed(0) });
      break;
  }
  return out;
}
