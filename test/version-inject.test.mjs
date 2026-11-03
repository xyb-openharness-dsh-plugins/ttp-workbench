import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();

test('版本十处同源：VERSION = package.json = lib/version.js = 客户端注入', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const libVer = readFileSync(join(ROOT, 'lib/version.js'), 'utf8');
  const client = readFileSync(join(ROOT, 'lib/client.js'), 'utf8');
  if (pkg.version !== version) throw new Error(`package.json ${pkg.version} ≠ VERSION ${version}`);
  if (!libVer.includes(`export const version = '${version}';`)) throw new Error('lib/version.js 未随 VERSION 生成');
  if (!client.includes(`const __VERSION__ = "${version}"`)) throw new Error('lib/client.js 版本注入缺失');
});

test('public/ 只走占位符，不写死版本字面量', () => {
  for (const f of ['index.html', 'app.js']) {
    const s = readFileSync(join(ROOT, 'public', f), 'utf8');
    if (/v0\.\d+\.\d+/.test(s)) throw new Error(`public/${f} 有版本字面量（应走 __VERSION_DISPLAY__）`);
  }
  if (!readFileSync(join(ROOT, 'public', 'index.html'), 'utf8').includes('__VERSION_DISPLAY__')) {
    throw new Error('public/index.html 缺 __VERSION_DISPLAY__ 占位');
  }
});
