import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/ui';
import { useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { update, updateSettings, useData } from '../lib/store';
import type { Lang } from '../lib/types';

export default function Onboarding() {
  const t = useT();
  const { settings } = useData();
  const [step, setStep] = useState(0);
  const finish = (to: string) => {
    update((d) => {
      d.onboarded = true;
    });
    navigate(to);
  };
  const features = [
    { icon: 'chart', title: t('测量', 'Measure'), body: t('用 NASA 与认知科学的经典测试，客观测量 7 个专注维度。', 'Objectively measure 7 dimensions of attention with tests used at NASA and in cognitive science.') },
    { icon: 'dumbbell', title: t('训练', 'Train'), body: t('每天约 15 分钟自适应训练，始终在你的能力边缘。', '~15 minutes a day of adaptive training, always at the edge of your ability.') },
    { icon: 'timer', title: t('应用', 'Apply'), body: t('深度专注计时、分心停车场和正念数息，把专注带进真实工作。', 'Deep-focus timer, distraction parking and breath counting bring focus into real work.') },
    { icon: 'sparkles', title: t('洞察', 'Learn'), body: t('结合睡眠、运动、压力数据，找出真正影响你专注的因素。', 'Combine sleep, exercise and stress data to discover what really drives your focus.') },
  ];
  return (
    <div className="onboard">
      <div className="onboard-card fade-in" key={step}>
        <div className="steps">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        {step === 0 && (
          <>
            <div className="brand-mark" style={{ width: 52, height: 52, borderRadius: 15, marginBottom: 20 }}>
              <Icon name="target" size={28} stroke={2.2} />
            </div>
            <h1 style={{ fontSize: 32 }}>{t('欢迎来到 FocusLab', 'Welcome to FocusLab')}</h1>
            <p className="text-2" style={{ fontSize: 16, marginTop: 10 }}>
              {t('一个基于科学的专注力训练实验室。不是又一个番茄钟，也不是哄你玩的小游戏。', 'A science-based attention training lab. Not another Pomodoro timer, and not games that just keep you busy.')}
            </p>
            <div className="feature-list">
              {features.map((f) => (
                <div key={f.title}>
                  <span className="icon-tile">
                    <Icon name={f.icon} size={19} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 650 }}>{f.title}</div>
                    <div className="small text-2">{f.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row between">
              <Segmented<Lang> value={settings.lang} onChange={(v) => updateSettings({ lang: v })} options={[{ value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }]} />
              <button className="btn primary lg" onClick={() => setStep(1)} type="button" autoFocus>
                {t('继续', 'Continue')} <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>{t('设定你的目标', 'Set your goal')}</h1>
            <p className="text-2" style={{ marginTop: 8 }}>
              {t('每天希望有多少小时的深度专注？之后可以随时修改。', 'How many hours of deep focus do you want each day? You can change this anytime.')}
            </p>
            <div style={{ margin: '24px 0' }}>
              <Segmented value={settings.dailyFocusGoalMin} onChange={(v) => updateSettings({ dailyFocusGoalMin: v })} options={[60, 90, 120, 180, 240].map((v) => ({ value: v, label: `${v / 60} h` }))} />
            </div>
            <div className="callout" style={{ marginBottom: 24 }}>
              <Icon name="info" size={18} />
              <div className="small">
                {t(
                  '刻意练习研究发现，即使是顶尖专家，每天高强度专注的时间通常也不超过约 4 小时。从现实的目标开始，逐步提高。',
                  'Research on deliberate practice found that even elite performers rarely sustain more than ~4 hours of intense focus a day. Start realistic and build up.',
                )}
              </div>
            </div>
            <div className="row between">
              <button className="btn ghost" onClick={() => setStep(0)} type="button">
                ← {t('返回', 'Back')}
              </button>
              <button className="btn primary lg" onClick={() => setStep(2)} type="button" autoFocus>
                {t('继续', 'Continue')} <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>{t('先建立基线', 'Start with a baseline')}</h1>
            <p className="text-2" style={{ marginTop: 8, fontSize: 16 }}>
              {t('约 15 分钟的标准化评估会测量你当前的警觉、持续注意、抗干扰、切换和工作记忆。之后每 2 周复测，用数据看到进步。', 'A ~15-minute standardized assessment measures your current alertness, sustained attention, interference control, switching and working memory. Retest every 2 weeks to see progress in data.')}
            </p>
            <div className="callout" style={{ margin: '20px 0' }}>
              <Icon name="keyboard" size={18} />
              <div className="small">{t('建议在安静的环境中使用电脑键盘完成。所有数据只保存在你的浏览器里。', 'Best done somewhere quiet with a physical keyboard. All data stays in your browser.')}</div>
            </div>
            <div className="stack sm">
              <button className="btn primary lg block" onClick={() => finish('/assess')} type="button" autoFocus>
                <Icon name="clipboard" size={18} /> {t('开始基线评估（15 分钟）', 'Take the baseline (15 min)')}
              </button>
              <button className="btn lg block" onClick={() => finish('/')} type="button">
                {t('先随便看看', 'Explore first')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
