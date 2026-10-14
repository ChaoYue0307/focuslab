import { EXPERIMENTS, templateOf } from '../content/habits';
import { addDays, dayKey, shortDate } from '../lib/date';
import { bi, tr, useT } from '../lib/i18n';
import { activeExperiment, analyzeExperiment, conditionOn, experimentDay, newExperiment, outcomeLabel, type Effect } from '../lib/personal';
import { mean } from '../lib/stats';
import { update, useData } from '../lib/store';
import type { Experiment, Lang } from '../lib/types';
import { Icon } from './Icon';
import { toast } from './ui';

export function startExperiment(templateId: string, t: ReturnType<typeof useT>) {
  update((d) => {
    d.experiments.forEach((e) => {
      if (e.status === 'active') {
        e.status = 'stopped';
        e.endedAt = Date.now();
      }
    });
    d.experiments.push(newExperiment(templateId));
  });
  toast(t('实验已开始：14 天，随机安排 ON / OFF 日', 'Experiment started: 14 days of randomized ON / OFF days'));
}

export function logExperimentDay(exp: Experiment, date: string, did: boolean) {
  update((d) => {
    const e = d.experiments.find((x) => x.id === exp.id);
    if (!e) return;
    e.log = { ...(e.log || {}), [date]: did };
    const c = d.checkins.find((x) => x.date === date);
    if (c) {
      const tags = new Set(c.tags || []);
      if (did) tags.add(e.tag);
      else tags.delete(e.tag);
      c.tags = [...tags];
    }
  });
}

/** Today card: what to do today and a one-tap log. */
export function ExperimentToday() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const exp = activeExperiment(data);
  if (!exp) return null;
  const tpl = templateOf(exp.template);
  if (!tpl) return null;
  const today = dayKey();
  const i = experimentDay(exp, today);
  if (i < 0 || i >= exp.schedule.length) return null;
  const on = exp.schedule[i];
  const logged = exp.log?.[today];
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: 8 }}>
        <h3>
          <Icon name="brain" size={18} /> {t('个人实验', 'Personal experiment')}
        </h3>
        <span className="chip">
          {t('第 {d} / {n} 天', 'Day {d} / {n}', { d: i + 1, n: exp.schedule.length })}
        </span>
      </div>
      <div style={{ fontWeight: 650 }}>{bi(tpl.title, lang)}</div>
      <div className="row" style={{ gap: 8, margin: '8px 0' }}>
        <span className={`chip ${on ? 'accent' : ''}`}>{on ? t('今天：ON', 'Today: ON') : t('今天：OFF（对照）', 'Today: OFF (control)')}</span>
      </div>
      <p className="small text-2">{bi(on ? tpl.on : tpl.off, lang)}</p>
      {on && (
        <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
          <span className="small muted">{t('今天做到了吗？', 'Did you do it today?')}</span>
          <button className={`btn sm ${logged === true ? 'primary' : ''}`} onClick={() => logExperimentDay(exp, today, true)} type="button">
            <Icon name="check" size={14} /> {t('做到了', 'Yes')}
          </button>
          <button className={`btn sm ${logged === false ? 'primary' : ''}`} onClick={() => logExperimentDay(exp, today, false)} type="button">
            {t('没做到', 'No')}
          </button>
        </div>
      )}
      <a className="small" href="#/progress" style={{ display: 'inline-block', marginTop: 10 }}>
        {t('查看实验进展', 'See experiment progress')} →
      </a>
    </div>
  );
}

const fmtOutcome = (e: Effect, v: number, lang: Lang) => {
  if (!Number.isFinite(v)) return '—';
  switch (e.key) {
    case 'perf':
      return `${v >= 0 ? '+' : ''}${v.toFixed(2)} SD`;
    case 'rating':
      return `${v.toFixed(1)}/5`;
    case 'distrPerHour':
      return tr(lang, '{v} 次/时', '{v}/h', { v: v.toFixed(1) });
    case 'onTask':
      return `${Math.round(v * 100)}%`;
  }
};

function VerdictChip({ e }: { e: Effect }) {
  const t = useT();
  if (e.verdict === 'insufficient') return <span className="chip">{t('数据不足', 'Not enough data')}</span>;
  if (e.verdict === 'none') return <span className="chip">{t('无明显差异', 'No clear difference')}</span>;
  const strong = e.verdict === 'clear';
  return e.helps ? (
    <span className="chip good">{strong ? t('明显更好', 'Clearly better') : t('可能更好', 'Possibly better')}</span>
  ) : (
    <span className="chip warn">{strong ? t('明显更差', 'Clearly worse') : t('可能更差', 'Possibly worse')}</span>
  );
}

/** Full experiment view: schedule strip + ON vs OFF comparison per outcome. */
export function ExperimentReport({ exp }: { exp: Experiment }) {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const tpl = templateOf(exp.template);
  if (!tpl) return null;
  const { effects, daysElapsed } = analyzeExperiment(data, exp);
  const today = dayKey();
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>
            <Icon name={tpl.icon} size={18} /> {bi(tpl.title, lang)}
          </h3>
          <div className="card-sub">
            {shortDate(exp.startDate, lang)} – {shortDate(addDays(exp.startDate, exp.schedule.length - 1), lang)} ·{' '}
            {exp.status === 'active' ? t('进行中 · 第 {d} 天', 'Running · day {d}', { d: Math.min(daysElapsed, exp.schedule.length) }) : exp.status === 'done' ? t('已完成', 'Finished') : t('已停止', 'Stopped')}
          </div>
        </div>
        {exp.status === 'active' && (
          <button
            className="btn sm ghost"
            onClick={() => {
              if (confirm(t('停止这个实验？', 'Stop this experiment?')))
                update((d) => {
                  const e = d.experiments.find((x) => x.id === exp.id);
                  if (e) {
                    e.status = 'stopped';
                    e.endedAt = Date.now();
                  }
                });
            }}
            type="button"
          >
            {t('停止', 'Stop')}
          </button>
        )}
      </div>
      <div className="exp-strip" aria-label={t('实验日程', 'Schedule')}>
        {exp.schedule.map((_, i) => {
          const date = addDays(exp.startDate, i);
          const on = conditionOn(exp, i);
          const future = date > today;
          return (
            <span key={i} className={`exp-day ${on ? 'on' : 'off'} ${future ? 'future' : ''} ${date === today ? 'today' : ''}`} title={`${shortDate(date, lang)} · ${on ? 'ON' : 'OFF'}`}>
              {on ? 'ON' : '–'}
            </span>
          );
        })}
      </div>
      <table className="data" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>{t('指标', 'Outcome')}</th>
            <th className="num">ON</th>
            <th className="num">OFF</th>
            <th className="num">{t('结论', 'Verdict')}</th>
          </tr>
        </thead>
        <tbody>
          {effects.map((e) => (
            <tr key={e.key}>
              <td>{outcomeLabel(e.key, lang)}</td>
              <td className="num">
                {fmtOutcome(e, mean(e.on), lang)} <span className="muted tiny">n={e.on.length}</span>
              </td>
              <td className="num">
                {fmtOutcome(e, mean(e.off), lang)} <span className="muted tiny">n={e.off.length}</span>
              </td>
              <td className="num">
                <VerdictChip e={e} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        {t(
          '随机安排 ON/OFF 日可以排除"状态好的日子才去做"这类偏差。"明显"表示差异约为波动的 2 倍以上；14 天的样本仍然较小，请把结论当作对你个人的参考。',
          'Randomizing ON/OFF days rules out biases like "I only do it on good days". "Clear" means the difference is about 2× the noise; 14 days is still a small sample, so treat results as personal guidance.',
        )}
      </p>
    </div>
  );
}

/** Picker for starting a new experiment. */
export function ExperimentPicker({ compact }: { compact?: boolean }) {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const active = activeExperiment(data);
  return (
    <div className={compact ? 'stack sm' : 'grid grid-2'}>
      {EXPERIMENTS.map((x) => (
        <div key={x.id} className="card flat row top" style={{ gap: 12 }}>
          <span className="icon-tile">
            <Icon name={x.icon} size={18} />
          </span>
          <div className="grow">
            <div style={{ fontWeight: 650 }}>{bi(x.title, lang)}</div>
            <p className="small text-2" style={{ marginTop: 2 }}>
              {bi(x.why, lang)}
            </p>
            <button
              className="btn sm"
              style={{ marginTop: 8 }}
              disabled={active?.template === x.id}
              onClick={() => {
                if (active && !confirm(t('这会停止当前进行中的实验，继续？', 'This stops your current experiment. Continue?'))) return;
                startExperiment(x.id, t);
              }}
              type="button"
            >
              {active?.template === x.id ? t('进行中', 'Running') : t('开始 14 天实验', 'Start 14-day experiment')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
