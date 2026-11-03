#!/usr/bin/env node
/**
 * 数据模型断言（G3 出口之一）：
 *   ① 判读列断言——全库不得有 diagnosis|risk_level|severity|stage|prognos 类判定列；
 *   ② 分类指标不进趋势——dec IS NULL 的必须 in_trend=0；
 *   ③ `using` 保留字不得作列名（应为 in_use）；
 *   ④ 有 {title, rows} 分节的表必须有 *_title 列或 section_titles 表；
 *   ⑤ 迁移只增不改——0002+ 只能 ALTER/CREATE，不得 DROP 0001 建的表。
 * 用法：node scripts/check-schema.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, 'schema');
const problems = [];

if (!existsSync(DIR)) { console.error('缺少 schema/ 目录'); process.exit(1); }
const files = readdirSync(DIR).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
if (!files.length) { console.error('schema/ 下没有 0001_*.sql'); process.exit(1); }

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
for (const f of files) db.exec(readFileSync(join(DIR, f), 'utf8'));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);
const JUDGE = /diagnosis|risk_level|severity|stage|prognos/i;
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  for (const c of cols) {
    if (JUDGE.test(c.name)) problems.push(`① 判读列：${t}.${c.name}`);
    if (c.name === 'using') problems.push(`③ 保留字列名：${t}.using（应为 in_use）`);
  }
  /* ④ 分节表必须有 section_titles 或自身 *_title 列 */
  if (/records|events|logs|items|viewpoints/.test(t)) {
    const hasTitle = cols.some((c) => /_title$/.test(c.name));
    const hasSectionTable = tables.includes('section_titles');
    if (!hasTitle && !hasSectionTable && t !== 'audit_log') problems.push(`④ ${t} 缺 *_title 列且无 section_titles 表`);
  }
}
/* ② 分类指标不进趋势（以 demo 数据实测，无 demo 时跳过） */
const DEMO = join(ROOT, 'demo/demo-data.sqlite');
if (existsSync(DEMO)) {
  const d = new DatabaseSync(DEMO);
  for (const r of d.prepare('SELECT metric_key, dec, in_trend, kind, unit FROM metric_definitions WHERE dec IS NULL').all()) {
    if (r.in_trend !== 0) problems.push(`② 分类指标进了趋势：${r.metric_key}（kind=${r.kind}）`);
    if (r.unit !== null) problems.push(`② 分类指标不该有单位：${r.metric_key} unit=${r.unit}`);
  }
  for (const r of d.prepare('SELECT metric_key FROM metric_definitions WHERE dec IS NOT NULL AND in_trend = 1 AND unit IS NULL').all()) {
    problems.push(`② 无量纲指标进趋势：${r.metric_key}`);
  }
  d.close();
}
/* ⑤ 0002+ 不得 DROP 0001 建的表 */
const first = new Set();
{
  const d2 = new DatabaseSync(':memory:');
  d2.exec(readFileSync(join(DIR, files[0]), 'utf8'));
  d2.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().forEach((r) => first.add(r.name));
  d2.close();
}
for (const f of files.slice(1)) {
  const sql = readFileSync(join(DIR, f), 'utf8');
  for (const m of sql.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w"]+)/gi)) {
    if (first.has(m[1].replace(/"/g, ''))) problems.push(`⑤ ${f} DROP 了 0001 建的表 ${m[1]}`);
  }
}
db.close();

if (problems.length) { console.error(`✗ 数据模型断言失败 ${problems.length} 条：`); problems.forEach((p) => console.error('  ' + p)); process.exit(1); }
console.log(`✓ 数据模型断言通过（${files.length} 个迁移文件 / ${tables.length} 张表，0 判读列、0 保留字列名）`);
