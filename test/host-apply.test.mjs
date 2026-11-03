import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* 用桩件跑 Workbench 层（Schemastery 是宿主 peer 依赖，dsh/index.js 的 Config 行不可在本仓 import；
   apply() 的 wiring 由 scripts/smoke-activate.mjs 覆盖，这里测等价的服务端行为）。 */
test('Workbench：开库→播种→bootstrap→关闭 幂等', async () => {
  const { Workbench } = await import('../dsh/workbench.js');
  const root = mkdtempSync(join(tmpdir(), 'ttp-apply-'));
  const wb = new Workbench({ root });
  wb.open();
  wb.open(); // 幂等
  const b1 = wb.bootstrap();
  const b2 = wb.bootstrap();
  if (JSON.stringify(b1) !== JSON.stringify(b2)) throw new Error('bootstrap 不稳定');
  if (wb.stats.hasDemo !== true) throw new Error('演示数据未播种');
  const st = wb.status();
  if (!st.capabilities.includes('health')) throw new Error('capabilities 缺 health');
  if (st.capabilities.includes('trialMatch')) throw new Error('非肿瘤不设试验线，capabilities 不应含 trialMatch');
  wb.close();
  wb.close(); // 幂等
});

test('root 缺失时给出可读错误，不裸 throw 白屏', async () => {
  const { Workbench } = await import('../dsh/workbench.js');
  let msg = '';
  try { new Workbench({}); } catch (e) { msg = e.message; }
  if (!/root/.test(msg)) throw new Error('错误信息未指向 root：' + msg);
});

test('静态服务：路径穿越被拒、SPA 兜底回 index.html', async () => {
  const { resolveStatic } = await import('../dsh/server.js');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pub = join(ROOT, 'public');
  if (resolveStatic(pub, '/../etc/passwd') !== null) throw new Error('路径穿越未被拒');
  if (resolveStatic(pub, 'a/../../package.json') !== null) throw new Error('.. 穿越未被拒');
  if (!resolveStatic(pub, '/index.html')) throw new Error('index.html 应可解析');
  if (resolveStatic(pub, '/nope.js') !== null) throw new Error('不存在文件应返回 null（走 SPA 兜底）');
});
