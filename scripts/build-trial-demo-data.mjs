#!/usr/bin/env node
/* 从 research/ttp 快照生成原型/开发版共用的试验子集数据（唯一源）。
   只保留标题与 TTP 相关的记录；字段全部来自快照，不改写；登记状态一律「未核实」。
   用法：node scripts/build-trial-demo-data.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const lines = readFileSync(join(ROOT, 'research/ttp/trials-2026.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const rel = lines.filter((r) => /thrombotic thrombocytopenic|Upshaw[- ]Schulman|血栓性血小板减少性紫癜|purpura/i.test(r.title || ''));
const records = rel.map((r) => {
  const regs = (r.registryNumbers || []).map((x) => `${x.registry} ${x.value}`);
  const primary = (r.registryNumbers || []).find((x) => x.primary) || (r.registryNumbers || [])[0];
  return {
    id: primary ? `${primary.registry}:${primary.value}` : r.recordId,
    registry: regs.join(' / '),
    title: r.title,
    sponsor: Array.isArray(r.sponsor) ? r.sponsor.join('；') : (r.sponsor || ''),
    url: r.sourceUrl || '',
    snapshotDate: r.snapshotDate || '',
    statusNote: '登记状态，未核实',
  };
}).sort((a, b) => String(a.id).localeCompare(String(b.id)));
const body = `/* 由 scripts/build-trial-demo-data.mjs 从 research/ttp/trials-2026.jsonl 生成，勿手改。
   筛选口径：标题含 thrombotic thrombocytopenic / Upshaw-Schulman / 血栓性血小板减少性紫癜 / purpura（排除 TTP 麻醉阻滞等缩写歧义）。
   快照日期 2026-11-04；登记状态一律「未核实」；不做任何匹配判定。 */
(function () {
  'use strict';
  window.TTP_TRIALS = {
    snapshotDate: '2026-11-04',
    source: 'research/ttp/ttp_trials_2026.sqlite（本地快照）',
    note: '本地快照会过期；登记状态 ≠ 有效 ≠ 安全 ≠ 可入组。',
    records: ${JSON.stringify(records, null, 2)}
  };
})();
`;
writeFileSync(join(ROOT, 'prototypes/v0.2/trials-data.js'), body);
console.log(`✓ trials-data.js：${records.length} 条（来自 ${lines.length} 条快照）`);
