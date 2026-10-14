import { lazy, Suspense, useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import { LanguagePicker, toast, ToastHost } from './components/ui';
import { achievementMeta, newlyUnlocked } from './lib/achievements';
import { sfx } from './lib/audio';
import { dayKey, fmtDuration } from './lib/date';
import { elapsedOf, loadActive } from './lib/focusActive';
import { bi, localeOf, useLangReady, useT } from './lib/i18n';
import { experimentDay } from './lib/personal';
import { navigate, useRoute } from './lib/router';
import { setSaveErrorHandler, update, useData } from './lib/store';
import type { Mode, TaskId } from './lib/types';
import Today from './pages/Today';
import Train from './pages/Train';
import { TASKS } from './tasks/registry';

// Heavier screens load on demand so the first paint stays fast.
const Flow = lazy(() => import('./pages/Flow'));
const Focus = lazy(() => import('./pages/Focus'));
const Learn = lazy(() => import('./pages/Learn'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Progress = lazy(() => import('./pages/Progress'));
const Review = lazy(() => import('./pages/Review'));
const Settings = lazy(() => import('./pages/Settings'));
const TaskRunner = lazy(() => import('./tasks/TaskRunner').then((m) => ({ default: m.TaskRunner })));

const NAV = [
  { path: '/', icon: 'home', zh: '今日', en: 'Today' },
  { path: '/train', icon: 'dumbbell', zh: '训练', en: 'Train' },
  { path: '/focus', icon: 'timer', zh: '专注', en: 'Focus' },
  { path: '/progress', icon: 'chart', zh: '进展', en: 'Progress' },
  { path: '/learn', icon: 'book', zh: '方法', en: 'Learn' },
  { path: '/settings', icon: 'settings', zh: '设置', en: 'Settings' },
];

/** Background upkeep: finish experiments that ran their course, unlock achievements, warn on storage failure. */
function useUpkeep() {
  const data = useData();
  const t = useT();
  useEffect(() => {
    setSaveErrorHandler(() => toast(t('无法保存数据：浏览器存储已满或被禁用。请在设置中导出备份。', 'Can’t save: browser storage is full or blocked. Export a backup from Settings.')));
    return () => setSaveErrorHandler(null);
  }, [t]);
  useEffect(() => {
    if (!data.onboarded) return;
    const today = dayKey();
    const finished = data.experiments.filter((e) => e.status === 'active' && experimentDay(e, today) >= e.schedule.length).map((e) => e.id);
    const fresh = newlyUnlocked(data);
    if (!finished.length && !fresh.length) return;
    update((d) => {
      d.experiments.forEach((e) => {
        if (finished.includes(e.id)) {
          e.status = 'done';
          e.endedAt = Date.now();
        }
      });
      fresh.forEach((id) => (d.achievements[id] = Date.now()));
    });
    if (finished.length) toast(t('个人实验已完成，去「进展」查看结果', 'Your experiment is complete — see the results in Progress'));
    else if (fresh.length === 1) {
      const a = achievementMeta(fresh[0]);
      if (a) toast(`🏆 ${t('解锁成就：', 'Achievement unlocked: ')}${bi(a.title, t.lang)}`);
    } else if (fresh.length > 1) toast(`🏆 ${t('解锁了 {n} 个成就，去「进展」查看', '{n} achievements unlocked — see Progress', { n: fresh.length })}`);
  }, [data, t]);
}

const Loading = () => <div className="empty" style={{ padding: 60 }} aria-busy="true" />;

function useTheme() {
  const { settings } = useData();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0d0d' : '#f5f4f0');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = localeOf(settings.lang);
  }, [settings.lang]);
}

/** Shows a running focus session while you browse other pages. */
function ActivePill({ floating }: { floating?: boolean }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  const [rang, setRang] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const a = loadActive();
  const left = a ? a.plannedMin * 60000 - elapsedOf(a, now) : 0;
  useEffect(() => {
    if (a && left <= 0 && !rang && !a.pausedAt) {
      setRang(true);
      sfx.bell();
    }
  }, [a, left, rang]);
  if (!a) return null;
  return (
    <a className={`active-pill ${floating ? 'floating mobile-only' : ''}`} href="#/focus">
      <span className="pulse" />
      {left > 0 ? (a.pausedAt ? t('已暂停', 'Paused') : t('专注中', 'Focusing')) : t('专注完成', 'Focus done')}
      <span className="tabnum" style={{ marginLeft: 'auto' }}>
        {fmtDuration(Math.max(0, left))}
      </span>
    </a>
  );
}

export default function App() {
  useTheme();
  useUpkeep();
  const data = useData();
  const t = useT();
  const { path, parts, query } = useRoute();
  const langReady = useLangReady(data.settings.lang);

  // Each page starts at the top, however it was reached (links, back button, navigate()).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    if (path.startsWith('/run') || path === '/plan' || path === '/assess') return;
    if (path === '/focus' && loadActive()) return; // the running timer owns the title
    const name = NAV.find((n) => n.path === path);
    document.title = name ? `${t(name.zh, name.en)} · FocusLab` : 'FocusLab';
  }, [path, t]);

  // Wait for the dictionary of a non-source language so the UI never flashes English first.
  if (!langReady) return <div className="app-loading" aria-busy="true" />;

  const immersive = (node: React.ReactNode) => (
    <Suspense fallback={<div className="stage" />}>
      {node}
      <ToastHost />
    </Suspense>
  );

  if (!data.onboarded) return immersive(<Onboarding />);


  // Immersive routes
  if (parts[0] === 'run' && TASKS.some((x) => x.id === parts[1])) {
    const mode = (query.get('mode') as Mode) || 'training';
    const back = query.get('back') || '/train';
    return immersive(<TaskRunner key={parts[1] + mode} task={parts[1] as TaskId} mode={mode} onExit={() => navigate(back)} />);
  }
  if (parts[0] === 'plan') return immersive(<Flow kind="plan" />);
  if (parts[0] === 'assess') return immersive(<Flow kind="assess" />);

  let page;
  switch (parts[0]) {
    case 'train':
      page = <Train />;
      break;
    case 'focus':
      page = <Focus />;
      break;
    case 'progress':
      page = <Progress />;
      break;
    case 'learn':
      page = <Learn />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    case 'review':
      page = <Review />;
      break;
    default:
      page = <Today />;
  }
  const active = '/' + (parts[0] || '');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="target" size={18} stroke={2.2} />
          </div>
          <div>
            FocusLab
            <small>{t('专注力实验室', 'Attention training')}</small>
          </div>
        </div>
        {NAV.map((n) => (
          <a key={n.path} href={'#' + n.path} className={`nav-item ${active === n.path ? 'active' : ''}`}>
            <Icon name={n.icon} />
            {t(n.zh, n.en)}
          </a>
        ))}
        {active !== '/focus' && <ActivePill />}
        <LanguagePicker className="sidebar-lang" />
        <div className="sidebar-foot">
          <div style={{ fontWeight: 650, color: 'var(--text)', marginBottom: 4 }}>{t('今天也来练 15 分钟', '15 minutes today')}</div>
          {t('稳定的小量练习，胜过偶尔的大量练习。', 'Small, consistent practice beats occasional marathons.')}
        </div>
      </aside>
      <main className="main">
        <div className="page fade-in" key={parts[0] || 'home'}>
          <Suspense fallback={<Loading />}>{page}</Suspense>
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.slice(0, 5).map((n) => (
          <a key={n.path} href={'#' + n.path} className={active === n.path || (n.path === '/learn' && active === '/settings') ? 'active' : ''}>
            <Icon name={n.icon} size={22} />
            {t(n.zh, n.en)}
          </a>
        ))}
      </nav>
      {active !== '/focus' && <ActivePill floating />}
      <ToastHost />
    </div>
  );
}
