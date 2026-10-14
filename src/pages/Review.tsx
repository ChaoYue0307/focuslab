import { useMemo, useState, type ReactNode } from 'react';
import { ExperimentPicker } from '../components/Experiment';
import { Icon } from '../components/Icon';
import { toast } from '../components/ui';
import { DISTRACTION_KINDS } from '../content/habits';
import { achievementMeta } from '../lib/achievements';
import { dayKey, fmtMinutes, shortDate, uid } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { allInsights, weekSummary, type WeekStats } from '../lib/personal';
import { navigate } from '../lib/router';
import { update, useData } from '../lib/store';

function Stat({ label, cur, prev, fmt, dfmt = fmt, better = 'high' }: { label: string; cur: number | null; prev: number | null; fmt: (v: number) => string; dfmt?: (v: number) => string; better?: 'high' | 'low' }) {
  const t = useT();
  let delta: ReactNode = null;
  if (cur !== null && prev !== null && Number.isFinite(cur - prev) && Math.abs(cur - prev) > 1e-9) {
    const up = cur > prev;
    const good = better === 'high' ? up : !up;
    delta = (
      <span className={`delta ${good ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {dfmt(Math.abs(cur - prev))}
      </span>
    );
  }
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{cur === null ? '—' : fmt(cur)}</div>
      <div className="small muted">
        {delta} {prev !== null && cur !== null ? t('较前一周', 'vs prior week') : ''}
      </div>
    </div>
  );
}

export default function Review() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const today = dayKey();
  const w = useMemo(() => weekSummary(data, today), [data, today]);
  const ins = useMemo(() => allInsights(data).slice(0, 3), [data]);
  const [wins, setWins] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [nextChange, setNextChange] = useState('');
  const past = [...data.reviews].sort((a, b) => b.createdAt - a.createdAt);
  const c: WeekStats = w.cur;
  const p: WeekStats = w.prev;
  const kind = DISTRACTION_KINDS.find((k) => k.id === w.topKind);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const save = () => {
    update((d) => {
      d.reviews.push({ id: uid(), weekEnd: today, createdAt: Date.now(), wins: wins.trim(), obstacle: obstacle.trim(), nextChange: nextChange.trim() });
    });
    toast(t('周回顾已保存', 'Weekly review saved'));
    navigate('/');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('周回顾', 'Weekly review')}</h1>
          <p>
            {shortDate(w.start, lang)} – {shortDate(w.end, lang)} · {t('5 分钟复盘，让下周更专注', 'Five minutes of reflection for a more focused week')}
          </p>
        </div>
      </div>

      <div className="grid grid-4">
        <Stat label={t('训练天数', 'Training days')} cur={c.trainingDays} prev={p.trainingDays} fmt={(v) => `${Math.round(v)}/7`} dfmt={(v) => t('{n} 天', '{n} days', { n: Math.round(v) })} />
        <Stat label={t('深度专注', 'Deep focus')} cur={c.focusMin} prev={p.focusMin} fmt={(v) => fmtMinutes(v * 60000, lang)} />
        <Stat label={t('专注抽查在任务上', 'On task (probes)')} cur={c.onTask} prev={p.onTask} fmt={pct} dfmt={(v) => t('{n} 个百分点', '{n} pts', { n: Math.round(v * 100) })} />
        <Stat label={t('分心 / 小时', 'Distractions / hour')} cur={c.distrPerHour} prev={p.distrPerHour} fmt={(v) => v.toFixed(1)} better="low" />
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Stat label={t('专注指数', 'Focus Index')} cur={w.fiEnd} prev={w.fiStart} fmt={(v) => String(Math.round(v))} />
        <Stat label={t('平均专注自评', 'Avg focus rating')} cur={c.avgRating} prev={p.avgRating} fmt={(v) => v.toFixed(1)} />
        <Stat label={t('状态打卡', 'Check-ins')} cur={c.checkins} prev={p.checkins} fmt={(v) => `${Math.round(v)}/7`} dfmt={(v) => t('{n} 次', '{n}', { n: Math.round(v) })} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>{t('本周发现', 'This week’s signals')}</h3>
          <div className="stack sm">
            {kind && kind.id !== 'other' && (
              <div className="row top small">
                <Icon name={kind.icon} size={16} />
                <span>
                  {t('最常见的分心：', 'Most common distraction: ')}
                  <b>{bi(kind.label, lang)}</b>. {bi(kind.advice, lang)}
                </span>
              </div>
            )}
            {ins.map((i) => (
              <div key={i.id} className="row top small">
                <Icon name={i.icon} size={16} />
                <span>
                  <b>{bi(i.title, lang, i.vars)}</b> — <span className="text-2">{bi(i.body, lang, i.vars)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>{t('本周解锁', 'Unlocked this week')}</h3>
          {w.unlocked.length ? (
            <div className="row wrap" style={{ gap: 8 }}>
              {w.unlocked.map((id) => {
                const a = achievementMeta(id);
                return a ? (
                  <span key={id} className="chip good">
                    <Icon name={a.icon} size={13} /> {bi(a.title, lang)}
                  </span>
                ) : null;
              })}
            </div>
          ) : (
            <p className="small muted">{t('这周还没有解锁新成就——下周继续。', 'No new achievements this week — next week, then.')}</p>
          )}
        </div>
      </div>

      <div className="section-title">{t('反思', 'Reflect')}</div>
      <div className="card stack lg">
        <div className="field">
          <label htmlFor="wins">{t('这周专注做得好的一件事是什么？', 'What went well for your focus this week?')}</label>
          <textarea id="wins" className="input" rows={2} value={wins} onChange={(e) => setWins(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="obstacle">{t('最大的障碍是什么？它通常在什么情况下出现？', 'What was the biggest obstacle, and when did it show up?')}</label>
          <textarea id="obstacle" className="input" rows={2} value={obstacle} onChange={(e) => setObstacle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="next">{t('下周要尝试的一个具体改变（写成"如果……就……"）', 'One concrete change for next week (as an "if–then" plan)')}</label>
          <textarea id="next" className="input" rows={2} value={nextChange} onChange={(e) => setNextChange(e.target.value)} placeholder={t('例如：如果上午 9 点坐到桌前，就先把手机放进抽屉', 'e.g. If I sit down at 9am, then my phone goes in the drawer first')} />
        </div>
        <button className="btn primary lg" onClick={save} type="button" style={{ alignSelf: 'flex-start' }}>
          <Icon name="check" size={16} /> {t('保存周回顾', 'Save review')}
        </button>
      </div>

      <div className="section-title">{t('想验证某个改变是否真的有效？', 'Want to know if a change really works?')}</div>
      <ExperimentPicker />

      {past.length > 0 && (
        <>
          <div className="section-title">{t('过往回顾', 'Past reviews')}</div>
          <div className="stack">
            {past.slice(0, 8).map((r) => (
              <div key={r.id} className="card">
                <div className="small muted" style={{ marginBottom: 6 }}>
                  {t('截至 {d}', 'Week ending {d}', { d: shortDate(r.weekEnd, lang) })}
                </div>
                {r.wins && (
                  <p className="small">
                    <b>{t('做得好：', 'Went well: ')}</b>
                    {r.wins}
                  </p>
                )}
                {r.obstacle && (
                  <p className="small">
                    <b>{t('障碍：', 'Obstacle: ')}</b>
                    {r.obstacle}
                  </p>
                )}
                {r.nextChange && (
                  <p className="small">
                    <b>{t('改变：', 'Change: ')}</b>
                    {r.nextChange}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
