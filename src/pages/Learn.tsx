import { Icon } from '../components/Icon';
import { EVIDENCE_LABEL, HABITS, REFERENCES, TOOLKIT, scholar } from '../content/learn';
import { bi, useT } from '../lib/i18n';
import { DOMAINS, TASKS } from '../tasks/registry';

export default function Learn() {
  const t = useT();
  const lang = t.lang;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('方法与科学', 'The method & the science')}</h1>
          <p>{t('FocusLab 做什么、为什么这样做，以及什么才真正能提升专注。', 'What FocusLab does, why, and what actually improves focus.')}</p>
        </div>
        <a className="btn mobile-only" href="#/settings">
          <Icon name="settings" size={16} /> {t('设置', 'Settings')}
        </a>
      </div>

      <div className="grid grid-3">
        {[
          {
            icon: 'chart',
            title: t('① 测量', '① Measure'),
            body: t('每日 PVT 和定期评估，客观看到你的专注状态和长期变化，而不是凭感觉。', 'A daily PVT and periodic assessments show your attention state and long-term change objectively, not by feel.'),
          },
          {
            icon: 'dumbbell',
            title: t('② 训练', '② Train'),
            body: t('经典认知范式 + 自适应难度，始终在"有点难"的区间刻意练习注意控制。', 'Classic cognitive paradigms with adaptive difficulty keep you deliberately practicing at "slightly too hard".'),
          },
          {
            icon: 'target',
            title: t('③ 迁移', '③ Transfer'),
            body: t('正念数息 + 真实的深度专注时段 + 生活方式数据——这是专注力真正提升的地方。', 'Breath-counting mindfulness, real deep-work sessions and lifestyle data — where focus really improves.'),
          },
        ].map((c) => (
          <div key={c.title} className="card">
            <div className="icon-tile" style={{ marginBottom: 12 }}>
              <Icon name={c.icon} size={19} />
            </div>
            <h3>{c.title}</h3>
            <p className="small text-2" style={{ marginTop: 6 }}>
              {c.body}
            </p>
          </div>
        ))}
      </div>

      <div className="section-title">{t('诚实说明', 'An honest note')}</div>
      <div className="card prose" style={{ maxWidth: 'none' }}>
        <p>
          {t(
            '大量研究表明：认知训练任务本身的成绩会稳定提升，但这种提升"远迁移"到未训练的日常任务上的证据有限（Simons 等，2016）。所以 FocusLab 不承诺"玩游戏变聪明"。',
            'Research consistently shows that people get better at the trained tasks themselves, but evidence that gains transfer to untrained everyday tasks is limited (Simons et al., 2016). So FocusLab doesn’t promise that games make you smarter.',
          )}
        </p>
        <p>
          {t(
            '我们的做法是：把训练任务当作精确的测量工具和注意控制的刻意练习，再把重心放在证据更强、能直接迁移的方法上——正念练习、真实工作中的深度专注时段，以及睡眠、运动、手机管理等生活杠杆。你的数据会告诉你哪些对你有效。',
            'Instead, we use the exercises as precise measurement tools and deliberate practice of attentional control, and put the weight on methods with stronger evidence that transfer directly — mindfulness practice, deep-focus sessions on real work, and lifestyle levers like sleep, exercise and phone management. Your own data shows what works for you.',
          )}
        </p>
        <p className="small muted">
          {t('FocusLab 不是医疗工具。如果你长期受注意力问题困扰（例如怀疑 ADHD），请咨询专业人士。', 'FocusLab is not a medical tool. If attention problems persistently affect your life (e.g. you suspect ADHD), please consult a professional.')}
        </p>
      </div>

      <div className="section-title">{t('推荐方案', 'Recommended protocol')}</div>
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>{t('每天', 'Every day')}</h3>
          <div className="stack sm text-2 small">
            <div className="row top">
              <Icon name="heart" size={16} /> {t('20 秒状态打卡（睡眠、精力、压力）', '20-second check-in (sleep, energy, stress)')}
            </div>
            <div className="row top">
              <Icon name="dumbbell" size={16} /> {t('约 15 分钟今日训练：PVT 状态检测 → 3 项核心训练 → 数息收尾', '~15-minute session: PVT state check → 3 core drills → breath counting')}
            </div>
            <div className="row top">
              <Icon name="timer" size={16} /> {t('至少 1 段深度专注（从 25 分钟开始，逐步延长）', 'At least one deep-focus session (start at 25 min, extend gradually)')}
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>{t('长期', 'Over weeks')}</h3>
          <div className="stack sm text-2 small">
            <div className="row top">
              <Icon name="calendar" size={16} /> {t('每周 5–6 天，持续 8 周；固定时段训练，数据更可比', '5–6 days a week for 8 weeks; train at a consistent time for comparable data')}
            </div>
            <div className="row top">
              <Icon name="clipboard" size={16} /> {t('第 1 天做基线评估，之后每 2 周复测', 'Baseline assessment on day 1, retest every 2 weeks')}
            </div>
            <div className="row top">
              <Icon name="sparkles" size={16} />
              {t('预期：SART 错误↓、冲突代价↓、N 值↑、数息准确率↑、深度专注分钟↑、分心次数↓', 'Expect: SART errors ↓, conflict costs ↓, N-back level ↑, breath accuracy ↑, deep-focus minutes ↑, distractions ↓')}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">{t('专注力的 7 个维度', 'The 7 dimensions of attention')}</div>
      <div className="grid grid-2">
        {DOMAINS.map((d) => (
          <div key={d.id} className="card row top" style={{ gap: 14 }}>
            <span className="icon-tile" style={{ ['--tile' as string]: d.color }}>
              <Icon name={d.icon} size={19} />
            </span>
            <div>
              <h3>{bi(d.name, lang)}</h3>
              <p className="small text-2" style={{ marginTop: 4 }}>
                {bi(d.desc, lang)}
              </p>
              <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                {TASKS.filter((x) => x.domain === d.id).map((x) => (
                  <a key={x.id} className="chip" href={`#/run/${x.id}?back=/learn`}>
                    {bi(x.name, lang)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">{t('12 个真正有效的习惯', '12 habits that actually help')}</div>
      <div className="grid grid-2">
        {HABITS.map((h) => (
          <div key={h.title.en} className="card">
            <div className="row between top" style={{ marginBottom: 8 }}>
              <div className="row">
                <span className="icon-tile" style={{ width: 34, height: 34 }}>
                  <Icon name={h.icon} size={17} />
                </span>
                <h3>{bi(h.title, lang)}</h3>
              </div>
              <span className={`ev ${h.evidence === 'practice' ? 'mixed' : h.evidence}`}>{bi(EVIDENCE_LABEL[h.evidence], lang)}</span>
            </div>
            <p className="small text-2">{bi(h.why, lang)}</p>
            <p className="small" style={{ marginTop: 8 }}>
              <b>{t('怎么做：', 'Do this: ')}</b>
              {bi(h.how, lang)}
            </p>
          </div>
        ))}
      </div>

      <div className="section-title">{t('走神时的急救包', 'In-the-moment toolkit')}</div>
      <div className="grid grid-3">
        {TOOLKIT.map((x) => (
          <div key={x.title.en} className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              <Icon name={x.icon} size={18} style={{ color: 'var(--accent)' }} />
              <h3>{bi(x.title, lang)}</h3>
            </div>
            <p className="small text-2">{bi(x.body, lang)}</p>
          </div>
        ))}
      </div>

      <div className="section-title">{t('参考文献', 'References')}</div>
      <div className="card">
        <ol className="small text-2" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {REFERENCES.map((r) => (
            <li key={r.title}>
              <a href={scholar(r.title)} target="_blank" rel="noreferrer">
                {r.title}
              </a>
              <span className="muted"> — {r.cite}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
