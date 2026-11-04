#!/usr/bin/node
/**
 * public/ 定点移植（TTP 版）：**复制原型 → 定点替换**，不手抄。
 *
 * 替换点（只有这些，其它与原型逐字符相同——ui-parity 口径）：
 *   1. index.html：加 noindex；「原型声明」条改开发版措辞；版本 chip/页脚走 __VERSION_DISPLAY__ 占位
 *      （server.js 注入，两种形态同一份文件）；
 *   2. 资产路径：原型在 prototypes/v0.2/ 用 ../../assets，public/ 在根下一层改 ../assets；
 *   3. app.js：boot() 后追加「bootstrap 混合数据源」块——宿主形态拉 /api/bootstrap（同形状），
 *      file:// 与拉取失败一律回退演示数据（禁裸 throw，禁白屏）。
 *
 * 用法：node scripts/migrate-public.mjs [--check]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'prototypes/v0.2');
const OUT = join(ROOT, 'public');
const CHECK = process.argv.includes('--check');
const FILES = ['index.html', 'app.js', 'style.css', 'demo-data.js', 'trials-data.js', 'primer-data.js'];

const bannerNote = '<div class="demo-strip" id="demo-strip">本机数据 · 不上传 · AI 面板由宿主提供 · 业务数据仍为演示内容直到导入真实资料</div>';

function migrateIndex(s) {
  return s
    .replace('<title>小宁宝 · TTP 工作台（交互原型）</title>', '<title>小宁宝 · TTP 工作台</title>\n<meta name="robots" content="noindex,nofollow">')
    .replace('<div class="demo-strip" id="demo-strip">原型声明：本页全部为合成示例，未接入宿主，不包含任何真实病历。</div>', bannerNote)
    .replace('aria-label="关于小宁宝：版本与口径说明">原型 v0.2<', 'aria-label="关于小宁宝：版本与口径说明">__VERSION_DISPLAY__<')
    .replace('<span data-version-placeholder>原型 v0.2</span>', '<span data-version-placeholder>__VERSION_DISPLAY__</span>')
    .replace(/href="\.\.\/\.\.\/assets\/patterns\//g, 'href="../assets/patterns/')
    .replace(/src="\.\.\/\.\.\/assets\/patterns\//g, 'src="../assets/patterns/');
}

function migrateApp(s) {
  return s + `

/* ── 开发版数据源（scripts/migrate-public.mjs 注入点；原型无此块）──
   宿主形态优先 bootstrap（读模型还原 demo 形状，parity 由测试断言）；
   file:// 与拉取失败回退演示数据：不裸 throw、不白屏。 */
;(function () {
  var apiBase = "__API_BASE__"; /* 令牌会被宿主注入成字符串字面量；禁止把令牌挂在 window 对象上（注入后会语法错误，0.2.0 装机教训） */
  if (location.protocol === 'file:') return;
  fetch(apiBase + '/api/bootstrap').then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (b) {
    if (!b || !b.profiles || !b.metrics) throw new Error('bootstrap 形状不符');
    window.DEMO.profiles = b.profiles;
    window.DEMO.metrics = b.metrics;
    var app = window.__APP__;
    app.state.profile = Object.keys(b.profiles)[0];
    app.state.view = 'dash';
    app.state.sub = null;
    app.state.flipped = {};
    app.state.candidates = { labs: [] };
    app.state.checks = {};
    app.render();
    console.info('[ttp] 已切换到本机数据库数据（' + Object.keys(b.profiles).length + ' 个档案）');
  }).catch(function (e) {
    console.warn('[ttp] bootstrap 不可用，继续使用演示数据：', String(e && e.message || e));
  });
})();
`;
}

const outs = {};
for (const f of FILES) {
  let s = readFileSync(join(SRC, f), 'utf8');
  if (f === 'index.html') s = migrateIndex(s);
  if (f === 'app.js') s = migrateApp(s);
  outs[f] = s;
}
if (CHECK) {
  let bad = 0;
  for (const f of FILES) {
    const p = join(OUT, f);
    if (!existsSync(p) || readFileSync(p, 'utf8') !== outs[f]) { console.error('✗ public/' + f + ' 与原型不同步（跑 npm run build:public）'); bad++; }
  }
  if (bad) process.exit(1);
  console.log('✓ public/ 与原型定点同步（' + FILES.length + ' 文件）');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
for (const f of FILES) writeFileSync(join(OUT, f), outs[f]);
console.log('✓ 已生成 public/（' + FILES.length + ' 文件 · 原型定点移植）');
