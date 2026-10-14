import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Icon } from '../components/Icon';
import { Delta, ScoreRing, Segmented, Switch as Toggle } from '../components/ui';
import { sessionDrift, Sparkline, TrialChart } from '../components/Charts';
import { sfx, speechAvailable, unlockAudio } from '../lib/audio';
import { dayKey, fmtSeconds, uid } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { mean } from '../lib/stats';
import { update, updateSettings, useData } from '../lib/store';
import type { Lang, Mode, TaskId, TaskOutcome, TaskProps, TaskResult, TrialPoint } from '../lib/types';
import Breath from './Breath';
import { Flanker, Stroop, Switch } from './ChoiceTask';
import { useKeys, useWakeLock } from './common';
import { interpret } from './feedback';
import Mot from './Mot';
import NBack from './NBack';
import Pvt from './Pvt';
import Sart from './Sart';
import Schulte from './Schulte';
import { fmtMetric } from './format';
import { ASSESS_LEVEL, DEFAULT_LEVEL, domainMeta, taskMeta, type MetricDef } from './registry';

/** Tasks that offer a short, unscored practice round the first time. */
const PRACTICE_TASKS: TaskId[] = ['pvt', 'sart', 'flanker', 'stroop', 'switch', 'nback', 'mot'];

const COMPONENTS: Record<TaskId, ComponentType<TaskProps>> = {
  pvt: Pvt,
  sart: Sart,
  flanker: Flanker,
  stroop: Stroop,
  switch: Switch,
  nback: NBack,
  mot: Mot,
  schulte: Schulte,
  breath: Breath,
};

const metricDelta = (def: MetricDef, d: number, lang: Lang) => {
  switch (def.fmt) {
    case 'ms':
      return `${Math.round(d)} ms`;
    case 'pct':
      return `${Math.round(d * 100)} pt`;
    case 'num1':
      return d.toFixed(1);
    case 'num2':
      return d.toFixed(2);
    case 's':
      return fmtSeconds(d, lang);
    default:
      return String(Math.round(d));
  }
};

export interface FlowInfo {
  index: number;
  total: number;
  label: string;
}

type Phase = 'intro' | 'countdown' | 'run' | 'paused' | 'interrupted' | 'result';

export function TaskRunner({ task, mode, flow, onExit, onNext, autoStart }: { task: TaskId; mode: Mode; flow?: FlowInfo; onExit: () => void; onNext?: () => void; autoStart?: boolean }) {
  const data = useData();
  const { settings } = data;
  const t = useT();
  const lang = t.lang;
  const meta = taskMeta(task);
  const dom = domainMeta(meta.domain);
  const level = mode === 'assessment' ? ASSESS_LEVEL[task] ?? DEFAULT_LEVEL[task] : data.levels[task] ?? DEFAULT_LEVEL[task];
  const [phase, setPhase] = useState<Phase>(autoStart ? 'countdown' : 'intro');
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [series, setSeries] = useState<TrialPoint[] | null>(null);
  const practiceable = PRACTICE_TASKS.includes(task);
  const [practice, setPractice] = useState(() => practiceable && !data.practiced.includes(task));
  const [practiceDone, setPracticeDone] = useState(false);
  const [running, setRunning] = useState<'real' | 'practice'>('real');
  const Comp = COMPONENTS[task];

  useWakeLock(phase === 'run' || phase === 'countdown');
  useEffect(() => {
    document.title = `${bi(meta.name, lang)} · FocusLab`;
  }, [meta, lang]);

  const start = (asPractice = false) => {
    unlockAudio();
    setRunning(asPractice ? 'practice' : 'real');
    setProgress(0);
    setCount(3);
    setPhase('countdown');
  };
  const startFromIntro = () => start(practice && practiceable);

  // countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      setStartedAt(Date.now());
      setRunKey((k) => k + 1);
      setPhase('run');
      return;
    }
    sfx.tick();
    const id = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, count]);

  // Leaving the page invalidates timing-based measurements.
  useEffect(() => {
    if (phase !== 'run' || task === 'breath') return;
    const onVis = () => document.visibilityState === 'hidden' && setPhase('interrupted');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase, task]);

  useKeys((e) => {
    if (e.key === 'Escape') {
      if (phase === 'run' || phase === 'countdown') setPhase('paused');
      else if (phase === 'intro' || phase === 'result') onExit();
    } else if (e.key === 'Enter' && phase === 'intro') {
      e.preventDefault();
      startFromIntro();
    }
  });

  const onProgress = useCallback((f: number) => setProgress(f), []);

  const onComplete = useCallback(
    (o: TaskOutcome) => {
      if (running === 'practice') {
        update((d) => {
          if (!d.practiced.includes(task)) d.practiced.push(task);
        });
        sfx.good();
        setPractice(false);
        setPracticeDone(true);
        setPhase('intro');
        return;
      }
      const metrics = { ...o.metrics };
      if (o.series && o.series.length >= 8) {
        const drift = sessionDrift(o.series).rtDelta;
        if (Number.isFinite(drift)) metrics.drift = Math.round(drift);
      }
      const r: TaskResult = {
        id: uid(),
        task,
        mode,
        startedAt,
        date: dayKey(startedAt),
        hour: new Date(startedAt).getHours(),
        durationMs: Math.round(o.durationMs),
        level: o.level,
        nextLevel: o.nextLevel,
        perf: Math.round(o.perf),
        score: Math.round(o.score),
        metrics,
      };
      update((d) => {
        d.results.push(r);
        if (mode === 'training') d.levels[task] = o.nextLevel;
      });
      sfx.done();
      setSeries(o.series || null);
      setResult(r);
      setPhase('result');
    },
    [task, mode, startedAt, running],
  );

  const title = bi(meta.name, lang);

  return (
    <div className="stage" style={{ ['--tile' as string]: dom.color }}>
      <div className="stage-top">
        <button className="icon-btn" onClick={() => (phase === 'run' || phase === 'countdown' ? setPhase('paused') : onExit())} aria-label={t('退出', 'Exit')} type="button">
          <Icon name="x" />
        </button>
        <span className="title">
          {flow ? `${flow.label} · ${flow.index + 1}/${flow.total} · ` : ''}
          {title}
        </span>
        {(phase === 'run' || phase === 'countdown') && (
          <div className="progress">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {phase !== 'run' && phase !== 'countdown' && <div className="grow" />}
        {running === 'practice' && (phase === 'run' || phase === 'countdown') && <span className="chip accent">{t('练习', 'Practice')}</span>}
        {mode === 'assessment' && <span className="chip warn">{t('评估模式', 'Assessment')}</span>}
      </div>

      {phase === 'intro' && (
        <Intro
          task={task}
          level={level}
          mode={mode}
          flow={flow}
          showWhy={showWhy}
          setShowWhy={setShowWhy}
          onStart={startFromIntro}
          onSkip={onNext}
          practice={practiceable ? practice : null}
          setPractice={setPractice}
          practiceDone={practiceDone}
        />
      )}

      {phase === 'countdown' && (
        <div className="stage-body">
          <div className="countdown" key={count}>
            {count}
          </div>
          <div className="stage-hint">{bi(meta.tagline, lang)}</div>
        </div>
      )}

      {phase === 'run' && (
        <div className="stage-body" key={runKey}>
          <Comp level={level} mode={running === 'practice' ? 'training' : mode} settings={settings} lang={lang} onComplete={onComplete} onProgress={onProgress} practice={running === 'practice'} />
        </div>
      )}

      {(phase === 'paused' || phase === 'interrupted') && (
        <div className="stage-body">
          <div className="stack center fade-in" style={{ alignItems: 'center', maxWidth: 420 }}>
            <div className="icon-tile lg">
              <Icon name={phase === 'paused' ? 'pause' : 'eye'} size={24} />
            </div>
            <h2>{phase === 'paused' ? t('已暂停', 'Paused') : t('任务被中断', 'Task interrupted')}</h2>
            <p className="text-2">
              {phase === 'paused'
                ? t('注意力测量需要连续完成，暂停后需要重新开始这一项。', 'Attention measurements need to run uninterrupted, so this task restarts from the beginning.')
                : t('你离开了页面。为保证数据准确，这一项需要重新开始。', 'You left the page. To keep the data accurate, this task needs to restart.')}
            </p>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={onExit} type="button">
                {t('退出', 'Exit')}
              </button>
              <button className="btn primary" onClick={() => start(running === 'practice')} type="button" autoFocus>
                <Icon name="refresh" size={18} /> {t('重新开始', 'Restart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && result && <ResultView result={result} series={series} flow={flow} onAgain={() => start(false)} onExit={onExit} onNext={onNext} />}
    </div>
  );
}

function Intro({
  task,
  level,
  mode,
  flow,
  showWhy,
  setShowWhy,
  onStart,
  onSkip,
  practice,
  setPractice,
  practiceDone,
}: {
  task: TaskId;
  level: number;
  mode: Mode;
  flow?: FlowInfo;
  showWhy: boolean;
  setShowWhy: (v: boolean) => void;
  onStart: () => void;
  onSkip?: () => void;
  practice: boolean | null;
  setPractice: (v: boolean) => void;
  practiceDone: boolean;
}) {
  const t = useT();
  const lang = t.lang;
  const { settings } = useData();
  const meta = taskMeta(task);
  const dom = domainMeta(meta.domain);
  const minutes = task === 'breath' ? settings.breathMin : mode === 'assessment' ? meta.assessMinutes ?? meta.minutes : meta.minutes;
  return (
    <div className="stage-scroll">
      <div className="stage-panel fade-in">
        <div className="row" style={{ gap: 14, marginBottom: 18 }}>
          <div className="icon-tile lg">
            <Icon name={meta.icon} size={24} />
          </div>
          <div className="grow">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip" style={{ gap: 6 }}>
                <span className="dot" style={{ background: dom.color }} />
                {bi(dom.name, lang)}
              </span>
              <span className="chip">
                <Icon name="clock" size={13} /> ~{minutes} {t('分钟', 'min')}
              </span>
              {meta.maxLevel > 1 && <span className="chip accent">{meta.levelLabel(level, lang)}</span>}
            </div>
            <h1 style={{ marginTop: 8, fontSize: 26 }}>{bi(meta.name, lang)}</h1>
          </div>
        </div>
        <p className="text-2" style={{ fontSize: 16 }}>
          {bi(meta.tagline, lang)}
        </p>

        <div className="card flat" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>{t('怎么做', 'How it works')}</h3>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }} className="text-2">
            {meta.how.map((s, i) => (
              <li key={i}>{bi(s, lang)}</li>
            ))}
          </ol>
          <div className="row small" style={{ marginTop: 12, gap: 8 }}>
            <Icon name="keyboard" size={16} />
            <span className="muted">{t('操作', 'Controls')}:</span>
            <span>{bi(meta.keys, lang)}</span>
          </div>
        </div>

        {task === 'nback' && (
          <div className="card flat" style={{ marginTop: 12 }}>
            <div className="row between">
              <div>
                <div style={{ fontWeight: 600 }}>{t('双任务模式（位置 + 字母）', 'Dual mode (position + letter)')}</div>
                <div className="small muted">{t('更难，但更全面地训练工作记忆', 'Harder, but trains working memory more broadly')}</div>
              </div>
              <Toggle on={settings.nbackDual} onChange={(v) => updateSettings({ nbackDual: v })} label={t('双任务模式（位置 + 字母）', 'Dual mode (position + letter)')} />
            </div>
            {settings.nbackDual && (
              <div className="row between" style={{ marginTop: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t('朗读字母（需要声音）', 'Speak letters (needs sound)')}</div>
                  <div className="small muted">{speechAvailable() ? t('关闭后字母显示在方块中', 'When off, letters appear in the square') : t('此浏览器不支持语音，将显示字母', 'Speech not supported here — letters will be shown')}</div>
                </div>
                <Toggle on={settings.nbackAudio} onChange={(v) => updateSettings({ nbackAudio: v })} label={t('朗读字母（需要声音）', 'Speak letters (needs sound)')} />
              </div>
            )}
          </div>
        )}

        {task === 'breath' && (
          <div className="card flat row between" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600 }}>{t('时长', 'Duration')}</div>
            <Segmented value={settings.breathMin} onChange={(v) => updateSettings({ breathMin: v })} options={[3, 5, 10, 15].map((v) => ({ value: v, label: `${v}′` }))} />
          </div>
        )}

        <button className="btn ghost sm" style={{ marginTop: 12, paddingLeft: 4 }} onClick={() => setShowWhy(!showWhy)} type="button">
          <Icon name={showWhy ? 'chevronDown' : 'chevronRight'} size={16} /> {t('为什么有效 · 科学依据', 'Why it works · the science')}
        </button>
        {showWhy && (
          <div className="fade-in text-2" style={{ padding: '4px 4px 0', lineHeight: 1.75 }}>
            <p>{bi(meta.why, lang)}</p>
            <p className="small muted" style={{ marginTop: 8 }}>
              {t('依据', 'Based on')}: {meta.basedOn}
            </p>
          </div>
        )}

        {task === 'stroop' && settings.stroopCvd && (
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('已启用色觉友好配色：蓝 / 黄 / 灰（D F J 或 1–3）。', 'Colour-vision-friendly palette on: blue / yellow / grey (D F J or 1–3).')}
          </p>
        )}

        {practiceDone && (
          <div className="callout good" style={{ marginTop: 14 }}>
            <Icon name="check" size={18} />
            <div>{t('练习完成！规则清楚了的话，现在开始正式一轮——这一轮会被记录。', 'Practice done! If the rules are clear, start the real round now — this one is recorded.')}</div>
          </div>
        )}

        {practice !== null && (
          <div className="card flat row between" style={{ marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t('先做一段短练习（不计分）', 'Do a short practice round first (not scored)')}</div>
              <div className="small muted">{t('约 30 秒，带即时反馈。第一次做这个练习时推荐。', '~30 seconds with instant feedback. Recommended the first time.')}</div>
            </div>
            <Toggle on={practice} onChange={setPractice} label={t('先做一段短练习（不计分）', 'Do a short practice round first (not scored)')} />
          </div>
        )}

        {mode === 'assessment' && (
          <p className="small muted" style={{ marginTop: 12 }}>
            {t('评估使用固定难度，以便和以后的评估直接比较。', 'Assessments use fixed difficulty so you can compare them directly over time.')}
          </p>
        )}

        <div className="row" style={{ marginTop: 22, gap: 10 }}>
          <button className="btn primary lg grow" onClick={onStart} type="button" autoFocus>
            <Icon name="play" size={16} /> {practice ? t('开始练习', 'Start practice') : t('开始', 'Start')}
            <span className="kbd" style={{ background: 'transparent', color: 'inherit', borderColor: 'rgba(255,255,255,.4)' }}>
              Enter
            </span>
          </button>
          {flow && onSkip && (
            <button className="btn lg" onClick={onSkip} type="button">
              {t('跳过', 'Skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, series, flow, onAgain, onExit, onNext }: { result: TaskResult; series: TrialPoint[] | null; flow?: FlowInfo; onAgain: () => void; onExit: () => void; onNext?: () => void }) {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const meta = taskMeta(result.task);
  const prev = useMemo(() => data.results.filter((r) => r.task === result.task && r.id !== result.id && r.mode === result.mode), [data.results, result]);
  const history = useMemo(
    () =>
      data.results
        .filter((r) => r.task === result.task && r.mode === result.mode)
        .slice(-12)
        .map((r) => r.score),
    [data.results, result],
  );
  const prevAvg = prev.length ? mean(prev.slice(-5).map((r) => r.score)) : null;
  const best = prev.length ? Math.max(...prev.map((r) => r.score)) : null;
  const isBest = best !== null && result.score > best;
  const tips = interpret(result.task, result.metrics);
  const lvlChange = result.nextLevel - result.level;

  useKeys((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (flow && onNext) onNext();
      else onExit();
    }
  });

  return (
    <div className="stage-scroll">
      <div className="stage-panel fade-in">
        <div className="row" style={{ gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <ScoreRing value={result.score} size={132} stroke={11}>
            <div>
              <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{result.score}</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {t('训练分', 'Score')}
              </div>
            </div>
          </ScoreRing>
          <div className="grow stack sm" style={{ minWidth: 200 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {isBest && (
                <span className="chip good">
                  <Icon name="trophy" size={13} /> {t('个人最佳', 'Personal best')}
                </span>
              )}
              {meta.maxLevel > 1 && result.mode === 'training' && (
                <span className={`chip ${lvlChange > 0 ? 'accent' : ''}`}>
                  {lvlChange > 0 ? t('升级 → {l}', 'Level up → {l}', { l: meta.levelLabel(result.nextLevel, lang) }) : lvlChange < 0 ? t('下次：{l}', 'Next: {l}', { l: meta.levelLabel(result.nextLevel, lang) }) : t('保持 {l}', 'Stay at {l}', { l: meta.levelLabel(result.level, lang) })}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 22 }}>{bi(meta.name, lang)}</h2>
            <div className="row small text-2" style={{ gap: 14, flexWrap: 'wrap' }}>
              {prevAvg !== null ? (
                <span>
                  {t('对比近期平均', 'vs recent avg')} <Delta value={result.score - prevAvg} better="high" />
                </span>
              ) : (
                <span>{t('第一次记录——这是你的基线。', 'First run — this is your baseline.')}</span>
              )}
              {history.length > 2 && <Sparkline values={history} color="var(--tile)" />}
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 22, gap: 10 }}>
          {meta.metrics.map((def) => {
            const v = result.metrics[def.key];
            const pv = prev.length ? mean(prev.slice(-5).map((r) => r.metrics[def.key]).filter(Number.isFinite)) : NaN;
            return (
              <div key={def.key} className="card flat" style={{ padding: 14 }}>
                <div className="stat-label" title={def.hint ? bi(def.hint, lang) : undefined}>
                  {bi(def.label, lang)}
                </div>
                <div className="row between" style={{ alignItems: 'baseline' }}>
                  <div className="stat-value" style={{ fontSize: 22 }}>
                    {fmtMetric(def, v, lang)}
                  </div>
                  {Number.isFinite(pv) && def.better !== 'none' && <Delta value={v - pv} better={def.better} fmt={(d) => metricDelta(def, d, lang)} />}
                </div>
                {def.hint && <div className="tiny muted">{bi(def.hint, lang)}</div>}
              </div>
            );
          })}
        </div>

        {series && series.length >= 8 && <SessionTimeline series={series} />}

        {tips.length > 0 && (
          <div className="stack sm" style={{ marginTop: 16 }}>
            {tips.map((tip, i) => (
              <div key={i} className={`callout ${tip.tone === 'info' ? '' : tip.tone}`}>
                <Icon name={tip.tone === 'good' ? 'sparkles' : tip.tone === 'warn' ? 'info' : 'brain'} size={18} />
                <div>{bi(tip.text, lang, tip.vars)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 22, gap: 10, flexWrap: 'wrap' }}>
          {flow && onNext ? (
            <>
              <button className="btn primary lg grow" onClick={onNext} type="button" autoFocus>
                {flow.index + 1 >= flow.total ? t('查看总结', 'See summary') : t('下一项', 'Next')} <Icon name="arrowRight" size={18} />
              </button>
              <button className="btn lg" onClick={onAgain} type="button">
                <Icon name="refresh" size={18} /> {t('再做一次', 'Retry')}
              </button>
            </>
          ) : (
            <>
              <button className="btn primary lg grow" onClick={onExit} type="button" autoFocus>
                {t('完成', 'Done')}
              </button>
              <button className="btn lg" onClick={onAgain} type="button">
                <Icon name="refresh" size={18} /> {t('再来一次', 'Again')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionTimeline({ series }: { series: TrialPoint[] }) {
  const t = useT();
  const { rtDelta, errDelta } = sessionDrift(series);
  let verdict: string;
  if (Number.isFinite(rtDelta) && (rtDelta > 25 || errDelta >= 3))
    verdict = t('后半程比前半程慢 {ms} ms{e}——注意力随时间衰减了。这正是持续注意要练的：最后几分钟也要"在场"。', 'The second half was {ms} ms slower{e} — attention faded over time. That is exactly what sustained-attention practice targets: stay present to the very end.', {
      ms: Math.max(0, Math.round(rtDelta)),
      e: errDelta >= 2 ? t('，错误多了 {n} 次', ', with {n} more errors', { n: errDelta }) : '',
    });
  else if (Number.isFinite(rtDelta) && rtDelta < -25) verdict = t('后半程反而更快了 {ms} ms：你在逐渐进入状态。', 'You got {ms} ms faster in the second half: you warmed into it.', { ms: Math.round(-rtDelta) });
  else verdict = t('前后半程基本稳定，注意力保持得很好。', 'First and second halves were steady — attention held up well.');
  return (
    <div className="card flat" style={{ marginTop: 16 }}>
      <div className="card-head" style={{ marginBottom: 6 }}>
        <h3>{t('注意力随时间的变化', 'Attention across the session')}</h3>
      </div>
      <p className="small text-2" style={{ marginBottom: 8 }}>
        {verdict}
      </p>
      <TrialChart series={series} lang={t.lang} />
    </div>
  );
}
