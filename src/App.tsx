import { useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import { ToastHost } from './components/ui';
import { useT } from './lib/i18n';
import { navigate, useRoute } from './lib/router';
import { useData } from './lib/store';
import { fmtDuration } from './lib/date';
import { sfx } from './lib/audio';
import type { Mode, TaskId } from './lib/types';
import Flow from './pages/Flow';
import Focus, { elapsedOf, loadActive } from './pages/Focus';
import Learn from './pages/Learn';
import Onboarding from './pages/Onboarding';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Train from './pages/Train';
import { TaskRunner } from './tasks/TaskRunner';
import { TASKS } from './tasks/registry';

const NAV = [
  { path: '/', icon: 'home', zh: '今日', en: 'Today' },
  { path: '/train', icon: 'dumbbell', zh: '训练', en: 'Train' },
  { path: '/focus', icon: 'timer', zh: '专注', en: 'Focus' },
  { path: '/progress', icon: 'chart', zh: '进展', en: 'Progress' },
  { path: '/learn', icon: 'book', zh: '方法', en: 'Learn' },
  { path: '/settings', icon: 'settings', zh: '设置', en: 'Settings' },
];

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
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-CN' : 'en';
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
  const data = useData();
  const t = useT();
  const { path, parts, query } = useRoute();

  useEffect(() => {
    if (path.startsWith('/run') || path === '/plan' || path === '/assess') return;
    if (path === '/focus' && loadActive()) return; // the running timer owns the title
    const name = NAV.find((n) => n.path === path);
    document.title = name ? `${t(name.zh, name.en)} · FocusLab` : 'FocusLab';
  }, [path, t]);

  if (!data.onboarded) return <Onboarding />;

  // Immersive routes
  if (parts[0] === 'run' && TASKS.some((x) => x.id === parts[1])) {
    const mode = (query.get('mode') as Mode) || 'training';
    const back = query.get('back') || '/train';
    return <TaskRunner key={parts[1] + mode} task={parts[1] as TaskId} mode={mode} onExit={() => navigate(back)} />;
  }
  if (parts[0] === 'plan') return <Flow kind="plan" />;
  if (parts[0] === 'assess') return <Flow kind="assess" />;

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
        <div className="sidebar-foot">
          <div style={{ fontWeight: 650, color: 'var(--text)', marginBottom: 4 }}>{t('今天也来练 15 分钟', '15 minutes today')}</div>
          {t('稳定的小量练习，胜过偶尔的大量练习。', 'Small, consistent practice beats occasional marathons.')}
        </div>
      </aside>
      <main className="main">
        <div className="page fade-in" key={parts[0] || 'home'}>
          {page}
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
