import { test } from 'node:test';
import { validateApiBase, buildApiUrl, normalizeApiBase, detectForm } from '../lib/api-base.js';

test('交界守卫：只禁交界处重复 /api，不禁宿主前缀含 /api', () => {
  if (validateApiBase('/api/ttp').ok !== true) throw new Error('宿主前缀 /api/ttp 应合法');
  if (validateApiBase('/api/ttp/api').ok !== false) throw new Error('交界处 /api 结尾应非法');
  if (validateApiBase('').ok !== true) throw new Error('独立启动空串应合法');
  if (buildApiUrl('/api/ttp', 'api/bootstrap') !== '/api/ttp/api/bootstrap') throw new Error('拼 URL 形态不对');
  if (buildApiUrl('', 'api/bootstrap') !== '/api/bootstrap') throw new Error('独立形态拼 URL 不对');
  if (detectForm('/api/ttp') !== 'hosted') throw new Error('宿主形态判定不对');
});
