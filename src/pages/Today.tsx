import { useMemo, useState } from 'react';
import { CheckInModal } from '../components/CheckIn';
import { ExperimentToday } from '../components/Experiment';
import { Icon } from '../components/Icon';
import { LanguagePicker, ScoreRing } from '../components/ui';
import { HABITS, EVIDENCE_LABEL } from '../content/learn';
import { baselineScores, dailyPlan, domainScores, firstActivityDay, focusIndex, focusMsOn, planMinutes, streak } from '../lib/analytics';
import { downloadBackup } from '../lib/backup';
import { addDays, dayKey, daysBetween, fmtMinutes } from '../lib/date';
import { bi, useT, type T } from '../lib/i18n';
import { activeExperiment, allInsights, readiness, reviewDue, type Readiness } from '../lib/personal';
import { navigate } from '../lib/router';
import { hashString } from '../lib/stats';
import { update, useData } from '../lib/store';
import type { AppData } from '../lib/types';
import { DOMAINS, domainMeta, taskMeta } from '../tasks/registry';

export default function Today() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const [checkin, setCheckin] = useState(false);
  const today = dayKey();
  const plan = useMemo(() => dailyPlan(data, today), [data, today]);
  const doneToday = new Set(data.results.filter((r) => r.date === today && r.mode === 'training').map((r) => r.task));
  const doneCount = plan.filter((p) => doneToday.has(p.task)).length;
  const scores = useMemo(() => domainScores(data.results), [data.results]);
  const base = useMemo(() => baselineScores(data.results), [data.results]);
  const fi = focusIndex(scores);
  const fiBase = focusIndex(base);
  const st = streak(data);
  const todayCheck = data.checkins.find((c) => c.date === today);
  const focusMs = focusMsOn(data.sessions, today);
  const goalMs = data.settings.dailyFocusGoalMin * 60000;
  const insight = useMemo(() => allInsights(data)[0], [data]);
  const ready = useMemo(() => readiness(data, today), [data, today]);
  const exp = activeExperiment(data);
  const firstDay = firstActivityDay(data);
  const week = firstDay ? Math.floor(daysBetween(firstDay, today) / 7) + 1 : null;
  const habit = HABITS[hashString(today) % HABITS.length];
  const hour = new Date().getHours();
  const greet = hour < 5 ? t('夜深了', 'Late night') : hour < 12 ? t('早上好', 'Good morning') : hour < 18 ? t('下午好', 'Good afternoon') : t('晚上好', 'Good evening');
  const minutes = planMinutes(plan, data.settings.breathMin);
  const allDone = doneCount === plan.length;
  const hasAssessment = data.results.some((r) => r.mode === 'assessment');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greet}</h1>
          <p>{new Date().toLocaleDateString(t.locale, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="row">
          {week !== null && week <= 8 && (
            <span className="chip" title={t('推荐方案：8 周，每 2 周复测', 'Recommended program: 8 weeks, retest every 2 weeks')}>
              {t('第 {w} / 8 周', 'Week {w} / 8', { w: week })}
            </span>
          )}
          <span className="chip" title={t('最长 {n} 天', 'Best {n} days', { n: st.best })}>
            <Icon name="flame" size={14} style={{ color: 'var(--d2)' }} />
            {t('连续 {n} 天', '{n}-day streak', { n: st.current })}
          </span>
          <LanguagePicker compact className="mobile-only" />
          <a className="icon-btn" href="#/settings" aria-label={t('设置', 'Settings')}>
            <Icon name="settings" />
          </a>
        </div>
      </div>

      <ReadinessCard r={ready} t={t} hasCheckin={!!todayCheck} onCheckin={() => setCheckin(true)} />
      <DueCards data={data} t={t} />

      <div className="grid grid-main">
        {/* Plan */}
        <div className="card pad-lg">
          <div className="card-head">
            <div>
              <h2>{t('今日训练', 'Today’s training')}</h2>
              <div className="card-sub">
                {t('约 {m} 分钟 · 已完成 {d}/{n}', '~{m} min · {d} of {n} done', { m: Math.round(minutes), d: doneCount, n: plan.length })}
              </div>
            </div>
            <div className="meter" style={{ width: 90 }}>
              <div style={{ width: `${(doneCount / plan.length) * 100}%` }} />
            </div>
          </div>
          <div className="stack sm">
            {plan.map((p, i) => {
              const m = taskMeta(p.task);
              const d = domainMeta(m.domain);
              const done = doneToday.has(p.task);
              const lvl = data.levels[p.task];
              return (
                <button key={i} className={`plan-item ${done ? 'done' : ''}`} onClick={() => navigate(`/run/${p.task}?back=/`)} type="button">
                  <span className="plan-check">{done && <Icon name="check" size={14} stroke={3} />}</span>
                  <span className="icon-tile" style={{ ['--tile' as string]: d.color }}>
                    <Icon name={m.icon} size={19} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 650 }}>{bi(m.name, lang)}</span>
                    <span className="small muted">
                      {p.role === 'warmup' ? t('状态检测', 'State check') : p.role === 'cooldown' ? t('收尾 · 正念', 'Cool-down · mindfulness') : bi(d.name, lang)}
                      {lvl && m.maxLevel > 1 ? ` · ${m.levelLabel(lvl, lang)}` : ''}
                    </span>
                  </span>
                  <span className="small muted tabnum">{p.task === 'breath' ? data.settings.breathMin : m.minutes}′</span>
                </button>
              );
            })}
          </div>
          <button className="btn primary lg block" style={{ marginTop: 18 }} onClick={() => navigate('/plan')} type="button">
            <Icon name="play" size={16} />
            {allDone ? t('再练一轮', 'Train another round') : doneCount ? t('继续今日训练', 'Continue session') : t('开始今日训练', 'Start today’s session')}
          </button>
        </div>

        {/* Focus index */}
        <div className="stack">
          <div className="card pad-lg">
            <div className="card-head">
              <h2>{t('专注指数', 'Focus Index')}</h2>
              <a href="#/progress" className="small">
                {t('详情', 'Details')} →
              </a>
            </div>
            <div className="row" style={{ gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <ScoreRing value={fi} size={124} stroke={11}>
                <div>
                  <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{fi ?? '—'}</div>
                  {fi !== null && fiBase !== null && fi !== fiBase && firstDay && data.results.some((r) => r.date > addDays(firstDay, 6)) && (
                    <div className={`delta ${fi > fiBase ? 'up' : 'down'}`} style={{ marginTop: 4 }}>
                      {fi > fiBase ? '▲' : '▼'} {Math.abs(fi - fiBase)} {t('较基线', 'vs base')}
                    </div>
                  )}
                </div>
              </ScoreRing>
              <div className="grow stack sm" style={{ gap: 7, minWidth: 150 }}>
                {DOMAINS.map((d) => (
                  <div key={d.id} className="row" style={{ gap: 8 }}>
                    <span className="dot" style={{ background: d.color }} />
                    <span className="small grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bi(d.name, lang)}
                    </span>
                    <span className="small tabnum" style={{ fontWeight: 650, color: scores[d.id] === undefined ? 'var(--muted)' : undefined }}>
                      {scores[d.id] ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {fi === null && <p className="small muted" style={{ marginTop: 12 }}>{t('完成至少 2 个不同领域的训练后显示。', 'Appears after training in at least 2 areas.')}</p>}
          </div>

          {/* Deep focus */}
          <div className="card">
            <div className="card-head" style={{ marginBottom: 10 }}>
              <h3>
                <Icon name="timer" size={18} /> {t('今日深度专注', 'Deep focus today')}
              </h3>
              <span className="small muted tabnum">
                {fmtMinutes(focusMs, lang)} / {fmtMinutes(goalMs, lang)}
              </span>
            </div>
            <div className="meter">
              <div style={{ width: `${Math.min(100, (focusMs / goalMs) * 100)}%` }} />
            </div>
            <button className="btn block" style={{ marginTop: 14 }} onClick={() => navigate('/focus')} type="button">
              <Icon name="play" size={14} /> {t('开始一段专注', 'Start a focus session')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {/* Check-in */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>
              <Icon name="heart" size={18} /> {t('状态打卡', 'Check-in')}
            </h3>
            {todayCheck && <span className="chip good">✓</span>}
          </div>
          {todayCheck ? (
            <>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="chip">
                  <Icon name="moon" size={13} /> {todayCheck.sleep}
                  {t(' 小时', 'h')}
                </span>
                <span className="chip">
                  {t('精力', 'Energy')} {todayCheck.energy}/5
                </span>
                <span className="chip">
                  {t('压力', 'Stress')} {todayCheck.stress}/5
                </span>
                <span className="chip">
                  <Icon name="coffee" size={13} /> {todayCheck.caffeine}
                </span>
              </div>
              <button className="btn ghost sm" style={{ marginTop: 10, paddingLeft: 0 }} onClick={() => setCheckin(true)} type="button">
                {t('修改', 'Edit')}
              </button>
            </>
          ) : (
            <>
              <p className="small text-2">{t('记录睡眠、精力和压力，找到影响你专注的真正因素。', 'Log sleep, energy and stress to find what really drives your focus.')}</p>
              <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => setCheckin(true)} type="button">
                {t('20 秒打卡', '20-second check-in')}
              </button>
            </>
          )}
        </div>

        {/* Insight */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>
              <Icon name="sparkles" size={18} /> {t('个人洞察', 'Insight')}
            </h3>
          </div>
          {insight && (
            <>
              <div style={{ fontWeight: 650, marginBottom: 4 }}>{bi(insight.title, lang, insight.vars)}</div>
              <p className="small text-2">{bi(insight.body, lang, insight.vars)}</p>
            </>
          )}
        </div>

        {/* Experiment, or habit of the day */}
        {exp ? (
          <ExperimentToday />
        ) : (
        <div className="card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>
              <Icon name={habit.icon} size={18} /> {t('今日习惯', 'Habit of the day')}
            </h3>
            <span className={`ev ${habit.evidence === 'practice' ? 'mixed' : habit.evidence}`}>{bi(EVIDENCE_LABEL[habit.evidence], lang)}</span>
          </div>
          <div style={{ fontWeight: 650, marginBottom: 4 }}>{bi(habit.title, lang)}</div>
          <p className="small text-2">{bi(habit.how, lang)}</p>
          <a className="small" href="#/learn" style={{ display: 'inline-block', marginTop: 8 }}>
            {t('用个人实验检验哪些习惯对你有效', 'Test which habits work for you with an experiment')} →
          </a>
        </div>
        )}
      </div>

      {!hasAssessment && (
        <div className="card" style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="icon-tile lg">
            <Icon name="clipboard" size={22} />
          </div>
          <div className="grow" style={{ minWidth: 220 }}>
            <h3>{t('建立你的专注基线', 'Set your focus baseline')}</h3>
            <p className="small text-2">{t('15 分钟标准化评估，之后每 2 周复测一次，用数据看到真实的进步。', 'A 15-minute standardized assessment. Retake every 2 weeks to see real, measured progress.')}</p>
          </div>
          <button className="btn" onClick={() => navigate('/assess')} type="button">
            {t('开始评估', 'Take assessment')} <Icon name="arrowRight" size={16} />
          </button>
        </div>
      )}

      {checkin && <CheckInModal onClose={() => setCheckin(false)} />}
    </>
  );
}

function ReadinessCard({ r, t, hasCheckin, onCheckin }: { r: Readiness | null; t: T; hasCheckin: boolean; onCheckin: () => void }) {
  if (!r)
    return (
      <div className="card readiness" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 14 }}>
          <span className="icon-tile">
            <Icon name="battery" size={19} />
          </span>
          <div className="grow" style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 650 }}>{t('今日状态', 'Today’s readiness')}</div>
            <div className="small text-2">{t('完成状态打卡或 PVT 后，这里会估计你今天的专注状态，并给出安排建议。', 'Check in or run the PVT and FocusLab will estimate today’s focus readiness and suggest how to plan your day.')}</div>
          </div>
          {!hasCheckin && (
            <button className="btn sm" onClick={onCheckin} type="button">
              {t('打卡', 'Check in')}
            </button>
          )}
          <button className="btn sm" onClick={() => navigate('/run/pvt?back=/')} type="button">
            PVT · 2′
          </button>
        </div>
      </div>
    );
  const f = Object.fromEntries(r.factors.map((x) => [x.key, x.value])) as Record<string, number>;
  const color = r.level === 'high' ? 'var(--good)' : r.level === 'mid' ? 'var(--accent)' : 'var(--d2)';
  const advice =
    r.level === 'high'
      ? t('状态很好：把最难、最需要创造力的工作放在接下来 2 小时，今天可以尝试比平时更长的专注时段。', 'You’re sharp: put your hardest, most creative work in the next 2 hours, and try a longer focus block than usual.')
      : r.level === 'mid'
        ? t('状态正常：按计划训练，专注时段用你习惯的时长。', 'Normal state: follow your plan and use your usual focus length.')
        : t('状态偏低：训练以完成为主、不追求成绩；深度专注用 25 分钟短时段并多休息。如果可以，小睡 10–20 分钟，今晚早点睡。', 'Low state: aim to complete training, not to set records; use 25-minute focus blocks with more breaks. A 10–20 minute nap and an early night will help.');
  const chips: { label: string; v: number }[] = [];
  const word = (v: number, good: string, mid: string, bad: string) => (v >= 0.15 ? good : v <= -0.15 ? bad : mid);
  if (f.sleep !== undefined) chips.push({ label: word(f.sleep, t('睡眠充足', 'Slept well'), t('睡眠一般', 'Sleep OK'), t('睡眠不足', 'Short sleep')), v: f.sleep });
  if (f.energy !== undefined) chips.push({ label: word(f.energy, t('精力充沛', 'High energy'), t('精力一般', 'Energy OK'), t('精力不足', 'Low energy')), v: f.energy });
  if (f.stress !== undefined) chips.push({ label: word(f.stress, t('压力小', 'Low stress'), t('压力一般', 'Some stress'), t('压力大', 'High stress')), v: f.stress });
  if (f.pvt !== undefined)
    chips.push({ label: r.pvtDelta! >= 0 ? t('警觉 快 {ms}ms', 'Alertness +{ms}ms', { ms: r.pvtDelta! }) : t('警觉 慢 {ms}ms', 'Alertness −{ms}ms', { ms: -r.pvtDelta! }), v: f.pvt });
  return (
    <div className="card readiness" style={{ marginBottom: 16 }}>
      <div className="row wrap" style={{ gap: 16 }}>
        <ScoreRing value={r.score} size={64} stroke={7} color={color}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{r.score}</span>
        </ScoreRing>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row wrap" style={{ gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 650 }}>{t('今日状态', 'Today’s readiness')}</span>
            <span className={`chip ${r.level === 'high' ? 'good' : r.level === 'low' ? 'warn' : 'accent'}`}>{r.level === 'high' ? t('高', 'High') : r.level === 'mid' ? t('中', 'Medium') : t('低', 'Low')}</span>
            {chips.map((c) => (
              <span key={c.label} className="chip" title={c.v >= 0.15 ? t('有利', 'helping') : c.v <= -0.15 ? t('不利', 'hurting') : t('中性', 'neutral')}>
                <span className="dot" style={{ background: c.v >= 0.15 ? 'var(--good)' : c.v <= -0.15 ? 'var(--bad)' : 'var(--axis)' }} /> {c.label}
              </span>
            ))}
          </div>
          <div className="small text-2">
            {advice}
            {f.sleep !== undefined && f.sleep <= -0.4 && t(' 昨晚睡眠不足是主要原因。', ' Short sleep is the main drag.')}
            {f.stress !== undefined && f.stress <= -0.5 && t(' 压力偏高：开始前先做 3 分钟数息或生理性叹息。', ' Stress is high: start with 3 minutes of breath counting or physiological sighs.')}
          </div>
        </div>
        {f.pvt === undefined && (
          <button className="btn sm" onClick={() => navigate('/run/pvt?back=/')} type="button">
            {t('做 PVT 让估计更准', 'Run PVT for a better estimate')}
          </button>
        )}
      </div>
    </div>
  );
}

function DueCards({ data, t }: { data: AppData; t: T }) {
  const today = dayKey();
  const dismiss = (id: string) =>
    update((d) => {
      d.dismissed[id] = today;
    });
  const recentlyDismissed = (id: string, days: number) => !!data.dismissed[id] && daysBetween(data.dismissed[id], today) < days;
  const cards: { id: string; icon: string; title: string; body: string; cta: string; go: () => void }[] = [];
  if (reviewDue(data, today) && !recentlyDismissed('review', 2))
    cards.push({
      id: 'review',
      icon: 'calendar',
      title: t('周回顾时间到了', 'Time for your weekly review'),
      body: t('5 分钟看看这周的数据、找出最大的障碍，并定下一个具体改变。', 'Five minutes to look at the week, name the biggest obstacle and pick one concrete change.'),
      cta: t('开始回顾', 'Start review'),
      go: () => navigate('/review'),
    });
  const assess = data.results.filter((r) => r.mode === 'assessment');
  const lastAssess = assess.length ? assess.reduce((a, b) => (b.startedAt > a.startedAt ? b : a)).date : null;
  if (lastAssess && daysBetween(lastAssess, today) >= 14 && !recentlyDismissed('retest', 3))
    cards.push({
      id: 'retest',
      icon: 'clipboard',
      title: t('该复测了', 'Time to retest'),
      body: t('距上次评估已 {n} 天。15 分钟复测，客观看到你的变化。', 'It’s been {n} days since your last assessment. Retest in 15 minutes to see objective change.', { n: daysBetween(lastAssess, today) }),
      cta: t('开始评估', 'Take assessment'),
      go: () => navigate('/assess'),
    });
  if (data.results.length >= 20 && (!data.lastExportAt || Date.now() - data.lastExportAt > 30 * 86400000) && !recentlyDismissed('backup', 14))
    cards.push({
      id: 'backup',
      icon: 'download',
      title: t('备份一下你的数据', 'Back up your data'),
      body: t('数据只保存在这个浏览器里。清除浏览器数据会让记录丢失——下载一份备份吧。', 'Your data lives only in this browser; clearing site data would erase it. Download a backup.'),
      cta: t('下载备份', 'Download backup'),
      go: downloadBackup,
    });
  if (!cards.length) return null;
  return (
    <div className="stack" style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <div key={c.id} className="card row wrap" style={{ gap: 14 }}>
          <span className="icon-tile">
            <Icon name={c.icon} size={19} />
          </span>
          <div className="grow" style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 650 }}>{c.title}</div>
            <div className="small text-2">{c.body}</div>
          </div>
          <button className="btn sm primary" onClick={c.go} type="button">
            {c.cta}
          </button>
          <button className="icon-btn" onClick={() => dismiss(c.id)} aria-label={t('稍后', 'Later')} type="button">
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
