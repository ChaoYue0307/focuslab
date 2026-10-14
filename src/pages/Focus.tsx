import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Segmented, Switch, toast } from '../components/ui';
import { setNoiseVolume, sfx, startNoise, stopNoise, unlockAudio } from '../lib/audio';
import { focusMsOn } from '../lib/analytics';
import { dayKey, fmtDuration, fmtMinutes, shortDate, uid } from '../lib/date';
import { DISTRACTION_KINDS } from '../content/habits';
import { elapsedOf, loadActive, nextProbe, PROBE_TIMEOUT_MS, probeAllowed, saveActive, type Active } from '../lib/focusActive';
import { bi, useT } from '../lib/i18n';
import { update, updateSettings, useData } from '../lib/store';
import type { DistractionKind, FocusSession, NoiseType, ProbeState } from '../lib/types';
import { useWakeLock } from '../tasks/common';

type Phase = 'setup' | 'primer' | 'running' | 'review' | 'break';

export default function Focus() {
  const t = useT();
  const data = useData();
  const { settings } = data;
  const [active, setActive] = useState<Active | null>(() => loadActive());
  const [phase, setPhase] = useState<Phase>(() => (loadActive() ? 'running' : 'setup'));
  const [intention, setIntention] = useState('');
  const [ifThen, setIfThen] = useState('');
  const [minutes, setMinutes] = useState(settings.focusMin);
  const [primer, setPrimer] = useState(true);
  const [trackAway, setTrackAway] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState<FocusSession | null>(null);

  const persist = (a: Active | null) => {
    setActive(a);
    saveActive(a);
  };

  const begin = () => {
    unlockAudio();
    if (primer) setPhase('primer');
    else startSession();
  };

  const startSession = () => {
    const a: Active = {
      id: uid(),
      startedAt: Date.now(),
      plannedMin: minutes,
      intention: intention.trim(),
      ifThen: ifThen.trim(),
      pausedTotal: 0,
      pausedAt: null,
      pauses: 0,
      distractions: [],
      trackAway,
      awayCount: 0,
      awayMs: 0,
      awayAt: null,
      noise: settings.noise,
      probes: [],
      probeEvery: settings.probes ? settings.probeMin : 0,
      nextProbeAt: nextProbe(0, settings.probes ? settings.probeMin : 0),
      probeOpenAt: null,
    };
    persist(a);
    updateSettings({ focusMin: minutes });
    sfx.start();
    setPhase('running');
  };

  const finish = (a: Active, completed: boolean) => {
    const now = Date.now();
    const focusMs = Math.min(a.plannedMin * 60000, Math.max(0, elapsedOf(a, now)));
    if (!completed && focusMs < 60000) {
      // An accidental start — don't pollute the stats.
      persist(null);
      stopNoise();
      setIntention(a.intention);
      setPhase('setup');
      toast(t('不足 1 分钟，未记录', 'Under a minute — not recorded'));
      return;
    }
    const s: FocusSession = {
      id: a.id,
      startedAt: a.startedAt,
      date: dayKey(a.startedAt),
      hour: new Date(a.startedAt).getHours(),
      plannedMin: a.plannedMin,
      focusMs,
      intention: a.intention,
      distractions: a.distractions,
      awayCount: a.awayCount,
      awayMs: a.awayMs + (a.awayAt ? now - a.awayAt : 0),
      pauses: a.pauses,
      completed,
      probes: a.probes,
      noise: a.noise,
    };
    update((d) => {
      d.sessions.push(s);
    });
    persist(null);
    stopNoise();
    setFinished(s);
    setPhase('review');
  };

  return (
    <>
      {phase === 'setup' && (
        <Setup
          {...{ intention, setIntention, ifThen, setIfThen, minutes, setMinutes, primer, setPrimer, trackAway, setTrackAway, checks, setChecks }}
          onStart={begin}
        />
      )}
      {phase === 'primer' && <Primer onDone={startSession} />}
      {phase === 'running' && active && <Running active={active} persist={persist} onFinish={finish} />}
      {phase === 'review' && finished && (
        <Review
          session={finished}
          onSave={(patch, next) => {
            update((d) => {
              const s = d.sessions.find((x) => x.id === finished.id);
              if (s) Object.assign(s, patch);
            });
            if (next === 'break') setPhase('break');
            else {
              setPhase('setup');
              toast(t('专注已记录', 'Session saved'));
            }
          }}
        />
      )}
      {phase === 'break' && (
        <Break
          minutes={settings.breakMin}
          onDone={(again) => {
            if (again) {
              setIntention(finished?.intention || '');
              setPhase('setup');
            } else setPhase('setup');
          }}
        />
      )}
      {phase === 'setup' && <FocusStats />}
    </>
  );
}

// ---------------- Setup ----------------
function Setup(p: {
  intention: string;
  setIntention: (s: string) => void;
  ifThen: string;
  setIfThen: (s: string) => void;
  minutes: number;
  setMinutes: (n: number) => void;
  primer: boolean;
  setPrimer: (b: boolean) => void;
  trackAway: boolean;
  setTrackAway: (b: boolean) => void;
  checks: Record<string, boolean>;
  setChecks: (c: Record<string, boolean>) => void;
  onStart: () => void;
}) {
  const t = useT();
  const data = useData();
  const { settings } = data;
  const presets = [15, 25, 50, 90];
  const suggestion = useMemo(() => {
    const recent = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
    if (recent.length < 3) return null;
    const ok = recent.every((s) => s.completed && (s.rating ?? 0) >= 4 && s.plannedMin === recent[0].plannedMin);
    return ok && recent[0].plannedMin < 120 ? recent[0].plannedMin + (recent[0].plannedMin < 50 ? 5 : 10) : null;
  }, [data.sessions]);
  const checklist = [
    { id: 'phone', icon: 'phone', label: t('手机已放远 / 勿扰模式', 'Phone away / Do Not Disturb') },
    { id: 'tabs', icon: 'monitor', label: t('只保留需要的窗口和标签页', 'Only the windows and tabs you need') },
    { id: 'water', icon: 'coffee', label: t('水已备好', 'Water within reach') },
    { id: 'next', icon: 'target', label: t('知道第一步要做什么', 'You know the very first step') },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('深度专注', 'Deep focus')}</h1>
          <p>{t('把训练出来的专注用到真正重要的事情上。', 'Put your trained attention to work on what matters.')}</p>
        </div>
      </div>
      <div className="grid grid-main">
        <div className="card pad-lg stack lg">
          <div className="field">
            <label htmlFor="intention">{t('这段时间要完成什么？', 'What will you get done?')}</label>
            <textarea
              id="intention"
              className="input"
              placeholder={t('具体、可检验，例如："写完报告第 2 节的初稿"', 'Concrete and checkable, e.g. "Draft section 2 of the report"')}
              value={p.intention}
              onChange={(e) => p.setIntention(e.target.value)}
              rows={2}
            />
          </div>
          <div className="field">
            <label htmlFor="ifthen">
              {t('如果想分心，我会……', 'If I feel the urge to switch, I will…')} <span className="muted">({t('可选', 'optional')})</span>
            </label>
            <input id="ifthen" className="input" placeholder={t('例如："按 D 记下来，然后回到当前这一句"', 'e.g. "press D to note it, then return to the current sentence"')} value={p.ifThen} onChange={(e) => p.setIfThen(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">{t('时长', 'Duration')}</span>
            <div className="row wrap">
              <Segmented value={presets.includes(p.minutes) ? p.minutes : -1} onChange={(v) => v > 0 && p.setMinutes(v)} options={presets.map((v) => ({ value: v, label: `${v}′` }))} />
              <input
                type="number"
                className="input"
                min={5}
                max={180}
                value={p.minutes}
                onChange={(e) => p.setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 25)))}
                style={{ width: 86 }}
                aria-label={t('自定义分钟', 'Custom minutes')}
              />
              {suggestion && suggestion !== p.minutes && (
                <button className="chip accent" style={{ cursor: 'pointer' }} onClick={() => p.setMinutes(suggestion)} type="button">
                  <Icon name="trophy" size={13} /> {t('试试 {m} 分钟？', 'Try {m} min?', { m: suggestion })}
                </button>
              )}
            </div>
          </div>
          <div className="field">
            <span className="label">{t('背景声音', 'Background sound')}</span>
            <div className="row wrap">
              <Segmented<NoiseType>
                value={settings.noise}
                onChange={(v) => updateSettings({ noise: v })}
                options={[
                  { value: 'off', label: t('无', 'Off') },
                  { value: 'brown', label: t('棕噪音', 'Brown') },
                  { value: 'pink', label: t('粉噪音', 'Pink') },
                  { value: 'white', label: t('白噪音', 'White') },
                  { value: 'rain', label: t('雨声', 'Rain') },
                ]}
              />
            </div>
          </div>
          <div className="field">
            <span className="label">{t('专注抽查（随机轻提示：此刻注意力在哪？）', 'Attention probes (random gentle chime: where is your attention?)')}</span>
            <div className="row wrap">
              <Segmented
                value={settings.probes ? settings.probeMin : 0}
                onChange={(v) => updateSettings(v ? { probes: true, probeMin: v } : { probes: false })}
                options={[
                  { value: 0, label: t('关', 'Off') },
                  { value: 5, label: t('约 5 分钟', '~5 min') },
                  { value: 10, label: t('约 10 分钟', '~10 min') },
                  { value: 15, label: t('约 15 分钟', '~15 min') },
                ]}
              />
            </div>
            <span className="tiny muted">
              {t('经验取样是研究走神的标准方法。每次如实回答，都是在训练"发现自己走神"的能力。', 'Experience sampling is how researchers measure mind-wandering. Each honest answer trains the skill of noticing that you drifted.')}
            </span>
          </div>
          <div className="stack sm">
            <div className="row between">
              <div>
                <div style={{ fontWeight: 600 }}>{t('开始前 1 分钟慢呼吸', '1-minute slow breathing first')}</div>
                <div className="small muted">{t('约 6 次/分的慢呼吸，帮助平稳进入状态', 'About 6 breaths/min to settle in')}</div>
              </div>
              <Switch on={p.primer} onChange={p.setPrimer} label={t('开始前 1 分钟慢呼吸', '1-minute slow breathing first')} />
            </div>
            <div className="row between">
              <div>
                <div style={{ fontWeight: 600 }}>{t('记录离开本页面', 'Track leaving this page')}</div>
                <div className="small muted">{t('仅当你的工作就在这个浏览器标签页中时开启', 'Only if your work happens in this browser tab')}</div>
              </div>
              <Switch on={p.trackAway} onChange={p.setTrackAway} label={t('记录离开本页面', 'Track leaving this page')} />
            </div>
          </div>
          <button className="btn primary lg block" onClick={p.onStart} type="button">
            <Icon name="play" size={16} /> {t('开始 {m} 分钟专注', 'Start {m}-minute focus', { m: p.minutes })}
          </button>
        </div>
        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>{t('开始前检查', 'Pre-flight check')}</h3>
            <div className="stack sm">
              {checklist.map((c) => (
                <button
                  key={c.id}
                  className={`plan-item ${p.checks[c.id] ? 'done' : ''}`}
                  style={{ padding: '9px 10px' }}
                  onClick={() => p.setChecks({ ...p.checks, [c.id]: !p.checks[c.id] })}
                  type="button"
                >
                  <span className="plan-check" style={{ width: 20, height: 20 }}>
                    {p.checks[c.id] && <Icon name="check" size={12} stroke={3} />}
                  </span>
                  <Icon name={c.icon} size={17} />
                  <span className="small" style={{ fontWeight: 550 }}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <ParkingLot />
        </div>
      </div>
    </>
  );
}

// ---------------- Primer (slow breathing) ----------------
function Primer({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [left, setLeft] = useState(60);
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    // 4 s in, 6 s out ≈ 6 breaths per minute
    const el = 60 - left;
    setInhale(el % 10 < 4);
    if (left <= 0) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  return (
    <div className="focus-full">
      <div className="stack center" style={{ alignItems: 'center', gap: 26 }}>
        <div className="muted small">{t('跟随圆圈呼吸', 'Breathe with the circle')}</div>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 55%, transparent), color-mix(in srgb, var(--accent) 12%, transparent) 70%)',
            transform: `scale(${inhale ? 1 : 0.62})`,
            transition: `transform ${inhale ? 4 : 6}s ease-in-out`,
          }}
        />
        <h2 style={{ fontSize: 26 }}>{inhale ? t('吸气', 'Breathe in') : t('呼气', 'Breathe out')}</h2>
        <div className="tabnum muted">{left}s</div>
        <button className="btn ghost" onClick={onDone} type="button">
          {t('跳过', 'Skip')} →
        </button>
      </div>
    </div>
  );
}

// ---------------- Running ----------------
function Running({ active, persist, onFinish }: { active: Active; persist: (a: Active | null) => void; onFinish: (a: Active, completed: boolean) => void }) {
  const t = useT();
  const { settings } = useData();
  const [now, setNow] = useState(Date.now());
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<DistractionKind>('thought');
  const [probeFb, setProbeFb] = useState<ProbeState | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [awayBanner, setAwayBanner] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const ref = useRef(active);
  ref.current = active;
  const total = active.plannedMin * 60000;
  const elapsed = elapsedOf(active, now);
  const remaining = Math.max(0, total - elapsed);
  const paused = active.pausedAt !== null;
  useWakeLock(!paused);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Attention probes (experience sampling)
  const probeOpen = active.probeOpenAt !== null;
  useEffect(() => {
    const a = ref.current;
    if (paused || !a.probeEvery) return;
    const el = elapsedOf(a, now);
    if (a.probeOpenAt === null) {
      if (el >= a.nextProbeAt && probeAllowed(el, total)) {
        persist({ ...a, probeOpenAt: el });
        sfx.probe();
        if (settings.notify && document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('FocusLab', { body: t('专注抽查：此刻你的注意力在哪里？', 'Attention probe: where is your attention right now?'), silent: true });
          } catch {
            /* ignore */
          }
        }
      }
    } else if (el - a.probeOpenAt > PROBE_TIMEOUT_MS) {
      persist({ ...a, probes: [...a.probes, { t: a.probeOpenAt, state: 'missed' }], probeOpenAt: null, nextProbeAt: nextProbe(el, a.probeEvery) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, paused]);

  const answerProbe = (state: ProbeState) => {
    const a = ref.current;
    if (a.probeOpenAt === null) return;
    const el = elapsedOf(a);
    persist({ ...a, probes: [...a.probes, { t: a.probeOpenAt, state }], probeOpenAt: null, nextProbeAt: nextProbe(el, a.probeEvery) });
    setProbeFb(state);
    window.setTimeout(() => setProbeFb((f) => (f === state ? null : f)), 4500);
  };

  // background noise
  useEffect(() => {
    if (!paused && settings.noise !== 'off') startNoise(settings.noise, settings.noiseVolume);
    else stopNoise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, settings.noise]);
  useEffect(() => setNoiseVolume(settings.noiseVolume), [settings.noiseVolume]);
  useEffect(() => () => stopNoise(), []);

  // completion
  useEffect(() => {
    if (remaining > 0 || paused) return;
    sfx.bell();
    if (settings.notify && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      try {
        new Notification('FocusLab', { body: t('专注完成！休息一下。', 'Focus session complete! Take a break.') });
      } catch {
        /* ignore */
      }
    }
    onFinish(ref.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  // tab title
  useEffect(() => {
    document.title = `${paused ? '⏸' : '●'} ${fmtDuration(remaining)} · FocusLab`;
  }, [remaining, paused]);
  useEffect(() => () => void (document.title = 'FocusLab'), []);

  // leaving the page
  useEffect(() => {
    if (!active.trackAway) return;
    const onVis = () => {
      const a = ref.current;
      if (document.visibilityState === 'hidden') persist({ ...a, awayCount: a.awayCount + 1, awayAt: Date.now() });
      else if (a.awayAt) {
        const dur = Date.now() - a.awayAt;
        persist({ ...a, awayMs: a.awayMs + dur, awayAt: null });
        if (dur > 5000) setAwayBanner(dur);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active.trackAway, persist]);

  const togglePause = () => {
    const a = ref.current;
    if (a.pausedAt) persist({ ...a, pausedTotal: a.pausedTotal + (Date.now() - a.pausedAt), pausedAt: null });
    else persist({ ...a, pausedAt: Date.now(), pauses: a.pauses + 1 });
  };

  const saveNote = () => {
    const text = note.trim() || t('（未命名的分心）', '(unnamed distraction)');
    const a = ref.current;
    persist({ ...a, distractions: [...a.distractions, { t: elapsedOf(a), text, kind }] });
    if (note.trim()) {
      update((d) => {
        d.parking.push({ id: uid(), text: note.trim(), createdAt: Date.now(), done: false });
      });
    }
    setNote('');
    setKind('thought');
    setNoting(false);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (noting) {
        if (e.key === 'Escape') setNoting(false);
        return;
      }
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (ref.current.probeOpenAt !== null && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        answerProbe((['on', 'mw', 'ext'] as const)[Number(e.key) - 1]);
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setNoting(true);
      } else if (e.key === 'p' || e.key === 'P') togglePause();
      else if (e.key === 'Escape' && immersive) setImmersive(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const toggleImmersive = () => {
    const next = !immersive;
    setImmersive(next);
    try {
      if (next && !document.fullscreenElement) void document.documentElement.requestFullscreen?.();
      if (!next && document.fullscreenElement) void document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  const r = 140;
  const c = 2 * Math.PI * r;
  const body = (
    <div className="focus-stage fade-in">
      {awayBanner !== null && (
        <div className="callout warn" style={{ maxWidth: 560 }}>
          <Icon name="eye" size={18} />
          <div className="grow">
            {t('你离开了 {d}。欢迎回来——继续：', 'You were away for {d}. Welcome back — continue with:', { d: fmtDuration(awayBanner) })} <b>{active.intention || t('当前任务', 'your task')}</b>
          </div>
          <button className="icon-btn" onClick={() => setAwayBanner(null)} type="button" aria-label={t('关闭', 'Close')}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
      <div className="ring-wrap">
        <svg viewBox="0 0 320 320">
          <circle cx="160" cy="160" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="12" />
          <circle cx="160" cy="160" r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - remaining / total)} style={{ transition: 'stroke-dashoffset .3s linear' }} />
        </svg>
        <div className="ring-center">
          <div className="ring-time" style={{ opacity: paused ? 0.45 : 1 }}>
            {fmtDuration(remaining)}
          </div>
          <div className="small muted">{paused ? t('已暂停', 'Paused') : t('专注中', 'Focusing')}</div>
        </div>
      </div>
      {probeOpen && (
        <div className="probe-card" role="alertdialog" aria-label={t('专注抽查', 'Attention probe')}>
          <div style={{ fontWeight: 650, marginBottom: 10 }}>{t('此刻，你的注意力在哪里？', 'Right now, where is your attention?')}</div>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => answerProbe('on')} type="button">
              <span className="kbd">1</span> {t('在任务上', 'On task')}
            </button>
            <button className="btn" onClick={() => answerProbe('mw')} type="button">
              <span className="kbd">2</span> {t('走神了', 'Mind wandered')}
            </button>
            <button className="btn" onClick={() => answerProbe('ext')} type="button">
              <span className="kbd">3</span> {t('被外界打断', 'Interrupted')}
            </button>
          </div>
        </div>
      )}
      {probeFb && !probeOpen && (
        <div className={`callout ${probeFb === 'on' ? 'good' : ''}`} style={{ maxWidth: 520 }}>
          <Icon name={probeFb === 'on' ? 'check' : probeFb === 'mw' ? 'sparkles' : 'info'} size={18} />
          <div>
            {probeFb === 'on'
              ? t('很好，继续保持。', 'Nice — keep going.')
              : probeFb === 'mw'
                ? t('很好，你发现了它——这正是在训练元觉察。温和地回到：', 'Good catch — that is meta-awareness in action. Gently return to: ')
                : t('处理完就回来，需要的话按 D 记一笔。回到：', 'Deal with it, then come back — press D to park it if needed. Return to: ')}
            {probeFb !== 'on' && <b>{active.intention || t('当前任务', 'your task')}</b>}
          </div>
        </div>
      )}
      {active.intention && <div className="intention">{active.intention}</div>}
      {active.ifThen && (
        <div className="small muted" style={{ marginTop: -10 }}>
          {t('如果想分心：', 'If distracted: ')}
          {active.ifThen}
        </div>
      )}
      {noting ? (
        <div className="stack sm" style={{ width: 'min(560px, 100%)', alignItems: 'stretch' }}>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
            {DISTRACTION_KINDS.map((k) => (
              <button key={k.id} type="button" className={`chip ${kind === k.id ? 'accent' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setKind(k.id)}>
                <Icon name={k.icon} size={13} /> {bi(k.label, t.lang)}
              </button>
            ))}
          </div>
        <div className="row">
          <input
            className="input"
            autoFocus
            placeholder={t('分心的念头是什么？回车保存后回到任务', 'What pulled you? Enter to park it and return')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNote();
            }}
          />
          <button className="btn primary" onClick={saveNote} type="button">
            {t('停车', 'Park')}
          </button>
        </div>
        </div>
      ) : (
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => setNoting(true)} type="button">
            <Icon name="pencil" size={16} /> {t('记录分心', 'Log distraction')} <span className="kbd">D</span>
          </button>
          <button className="btn" onClick={togglePause} type="button">
            <Icon name={paused ? 'play' : 'pause'} size={16} /> {paused ? t('继续', 'Resume') : t('暂停', 'Pause')} <span className="kbd">P</span>
          </button>
          <button className="btn" onClick={toggleImmersive} type="button" aria-label={t('沉浸模式', 'Immersive')}>
            <Icon name={immersive ? 'minimize' : 'maximize'} size={16} />
          </button>
          <button className="btn ghost" onClick={() => setConfirmEnd(true)} type="button">
            <Icon name="stop" size={14} /> {t('结束', 'End')}
          </button>
        </div>
      )}
      {confirmEnd && (
        <div className="callout" style={{ maxWidth: 520, alignItems: 'center' }}>
          <Icon name="info" size={18} />
          <div className="grow">{t('提前结束？已专注的时间仍会被记录。', 'End early? Time focused so far is still recorded.')}</div>
          <button className="btn sm" onClick={() => setConfirmEnd(false)} type="button">
            {t('继续专注', 'Keep going')}
          </button>
          <button className="btn sm primary" onClick={() => onFinish(ref.current, false)} type="button">
            {t('结束', 'End')}
          </button>
        </div>
      )}
      <div className="row small muted" style={{ gap: 18 }}>
        <span>
          {t('分心记录', 'Distractions')}: <b className="tabnum">{active.distractions.length}</b>
        </span>
        {active.trackAway && (
          <span>
            {t('离开页面', 'Left page')}: <b className="tabnum">{active.awayCount}</b>
          </span>
        )}
        {settings.noise !== 'off' && (
          <span className="row" style={{ gap: 6 }}>
            <Icon name="volume" size={15} />
            <input type="range" min={0.02} max={1} step={0.02} value={settings.noiseVolume} onChange={(e) => updateSettings({ noiseVolume: Number(e.target.value) })} style={{ width: 90 }} aria-label={t('音量', 'Volume')} />
          </span>
        )}
      </div>
      {!immersive && (
        <p className="tiny muted center" style={{ maxWidth: 440 }}>
          {t('提示：可以切到其他应用工作，计时会继续。标签页标题会显示剩余时间。', 'Tip: switch to your work app freely — the timer keeps running and the tab title shows the time left.')}
        </p>
      )}
    </div>
  );
  return immersive ? <div className="focus-full">{body}</div> : body;
}

// ---------------- Review ----------------
function Review({ session, onSave }: { session: FocusSession; onSave: (patch: Partial<FocusSession>, next: 'break' | 'done') => void }) {
  const t = useT();
  const lang = t.lang;
  const [rating, setRating] = useState(0);
  const [outcome, setOutcome] = useState<FocusSession['outcome']>(undefined);
  const answered = (session.probes || []).filter((p) => p.state !== 'missed');
  const labels = [t('很散', 'Scattered'), t('经常走神', 'Drifty'), t('一般', 'Okay'), t('专注', 'Focused'), t('心流', 'Flow')];
  return (
    <div className="focus-stage fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="icon-tile lg" style={{ ['--tile' as string]: 'var(--good)' }}>
        <Icon name="check" size={24} />
      </div>
      <div className="center">
        <h1>{session.completed ? t('专注完成！', 'Session complete!') : t('已结束', 'Session ended')}</h1>
        <p className="text-2" style={{ marginTop: 6 }}>
          {t('专注 {m} · 记录分心 {d} 次', '{m} focused · {d} distractions logged', { m: fmtMinutes(session.focusMs, lang), d: session.distractions.length })}
        </p>
        {answered.length > 0 && (
          <p className="small text-2" style={{ marginTop: 4 }}>
            {t('专注抽查 {n} 次：{on} 次在任务上 · {mw} 次走神 · {ext} 次被打断', 'Probes {n}: {on} on task · {mw} mind-wandering · {ext} interrupted', {
              n: answered.length,
              on: answered.filter((p) => p.state === 'on').length,
              mw: answered.filter((p) => p.state === 'mw').length,
              ext: answered.filter((p) => p.state === 'ext').length,
            })}
          </p>
        )}
      </div>
      <div className="card" style={{ width: '100%' }}>
        <div className="stack lg">
          <div className="field">
            <span className="label">{t('这段时间你有多专注？', 'How focused were you?')}</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {labels.map((l, i) => (
                <button key={i} className={`btn sm ${rating === i + 1 ? 'primary' : ''}`} onClick={() => setRating(i + 1)} type="button">
                  {i + 1} · {l}
                </button>
              ))}
            </div>
          </div>
          {session.intention && (
            <div className="field">
              <span className="label">
                {t('完成了吗：', 'Did you finish: ')}
                <span style={{ color: 'var(--text)' }}>{session.intention}</span>
              </span>
              <Segmented<string>
                value={outcome || ''}
                onChange={(v) => setOutcome(v as FocusSession['outcome'])}
                options={[
                  { value: 'done', label: t('完成', 'Yes') },
                  { value: 'partial', label: t('部分', 'Partly') },
                  { value: 'no', label: t('没有', 'No') },
                ]}
              />
            </div>
          )}
          {session.distractions.length > 0 && (
            <div className="field">
              <span className="label">{t('分心记录（已放入停车场）', 'Distractions (saved to parking lot)')}</span>
              <div className="stack sm small text-2">
                {session.distractions.map((d, i) => (
                  <div key={i} className="row">
                    <span className="tabnum muted" style={{ width: 44 }}>
                      {fmtDuration(d.t)}
                    </span>
                    {d.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="row" style={{ width: '100%' }}>
        <button className="btn primary lg grow" onClick={() => onSave({ rating: rating || undefined, outcome }, 'break')} type="button">
          <Icon name="leaf" size={18} /> {t('休息一下', 'Take a break')}
        </button>
        <button className="btn lg" onClick={() => onSave({ rating: rating || undefined, outcome }, 'done')} type="button">
          {t('保存', 'Save')}
        </button>
      </div>
    </div>
  );
}

// ---------------- Break ----------------
function Break({ minutes, onDone }: { minutes: number; onDone: (again: boolean) => void }) {
  const t = useT();
  const [end] = useState(Date.now() + minutes * 60000);
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, end - now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) sfx.bell();
  }, [left === 0]);
  useEffect(() => {
    document.title = `☕ ${fmtDuration(left)} · FocusLab`;
    return () => void (document.title = 'FocusLab');
  }, [left]);
  const ideas = [
    { icon: 'run', text: t('站起来走一走、伸展一下', 'Stand up, walk, stretch') },
    { icon: 'eye', text: t('看向窗外远处 20 秒以上', 'Look out the window, far away, for 20+ seconds') },
    { icon: 'coffee', text: t('喝一杯水', 'Drink a glass of water') },
    { icon: 'wind', text: t('做 3 次生理性叹息：吸气、补吸一口、长呼气', '3 physiological sighs: inhale, top-up inhale, long exhale') },
    { icon: 'phone', text: t('尽量别拿手机——它不会让大脑休息', 'Skip the phone — it doesn’t rest your brain') },
  ];
  return (
    <div className="focus-stage fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="ring-wrap" style={{ width: 220 }}>
        <svg viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" fill="none" stroke="var(--good-soft)" strokeWidth="12" />
          <circle cx="160" cy="160" r="140" fill="none" stroke="var(--good)" strokeWidth="12" strokeLinecap="round" strokeDasharray={2 * Math.PI * 140} strokeDashoffset={2 * Math.PI * 140 * (left / (minutes * 60000))} />
        </svg>
        <div className="ring-center">
          <div className="ring-time" style={{ fontSize: 44 }}>
            {fmtDuration(left)}
          </div>
          <div className="small muted">{t('休息', 'Break')}</div>
        </div>
      </div>
      <div className="card" style={{ width: '100%' }}>
        <div className="stack sm">
          {ideas.map((x) => (
            <div key={x.text} className="row text-2">
              <Icon name={x.icon} size={17} /> {x.text}
            </div>
          ))}
        </div>
      </div>
      <div className="row" style={{ width: '100%' }}>
        <button className="btn primary lg grow" onClick={() => onDone(true)} type="button">
          <Icon name="play" size={16} /> {left === 0 ? t('开始下一段', 'Start next session') : t('提前开始下一段', 'Start next session early')}
        </button>
        <button className="btn lg" onClick={() => onDone(false)} type="button">
          {t('结束', 'Finish')}
        </button>
      </div>
    </div>
  );
}

// ---------------- Parking lot & stats ----------------
function ParkingLot() {
  const t = useT();
  const { parking } = useData();
  const [text, setText] = useState('');
  const pending = parking.filter((p) => !p.done);
  const add = () => {
    if (!text.trim()) return;
    update((d) => {
      d.parking.push({ id: uid(), text: text.trim(), createdAt: Date.now(), done: false });
    });
    setText('');
  };
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: 6 }}>
        <h3>
          <Icon name="pencil" size={17} /> {t('停车场', 'Parking lot')}
        </h3>
        <span className="small muted">{pending.length}</span>
      </div>
      <p className="tiny muted" style={{ marginBottom: 10 }}>
        {t('专注时冒出的念头先停在这里，休息时再处理。', 'Park stray thoughts here during focus; handle them on a break.')}
      </p>
      <div className="row" style={{ marginBottom: 8 }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={t('添加一条……', 'Add an item…')} />
        <button className="btn" onClick={add} type="button" aria-label={t('添加', 'Add')}>
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="list">
        {pending.slice(-8).map((p) => (
          <div key={p.id} className="list-item" style={{ padding: '7px 2px', gap: 10 }}>
            <button
              className="plan-check"
              style={{ width: 20, height: 20, cursor: 'pointer', background: 'none' }}
              onClick={() =>
                update((d) => {
                  const x = d.parking.find((y) => y.id === p.id);
                  if (x) x.done = true;
                })
              }
              aria-label={t('完成', 'Done')}
              type="button"
            />
            <span className="small grow">{p.text}</span>
          </div>
        ))}
        {!pending.length && <div className="tiny muted">{t('空空如也，很好。', 'Empty. Nice.')}</div>}
      </div>
    </div>
  );
}

function FocusStats() {
  const t = useT();
  const lang = t.lang;
  const data = useData();
  const today = dayKey();
  const todayMs = focusMsOn(data.sessions, today);
  const recent = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 6);
  const outcomeLabel = (o?: FocusSession['outcome']) => (o === 'done' ? t('完成', 'Done') : o === 'partial' ? t('部分', 'Partly') : o === 'no' ? t('未完成', 'Not done') : '');
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <h3>{t('最近的专注', 'Recent sessions')}</h3>
        <span className="small muted">
          {t('今天', 'Today')} {fmtMinutes(todayMs, lang)} / {fmtMinutes(data.settings.dailyFocusGoalMin * 60000, lang)}
        </span>
      </div>
      {recent.length ? (
        <table className="data">
          <thead>
            <tr>
              <th>{t('日期', 'Date')}</th>
              <th>{t('意图', 'Intention')}</th>
              <th className="num">{t('时长', 'Time')}</th>
              <th className="num">{t('分心', 'Distr.')}</th>
              <th className="num">{t('自评', 'Rating')}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{shortDate(s.date, lang)}</td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.intention || <span className="muted">—</span>} {s.outcome && <span className="chip" style={{ marginLeft: 4 }}>{outcomeLabel(s.outcome)}</span>}
                </td>
                <td className="num">{Math.round(s.focusMs / 60000)}′</td>
                <td className="num">{s.distractions.length}</td>
                <td className="num">{s.rating ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">{t('还没有专注记录。第一段从 25 分钟开始吧。', 'No sessions yet. Start with 25 minutes.')}</div>
      )}
    </div>
  );
}
