#!/usr/bin/env node
/**
 * public/ 令牌形态自查 —— 0.2.0 装机激活失败（业务帧白屏）的可断言版。
 *
 * 现场：migrate-public 生成 `window.__API_BASE__`，宿主注入令牌后变成 `window./api/ttp`
 * → 语法错误 → 业务帧整个脚本不执行（dev-server 里 API_BASE='' 时看不出问题，
 * 装进宿主才炸——「dev 全绿 ≠ 装机能用」第 7 类）。
 *
 * 断言：
 *   ① public/app.js 的 apiBase 必须是字符串字面量形态 `"__API_BASE__"`；
 *   ② 全 public/ 禁止 `window.__API_BASE__` / `window.__VERSION`（令牌被替换后必然语法错误）；
 *   ③ public/index.html 必须含 __VERSION_DISPLAY__ 占位（版本注入面）。
 * 用法：node scripts/check-public-tokens.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const app = join(ROOT, 'public/app.js');
const index = join(ROOT, 'public/index.html');
if (!existsSync(app)) { console.error('✗ public/app.js 不存在（先跑 npm run build:public）'); process.exit(1); }
const appSrc = readFileSync(app, 'utf8');
if (!/var\s+apiBase\s*=\s*"__API_BASE__"/.test(appSrc)) fails.push('public/app.js 缺字符串字面量形态 var apiBase = "__API_BASE__"（注入后才是合法 JS）');
if (/window\.__API_BASE__/.test(appSrc)) fails.push('public/app.js 出现 window.__API_BASE__（注入后变 window./api/ttp，语法错误）');
if (existsSync(index)) {
  const idxSrc = readFileSync(index, 'utf8');
  if (/window\.__VERSION/.test(idxSrc)) fails.push('public/index.html 出现 window.__VERSION*（注入后必然语法错误）');
  if (!idxSrc.includes('__VERSION_DISPLAY__')) fails.push('public/index.html 缺 __VERSION_DISPLAY__ 占位（版本注入面缺失）');
} else fails.push('public/index.html 不存在');
if (fails.length) { console.error('✗ public 令牌形态：\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('✓ public 令牌形态：字符串字面量注入面正确，无 window.* 令牌（0.2.0 装机教训回归保护）');
