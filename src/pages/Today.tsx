import { useMemo, useState } from 'react';
import { CheckInModal } from '../components/CheckIn';
import { Icon } from '../components/Icon';
import { ScoreRing } from '../components/ui';
import { HABITS, EVIDENCE_LABEL } from '../content/learn';
import { baselineScores, dailyPlan, domainScores, focusIndex, focusMsOn, insights, planMinutes, streak } from '../lib/analytics';
import { addDays, dayKey, fmtMinutes } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { hashString } from '../lib/stats';
import { useData } from '../lib/store';
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
  const insight = useMemo(() => insights(data)[0], [data]);
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
          <p>{new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="row">
          <span className="chip" title={t('最长 {n} 天', 'Best {n} days', { n: st.best })}>
            <Icon name="flame" size={14} style={{ color: 'var(--d2)' }} />
            {t('连续 {n} 天', '{n}-day streak', { n: st.current })}
          </span>
          <a className="icon-btn" href="#/settings" aria-label={t('设置', 'Settings')}>
            <Icon name="settings" />
          </a>
        </div>
      </div>

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
                  {fi !== null && fiBase !== null && fi !== fiBase && data.results.some((r) => r.date > addDays(data.results.reduce((m, x) => (x.date < m ? x.date : m), today), 6)) && (
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
              <div style={{ fontWeight: 650, marginBottom: 4 }}>{bi(insight.title, lang)}</div>
              <p className="small text-2">{bi(insight.body, lang)}</p>
            </>
          )}
        </div>

        {/* Habit of the day */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>
              <Icon name={habit.icon} size={18} /> {t('今日习惯', 'Habit of the day')}
            </h3>
            <span className={`ev ${habit.evidence === 'practice' ? 'mixed' : habit.evidence}`}>{bi(EVIDENCE_LABEL[habit.evidence], lang)}</span>
          </div>
          <div style={{ fontWeight: 650, marginBottom: 4 }}>{bi(habit.title, lang)}</div>
          <p className="small text-2">{bi(habit.how, lang)}</p>
        </div>
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
