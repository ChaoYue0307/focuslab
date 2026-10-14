import { useMemo, useState } from 'react';
import { ChartCard, ColumnChart, Heatmap, LineChart } from '../components/Charts';
import { Icon } from '../components/Icon';
import { Delta, Segmented } from '../components/ui';
import { baselineScores, domainScores, focusIndex, indexHistory, insights, streak, timeOfDayProfile } from '../lib/analytics';
import { addDays, dayKey, dayRange, fmtMinutes, shortDate } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { mean } from '../lib/stats';
import { update, useData } from '../lib/store';
import type { TaskId } from '../lib/types';
import { fmtMetric } from '../tasks/TaskRunner';
import { ASSESSMENT, DOMAINS, TASKS, domainMeta, taskMeta } from '../tasks/registry';

export default function Progress() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const [range, setRange] = useState<30 | 90 | 365>(30);
  const today = dayKey();
  const from = addDays(today, -range + 1);
  const results = data.results;
  const scores = useMemo(() => domainScores(results), [results]);
  const base = useMemo(() => baselineScores(results), [results]);
  const fi = focusIndex(scores);
  const fiBase = focusIndex(base);
  const firstDay = results.length ? results.reduce((m, r) => (r.date < m ? r.date : m), results[0].date) : today;
  const pastBaseline = results.some((r) => r.date > addDays(firstDay, 6));
  const hist = useMemo(() => indexHistory(results).filter((p) => p.date >= from), [results, from]);
  const st = streak(data);
  const trainMs = results.reduce((s, r) => s + r.durationMs, 0);
  const weekFrom = addDays(today, -6);
  const weekFocus = data.sessions.filter((s) => s.date >= weekFrom).reduce((a, s) => a + s.focusMs, 0);
  const ins = useMemo(() => insights(data), [data]);

  if (!results.length && !data.sessions.length) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{t('进展', 'Progress')}</h1>
          </div>
        </div>
        <div className="card empty" style={{ padding: 48 }}>
          <div className="icon-tile lg" style={{ margin: '0 auto 14px' }}>
            <Icon name="chart" size={24} />
          </div>
          <h3 style={{ color: 'var(--text)' }}>{t('还没有数据', 'No data yet')}</h3>
          <p style={{ marginTop: 6 }}>{t('完成第一次训练或评估后，这里会显示你的专注指数、各维度变化和个人洞察。', 'After your first training or assessment, your Focus Index, domain trends and personal insights appear here.')}</p>
          <a className="btn primary" style={{ marginTop: 18 }} href="#/assess">
            {t('开始基线评估', 'Take the baseline assessment')}
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('进展', 'Progress')}</h1>
          <p>{t('所有数据只保存在你的浏览器中。', 'All data stays in your browser.')}</p>
        </div>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: 30, label: t('30 天', '30 days') },
            { value: 90, label: t('90 天', '90 days') },
            { value: 365, label: t('1 年', '1 year') },
          ]}
        />
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-label">{t('专注指数', 'Focus Index')}</div>
          <div className="stat-value">{fi ?? '—'}</div>
          {fi !== null && fiBase !== null && pastBaseline ? (
            <span className="small muted">
              <Delta value={fi - fiBase} better="high" /> {t('较基线', 'vs baseline')}
            </span>
          ) : fi !== null ? (
            <span className="small muted">{t('基线周（前 7 天）', 'Baseline week (first 7 days)')}</span>
          ) : (
            <span className="small muted">{t('需 2 个领域数据', 'Needs 2 areas')}</span>
          )}
        </div>
        <div className="card">
          <div className="stat-label">{t('累计训练', 'Total training')}</div>
          <div className="stat-value">{fmtMinutes(trainMs, lang)}</div>
          <span className="small muted">{t('{n} 次练习', '{n} sessions', { n: results.length })}</span>
        </div>
        <div className="card">
          <div className="stat-label">{t('近 7 天深度专注', 'Deep focus, last 7 days')}</div>
          <div className="stat-value">{fmtMinutes(weekFocus, lang)}</div>
          <span className="small muted">{t('日均 {m}', '{m}/day', { m: fmtMinutes(weekFocus / 7, lang) })}</span>
        </div>
        <div className="card">
          <div className="stat-label">{t('连续天数', 'Streak')}</div>
          <div className="stat-value">
            {st.current}
            <small>{t('天', 'days')}</small>
          </div>
          <span className="small muted">{t('最长 {n} 天', 'Best {n}', { n: st.best })}</span>
        </div>
      </div>

      <div className="grid grid-main" style={{ marginTop: 16 }}>
        <ChartCard
          title={t('专注指数趋势', 'Focus Index over time')}
          sub={t('各维度最近 3 次训练的平均', 'Average of your last 3 sessions per domain')}
          table={
            <table className="data">
              <thead>
                <tr>
                  <th>{t('日期', 'Date')}</th>
                  <th className="num">{t('指数', 'Index')}</th>
                </tr>
              </thead>
              <tbody>
                {[...hist].reverse().map((p) => (
                  <tr key={p.date}>
                    <td>{shortDate(p.date, lang)}</td>
                    <td className="num">{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {hist.length >= 2 ? (
            <LineChart lang={lang} series={[{ id: 'fi', label: t('专注指数', 'Focus Index'), color: 'var(--accent)', points: hist.map((p) => ({ x: p.date, y: p.value })) }]} />
          ) : (
            <div className="empty">{t('再训练几天就能看到趋势线。', 'Train a few more days to see the trend.')}</div>
          )}
        </ChartCard>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>{t('专注力画像', 'Attention profile')}</h3>
              <div className="card-sub">{t('竖线 = 你的基线（第一周）', 'Tick = your baseline (first week)')}</div>
            </div>
          </div>
          {DOMAINS.map((d) => {
            const v = scores[d.id];
            const b = base[d.id];
            return (
              <div key={d.id} className="dbar" title={bi(d.desc, lang)}>
                <div className="dbar-name">
                  <span className="dot" style={{ background: d.color }} />
                  <span>{bi(d.name, lang)}</span>
                </div>
                <div className="dbar-track">
                  {v !== undefined && <div className="dbar-fill" style={{ width: `${v}%`, background: d.color }} />}
                  {b !== undefined && v !== undefined && <div className="dbar-base" style={{ left: `calc(${b}% - 1px)` }} />}
                </div>
                <div className="dbar-val">
                  {v ?? <span className="muted">—</span>}
                  {v !== undefined && b !== undefined && v !== b && (
                    <span style={{ marginLeft: 5 }}>
                      <Delta value={v - b} better="high" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-title">{t('个人洞察', 'Personal insights')}</div>
      <div className="grid grid-2">
        {ins.map((i) => (
          <div key={i.id} className={`callout ${i.tone === 'info' ? '' : i.tone}`} style={{ padding: 18 }}>
            <Icon name={i.icon} size={20} />
            <div>
              <div style={{ fontWeight: 650, marginBottom: 4 }}>{bi(i.title, lang)}</div>
              <div className="small text-2">{bi(i.body, lang)}</div>
            </div>
          </div>
        ))}
      </div>

      <TaskTrends from={from} />

      <div className="section-title">{t('深度专注', 'Deep focus')}</div>
      <div className="grid grid-main">
        <FocusColumns />
        <TimeOfDay />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h3>{t('练习日历', 'Practice calendar')}</h3>
            <div className="card-sub">{t('训练 + 深度专注分钟数', 'Training + deep-focus minutes')}</div>
          </div>
        </div>
        <ActivityHeatmap />
      </div>

      <Benchmarks />
      <History />
    </>
  );
}

function TaskTrends({ from }: { from: string }) {
  const t = useT();
  const lang = t.lang;
  const { results } = useData();
  const practiced = TASKS.filter((m) => results.some((r) => r.task === m.id));
  const [sel, setSel] = useState<TaskId | null>(null);
  const task = sel && practiced.some((p) => p.id === sel) ? sel : practiced[0]?.id;
  if (!task) return null;
  const meta = taskMeta(task);
  const color = domainMeta(meta.domain).color;
  const primary = meta.metrics.find((m) => m.primary) || meta.metrics[0];
  // one point per day (daily mean) keeps the chart readable
  const byDay = (fn: (r: (typeof results)[number]) => number) => {
    const m = new Map<string, number[]>();
    results
      .filter((r) => r.task === task && r.date >= from && r.mode === 'training')
      .forEach((r) => {
        const a = m.get(r.date) || [];
        a.push(fn(r));
        m.set(r.date, a);
      });
    return [...m.entries()].map(([x, v]) => ({ x, y: mean(v) }));
  };
  const scorePts = byDay((r) => r.score);
  const metricPts = byDay((r) => r.metrics[primary.key]).filter((p) => Number.isFinite(p.y));
  const vals = metricPts.map((p) => p.y);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.1 || 1;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const ticks = [0, 1, 2, 3, 4].map((i) => yMin + ((yMax - yMin) * i) / 4);

  return (
    <>
      <div className="section-title">{t('单项趋势', 'Exercise trends')}</div>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <select className="input" style={{ width: 'auto', minWidth: 220 }} value={task} onChange={(e) => setSel(e.target.value as TaskId)} aria-label={t('选择练习', 'Choose exercise')}>
          {practiced.map((m) => (
            <option key={m.id} value={m.id}>
              {bi(m.name, lang)}
            </option>
          ))}
        </select>
        <span className="small muted">{t('训练模式 · 每日平均', 'Training mode · daily average')}</span>
      </div>
      <div className="grid grid-2">
        <ChartCard title={t('训练分', 'Training score')} sub={bi(meta.name, lang)}>
          {scorePts.length >= 2 ? <LineChart lang={lang} height={200} series={[{ id: 's', label: t('训练分', 'Score'), color, points: scorePts }]} /> : <div className="empty">{t('至少需要 2 天的数据', 'Needs at least 2 days of data')}</div>}
        </ChartCard>
        <ChartCard title={bi(primary.label, lang)} sub={primary.better === 'low' ? t('越低越好', 'Lower is better') : primary.better === 'high' ? t('越高越好', 'Higher is better') : ''}>
          {metricPts.length >= 2 ? (
            <LineChart lang={lang} height={200} yMin={yMin} yMax={yMax} yTicks={ticks} area={false} fmt={(v) => fmtMetric(primary, v, lang).replace(' ms', '')} series={[{ id: 'm', label: bi(primary.label, lang), color, points: metricPts }]} />
          ) : (
            <div className="empty">{t('至少需要 2 天的数据', 'Needs at least 2 days of data')}</div>
          )}
        </ChartCard>
      </div>
    </>
  );
}

function FocusColumns() {
  const t = useT();
  const lang = t.lang;
  const { sessions, settings } = useData();
  const today = dayKey();
  const days = dayRange(addDays(today, -13), today);
  const pts = days.map((d) => ({ x: d, y: Math.round(sessions.filter((s) => s.date === d).reduce((a, s) => a + s.focusMs, 0) / 60000) }));
  const rated = sessions.filter((s) => s.rating);
  const avgRating = rated.length ? mean(rated.map((s) => s.rating!)) : null;
  const distRate = (() => {
    const ms = sessions.reduce((a, s) => a + s.focusMs, 0);
    return ms > 0 ? (sessions.reduce((a, s) => a + s.distractions.length, 0) / ms) * 3600000 : null;
  })();
  return (
    <ChartCard
      title={t('每日深度专注（分钟）', 'Daily deep focus (minutes)')}
      sub={
        <>
          {avgRating !== null && t('平均自评 {r}/5', 'Avg rating {r}/5', { r: avgRating.toFixed(1) })}
          {distRate !== null && ` · ${t('分心 {d} 次/小时', '{d} distractions/hour', { d: distRate.toFixed(1) })}`}
        </>
      }
      table={
        <table className="data">
          <thead>
            <tr>
              <th>{t('日期', 'Date')}</th>
              <th className="num">{t('分钟', 'Minutes')}</th>
            </tr>
          </thead>
          <tbody>
            {[...pts].reverse().map((p) => (
              <tr key={p.x}>
                <td>{shortDate(p.x, lang)}</td>
                <td className="num">{p.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ColumnChart data={pts} lang={lang} goal={settings.dailyFocusGoalMin} goalLabel={t('目标', 'Goal')} fmt={(v) => String(Math.round(v))} />
    </ChartCard>
  );
}

function TimeOfDay() {
  const t = useT();
  const lang = t.lang;
  const { results } = useData();
  const prof = timeOfDayProfile(results);
  const enough = prof.filter((p) => p.n >= 2);
  const maxAbs = Math.max(0.5, ...enough.map((p) => Math.abs(p.z)));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>{t('时段表现', 'Performance by time of day')}</h3>
          <div className="card-sub">{t('相对于你自己的平均水平', 'Relative to your own average')}</div>
        </div>
      </div>
      {enough.length < 2 ? (
        <div className="empty">{t('在不同时段训练后，这里会告诉你何时最专注。', 'Train at different times of day and this will reveal when you focus best.')}</div>
      ) : (
        <div className="stack sm" style={{ gap: 10 }}>
          {prof.map((p) => {
            const ok = p.n >= 2;
            const w = ok ? (Math.abs(p.z) / maxAbs) * 50 : 0;
            return (
              <div key={p.bucket.id} className="row" style={{ gap: 10 }}>
                <span className="small" style={{ width: 64, fontWeight: 600 }}>
                  {lang === 'zh' ? p.bucket.zh : p.bucket.en}
                </span>
                <div style={{ position: 'relative', flex: 1, height: 14, background: 'var(--surface-2)', borderRadius: 4 }}>
                  <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--axis)' }} />
                  {ok && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: p.z >= 0 ? '50%' : `${50 - w}%`,
                        width: `${w}%`,
                        background: p.z >= 0 ? 'var(--accent)' : 'var(--d2)',
                        borderRadius: p.z >= 0 ? '0 4px 4px 0' : '4px 0 0 4px',
                      }}
                    />
                  )}
                </div>
                <span className="small tabnum" style={{ width: 70, textAlign: 'right' }}>
                  {ok ? (p.z >= 0 ? t('高于平均', 'above') : t('低于平均', 'below')) : <span className="muted">n={p.n}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActivityHeatmap() {
  const t = useT();
  const lang = t.lang;
  const { results, sessions } = useData();
  const today = dayKey();
  const mins = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((r) => m.set(r.date, (m.get(r.date) || 0) + r.durationMs / 60000));
    sessions.forEach((s) => m.set(s.date, (m.get(s.date) || 0) + s.focusMs / 60000));
    return m;
  }, [results, sessions]);
  return <Heatmap end={today} value={(d) => Math.round(mins.get(d) || 0)} lang={lang} fmt={(v) => t('{v} 分钟', '{v} min', { v })} />;
}

function Benchmarks() {
  const t = useT();
  const lang = t.lang;
  const { results } = useData();
  const rows = ASSESSMENT.flatMap((task) => {
    const rs = results.filter((r) => r.task === task && r.mode === 'assessment').sort((a, b) => a.startedAt - b.startedAt);
    if (!rs.length) return [];
    const first = rs[0];
    const last = rs[rs.length - 1];
    const meta = taskMeta(task);
    return meta.metrics
      .filter((m) => m.better !== 'none')
      .slice(0, 2)
      .map((m) => ({ task, meta, m, a: first.metrics[m.key], b: last.metrics[m.key], n: rs.length }));
  });
  if (!rows.length) return null;
  return (
    <>
      <div className="section-title">{t('评估基准', 'Assessment benchmarks')}</div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th>{t('测试', 'Test')}</th>
              <th>{t('指标', 'Measure')}</th>
              <th className="num">{t('第一次', 'First')}</th>
              <th className="num">{t('最近', 'Latest')}</th>
              <th className="num">{t('变化', 'Change')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.task + r.m.key}>
                <td>{bi(r.meta.name, lang)}</td>
                <td className="text-2">{bi(r.m.label, lang)}</td>
                <td className="num">{fmtMetric(r.m, r.a, lang)}</td>
                <td className="num">{r.n > 1 ? fmtMetric(r.m, r.b, lang) : '—'}</td>
                <td className="num">{r.n > 1 ? <Delta value={r.b - r.a} better={r.m.better} fmt={(d) => fmtMetric({ ...r.m }, d, lang)} /> : <span className="muted">{t('待复测', 'retest')}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function History() {
  const t = useT();
  const lang = t.lang;
  const { results } = useData();
  const [n, setN] = useState(12);
  const rs = [...results].sort((a, b) => b.startedAt - a.startedAt);
  if (!rs.length) return null;
  return (
    <>
      <div className="section-title">{t('训练记录', 'Session history')}</div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th>{t('时间', 'When')}</th>
              <th>{t('练习', 'Exercise')}</th>
              <th>{t('难度', 'Level')}</th>
              <th className="num">{t('核心指标', 'Key metric')}</th>
              <th className="num">{t('分数', 'Score')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rs.slice(0, n).map((r) => {
              const m = taskMeta(r.task);
              const p = m.metrics.find((x) => x.primary) || m.metrics[0];
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {shortDate(r.date, lang)} <span className="muted">{String(new Date(r.startedAt).getHours()).padStart(2, '0')}:{String(new Date(r.startedAt).getMinutes()).padStart(2, '0')}</span>
                  </td>
                  <td>
                    {bi(m.name, lang)} {r.mode === 'assessment' && <span className="chip warn">{t('评估', 'Test')}</span>}
                  </td>
                  <td className="text-2">{m.maxLevel > 1 ? m.levelLabel(r.level, lang) : '—'}</td>
                  <td className="num">{fmtMetric(p, r.metrics[p.key], lang)}</td>
                  <td className="num" style={{ fontWeight: 650 }}>
                    {r.score}
                  </td>
                  <td className="num">
                    <button
                      className="icon-btn"
                      style={{ width: 28, height: 28 }}
                      title={t('删除这条记录', 'Delete this entry')}
                      onClick={() => {
                        if (confirm(t('删除这条训练记录？', 'Delete this session?')))
                          update((d) => {
                            d.results = d.results.filter((x) => x.id !== r.id);
                          });
                      }}
                      type="button"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rs.length > n && (
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setN(n + 30)} type="button">
            {t('显示更多', 'Show more')}
          </button>
        )}
      </div>
    </>
  );
}
