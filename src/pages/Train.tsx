import { Icon } from '../components/Icon';
import { Sparkline } from '../components/Charts';
import { dayKey, daysBetween, shortDate } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { useData } from '../lib/store';
import { DEFAULT_LEVEL, DOMAINS, TASKS } from '../tasks/registry';

export default function Train() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const assessments = data.results.filter((r) => r.mode === 'assessment');
  const lastAssess = assessments.length ? assessments.reduce((a, b) => (b.startedAt > a.startedAt ? b : a)) : null;
  const since = lastAssess ? daysBetween(lastAssess.date, dayKey()) : null;
  const due = since === null || since >= 14;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('训练库', 'Training library')}</h1>
          <p>{t('9 个基于经典认知科学范式的练习，覆盖专注力的 7 个维度。难度会自动适应你。', '9 exercises built on classic cognitive-science paradigms, covering 7 dimensions of attention. Difficulty adapts to you.')}</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div className="icon-tile lg">
          <Icon name="clipboard" size={22} />
        </div>
        <div className="grow" style={{ minWidth: 220 }}>
          <h3>{t('专注力评估', 'Focus assessment')}</h3>
          <p className="small text-2">
            {lastAssess
              ? t('上次评估：{d}（{n} 天前）。{s}', 'Last taken {d} ({n} days ago). {s}', {
                  d: shortDate(lastAssess.date, lang),
                  n: since!,
                  s: due ? t('建议现在复测。', 'Time to retest.') : t('建议每 2 周复测一次。', 'Retest every 2 weeks.'),
                })
              : t('约 15 分钟的标准化测试，建立你的专注基线。', 'A ~15-minute standardized battery that sets your baseline.')}
          </p>
        </div>
        <button className={`btn ${due ? 'primary' : ''}`} onClick={() => navigate('/assess')} type="button">
          {lastAssess ? t('重新评估', 'Retake') : t('开始评估', 'Begin')} <Icon name="arrowRight" size={16} />
        </button>
      </div>

      {DOMAINS.map((d) => {
        const tasks = TASKS.filter((x) => x.domain === d.id);
        return (
          <section key={d.id}>
            <div className="section-title row" style={{ gap: 8 }}>
              <span className="dot" style={{ background: d.color }} />
              {bi(d.name, lang)}
            </div>
            <p className="small text-2" style={{ marginTop: -6, marginBottom: 12, maxWidth: 720 }}>
              {bi(d.desc, lang)}
            </p>
            <div className="grid grid-3">
              {tasks.map((m) => {
                const rs = data.results.filter((r) => r.task === m.id && r.mode === 'training');
                const last = rs[rs.length - 1];
                const lvl = data.levels[m.id] ?? DEFAULT_LEVEL[m.id];
                return (
                  <button key={m.id} className="task-card" style={{ ['--tile' as string]: d.color }} onClick={() => navigate(`/run/${m.id}`)} type="button">
                    <div className="row between">
                      <span className="icon-tile">
                        <Icon name={m.icon} size={19} />
                      </span>
                      <Sparkline values={rs.slice(-10).map((r) => r.score)} color={d.color} width={80} height={26} />
                    </div>
                    <div>
                      <h3>{bi(m.name, lang)}</h3>
                      <p style={{ marginTop: 3 }}>{bi(m.tagline, lang)}</p>
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                      <span className="chip">
                        <Icon name="clock" size={12} /> {m.id === 'breath' ? data.settings.breathMin : m.minutes}′
                      </span>
                      {m.maxLevel > 1 && <span className="chip">{m.levelLabel(lvl, lang)}</span>}
                      {last && <span className="chip accent">{t('上次 {s}', 'Last {s}', { s: last.score })}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
