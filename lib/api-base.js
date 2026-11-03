/**
 * apiBase 定稿契约（v0.1.3 口径）。
 *
 * 背景（GBM 踩 4）：页面拼 `${API_BASE}/api/xxx`，而 API_BASE 在两种形态下不同：
 *   - 独立启动：API_BASE = ''      → 页面拼 `/api/bootstrap`
 *   - 宿主机内：API_BASE = '/api/ttp' → 页面拼 `/api/ttp/api/bootstrap`
 * 于是有人写了 `includes('/api')` 一刀切去"防重复"，把**正常的宿主前缀含 /api** 判成错误；
 * 或者反过来没防住，拼出 `/api/api/...`。
 *
 * 定稿规则：
 *   ① 守卫只禁**交界处重复**：API_BASE 以 `/api` 结尾（`/(^|\/)api$/`）→ 非法；
 *   ② 不许 `includes('/api')` 一刀切；
 *   ③ 启动期校验失败 → **渲染错误横幅，禁止裸 throw 白屏**（宿主里白屏等于装机失败）；
 *   ④ 必须带双形态回归测试（见 test/api-base.test.mjs）。
 */

/** 规范化挂载前缀：去尾斜杠；空串表示独立启动。 */
export function normalizeApiBase(raw) {
  if (raw === undefined || raw === null) return '';
  let v = String(raw).trim();
  if (v === '' || v === '/') return '';
  if (!v.startsWith('/')) v = '/' + v;
  return v.replace(/\/+$/, '');
}

/**
 * 校验 apiBase 是否可用于拼接 `${base}/api/xxx`。
 * @returns {{ok: boolean, reason?: string, base: string}}
 */
export function validateApiBase(raw) {
  /* 先判原始值：完整 URL 归一化后会被加上前导斜杠，必须在这之前拦 */
  const rawText = raw === undefined || raw === null ? '' : String(raw).trim();
  if (/^https?:\/\//i.test(rawText) || rawText.includes('://')) {
    return { ok: false, base: '', reason: 'API_BASE 只放挂载前缀，不放完整 URL（跨源会丢认证）' };
  }
  const base = normalizeApiBase(raw);
  /* 唯一禁止：交界处重复 /api（独立启动为空串是合法的） */
  if (/(^|\/)api$/.test(base)) {
    return { ok: false, base, reason: `API_BASE 以 /api 结尾会让拼出的路径出现 /api/api（当前 "${base}"）` };
  }
  if (/\s/.test(base)) return { ok: false, base, reason: 'API_BASE 不得含空白字符' };
  return { ok: true, base };
}

/** 页面统一用这个拼：buildApiUrl('/api/bootstrap') */
export function buildApiUrl(base, path) {
  const v = validateApiBase(base);
  if (!v.ok) throw new Error('apiBase 非法：' + v.reason);
  const p = path.startsWith('/') ? path : '/' + path;
  return v.base + p;
}

/**
 * 启动期校验：失败**不抛**，返回给调用方渲染错误横幅。
 * 返回值里的 `banner` 是给 UI 的直接可渲染文案。
 */
export function guardStartupApiBase(raw) {
  const v = validateApiBase(raw);
  if (v.ok) return { ok: true, base: v.base, banner: null };
  return {
    ok: false, base: '', banner: {
      title: '服务连接配置有问题',
      detail: v.reason,
      hint: '这通常不是你的操作问题；可以点「重新检查连接」，或把这段文字发给维护者。',
    },
  };
}

/** 宿主形态判定（客户端/服务端共用同一判据，避免两处写法漂移）。 */
export function detectForm(apiBase) {
  return normalizeApiBase(apiBase) === '' ? 'standalone' : 'hosted';
}
