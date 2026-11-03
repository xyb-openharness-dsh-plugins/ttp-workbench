#!/usr/bin/env node
/**
 * 独立启动：`npm start -- --root <资料目录>`（不装 Desktop 也能看开发版）。
 *
 * 与宿主里跑的是**同一份** createHandler + 同一个 Workbench：独立启动 API_BASE=''，
 * 宿主里 API_BASE='/api/ttp'。两种形态都由 test/api-base.test.mjs 与 ui-parity 兜底。
 */
import { parseArgs } from 'node:util';
import { Workbench } from '../dsh/workbench.js';
import { createHandler } from '../dsh/server.js';
import { DEV_PORT } from '../lib/identity.js';
import { version, displayVersion, build as buildDate } from '../lib/version.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { values } = parseArgs({ options: { root: { type: 'string' }, port: { type: 'string' } } });
const root = values.root || process.argv[2];
if (!root) {
  console.error('用法：npm start -- --root <用户资料目录>\n（本机目录由用户明确指定；不接受主目录/桌面/下载根/tmp）');
  process.exit(2);
}
const forbidden = [/^\/$/, /^\/Users\/[^/]+$/, /\/Desktop$/, /\/Downloads$/, /^\/tmp/, /^\/private\/tmp/];
if (forbidden.some((re) => re.test(root))) { console.error(`✗ 拒绝把 ${root} 当资料目录（主目录/桌面/下载根/tmp）`); process.exit(2); }

const port = Number(values.port || process.env.PORT || DEV_PORT);
const workbench = new Workbench({ root });
workbench.open();
const handler = createHandler({
  apiBase: '',
  publicDir: join(dirname(fileURLToPath(import.meta.url)), '..', 'public'),
  services: {
    version, displayVersion, buildDate,
    capabilities: ['bootstrap', 'profile', 'health'],
    bootstrap: () => workbench.bootstrap(),
    /* 与宿主形态共用同一个 Workbench 方法：dev 与装机的读模型必须是同一条路径，
       否则"本地验过、装进去不一样"（ATTR 第 6 类的常见成因）。 */
  },
});
const { createServer } = await import('node:http');
createServer(handler).listen(port, '127.0.0.1', () => {
  console.log(`小宁宝 TTP 开发版：http://127.0.0.1:${port}/  （资料目录 ${root}）`);
  console.log(`健康检查：http://127.0.0.1:${port}/api/health`);
});
process.on('SIGINT', () => { workbench.close(); process.exit(0); });
