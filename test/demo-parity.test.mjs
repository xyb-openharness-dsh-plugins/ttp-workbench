import { test } from 'node:test';
import { Workbench } from '../dsh/workbench.js';
import { buildDemoProfiles } from '../demo/build-demo-data.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('bootstrap 与原型 demo 形状一致（条数/私密标记/计划原话）', () => {
  const root = mkdtempSync(join(tmpdir(), 'ttp-parity-'));
  const wb = new Workbench({ root });
  wb.open();
  const b = wb.bootstrap();
  const d = buildDemoProfiles();
  if (b.metrics.length !== d.metrics.length) throw new Error('指标数不符');
  for (const k of Object.keys(d.profiles)) {
    const a = b.profiles[k], e = d.profiles[k];
    if (a.labs.length !== e.labs.length) throw new Error(`${k} labs ${a.labs.length} ≠ ${e.labs.length}`);
    if (a.pe.length !== e.pe.length) throw new Error(`${k} pe 不符`);
    if (a.episodes.length !== e.episodes.length) throw new Error(`${k} episodes 不符`);
    if (a.meds.length !== e.meds.length) throw new Error(`${k} meds 不符`);
    if (a.docs.length !== e.docs.length) throw new Error(`${k} docs 不符`);
    if (a.notes.length !== e.notes.length) throw new Error(`${k} notes 不符`);
    if (!!a.plan !== !!e.plan) throw new Error(`${k} plan 有无不符`);
    if ((a.sites || []).length !== (e.sites || []).length) throw new Error(`${k} sites 数不符`);
    if (a.sites && a.sites[0] && a.sites[0].name !== e.sites[0].name) throw new Error(`${k} 首医院名不符`);
    if ((a.questions || []).length !== (e.questions || []).length) throw new Error(`${k} questions 数不符`);
    const privE = e.labs.filter((x) => x.private).length;
    const privA = a.labs.filter((x) => x.private).length;
    if (privA !== privE) throw new Error(`${k} 私密标记数不符`);
  }
  // 双档案条数明显不同（Q9）：A 少 B 多
  if (!(b.profiles.A.labs.length < b.profiles.B.labs.length / 2)) throw new Error('A/B 条数差异不足');
});
