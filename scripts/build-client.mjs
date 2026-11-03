#!/usr/bin/env node
/**
 * 宿主接线件 ③ 的构建：把 `src/client.js` 打成宿主可加载的前端包 `lib/client.js`。
 *
 * 为什么产物必须是 `lib/client.js`（2026-10-25 装机前实测）：
 *   `package.json` 的 `exports['./client']` 指向 `./lib/client.js`，宿主加载的就是它。
 *   而 init 生成的 `lib/client.js` 只是**占位骨架**（渲染一句「接入骨架」），
 *   `src/client.js` 却从没被打进去 —— dev-server 直接服务 public/ 所以本地看不出，
 *   装进 Desktop 就是"只见骨架、业务区空白"（第 3 类失败）。
 *   旧版本脚本产物写到 `dist/client.js`，那个路径既不在 exports 也不在 files，等于白做。
 *
 * 注入两处（不许在客户端手写第二份）：
 *   __PANEL_LAYOUT__ ← lib/layout.js 的 PANEL（customFrame/businessSide/businessWidth）
 *   __VERSION__      ← lib/version.js（由 VERSION 派生）
 *
 * 用法：
 *   node scripts/build-client.mjs            写 lib/client.js
 *   node scripts/build-client.mjs --check    只校验产物是否与源同步（不改文件）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PANEL, AGENT_PANE } from '../lib/layout.js';
import { version } from '../lib/version.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes('--check');

const src = readFileSync(join(ROOT, 'src/client.js'), 'utf8');

/* 源文件里 `export ` 前缀要剥掉：里面的东西是在工厂函数作用域内直接用的变量/函数 */
const body = src
  .replace(/^export\s+(const|function|let)\s/gm, '$1 ')
  .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '');

const banner = `/* 由 scripts/build-client.mjs 从 src/client.js 生成，勿手改。 */
/* 面板参数来自 lib/layout.js，版本来自 lib/version.js（VERSION 派生）。 */
`;

const out = `${banner}window.__ModuleLoader__.load({
  id: "@xyb-community/ttp-workbench",
  factory(require) {
    const React = require('react')
    /* 注入点：与 lib/layout.js 同源，客户端不许另写一份 0.65 */
    const __PANEL_LAYOUT__ = ${JSON.stringify(PANEL)}
    /* 会话面板参数（默认/最小/最大/步进）同源于 lib/layout.js */
    const __AGENT_PANE__ = ${JSON.stringify(AGENT_PANE)}
    const __VERSION__ = ${JSON.stringify(version)}

${body.split('\n').map((line) => (line.trim() === '' ? '' : '    ' + line)).join('\n')}

    return { apply, inject: INJECT }
  }
})
`;

const target = join(ROOT, 'lib/client.js');
if (check) {
  let current = '';
  try { current = readFileSync(target, 'utf8'); } catch { /* 不存在就是不同步 */ }
  if (current !== out) {
    console.error('✗ lib/client.js 与 src/client.js 不同步（跑 npm run build:client）');
    process.exit(1);
  }
  console.log('✓ lib/client.js 与源同步');
  process.exit(0);
}
writeFileSync(target, out);
console.log(`✓ lib/client.js（${out.split('\n').length} 行 · ${version}）`);
