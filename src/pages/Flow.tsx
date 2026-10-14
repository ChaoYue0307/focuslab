import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScoreRing } from '../components/ui';
import { unlockAudio } from '../lib/audio';
import { dailyPlan, domainScores, focusIndex, streak } from '../lib/analytics';
import { dayKey } from '../lib/date';
import { bi, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { getData, useData } from '../lib/store';
import type { TaskId } from '../lib/types';
import { TaskRunner } from '../tasks/TaskRunner';
import { ASSESSMENT, domainMeta, taskMeta } from '../tasks/registry';

/** Runs a sequence of tasks: today's plan or the standardized assessment battery. */
export default function Flow({ kind }: { kind: 'plan' | 'assess' }) {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const [startedAt] = useState(Date.now());
  const queue = useMemo<TaskId[]>(() => {
    if (kind === 'assess') return ASSESSMENT;
    const today = dayKey();
    const d = getData();
    const doneToday = new Set(d.results.filter((r) => r.date === today && r.mode === 'training').map((r) => r.task));
    const plan = dailyPlan(d, today).map((p) => p.task);
    const remaining = plan.filter((x) => !doneToday.has(x));
    return remaining.length ? remaining : plan;
  }, [kind]);
  const [idx, setIdx] = useState(kind === 'assess' ? -1 : 0);
  const mode = kind === 'assess' ? 'assessment' : 'training';
  const label = kind === 'assess' ? t('评估', 'Assessment') : t('今日训练', 'Today');

  if (idx === -1) {
    document.title = `${t('专注力评估', 'Focus assessment')} · FocusLab`;
    const mins = ASSESSMENT.reduce((s, x) => s + (taskMeta(x).assessMinutes ?? taskMeta(x).minutes), 0);
    return (
      <div className="stage">
        <div className="stage-top">
          <button className="icon-btn" onClick={() => navigate('/train')} aria-label={t('退出', 'Exit')} type="button">
            <Icon name="x" />
          </button>
          <span className="title">{t('专注力评估', 'Focus assessment')}</span>
        </div>
        <div className="stage-scroll">
          <div className="stage-panel fade-in">
            <div className="icon-tile lg" style={{ marginBottom: 14 }}>
              <Icon name="clipboard" size={24} />
            </div>
            <h1>{t('专注力评估', 'Focus assessment')}</h1>
            <p className="text-2" style={{ marginTop: 8, fontSize: 16 }}>
              {t(
                '约 {m} 分钟，5 项标准化测试，覆盖警觉、持续注意、抗干扰、切换与工作记忆。难度固定，便于每 2 周对比一次，客观看到你的变化。',
                'About {m} minutes: 5 standardized tests covering alertness, sustained attention, interference control, switching and working memory. Fixed difficulty, so you can compare every 2 weeks and see objective change.',
                { m: Math.round(mins) },
              )}
            </p>
            <div className="card flat stack sm" style={{ marginTop: 18 }}>
              {ASSESSMENT.map((x, i) => {
                const m = taskMeta(x);
                return (
                  <div key={x} className="row" style={{ gap: 12 }}>
                    <span className="muted tabnum" style={{ width: 16 }}>
                      {i + 1}
                    </span>
                    <span className="icon-tile" style={{ ['--tile' as string]: domainMeta(m.domain).color, width: 32, height: 32 }}>
                      <Icon name={m.icon} size={17} />
                    </span>
                    <span className="grow" style={{ fontWeight: 600 }}>
                      {bi(m.name, lang)}
                    </span>
                    <span className="small muted">~{m.assessMinutes ?? m.minutes}′</span>
                  </div>
                );
              })}
            </div>
            <div className="callout" style={{ marginTop: 14 }}>
              <Icon name="info" size={18} />
              <div>{t('找一个安静、不会被打扰的环境，用电脑键盘效果最佳。中途离开页面会让当前测试重新开始。', 'Find a quiet spot where you won’t be interrupted; a physical keyboard works best. Leaving the page restarts the current test.')}</div>
            </div>
            <button
              className="btn primary lg block"
              style={{ marginTop: 20 }}
              onClick={() => {
                unlockAudio();
                setIdx(0);
              }}
              type="button"
              autoFocus
            >
              <Icon name="play" size={16} /> {t('开始评估', 'Begin assessment')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (idx < queue.length) {
    return (
      <TaskRunner
        key={idx + queue[idx]}
        task={queue[idx]}
        mode={mode}
        flow={{ index: idx, total: queue.length, label }}
        onExit={() => navigate(kind === 'assess' ? '/train' : '/')}
        onNext={() => setIdx(idx + 1)}
      />
    );
  }

  // Summary
  const done = data.results.filter((r) => r.startedAt >= startedAt);
  document.title = `${label} · FocusLab`;
  const fi = focusIndex(domainScores(data.results));
  const st = streak(data);
  return (
    <div className="stage">
      <div className="stage-top">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label={t('关闭', 'Close')} type="button">
          <Icon name="x" />
        </button>
        <span className="title">{label}</span>
      </div>
      <div className="stage-scroll">
        <div className="stage-panel fade-in">
          <div className="row" style={{ gap: 22, flexWrap: 'wrap' }}>
            <ScoreRing value={fi} size={132} stroke={11}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{fi ?? '—'}</div>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  {t('专注指数', 'Focus Index')}
                </div>
              </div>
            </ScoreRing>
            <div className="grow stack sm">
              {done.length ? (
                <span className="chip good" style={{ alignSelf: 'flex-start' }}>
                  <Icon name="check" size={13} /> {kind === 'assess' ? t('评估完成', 'Assessment complete') : t('今日训练完成', 'Session complete')}
                </span>
              ) : (
                <span className="chip" style={{ alignSelf: 'flex-start' }}>
                  {t('已跳过', 'Skipped')}
                </span>
              )}
              <h1 style={{ fontSize: 26 }}>{!done.length ? t('下次继续', 'Next time, then') : kind === 'assess' ? t('很好，基准已更新', 'Benchmarks updated') : t('干得漂亮！', 'Nicely done!')}</h1>
              <div className="row small text-2" style={{ gap: 6 }}>
                <Icon name="flame" size={16} style={{ color: 'var(--d2)' }} />
                {t('连续 {n} 天', '{n}-day streak', { n: st.current })}
              </div>
            </div>
          </div>
          <div className="card flat" style={{ marginTop: 20, padding: 6 }}>
            <div className="list">
              {done.map((r) => {
                const m = taskMeta(r.task);
                return (
                  <div key={r.id} className="list-item" style={{ padding: '10px 10px' }}>
                    <span className="icon-tile" style={{ ['--tile' as string]: domainMeta(m.domain).color, width: 32, height: 32 }}>
                      <Icon name={m.icon} size={17} />
                    </span>
                    <span className="grow" style={{ fontWeight: 600 }}>
                      {bi(m.name, lang)}
                    </span>
                    <span className="tabnum" style={{ fontWeight: 700 }}>
                      {r.score}
                    </span>
                  </div>
                );
              })}
              {!done.length && <div className="empty">{t('这次没有完成的项目。', 'Nothing completed this time.')}</div>}
            </div>
          </div>
          <div className="callout" style={{ marginTop: 14 }}>
            <Icon name="target" size={18} />
            <div>
              {t(
                '训练让注意力"热身"完毕。现在是开始一段深度专注的最佳时机——把练出来的专注用到真正重要的事情上。',
                'Your attention is warmed up. This is the perfect moment for a deep focus session — put that focus to work on something that matters.',
              )}
            </div>
          </div>
          <div className="row" style={{ marginTop: 20, gap: 10 }}>
            <button className="btn primary lg grow" onClick={() => navigate('/focus')} type="button" autoFocus>
              <Icon name="timer" size={18} /> {t('开始深度专注', 'Start deep focus')}
            </button>
            <button className="btn lg" onClick={() => navigate(kind === 'assess' ? '/progress' : '/')} type="button">
              {kind === 'assess' ? t('查看进展', 'View progress') : t('回到今日', 'Back to Today')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
