#!/usr/bin/env node
/**
 * 版本生成物：lib/version.js。
 *
 * 为什么是生成物：家族里"三处版本号打架"是高频故障（VERSION / package.json / 页面字面量）。
 * 统一成"VERSION 是唯一手写处，其余全部派生"，并由 scripts/check-version.mjs 反查。
 *
 * 用法：
 *   node scripts/build-version.mjs           写入 lib/version.js
 *   node scripts/build-version.mjs --check   只校验（不改文件），不一致退出码 1
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes('--check');

const version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const problems = [];
if (pkg.version !== version) problems.push(`package.json(${pkg.version}) ≠ VERSION(${version})`);
if (!/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?$/.test(version)) problems.push(`VERSION 不是合法 semver：${version}`);

let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* 非 git 环境允许 */ }

/* 渠道：预发布段存在则为 rc，否则 stable */
const channel = version.includes('-') ? 'rc' : 'stable';
const channelLabel = channel === 'rc' ? '预发布' : '正式';
const build = new Date().toISOString().slice(0, 10);

const body = `/* 生成物，勿手改：由 scripts/build-version.mjs 从 VERSION 派生。
   改版本先改 VERSION，再跑 npm run build:version。 */
export const version = '${version}';
export const displayVersion = 'v${version}';
export const channel = '${channel}';
export const channelLabel = '${channelLabel}';
export const build = '${build}';
export const commit = '${commit}';
export default { version, displayVersion, channel, channelLabel, build, commit };
`;

const target = join(ROOT, 'lib/version.js');
if (check) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  /* build 与 commit 每次都变，--check 只比对 version/channel 两行 */
  const same = current.includes(`export const version = '${version}';`) && current.includes(`export const channel = '${channel}';`);
  if (!same) problems.push('lib/version.js 未随 VERSION 更新（跑 npm run build:version）');
  if (problems.length) { console.error('✗ 版本簿记不一致：\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log(`✓ 版本簿记一致（v${version} · ${channel}）`);
} else {
  if (problems.length) { console.error('✗ ' + problems.join('；')); process.exit(1); }
  writeFileSync(target, body);
  console.log(`✓ 已生成 lib/version.js（v${version} · ${channel} · ${commit}）`);
}
