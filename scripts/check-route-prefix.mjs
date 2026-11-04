#!/usr/bin/env node
/**
 * 路由前缀同源自查 —— 「UI 路由写死字面量」是多仓互撞与 404 的共同根因。
 *
 * 现场（2026-11-05）：takayasu-workbench 从 ttp-workbench 复制模板后，dsh/index.js 里
 * UI 路由仍写死 `path: '/ttp'`，而其客户端 iframe 加载 `/takayasu/`：
 *   ① 与 ttp-workbench 的 `/ttp` 相撞 → 宿主报 `duplicate prefix route "/ttp"`，一个插件激活失败；
 *   ② 即便不撞，客户端请求 `/takayasu/` 也会 404（SPA 兜底把 index.html 当 JS）。
 *
 * 断言：
 *   ① dsh/index.js 不得出现写死的 `path: '/<非本仓 slug>'` 前缀注册（只许 '/' + API_PREFIX）；
 *   ② identity 的 API_PREFIX 必须是本仓 slug（从 package name 末段取）；
 *   ③ 客户端 UI_ENTRY 与 API_PREFIX 一致（`/slug/`）。
 * 用法：node scripts/check-route-prefix.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const slug = String(pkg.name || '').split('/').pop();
const identity = readFileSync(join(ROOT, 'lib/identity.js'), 'utf8');
const index = readFileSync(join(ROOT, 'dsh/index.js'), 'utf8');
const client = readFileSync(join(ROOT, 'src/client.js'), 'utf8');
const fails = [];

const prefix = (identity.match(/API_PREFIX\s*=\s*'([^']+)'/) || [])[1];
if (!prefix) fails.push('lib/identity.js 缺 API_PREFIX');
if (prefix && !slug.includes(prefix)) fails.push(`API_PREFIX(${prefix}) 与包名 slug(${slug}) 不同源`);
const hard = [...index.matchAll(/path:\s*'\/([a-z0-9-]+)'/g)].map((m) => m[1]).filter((x) => x !== slug && x !== `api/${prefix}`);
if (hard.length) fails.push(`dsh/index.js 写死路由前缀：${hard.join(', ')}（应只用 '/' + API_PREFIX 与 API_BASE_HOSTED）`);
if (!/path:\s*'\/'\s*\+\s*API_PREFIX/.test(index)) fails.push("dsh/index.js 未使用 '/' + API_PREFIX 注册 UI 路由");
if (!new RegExp(`UI_ENTRY\\s*=\\s*'/${prefix}/'`).test(client)) fails.push(`src/client.js UI_ENTRY 不等于 /${prefix}/`);
if (fails.length) { console.error('✗ 路由前缀同源断言失败：\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`✓ 路由前缀同源（slug=${slug} · API_PREFIX=${prefix} · UI=/${prefix}/）`);
