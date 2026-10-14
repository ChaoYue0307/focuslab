import type { Bi } from '../lib/i18n';
import { NORMS } from '../lib/scoring';
import type { TaskId } from '../lib/types';

export interface Tip {
  tone: 'good' | 'warn' | 'info';
  text: Bi;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Plain-language interpretation of a session plus a concrete strategy to try next time. */
export function interpret(task: TaskId, m: Record<string, number>): Tip[] {
  const out: Tip[] = [];
  const add = (tone: Tip['tone'], zh: string, en: string) => out.push({ tone, text: { zh, en } });

  switch (task) {
    case 'pvt':
      if (m.lapses >= 3)
        add('warn', `本次有 ${m.lapses} 次走神失误（≥500ms）。这通常意味着睡眠不足或疲劳——今天适合先处理轻量任务，或小睡 10–20 分钟。`, `${m.lapses} lapses (≥500 ms) this time. That usually signals sleep debt or fatigue — consider lighter work first, or a 10–20 minute nap.`);
      else if (m.medianRT > 0 && m.medianRT < 290 && m.lapses <= 1)
        add('good', '反应快且稳定：你此刻处于很好的警觉状态。把最难的工作安排在接下来的 1–2 小时。', 'Fast and stable: you are highly alert right now. Put your hardest work in the next 1–2 hours.');
      else add('info', '把 PVT 当作每日"状态体温计"。持续记录几天后，你会看到睡眠和时段如何影响它。', 'Treat the PVT as a daily state thermometer. After a few days you will see how sleep and time of day move it.');
      if (m.falseStarts >= 3) add('info', `抢跑 ${m.falseStarts} 次：你在预判刺激。放松等待，看到再按。`, `${m.falseStarts} false starts: you are anticipating. Relax and respond only when you see it.`);
      break;
    case 'sart':
      if (m.commissionRate > 0.5)
        add('warn', `有 ${pct(m.commissionRate)} 的 3 你没刹住——典型的"自动驾驶"。策略：每个数字出现时在心里轻轻念出它，让每一次按键都是有意识的决定。`, `You pressed on ${pct(m.commissionRate)} of the 3s — classic autopilot. Strategy: silently name each digit as it appears so every press is a conscious decision.`);
      else if (m.commissionRate <= 0.2) add('good', `只错按了 ${pct(m.commissionRate)} 的 3，抑制控制非常出色。`, `Only ${pct(m.commissionRate)} commission errors — excellent inhibitory control.`);
      if (m.meanRT > 0 && m.meanRT < 320 && m.commissionRate > 0.35)
        add('info', '你按得很快，但错误也多：这是速度换准确。稍微放慢节奏，错误通常会明显减少。', 'You are fast but error-prone — a speed–accuracy trade-off. Slowing down slightly usually cuts errors sharply.');
      if (m.rtCV > 0.3)
        add('info', `反应时波动较大（${m.rtCV.toFixed(2)}），说明注意力时进时出。目标是让每一次反应的节奏都一样。`, `Your response timing is variable (${m.rtCV.toFixed(2)}), a sign of attention drifting in and out. Aim for the same rhythm every trial.`);
      break;
    case 'flanker':
    case 'stroop': {
      const cap = NORMS[task].costMax;
      if (m.accuracy < 0.85) add('warn', `正确率 ${pct(m.accuracy)} 偏低。先求准、再求快——准确的习惯会自动带来速度。`, `Accuracy was ${pct(m.accuracy)}. Get accurate first; speed follows good habits.`);
      if (m.interference > cap * 0.6)
        add('info', task === 'flanker' ? `冲突代价 ${m.interference}ms 较大：两侧干扰对你影响明显。试着把注意力"收窄"到正中间，像聚光灯一样。` : `干扰代价 ${m.interference}ms 较大：读字的冲动很强。试着把视线落在字的边缘，只关注颜色。`, task === 'flanker' ? `A ${m.interference} ms conflict cost is large: the flankers pull at you. Narrow your attention to the center like a spotlight.` : `A ${m.interference} ms interference cost is large: the urge to read is strong. Rest your gaze on the edge of the word and attend only to color.`);
      else if (m.accuracy >= 0.9) add('good', '干扰控制良好，继续保持。系统会自动缩短反应窗口来增加挑战。', 'Good interference control. The response window will shrink automatically to keep it challenging.');
      if (m.timeouts >= 4) add('info', `有 ${m.timeouts} 次超时。如果持续发生，系统会自动降低难度。`, `${m.timeouts} timeouts. If this keeps happening, difficulty will drop automatically.`);
      break;
    }
    case 'switch':
      if (m.switchCost > 250)
        add('info', `切换代价 ${m.switchCost}ms：大脑每次换规则都要"重新加载"。这正是频繁切换任务（看消息、切窗口）让你变慢的原因。`, `A ${m.switchCost} ms switch cost: your brain "reloads" every time the rule changes. This is exactly why checking messages and switching windows slows you down.`);
      else if (m.switchCost < 120 && m.accuracy >= 0.9) add('good', '切换代价很小，规则切换流畅。', 'Very small switch cost — smooth rule switching.');
      if (m.accSwitch < m.accRepeat - 0.08)
        add('warn', '切换试次更容易出错。看到提示时，先在心里说出规则（"奇偶"或"大小"），再看数字。', 'You make more errors on switch trials. When the cue appears, say the rule to yourself ("odd/even" or "low/high") before the digit arrives.');
      break;
    case 'nback':
      if (m.maxN > 0 && m.accuracy >= 0.8) add('good', `最高达到 ${m.maxN}-back。保持在"有点难"的区间是最有效的训练。`, `You reached ${m.maxN}-back. Staying at "slightly too hard" is where training works.`);
      if (m.falseAlarmRate > 0.2) add('info', '误按较多。没有把握时宁可不按——漏按的代价和误按一样。', 'Many false alarms. When unsure, don’t press — a miss costs the same as a false alarm.');
      if (m.accuracy < 0.65) add('info', '这个难度对你还偏高，这完全正常。策略：在心里默念最近 N 个位置/字母，像一个滚动的队列。', 'This level is still hard for you — that is normal. Strategy: rehearse the last N items silently like a rolling queue.');
      break;
    case 'mot':
      if (m.accuracy < 0.7)
        add('info', '策略：不要逐个盯目标，而是把它们想象成一个会变形的多边形"整体"来追踪；眼睛可以停在中心。', 'Strategy: don’t chase targets one by one — track them as the corners of one shape-shifting polygon, eyes resting near the center.');
      else add('good', `追踪容量约 ${m.capacity.toFixed(1)} 个目标。难度会随着全对的轮次自动提升。`, `Tracking capacity ≈ ${m.capacity.toFixed(1)} objects. Difficulty rises after each perfect round.`);
      break;
    case 'schulte':
      if (m.spi < 1.0) add('good', `每格仅 ${m.spi.toFixed(2)} 秒，非常快。表现稳定后会自动升级到更大的方格。`, `Only ${m.spi.toFixed(2)} s per cell — very fast. You will move to a larger grid once it is consistent.`);
      if (m.errors > 4) add('info', `点错 ${m.errors} 次。速度来自稳定的扫视，而不是猜测。`, `${m.errors} mis-clicks. Speed comes from steady scanning, not guessing.`);
      add('info', '试着把视线固定在中心红点，用余光寻找数字——这会逐步扩大你的有效注意视野。', 'Try fixing your gaze on the red center dot and finding numbers peripherally — this gradually widens your useful field of view.');
      break;
    case 'breath':
      if (m.correct + m.miscounts === 0)
        add('warn', '没有完成完整的 9 次循环。记得在第 9 次呼气时按回车（或右侧区域）。', 'No complete 9-breath cycles were recorded. Remember to press Enter (or the right side) on the 9th breath.');
      else if (m.accuracy >= 0.85) add('good', `计数准确率 ${pct(m.accuracy)}：注意力非常稳定地停留在呼吸上。`, `${pct(m.accuracy)} count accuracy: your attention stayed with the breath very steadily.`);
      else add('info', `准确率 ${pct(m.accuracy)}。数错并不是失败——每次你发现并回到呼吸，都是在锻炼"觉察肌肉"。`, `${pct(m.accuracy)} accuracy. Miscounts aren’t failure — each time you notice and return, you train the awareness muscle.`);
      if (m.resets >= 1) add('good', `你主动发现了 ${m.resets} 次走神并重置。这正是日常专注最需要的能力。`, `You caught yourself drifting ${m.resets} time(s) and reset. That is exactly the skill everyday focus needs.`);
      if (m.bpm > 20) add('info', `按键频率 ${m.bpm.toFixed(0)} 次/分偏快。确保每次按键对应一次真实、自然的呼气。`, `${m.bpm.toFixed(0)} presses/min is fast. Make sure each press matches a real, natural out-breath.`);
      break;
  }
  return out;
}
