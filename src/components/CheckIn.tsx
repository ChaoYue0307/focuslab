import { useState } from 'react';
import { TAGS } from '../content/habits';
import { dayKey } from '../lib/date';
import { useT } from '../lib/i18n';
import { update, updateSettings, useData } from '../lib/store';
import type { CheckIn as CheckInT } from '../lib/types';
import { Icon } from './Icon';
import { Modal, Segmented, toast } from './ui';

function Scale({ label, value, onChange, low, high }: { label: string; value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div className="field">
      <div className="row between">
        <span className="label">{label}</span>
        <span className="tiny muted">
          {low} → {high}
        </span>
      </div>
      <Segmented value={value} onChange={onChange} options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))} />
    </div>
  );
}

export function CheckInModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const data = useData();
  const today = dayKey();
  const existing = data.checkins.find((c) => c.date === today);
  const last = [...data.checkins].sort((a, b) => b.createdAt - a.createdAt)[0];
  const [c, setC] = useState<CheckInT>(
    existing || {
      date: today,
      createdAt: Date.now(),
      sleep: last?.sleep ?? 7,
      sleepQuality: 3,
      energy: 3,
      mood: 3,
      stress: 3,
      caffeine: 0,
      exercise: false,
    },
  );
  const set = <K extends keyof CheckInT>(k: K, v: CheckInT[K]) => setC((x) => ({ ...x, [k]: v }));
  const [newTag, setNewTag] = useState('');
  const tags = c.tags || [];
  const toggleTag = (id: string) => set('tags', tags.includes(id) ? tags.filter((x) => x !== id) : [...tags, id]);
  const addCustom = () => {
    const v = newTag.trim().slice(0, 24);
    if (!v) return;
    if (!data.settings.customTags.includes(v)) updateSettings({ customTags: [...data.settings.customTags, v] });
    if (!tags.includes(`c:${v}`)) set('tags', [...tags, `c:${v}`]);
    setNewTag('');
  };
  const save = () => {
    update((d) => {
      d.checkins = d.checkins.filter((x) => x.date !== today);
      d.checkins.push({ ...c, tags, createdAt: Date.now() });
    });
    toast(t('已记录今日状态', 'Check-in saved'));
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2>{t('今日状态打卡', 'Daily check-in')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('关闭', 'Close')} type="button">
          <Icon name="x" />
        </button>
      </div>
      <p className="small text-2" style={{ marginBottom: 18 }}>
        {t('20 秒。它让 FocusLab 找出到底是什么在影响你的专注。', '20 seconds. It lets FocusLab find out what actually drives your focus.')}
      </p>
      <div className="stack lg">
        <div className="field">
          <div className="row between">
            <span className="label">{t('昨晚睡眠', 'Sleep last night')}</span>
            <span style={{ fontWeight: 700 }} className="tabnum">
              {c.sleep} {t('小时', 'h')}
            </span>
          </div>
          <input type="range" min={3} max={11} step={0.5} value={c.sleep} onChange={(e) => set('sleep', Number(e.target.value))} aria-label={t('睡眠小时', 'Sleep hours')} />
        </div>
        <Scale label={t('睡眠质量', 'Sleep quality')} value={c.sleepQuality} onChange={(v) => set('sleepQuality', v)} low={t('很差', 'poor')} high={t('很好', 'great')} />
        <Scale label={t('精力', 'Energy')} value={c.energy} onChange={(v) => set('energy', v)} low={t('疲惫', 'drained')} high={t('充沛', 'energized')} />
        <Scale label={t('心情', 'Mood')} value={c.mood} onChange={(v) => set('mood', v)} low={t('低落', 'low')} high={t('很好', 'great')} />
        <Scale label={t('压力', 'Stress')} value={c.stress} onChange={(v) => set('stress', v)} low={t('放松', 'calm')} high={t('很大', 'high')} />
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="field">
            <span className="label">{t('今天咖啡因', 'Caffeine today')}</span>
            <Segmented value={c.caffeine} onChange={(v) => set('caffeine', v)} options={[0, 1, 2, 3].map((v) => ({ value: v, label: v === 3 ? '3+' : String(v) }))} />
          </div>
          <div className="field">
            <span className="label">{t('过去 24 小时运动过', 'Exercised in last 24 h')}</span>
            <Segmented value={c.exercise ? 1 : 0} onChange={(v) => set('exercise', v === 1)} options={[{ value: 0, label: t('没有', 'No') }, { value: 1, label: t('有', 'Yes') }]} />
          </div>
        </div>
        <div className="field">
          <div className="row between">
            <span className="label">{t('今天的习惯（可稍后回来补充）', 'Today’s habits (you can update later)')}</span>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {[...TAGS.map((x) => ({ id: x.id, label: t(x.label.zh, x.label.en) })), ...data.settings.customTags.map((x) => ({ id: `c:${x}`, label: x }))].map((x) => (
              <button key={x.id} type="button" className={`chip ${tags.includes(x.id) ? 'accent' : ''}`} style={{ cursor: 'pointer' }} aria-pressed={tags.includes(x.id)} onClick={() => toggleTag(x.id)}>
                {tags.includes(x.id) && <Icon name="check" size={12} stroke={3} />}
                {x.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            <input className="input" style={{ padding: '6px 10px' }} value={newTag} maxLength={24} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder={t('添加自定义习惯，例如"上午不开会"', 'Add your own, e.g. "no morning meetings"')} />
            <button className="btn sm" onClick={addCustom} type="button" aria-label={t('添加', 'Add')}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          <span className="tiny muted">{t('积累一段时间后，FocusLab 会估计每个习惯对你专注的影响。', 'Over time, FocusLab estimates how each habit affects your focus.')}</span>
        </div>
      </div>
      <button className="btn primary lg block" style={{ marginTop: 24 }} onClick={save} type="button">
        {t('保存', 'Save')}
      </button>
    </Modal>
  );
}
