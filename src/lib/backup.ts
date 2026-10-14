import { dayKey } from './date';
import { exportJSON, update } from './store';

/** Download all data as JSON and remember when the last backup happened. */
export function downloadBackup() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `focuslab-backup-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  update((d) => {
    d.lastExportAt = Date.now();
  });
}
