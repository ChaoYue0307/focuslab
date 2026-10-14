import { useRef, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { LanguagePicker, Segmented, Switch, toast } from '../components/ui';
import { sfx } from '../lib/audio';
import { daysBetween, dayKey } from '../lib/date';
import { downloadReminder } from '../lib/reminder';
import { useT } from '../lib/i18n';
import { downloadBackup } from '../lib/backup';
import { emptyData, normalize, replaceData, updateSettings, useData } from '../lib/store';
import type { ThemePref } from '../lib/types';

function Row({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="list-item" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 200, flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {sub && <div className="small muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const t = useT();
  const data = useData();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = downloadBackup;

  const doImport = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.results)) throw new Error('bad');
      if (!confirm(t('导入会覆盖当前所有数据，继续？', 'Importing replaces all current data. Continue?'))) return;
      replaceData(normalize(parsed));
      toast(t('导入成功', 'Imported'));
    } catch {
      toast(t('文件格式不正确', 'That file isn’t a FocusLab backup'));
    }
  };

  const requestNotify = async (on: boolean) => {
    if (!on) return updateSettings({ notify: false });
    if (!('Notification' in window)) return toast(t('此浏览器不支持通知', 'Notifications not supported'));
    const p = await Notification.requestPermission();
    updateSettings({ notify: p === 'granted' });
    if (p !== 'granted') toast(t('通知权限未开启', 'Notification permission denied'));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('设置', 'Settings')}</h1>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>
        {t('通用', 'General')}
      </div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        <Row title={t('语言', 'Language')}>
          <LanguagePicker />
        </Row>
        <Row title={t('外观', 'Appearance')}>
          <Segmented<ThemePref>
            value={s.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'system', label: t('跟随系统', 'System') },
              { value: 'light', label: t('浅色', 'Light') },
              { value: 'dark', label: t('深色', 'Dark') },
            ]}
          />
        </Row>
        <Row title={t('音效', 'Sound effects')} sub={t('反馈音、倒计时和钟声', 'Feedback tones, countdown and bells')}>
          <div className="row">
            {s.sound && (
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={s.volume}
                onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                onPointerUp={() => sfx.good()}
                style={{ width: 120 }}
                aria-label={t('音量', 'Volume')}
              />
            )}
            <Switch on={s.sound} onChange={(v) => updateSettings({ sound: v })} label={t('音效', 'Sound effects')} />
          </div>
        </Row>
        <Row title={t('系统通知', 'System notifications')} sub={t('专注结束和专注抽查时，页面在后台也能提醒你', 'Alerts for focus end and attention probes while the tab is in the background')}>
          <Switch on={s.notify} onChange={requestNotify} label={t('系统通知', 'System notifications')} />
        </Row>
        <Row title={t('每日训练提醒', 'Daily training reminder')} sub={t('下载一个每天重复的日历提醒（Apple / Google / Outlook 日历都支持）', 'Download a daily repeating calendar reminder (works with Apple, Google and Outlook calendars)')}>
          <div className="row">
            <input type="time" className="input" style={{ width: 120 }} value={s.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value || '08:30' })} aria-label={t('提醒时间', 'Reminder time')} />
            <button className="btn sm" onClick={() => downloadReminder(s.reminderTime, s.lang)} type="button">
              <Icon name="calendar" size={15} /> {t('添加到日历', 'Add to calendar')}
            </button>
          </div>
        </Row>
      </div>

      <div className="section-title">{t('训练与专注', 'Training & focus')}</div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        <Row title={t('每日深度专注目标', 'Daily deep-focus goal')}>
          <Segmented value={s.dailyFocusGoalMin} onChange={(v) => updateSettings({ dailyFocusGoalMin: v })} options={[60, 90, 120, 180, 240].map((v) => ({ value: v, label: `${v / 60}h` }))} />
        </Row>
        <Row title={t('默认休息时长', 'Default break')}>
          <Segmented value={s.breakMin} onChange={(v) => updateSettings({ breakMin: v })} options={[3, 5, 10, 15].map((v) => ({ value: v, label: `${v}′` }))} />
        </Row>
        <Row title={t('数息练习时长', 'Breath counting length')}>
          <Segmented value={s.breathMin} onChange={(v) => updateSettings({ breathMin: v })} options={[3, 5, 10, 15].map((v) => ({ value: v, label: `${v}′` }))} />
        </Row>
        <Row title={t('专注抽查', 'Attention probes')} sub={t('专注时段中随机询问"此刻注意力在哪"，测量并训练对走神的觉察', 'Random "where is your attention?" check-ins during focus sessions to measure and train awareness of mind-wandering')}>
          <Segmented
            value={s.probes ? s.probeMin : 0}
            onChange={(v) => updateSettings(v ? { probes: true, probeMin: v } : { probes: false })}
            options={[
              { value: 0, label: t('关', 'Off') },
              { value: 5, label: '~5′' },
              { value: 10, label: '~10′' },
              { value: 15, label: '~15′' },
            ]}
          />
        </Row>
        <Row title={t('Stroop 色觉友好配色', 'Colour-vision-friendly Stroop')} sub={t('改用蓝 / 黄 / 灰三色，适合红绿色弱', 'Uses blue / yellow / grey instead, suitable for red–green colour vision deficiency')}>
          <Switch on={s.stroopCvd} onChange={(v) => updateSettings({ stroopCvd: v })} label={t('Stroop 色觉友好配色', 'Colour-vision-friendly Stroop')} />
        </Row>
        <Row title={t('N-Back 双任务', 'Dual N-Back')} sub={t('同时记忆位置和字母', 'Track positions and letters together')}>
          <Switch on={s.nbackDual} onChange={(v) => updateSettings({ nbackDual: v })} label={t('N-Back 双任务', 'Dual N-Back')} />
        </Row>
        <Row title={t('N-Back 朗读字母', 'Speak N-Back letters')} sub={t('关闭则在方块中显示字母', 'When off, letters are shown in the square')}>
          <Switch on={s.nbackAudio} onChange={(v) => updateSettings({ nbackAudio: v })} label={t('N-Back 朗读字母', 'Speak N-Back letters')} />
        </Row>
        {s.customTags.length > 0 && (
          <Row title={t('自定义习惯标签', 'Custom habit tags')} sub={t('点击移除', 'Click to remove')}>
            <div className="row wrap" style={{ gap: 6 }}>
              {s.customTags.map((tag) => (
                <button key={tag} className="chip" style={{ cursor: 'pointer' }} onClick={() => updateSettings({ customTags: s.customTags.filter((x) => x !== tag) })} type="button">
                  {tag} <Icon name="x" size={12} />
                </button>
              ))}
            </div>
          </Row>
        )}
        <Row title={t('重置训练难度', 'Reset difficulty levels')} sub={t('所有练习回到初始难度', 'All exercises go back to their starting level')}>
          <button
            className="btn sm"
            onClick={() => {
              if (confirm(t('重置所有难度？', 'Reset all levels?'))) {
                replaceData({ ...data, levels: {} });
                toast(t('已重置', 'Reset'));
              }
            }}
            type="button"
          >
            {t('重置', 'Reset')}
          </button>
        </Row>
      </div>

      <div className="section-title">{t('数据', 'Data')}</div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        <Row
          title={t('你的数据只在这台设备上', 'Your data stays on this device')}
          sub={t('{r} 次训练 · {s} 段专注 · {c} 次打卡。没有账号、没有服务器、没有追踪。', '{r} sessions · {s} focus blocks · {c} check-ins. No account, no server, no tracking.', { r: data.results.length, s: data.sessions.length, c: data.checkins.length })}
        >
          <span />
        </Row>
        <Row
          title={t('导出备份', 'Export backup')}
          sub={`${t('下载 JSON 文件，可在其他设备导入', 'Download a JSON file you can import elsewhere')} · ${
            data.lastExportAt ? t('上次备份：{n} 天前', 'Last backup: {n} days ago', { n: daysBetween(dayKey(data.lastExportAt), dayKey()) }) : t('还没有备份过', 'Never backed up')
          }`}
        >
          <button className="btn sm" onClick={doExport} type="button">
            <Icon name="download" size={15} /> {t('导出', 'Export')}
          </button>
        </Row>
        <Row title={t('导入备份', 'Import backup')}>
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            <button className="btn sm" onClick={() => fileRef.current?.click()} type="button">
              <Icon name="upload" size={15} /> {t('导入', 'Import')}
            </button>
          </>
        </Row>
        <Row title={t('清除所有数据', 'Erase all data')} sub={t('不可撤销，建议先导出备份', 'Cannot be undone — export a backup first')}>
          <button
            className="btn sm danger"
            onClick={() => {
              if (confirm(t('确定清除所有数据？此操作不可撤销。', 'Erase everything? This cannot be undone.'))) {
                const fresh = emptyData();
                replaceData({ ...fresh, onboarded: true, settings: s });
                toast(t('已清除', 'Erased'));
              }
            }}
            type="button"
          >
            <Icon name="trash" size={15} /> {t('清除', 'Erase')}
          </button>
        </Row>
      </div>

      <div className="section-title">{t('键盘快捷键', 'Keyboard shortcuts')}</div>
      <div className="card">
        <table className="data">
          <tbody>
            {[
              [t('开始 / 下一项', 'Start / next'), 'Enter'],
              [t('暂停 / 退出任务', 'Pause / exit a task'), 'Esc'],
              [t('PVT、SART 响应', 'PVT, SART response'), 'Space'],
              [t('Flanker / 规则切换', 'Flanker / switching'), '← →  ·  F J'],
              [t('Stroop 颜色', 'Stroop colors'), 'D F J K  ·  1–4'],
              [t('N-Back 位置 / 声音', 'N-Back position / sound'), 'A  ·  L'],
              [t('数息：1–8 / 9 / 重置', 'Breath: 1–8 / 9 / reset'), 'Space  ·  Enter  ·  R'],
              [t('专注：记录分心 / 暂停', 'Focus: log distraction / pause'), 'D  ·  P'],
            ].map(([a, b]) => (
              <tr key={a}>
                <td>{a}</td>
                <td className="num">
                  {b.split('  ·  ').map((k) => (
                    <span key={k} className="kbd" style={{ marginLeft: 4 }}>
                      {k}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted center" style={{ marginTop: 28 }}>
        FocusLab · {t('开源，MIT 许可', 'Open source, MIT licensed')} ·{' '}
        <a href="https://github.com/ChaoYue0307/focuslab" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </>
  );
}
