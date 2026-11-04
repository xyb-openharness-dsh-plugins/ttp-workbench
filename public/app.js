/* 小宁宝 TTP 工作台 · 原型 v0.2 app.js
 * 结构基准：家族三样板（移植底本的导航/选中态、结构基准仓的 phase-fold/AI 面板/泳道、成熟基准仓的卡与空态）——只取结构与元素体系，不取病种语义；对照明细见 docs/research/FAMILY-STRUCTURE-2026.md。
 * 数据唯一源：demo-data.js（window.DEMO）；本文件不写死任何病历数字。
 * 红线：无判定列；复发/缓解状态只引用医生原文；私密三出口共用 DEMO.filterPublic。
 */
(function () {
  'use strict';

  /* ---------- 常量 ---------- */
  var DEMO_NOW = '2026-11-01'; // 演示时钟（合成）
  var PAGES = [
    { key: 'dash',    name: '看板' },
    { key: 'episode', name: '发作与缓解' },
    { key: 'labs',    name: '化验与趋势' },
    { key: 'pe',      name: '血浆置换' },
    { key: 'tx',      name: '治疗与用药' },
    { key: 'review',  name: '复诊准备' },
    { key: 'urgent',  name: '就医与紧急' },
    { key: 'mind',    name: '心理与照护' },
    { key: 'docs',    name: '资料与导入' }
  ];
  var SUBPAGES = {
    episode: [['ep-timeline', '时间线'], ['ep-detail', '发作详情'], ['ep-log', '发作记录']],
    labs:    [['labs-cat', '分类指标'], ['labs-trend', '一图秀'], ['labs-compare', '可比组']],
    pe:      [['pe-list', '置换记录'], ['pe-session', '单次详情']],
    tx:      [['tx-meds', '用药记录'], ['tx-episodes', '发作内治疗']],
    review:  [['review-prep', '就诊准备'], ['review-export', '导出与回顾']],
    urgent:  [['urgent-plan', '行动计划'], ['urgent-info', '就医信息']],
    mind:    [['mind-feel', '当下感受'], ['mind-burden', '家庭与照护']],
    docs:    [['docs-lib', '资料库'], ['docs-import', '导入与解析'], ['docs-candidates', '整理草稿']]
  };
  var ROUTES = [
    'dash',
    'episode/ep-timeline', 'episode/ep-detail', 'episode/ep-log',
    'labs/labs-cat', 'labs/labs-trend', 'labs/labs-compare',
    'pe/pe-list', 'pe/pe-session',
    'tx/tx-meds', 'tx/tx-episodes',
    'review/review-prep', 'review/review-export',
    'urgent/urgent-plan', 'urgent/urgent-info',
    'mind/mind-feel', 'mind/mind-burden',
    'docs/docs-lib', 'docs/docs-import', 'docs/docs-candidates'
  ];

  /* ---------- 状态 ---------- */
  var state = {
    profile: 'B',
    view: 'dash', sub: null,
    aiOpen: false, aiSessionId: 0,
    timeWindow: 'all', showPE: true, showLabDots: true,
    flipped: {},            // mcard key -> true
    sel: ['plt', 'ldh'],
    settingsTab: 'store',
    cfg: { consent: false, showToken: false, tokenMasked: 'sk-8f2c****' },
    candidates: { labs: [] }, // AI/导入候选，核对前不入图
    checks: {},             // 已核对候选 id
    pvStack: [],            // 整页视图栈（唯一真源是 history，栈只存 UI 上下文）
    pvReturnFocus: null, pvScroll: 0,
        exportSel: {}, listCheck: {}
  };

  function P() { return DEMO.profiles[state.profile]; }
  function metricOf(k) { for (var i = 0; i < DEMO.metrics.length; i++) if (DEMO.metrics[i].key === k) return DEMO.metrics[i]; return null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dayCount(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  /* 病程位置：发作—缓解语义（非肿瘤口径），状态文字只来自医生原文 */
  function coursePos(p) {
    var last = p.episodes[p.episodes.length - 1];
    var ended = last.endPrecision === 'day' && last.end;
    var n = dayCount(ended ? last.end : last.start, DEMO_NOW);
    if (ended) return { mode: 'remission', dayN: n, sinceFlare: n, last: last };
    return { mode: 'flare', dayN: n, sinceFlare: null, last: last };
  }
  function flares90(p) {
    var lim = new Date(DEMO_NOW); lim.setDate(lim.getDate() - 90);
    return p.episodes.filter(function (e) { return new Date(e.start) >= lim; }).length;
  }

  /* ---------- DOM 工具 ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      if (Array.isArray(c)) { c.forEach(function (x) { if (x == null) return; el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); continue; }
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(document.createTextNode(String(c)));
    }
    return el;
  }
  function pageHead(eyebrow, title, sub) {
    return h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, eyebrow),
      h('h1', null, title),
      sub ? h('div', { class: 'sub' }, sub) : null);
  }
  function secTitle(t, note) {
    return h('div', { class: 'section-title' }, h('h2', null, t), note ? h('span', { class: 'sec-note' }, note) : null);
  }
  function aiBtn(pageKey, extra) { return h('button', { class: 'soft-btn', 'data-action': 'ai-discuss', 'data-ai-page': pageKey, 'data-ai-extra': extra || '' }, '和 AI 讨论'); }

  /* 导航线性图标（家族口径：stroke currentColor，18px） */
  var ICONS = {
    dash: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    episode: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    labs: '<path d="M4 19V5M4 19h16"/><path d="M8 15l3-4 3 2 4-6"/>',
    pe: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
    tx: '<rect x="4" y="8" width="16" height="8" rx="4"/><path d="M12 8v8"/>',
    review: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h4"/>',
    urgent: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 17h.01"/>',
    mind: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>',
    docs: '<path d="M4 4h9l4 4v12H4z"/><path d="M13 4v4h4"/>'
  };
  function navIcon(key) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[key] || '') + '</svg>';
  }

  /* ---------- 私密三出口 ---------- */
  /* 出口 1：看板摘要预览；出口 2：导出；出口 3：AI 上下文 —— 三处都走 DEMO.filterPublic */
  function privateNote(p) {
    var all = [].concat(p.notes, p.pe.filter(function (x) { return x.note; }), p.labs, p.docs);
    var m = DEMO.privateCount(all);
    return m ? '共 ' + all.length + ' 条中私密 ' + m + ' 条（三出口均不包含）' : '当前无私密记录';
  }

  /* ---------- AI（Q14–Q19） ---------- */
  var AI_PROMPTS = {
    'dash': function () { var p = P(), c = coursePos(p); return '我的 TTP 随访档案：' + (c.mode === 'remission' ? '缓解第 ' + c.dayN + ' 天（自医生记录的结束日期起），距上次发作结束 ' + c.sinceFlare + ' 天' : '发作中第 ' + c.dayN + ' 天') + '；近 90 天发作 ' + flares90(p) + ' 次（数据截止 ' + DEMO_NOW + '，合成示例）。请帮我把这些数字整理成一段复诊时可以给医生看的话。只整理，不需要任何判断。'; },
    'episode': function () { var p = P(); return '发作记录：共 ' + p.episodes.length + ' 次，首发作 ' + p.anchor + '，状态文字均为医生原文。请按时间列一张「发作日期 / 结束日期 / 医生原文状态」对照表。仅整理。'; },
    'labs': function () { var p = P(); var pub = DEMO.filterPublic(p.labs); var byM = {}; pub.forEach(function (l) { byM[l.metric] = (byM[l.metric] || 0) + 1; }); var s = Object.keys(byM).map(function (k) { return metricOf(k).name + ' ' + byM[k] + ' 条'; }).join('、'); return '化验记录（' + s + '，数据截止 ' + DEMO_NOW + '）。请把血小板和 LDH 各自最近 3 条整理成表：日期、数值、单位、方法、机构。不同方法分列，不合并。仅整理。'; },
    'pe': function () { var p = P(); var pub = DEMO.filterPublic(p.pe); return '血浆置换记录：共 ' + pub.length + ' 次。请按发作分组，列每次的日期、序号、记录时长。仅整理，不做效果评价。'; },
    'tx': function () { var p = P(); return '用药记录：共 ' + p.meds.length + ' 条，均为医嘱/出院小结原文（未抄录剂量处如实标注）。请按时间列「药名 / 起止 / 记录来源」。仅整理，不给出任何用药意见。'; },
    'review': function () { var p = P(); return '复诊准备：距上次发作 ' + (coursePos(p).sinceFlare != null ? coursePos(p).sinceFlare + ' 天' : '（发作中）') + '；可带资料 ' + DEMO.filterPublic(p.docs).length + ' 份。请帮我列一份「复诊要带」清单框架。仅整理。'; },
    'urgent': function () { var p = P(); return p.plan ? '医生行动计划原话已记录于 ' + p.plan.source + '。请帮我把原话整理成一张可放大展示的卡片文本，保持原话不动。' : '尚无医生确认的行动计划。请提醒我：向医生要一句「什么情况要马上联系谁」并记下来。不生成任何行动建议。'; },
    'mind': function () { var p = P(); var pub = DEMO.filterPublic(p.notes); return '感受与照护记录（不含私密 ' + DEMO.privateCount(p.notes) + ' 条）：共 ' + pub.length + ' 条。请按日期整理成时间顺序摘要，不解读、不评判。'; },
    'docs': function () { var p = P(); return '资料库：共 ' + p.docs.length + ' 份，其中 ' + p.docs.filter(function (d) { return !d.hasOriginal; }).length + ' 份未取得原件。请列「已核对 / 待核对 / 原件未取得」三组清单。仅整理。'; }
  };
  function agentDraft(prompt, send) {
    var ev = { type: 'ttp:agent-draft', prompt: prompt, send: !!send, sessionId: ++state.aiSessionId };
    try { (window.parent !== window ? window.parent : window).postMessage(ev, '*'); } catch (e) { /* 独立打开时无宿主 */ }
    if (window.parent === window) localDraftFill(ev); // Q16 演示面板
  }
  function localDraftFill(ev) {
    if (!state.aiOpen) toggleAI(true);
    var input = document.getElementById('agent-input');
    if (input) input.value = ev.prompt;
    appendAgentLog('（演示）已把问题填进草稿框。未接通原生会话，不会发送。');
  }
  function appendAgentLog(text) {
    var log = document.getElementById('agent-log'); if (!log) return;
    log.appendChild(h('div', { class: 'card', style: 'margin-bottom:8px;font-size:13px;' }, text));
    log.scrollTop = log.scrollHeight;
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    if (e.data && e.data.type === 'ttp:agent-draft' && window.parent === window) localDraftFill(e.data);
  });
  function toggleAI(open) {
    state.aiOpen = open == null ? !state.aiOpen : open;
    document.body.classList.toggle('ai-collapsed', !state.aiOpen);
    var t = document.getElementById('agent-toggle');
    if (t) { t.setAttribute('aria-expanded', String(state.aiOpen)); }
    if (state.aiOpen) appendAgentLog('演示面板已打开。这里永远只是草稿：不会自动发送任何内容。');
  }

  /* ---------- 折叠卡（aml phase-fold 结构） ---------- */
  function fold(summaryNodes, bodyNodes, open) {
    var d = h('details', { class: 'phase-fold' });
    if (open) d.setAttribute('open', '');
    var s = h('summary', null); summaryNodes.forEach(function (n) { s.appendChild(n); });
    var b = h('div', { class: 'fold-body' }); bodyNodes.forEach(function (n) { if (n) b.appendChild(n); });
    d.appendChild(s); d.appendChild(b);
    return d;
  }

  /* ---------- 平滑曲线（Fritsch–Carlson 单调三次插值） ---------- */
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var n = pts.length, dx = [], dy = [], m = [], t1 = [];
    for (var i = 0; i < n - 1; i++) { dx.push(xs[i + 1] - xs[i]); dy.push(ys[i + 1] - ys[i]); m.push(dy[i] / dx[i]); }
    t1[0] = m[0]; t1[n - 1] = m[n - 2];
    for (i = 1; i < n - 1; i++) t1[i] = (m[i - 1] * m[i] <= 0) ? 0 : (m[i - 1] + m[i]) / 2;
    /* Fritsch–Carlson 限幅 */
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t1[i] = 0; t1[i + 1] = 0; }
      else {
        var a = t1[i] / m[i], b = t1[i + 1] / m[i], s = a * a + b * b;
        if (s > 9) { var tt = 3 / Math.sqrt(s); t1[i] = tt * a * m[i]; t1[i + 1] = tt * b * m[i]; }
      }
    }
    var d = 'M' + xs[0] + ' ' + ys[0];
    for (i = 0; i < n - 1; i++) {
      var x1 = xs[i] + dx[i] / 3, y1 = ys[i] + t1[i] * dx[i] / 3;
      var x2 = xs[i + 1] - dx[i] / 3, y2 = ys[i + 1] - t1[i + 1] * dx[i] / 3;
      d += 'C' + x1 + ' ' + y1 + ' ' + x2 + ' ' + y2 + ' ' + xs[i + 1] + ' ' + ys[i + 1];
    }
    return d;
  }

  /* ---------- 化验分组（可比组：指标+方法+机构；跨组不连线） ---------- */
  function comparableGroups(labs0, metricKey) {
    var labs = (labs0 && labs0._pub) ? labs0 : DEMO.filterPublic(labs0);
    var g = {}, order = [];
    labs.forEach(function (l) {
      if (l.metric !== metricKey || l.datePrecision === 'unknown') return;
      var k = l.metric + '|' + l.method + '|' + l.site;
      if (!g[k]) { g[k] = []; order.push(k); }
      g[k].push(l);
    });
    order.forEach(function (k) { g[k].sort(function (a, b) { return new Date(a.date) - new Date(b.date); }); });
    return order.map(function (k) { return { key: k, items: g[k] }; });
  }
  function inWindow(items) {
    var back = state.timeWindow === '90d' ? 3 : state.timeWindow === '180d' ? 6 : state.timeWindow === '365d' ? 12 : 0;
    if (!back) return items;
    var lim = new Date(DEMO_NOW); lim.setMonth(lim.getMonth() - back);
    lim = lim.toISOString().slice(0, 10);
    return items.filter(function (l) { return l.date && l.date >= lim; });
  }

  /* ---------- 图表：一图秀（C 组口径） ---------- */
  var CH = { w: 720, h: 300, padL: 42, padR: 58, padT: 16, padB: 34 };
  function renderTrend(container) {
    var p = P();
    var sel = state.sel.slice(0, 4);
    /* 双栏：左 rail（对齐小粉宝一图秀）+ 右主图 */
    var layout = h('div', { class: 'onechart-layout' });
    container.appendChild(layout);

    /* ---- 左 rail ---- */
    var ranges = [['all', '全部'], ['90d', '近 3 月'], ['180d', '近 6 月'], ['365d', '近 12 月']];
    var rangeChips = h('div', { class: 'chips' });
    ranges.forEach(function (r) {
      rangeChips.appendChild(h('button', { class: 'chip', 'data-action': 'tw', 'data-tw': r[0], 'aria-pressed': String(state.timeWindow === r[0]) }, r[1]));
    });
    var metricList = h('div', { class: 'metric-list' });
    var cats = [];
    DEMO.metrics.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat); });
    cats.forEach(function (cat) {
      metricList.appendChild(h('div', { class: 'cat-label' }, cat));
      DEMO.metrics.filter(function (m) { return m.cat === cat; }).forEach(function (m) {
        var last = (function () { var it = DEMO.filterPublic(p.labs).filter(function (l) { return l.metric === m.key; }); it.sort(function (a, b) { return (b.date || '9999') < (a.date || '9999') ? -1 : 1; }); return it[0]; })();
        var cb = h('input', { type: 'checkbox', 'data-action': 'sel-metric', 'data-metric': m.key });
        if (sel.indexOf(m.key) >= 0) cb.checked = true;
        metricList.appendChild(h('label', { class: 'metric-pick' },
          cb,
          h('i', { style: 'background:' + m.color }),
          h('span', null, m.name),
          h('small', null, last ? String(last.value) : '—')));
      });
    });
    var pickDetails = h('details', { class: 'pick' });
    if (typeof window !== 'undefined' && window.innerWidth > 900) pickDetails.setAttribute('open', '');
    pickDetails.appendChild(h('summary', null, h('span', null, '选择指标'), h('small', null, '最多 4 个 · 已选 ' + sel.length)));
    pickDetails.appendChild(metricList);
    pickDetails.appendChild(h('p', { class: 'small-note', style: 'margin-top:6px' }, '共 ' + DEMO.metrics.length + ' 项，可滚动 · 勾选后图表立即更新'));
    var rail = h('aside', { class: 'rail', 'aria-label': '一图秀筛选项' },
      h('section', null, h('h3', null, '时间范围'), rangeChips),
      h('section', null, pickDetails),
      h('section', null,
        h('h3', null, '显示内容'),
        h('div', { class: 'chips' }, h('button', { class: 'chip', 'data-action': 'toggle-pe', 'aria-pressed': String(state.showPE) }, '置换节点')),
        h('p', { class: 'small-note', style: 'margin-top:8px' }, '发作区间带始终显示（医生记录）；虚线浅红。')));
    layout.appendChild(rail);

    /* ---- 右主图 ---- */
    var mainCol = h('div', { class: 'timeline-main' });
    layout.appendChild(mainCol);
    var panel = h('div', { class: 'chart-panel' });
    mainCol.appendChild(panel);
    var svg = svgEl('svg', { class: 'chart', viewBox: '0 0 ' + CH.w + ' ' + CH.h, role: 'img', 'aria-label': '一图秀：已选化验序列各自全期范围归一化，不可比' });
    panel.appendChild(svg);

    var bands = sel.map(function (k, i) { return { m: metricOf(k), cls: i % 2 === 0 ? 'lab' : 'ldh', groups: [] }; }).filter(function (b) { return b.m; });
    bands.forEach(function (b) {
      b.groups = comparableGroups(p.labs, b.m.key).map(function (g) { return { g: g, items: inWindow(g.items) }; }).filter(function (x) { return x.items.length; });
    });
    var any = bands.some(function (b) { return b.groups.length; });
    if (!sel.length) {
      svg.appendChild(svgEl('text', { x: CH.padL + 10, y: CH.h / 2 }, '没有所选指标——从左侧勾选，最多 4 条'));
      panel.appendChild(h('div', { class: 'sub', style: 'color:var(--soft-fg);font-size:13px;margin-top:6px;' }, '不同方法/机构分线，互不可比。'));
      panel.setAttribute('data-points', '0');
      panel.setAttribute('data-paths-visible', '0');
      return;
    }
    if (!any) {
      svg.appendChild(svgEl('text', { x: CH.padL + 10, y: CH.h / 2 }, '所选时间窗内没有所选指标的数据'));
      panel.appendChild(h('div', { class: 'sub', style: 'color:var(--soft-fg);font-size:13px;margin-top:6px;' },
        '切换时间窗或换指标；不同方法/机构分线，互不可比。'));
      panel.setAttribute('data-points', '0');
      panel.setAttribute('data-paths-visible', '0');
      return;
    }

    /* x 域 */
    var all = [].concat.apply([], bands.map(function (b) { return [].concat.apply([], b.groups.map(function (x) { return x.items; })); }));
    var dmin = all.reduce(function (a, l) { return l.date < a ? l.date : a; }, all[0].date);
    var dmax = all.reduce(function (a, l) { return l.date > a ? l.date : a; }, all[0].date);
    var monthsBack = state.timeWindow === '90d' ? 3 : state.timeWindow === '180d' ? 6 : state.timeWindow === '365d' ? 12 : 0;
    if (monthsBack) { var lim = new Date(DEMO_NOW); lim.setMonth(lim.getMonth() - monthsBack); dmin = dmin < lim.toISOString().slice(0, 10) ? lim.toISOString().slice(0, 10) : dmin; }
    var x = function (date) {
      var t0 = new Date(dmin + 'T00:00'), t1 = new Date(dmax + 'T00:00');
      var f = (new Date(date + 'T00:00') - t0) / Math.max(1, (t1 - t0));
      return CH.padL + f * (CH.w - CH.padL - CH.padR);
    };

    /* y：每条序列一条带，等高（C1 恒成立） */
    var bandTop0 = CH.padT + 16;
    var bandH = Math.floor((CH.h - CH.padB - 26 - bandTop0 - (bands.length - 1) * 14) / bands.length);
    function bandY(items, top, bottom) {
      var full = DEMO.filterPublic(p.labs).filter(function (l) { return l.metric === items[0].metric; }).map(function (l) { return l.value; });
      var mn = Math.min.apply(null, full), mx = Math.max.apply(null, full);
      if (mx === mn) mx = mn + 1;
      return function (v) { return top + (1 - (v - mn) / (mx - mn)) * (bottom - top); };
    }

    /* 发作带（背景层，最底） */
    p.episodes.forEach(function (e) {
      var xs = x(e.start), xe = (e.endPrecision === 'day' && e.end) ? x(e.end) : CH.w - CH.padR;
      svg.appendChild(svgEl('rect', { class: 'band-flare', x: xs, y: bandTop0 - 14, width: Math.max(2, xe - xs), height: bandH * bands.length + 14 * bands.length, 'data-kind': 'flare' }));
    });
    /* 网格 + x 刻度 */
    var t0 = new Date(dmin + 'T00:00'), t1 = new Date(dmax + 'T00:00');
    var months = Math.max(1, Math.round((t1 - t0) / (30 * 86400000)));
    var step = Math.max(1, Math.round(months / 5));
    var cur = new Date(t0.getFullYear(), t0.getMonth(), 1);
    while (cur <= t1) {
      var key = cur.getFullYear() + '-' + ('0' + (cur.getMonth() + 1)).slice(-2) + '-01';
      var tx = x(key);
      if (tx >= CH.padL - 1 && tx <= CH.w - CH.padR + 1) {
        svg.appendChild(svgEl('line', { class: 'gridline', x1: tx, y1: bandTop0 - 14, x2: tx, y2: CH.h - CH.padB }));
        svg.appendChild(svgEl('text', { x: Math.min(CH.w - CH.padR - 24, Math.max(CH.padL, tx - 16)), y: CH.h - 10 }, key.slice(0, 7)));
      }
      cur.setMonth(cur.getMonth() + step);
    }

    var totalPoints = 0;
    bands.forEach(function (b, bi) {
      if (!b.groups.length) return;
      var top = bandTop0 + bi * (bandH + 14), bottom = top + bandH;
      var yf = bandY(b.groups[0].items, top, bottom);
      b.groups.forEach(function (gr) {
        var pts = gr.items.map(function (l) { return [x(l.date), yf(l.value), l]; });
        if (pts.length > 1) {
          var d = smoothPath(pts.map(function (pt) { return [pt[0], pt[1]]; }));
          var path = svgEl('path', { class: 'line-' + b.cls, d: d, 'data-group': gr.key, 'data-d': d, 'data-band': String(bi) });
          path.addEventListener('click', function (ev) { ev.stopPropagation(); });
          svg.appendChild(path);
        }
        pts.forEach(function (pt) {
          var c = svgEl('circle', { class: 'dot dot-' + b.cls, cx: pt[0], cy: pt[1], 'data-report': pt[2].reportId || '', 'data-lab-id': pt[2].id, 'data-month': pt[2].datePrecision === 'month' ? '1' : '' });
          c.addEventListener('click', function (ev) { ev.stopPropagation(); openLabSource(pt[2]); });
          svg.appendChild(c);
          totalPoints++;
        });
        var lastPt = pts[pts.length - 1];
        if (gr === b.groups[b.groups.length - 1]) {
          svg.appendChild(svgEl('text', { x: Math.min(CH.w - CH.padR + 6, lastPt[0] + 6), y: Math.max(top + 10, Math.min(bottom - 2, lastPt[1] + 4)) },
            String(lastPt[2].value) + (b.m.unit ? ' ' + b.m.unit : '')));
        }
      });
      var vs = DEMO.filterPublic(p.labs).filter(function (l) { return l.metric === b.m.key; }).map(function (l) { return l.value; });
      svg.appendChild(svgEl('text', { x: CH.padL, y: top - 4, 'font-size': '11' }, b.m.name + '（全期 ' + (vs.length ? Math.min.apply(null, vs) + '–' + Math.max.apply(null, vs) : '—') + '）· 不可比'));
    });

    if (state.showPE) {
      DEMO.filterPublic(P().pe).forEach(function (s) {
        if (s.datePrecision !== 'day' || !s.date || s.date < dmin || s.date > dmax) return;
        var c = svgEl('circle', { class: 'dot dot-pe', cx: x(s.date), cy: CH.h - CH.padB + 12, r: 3 });
        c.addEventListener('click', function (ev) { ev.stopPropagation(); openPageView('pe/pe-session', { peId: s.id }); });
        svg.appendChild(c);
      });
      svg.appendChild(svgEl('text', { x: CH.w - CH.padR - 60, y: CH.h - CH.padB + 15 }, '● 置换次数位'));
    }

    panel.appendChild(h('div', { class: 'chart-legend' },
      h('span', null, '虚线带 = 发作区间（医生记录）'),
      h('span', null, '每条线按该指标全期范围缩放，纵向不可比'),
      h('span', null, '点数据点看原始报告'),
      h('span', null, '日期不详的记录：' + DEMO.filterPublic(p.labs).filter(function (l) { return l.datePrecision === 'unknown'; }).length + ' 条（见分类指标页）')
    ));
    panel.setAttribute('data-points', String(totalPoints));
    panel.setAttribute('data-paths-visible', String(svg.querySelectorAll('path').length));
  }
  /* MT09：点图点开原始来源（弹层，不翻卡） */
  function openLabSource(lab) {
    var m = metricOf(lab.metric);
    openModal('原始来源 · ' + m.name, [
      h('table', { class: 'data' },
        h('tr', null, h('th', null, '日期'), h('td', null, lab.date ? lab.date + (lab.datePrecision === 'month' ? '（仅记到月）' : '') : '日期不详（原文未记）')),
        h('tr', null, h('th', null, '数值'), h('td', { class: 'nowrap-num' }, lab.value + ' ' + m.unit)),
        h('tr', null, h('th', null, '方法/机构'), h('td', null, lab.method + ' · ' + lab.site)),
        h('tr', null, h('th', null, '报告号'), h('td', null, lab.reportId || '未登记')),
        h('tr', null, h('th', null, '出处'), h('td', null, lab.source || '化验单')))
    ]);
  }

  /* ---------- 指标卡（MT 组，194 定高 3D） ---------- */
  function mcard(m) {
    var p = P();
    var items = DEMO.filterPublic(p.labs).filter(function (l) { return l.metric === m.key; });
    items.sort(function (a, b) { return (b.date || '9999') < (a.date || '9999') ? -1 : 1; });
    var cur = items[0];
    var prev = items[1];
    var flipped = !!state.flipped[m.key];
    var front = h('div', { class: 'mface' },
      h('span', { class: 'm-cat' }, m.cat),
      h('div', { class: 'm-name' }, m.name),
      cur
        ? h('div', null,
            h('span', { class: 'm-value' }, String(cur.value)),
            h('span', { class: 'm-unit' }, ' ' + m.unit + (cur.datePrecision === 'month' ? '（仅记到月）' : '')))
        : h('div', { class: 'm-value', style: 'color:var(--soft-fg)' }, '—'),
      h('div', { class: 'm-meta' },
        cur ? (cur.date ? '最近：' + cur.date : '最近：日期不详') + ' · 共 ' + items.length + ' 次 · ' + cur.site : '尚无记录'),
      prev && cur && cur.datePrecision === 'day' && prev.datePrecision === 'day'
        ? h('div', { class: 'm-delta' }, '较上次 ' + (cur.value - prev.value > 0 ? '+' : '') + (cur.value - prev.value) + ' ' + m.unit + '（仅回顾，不解读）')
        : h('div', { class: 'm-delta' }, cur ? '无可比前次（不同方法/日期不详不比较）' : '空态：等下一次化验'),
      h('div', { class: 'm-meta', style: 'margin-top:4px;font-size:11px;' }, '来源：' + (cur ? (cur.reportId || cur.source || '化验单') : '—'))
    );
    /* 背面：最近几次 + 迷你折线 */
    var spark = h('div', { class: 'spark' });
    var back = h('div', { class: 'mface back' },
      h('div', { class: 'm-name' }, '最近 ' + Math.min(3, items.length) + ' 次 · ' + m.name),
      items.length ? h('div', { class: 'm-list' }, items.slice(0, 3).map(function (l) {
        return h('div', { class: 'm-row' },
          h('span', { class: 'nowrap-num' }, l.date ? (l.datePrecision === 'month' ? l.date + '（月）' : l.date) : '日期不详'),
          h('b', { class: 'nowrap-num' }, String(l.value)),
          h('span', { class: 'm-row-src' }, l.method + ' · ' + l.site));
      })) : h('div', { class: 'sub' }, '暂无记录'),
      spark,
      h('div', { class: 'm-note' }, m.note));
    /* 单点不连线（C2/MT05）：points<2 时不画 path */
    var pts = items.filter(function (l) { return l.datePrecision === 'day'; }).slice(0, 6).reverse();
    if (pts.length >= 2) {
      var sw = 180, sh = 34;
      var vs = pts.map(function (l) { return l.value; });
      var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs); if (mx === mn) mx = mn + 1;
      var XY = pts.map(function (l, i) { return [4 + i * (sw - 8) / (pts.length - 1), 30 - (l.value - mn) / (mx - mn) * 26]; });
      var sv = svgEl('svg', { viewBox: '0 0 ' + sw + ' ' + sh, width: '100%', height: sh, 'aria-hidden': 'true' });
      sv.appendChild(svgEl('path', { d: smoothPath(XY), stroke: 'var(--brand)', fill: 'none', 'stroke-width': '1.5' }));
      XY.forEach(function (xy) { sv.appendChild(svgEl('circle', { cx: xy[0], cy: xy[1], r: 2, fill: 'var(--brand)' })); });
      spark.appendChild(sv);
    } else if (pts.length === 1) {
      var sv1 = svgEl('svg', { viewBox: '0 0 180 34', width: '100%', height: 34, 'aria-hidden': 'true' });
      sv1.appendChild(svgEl('circle', { cx: 90, cy: 17, r: 3, fill: 'var(--brand)' }));
      spark.appendChild(sv1);
    }
    var btn = h('button', { class: 'mcard', 'aria-pressed': String(flipped), 'data-action': 'flip', 'data-metric': m.key,
      'aria-label': m.name + '：' + (cur ? '最近 ' + cur.value + ' ' + m.unit + '，翻面看最近几次' : '暂无记录') },
      h('div', { class: 'mcard-inner' }, front, back));
    back.setAttribute('aria-hidden', String(!flipped));
    if (!flipped) back.setAttribute('inert', ''); else back.removeAttribute('inert');
    return btn;
  }

  /* ---------- 整页视图（A 组） ---------- */
  function openPageView(route, ctx) {
    state.pvReturnFocus = document.activeElement;
    state.pvScroll = document.getElementById('main').scrollTop;
    state.pvStack.push({ route: route, ctx: ctx });
    try { history.pushState({ pv: state.pvStack.length }, '', '#page=' + route.replace('/', '-')); } catch (e) { /* file:// 某些环境 */ }
    renderPageView();
  }
  function closePageView(popHistory) {
    state.pvStack.pop();
    if (popHistory) { state._pvClosing = true; try { history.back(); return; } catch (e) { } }
    renderPageView();
  }
  function renderPageView() {
    var view = document.getElementById('pv-view');
    var top = state.pvStack[state.pvStack.length - 1];
    if (!top) {
      view.hidden = true; view.innerHTML = '';
      if (state.pvReturnFocus) { try { state.pvReturnFocus.focus(); } catch (e) { } }
      document.getElementById('main').scrollTop = state.pvScroll;
      return;
    }
    view.hidden = false;
    view.innerHTML = '';
    var body = h('div', { class: 'pv-body' });
    var title = '';
    if (top.route === 'pe/pe-session') title = '单次置换详情';
    if (top.route === 'episode/ep-detail-flow') title = '发作详情';
    view.appendChild(h('div', { class: 'pv-top' },
      h('h2', null, title),
      h('button', { class: 'soft-btn', 'data-action': 'pv-back' }, '返回'),
      h('button', { class: 'soft-btn', 'data-action': 'pv-close' }, '关闭')));
    view.appendChild(body);
    if (top.route === 'pe/pe-session') {
      var s = null;
      P().pe.forEach(function (x) { if (x.id === top.ctx.peId) s = x; });
      if (!s) { body.appendChild(h('div', { class: 'empty' }, '记录不存在')); return; }
      body.appendChild(pageHead('血浆置换 · ' + s.episode, '第 ' + s.seq + ' 次置换', '全部字段为演示记录原文'));
      body.appendChild(h('table', { class: 'data' },
        h('tr', null, h('th', null, '日期'), h('td', null, s.date)),
        h('tr', null, h('th', null, '置换量'), h('td', { class: 'nowrap-num' }, s.volumeMl + ' ml（当次记录原文）')),
        h('tr', null, h('th', null, '通路'), h('td', null, s.access)),
        h('tr', null, h('th', null, '记录时长'), h('td', { class: 'nowrap-num' }, s.durationMin + ' 分钟')),
        h('tr', null, h('th', null, '备注'), h('td', null, s.private ? '（私密，仅本机查看）' + s.note : (s.note || '—')))));
      body.appendChild(h('p', { class: 'sub' }, '来源：置换记录单（合成示例）'));
      body.appendChild(aiBtn('pe'));
    }
    view.querySelector('[data-action="pv-close"]').focus();
  }

  /* ---------- 弹层 ---------- */
  function openModal(title, nodes) {
    var back = document.getElementById('modal-back');
    document.getElementById('modal-title').textContent = title;
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    nodes.forEach(function (n) { body.appendChild(n); });
    back.hidden = false;
    back._returnFocus = document.activeElement;
    body.querySelector('button, a, [tabindex]') && body.querySelector('button, a, [tabindex]').focus();
  }
  function openSettings() {
    var p = P();
    var TABS = [['store', '工作区'], ['parse', '文档解析（MinerU）'], ['clinic', '临床数据库']];
    var tabs = h('div', { class: 'cfg-tabs', role: 'tablist', 'aria-label': '设置分区' });
    TABS.forEach(function (t) {
      tabs.appendChild(h('button', { role: 'tab', 'aria-selected': String(state.settingsTab === t[0]), 'data-action': 'settings-tab', 'data-tab': t[0] }, t[1]));
    });
    var body = h('div', { style: 'margin-top:14px' });
    if (state.settingsTab === 'store') {
      body.appendChild(h('div', { class: 'notice info' }, '下面是示意值。真实版本由宿主目录选择器返回绝对路径，并拒绝根目录、用户主目录与下载根目录。'));
      body.appendChild(h('div', { class: 'cfg-block' },
        h('span', { class: 'form-label' }, '业务资料根目录'),
        h('div', { class: 'path-row' }, h('code', null, '（演示态 · 未连接宿主目录）'), h('button', { class: 'soft-btn', 'data-action': 'demo-toast' }, '更改位置')),
        h('p', { class: 'small-note' }, '原件、解析派生文件与数据库都放在这里；该目录不进安装包、不进日志、不进 Git。更改后下次导入生效，已有记录不搬家。')));
      body.appendChild(h('div', { class: 'stat-row', style: 'margin:14px 0' },
        h('div', { class: 'stat-tile' }, h('span', null, '原件'), h('b', null, '2.4 MB')),
        h('div', { class: 'stat-tile' }, h('span', null, '派生文件'), h('b', null, '0.6 MB')),
        h('div', { class: 'stat-tile' }, h('span', null, '数据库'), h('b', null, '0.1 MB'))));
      body.appendChild(h('div', { class: 'set-row' },
        h('div', null, h('b', null, '备份'), h('p', { class: 'small-note' }, '上次备份 2026-10-28 · 位置在资料根目录下的 backup/')),
        h('div', { style: 'display:flex;gap:8px' },
          h('button', { class: 'soft-btn', 'data-action': 'demo-toast' }, '立即备份'),
          h('button', { class: 'text-button', 'data-action': 'demo-toast' }, '从备份恢复'))));
      body.appendChild(h('p', { class: 'small-note' }, '恢复会覆盖当前数据库与派生文件，原件保留；执行前需二次确认并列出覆盖范围。'));
    } else if (state.settingsTab === 'parse') {
      body.appendChild(h('div', { class: 'choice' + (state.cfg.consent ? ' on' : ' off'), role: 'group', 'aria-label': '解析方式' },
        h('div', { class: 'choice-head' }, h('b', null, 'MinerU 解析'),
          h('span', { class: 'pill', style: state.cfg.consent ? 'background:var(--ok-weak);color:var(--ok)' : 'background:var(--warn-weak);color:var(--warn)' }, state.cfg.consent ? '已同意' : '未确认')),
        h('p', { class: 'small-note' }, '默认推荐。TXT / MD / CSV 始终先走本地抽取，不上传；只有扫描件、图片、PDF 与 Office 才送到 MinerU。'),
        h('label', { class: 'check-row' },
          h('input', { type: 'checkbox', 'data-action': 'consent', ...(state.cfg.consent ? { checked: true } : {}) }),
          h('span', null, '我了解：所选文件会上传到 MinerU 云端解析。只传文件本身，不传档案、化验结论、治疗记录；可随时关闭。')),
        state.cfg.consent ? null : h('p', { class: 'small-note', style: 'color:var(--warn)' }, '未勾选前不会上传，也不会调用 MinerU。')));
      body.appendChild(h('div', { class: 'choice', style: 'margin-top:14px' },
        h('div', { class: 'choice-head' }, h('b', null, 'API Token'), h('span', { class: 'set-val' }, '未配置')),
        h('div', { class: 'token-row' }, h('code', { class: 'masked' }, state.cfg.tokenMasked), h('span', { class: 'small-note' }, '只显示后 4 位，不提供「查看完整值」')),
        h('form', { id: 'mineru-form', style: 'margin-top:10px', onsubmit: function (ev) { ev.preventDefault(); toast('原型演示：校验与保存未接入'); } },
          h('label', null,
            h('span', { class: 'form-label' }, '替换为我的 Token（可选）'),
            h('div', { class: 'token-row' },
              h('input', { name: 'token', type: state.cfg.showToken ? 'text' : 'password', placeholder: 'ey-...', autocomplete: 'off', spellcheck: 'false', disabled: !state.cfg.consent }),
              h('button', { type: 'button', class: 'text-button', 'data-action': 'mineru-show' }, state.cfg.showToken ? '隐藏' : '显示'))),
          h('div', { class: 'form-actions' },
            h('button', { class: 'primary', type: 'submit' }, '校验并保存'),
            h('button', { type: 'button', class: 'text-button', 'data-action': 'mineru-guide' }, '如何申请？'))),
        h('p', { class: 'small-note' }, 'Token 存于 ~/.mineru/config.yaml，不写进患者库、不进日志、不进导出。保存前先校验一次，失败分三种原因：401 无效 / 429 配额用尽 / 网络错误。'),
        h('div', { id: 'mineru-guide', hidden: true },
          h('div', { class: 'notice info' },
            h('b', null, '4 步拿到自己的 Token'),
            h('ol', { style: 'padding-left:18px;margin:8px 0 0' },
              h('li', null, '访问 mineru.net，注册并登录'),
              h('li', null, '进入「API」→「API 管理」'),
              h('li', null, '创建 Token 并复制'),
              h('li', null, '回到这里粘贴，点「校验并保存」')),
            h('p', { style: 'margin-top:8px' }, h('span', { class: 'small-note' }, '原型不提供外链跳转；正式版会先说明去向再打开 mineru.net/token 申请页。'))))));
      body.appendChild(h('div', { class: 'set-row', style: 'margin-top:6px' },
        h('div', null, h('b', null, '解析模型：pipeline（固定）'), h('p', { class: 'small-note' }, '面向病历优先保留来源内容，不做生成式补写。VLM 可能生成原文不存在的内容，本流程不提供该选项。')),
        h('span', { class: 'pill' }, '不可切换')));
      body.appendChild(h('div', { class: 'notice', style: 'margin-top:12px' }, 'Flash 免费解析单文件上限 10 MB / 20 页，真实扫描病历常超过这个范围。超限时保留原件并提示换 Token 或稍后重试，不丢文件。认证失败自动尝试 Flash，成功时界面明确标注「Flash 降级解析」。'));
      body.appendChild(h('p', { class: 'small-note', style: 'margin-top:10px' }, '当前状态：未接入（本原型按 DEV-REQUIREMENTS §五 的可回退默认值关闭文档解析）；上面的界面是正式版形态预览，勾选与保存都不会真正联网。'));
    } else {
      body.appendChild(h('div', { class: 'notice info' }, '临床数据库用于试验与登记信息的离线检索。本仓 M4 已构建离线快照；未接入或断网时，临床页给空态与获取说明，不报错、不假装有结果。'));
      body.appendChild(h('div', { class: 'set-row' },
        h('div', null, h('b', null, '状态：离线快照已构建'), h('p', { class: 'small-note' }, '2026-11-04 · 193 条（同登记号合并）· manifest/jsonl/sqlite 三方计数一致')),
        h('span', { class: 'pill', style: 'background:var(--ok-weak);color:var(--ok)' }, '已构建')));
      body.appendChild(h('div', { class: 'set-row' },
        h('div', null, h('b', null, '数据来源'), h('p', { class: 'small-note' }, 'CDE 药物临床试验 14 / CTV 4 / ICTRP 175；每条保留来源与检索日期，登记状态一律「未核实」')),
        h('span', { class: 'pill' }, '快照')));
      body.appendChild(h('div', { class: 'set-row' },
        h('div', null, h('b', null, '通道终态（如实记录）'), h('p', { class: 'small-note' }, 'chictr_online 全程 FAILED、ictrp 两次 FAILED——查过但服务失败，不是零结果；ChiCTR 归档语料仅胰腺癌覆盖，未配置')),
        h('span', { class: 'pill', style: 'background:var(--warn-weak);color:var(--warn)' }, '部分失败')));
      body.appendChild(h('div', { class: 'set-row' },
        h('div', null, h('b', null, '离线可用'), h('p', { class: 'small-note' }, '未接入或断网时给空态与获取说明')),
        h('span', { class: 'pill', style: 'background:var(--ok-weak);color:var(--ok)' }, '设计约束')));
      body.appendChild(h('p', { class: 'small-note', style: 'margin-top:12px' }, '原型没有真实数据库 UI；「导入离线库 / 检查更新」在正式版接入 research/ttp 快照。'));
      body.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:8px' },
        h('button', { class: 'soft-btn', 'data-action': 'demo-toast' }, '导入离线库'),
        h('button', { class: 'text-button', 'data-action': 'demo-toast' }, '检查更新')));
    }
    openModal('设置', [tabs, body]);
  }
  function closeModal() {
    var back = document.getElementById('modal-back');
    back.hidden = true;
    if (back._returnFocus) { try { back._returnFocus.focus(); } catch (e) { } }
  }

  /* ---------- 页面 ---------- */
  function pageDash(root) {
    var p = P(), c = coursePos(p);
    root.appendChild(pageHead('NINGPAL / TTP CARE RECORD', (state.profile === 'A' ? '档案 A · 刚确诊' : '档案 B · 多年随访') + '，今天先看什么', '仅回顾与整理，不解读；解读归医生'));

    /* 档案切换（Q10 可见入口） */
    root.appendChild(h('div', { class: 'hero-switch' },
      h('button', { class: 'soft-btn', 'data-action': 'use-profile', 'data-profile': 'A', 'aria-pressed': String(state.profile === 'A') }, '切到档案 A（刚确诊）'),
      h('button', { class: 'soft-btn', 'data-action': 'use-profile', 'data-profile': 'B', 'aria-pressed': String(state.profile === 'B') }, '切到档案 B（多年随访）'),
      h('span', { class: 'pill' }, DEMO.banner)));

    /* 大状态卡：缓解期第 N 天 / 发作中第 N 天（对齐家族 D+N 卡） */
    var hero = h('div', { class: 'hero-card' },
      h('div', { class: 'hero-meta' }, h('span', null, 'TTP · 病程位置（来自医生记录）'), h('span', { class: 'pill' }, p.tag)),
      c.mode === 'remission'
        ? h('div', { class: 'hero-state' }, '缓解期第 ' + c.dayN + ' 天')
        : h('div', { class: 'hero-state', style: 'color:var(--danger)' }, '发作中第 ' + c.dayN + ' 天'),
      h('div', { class: 'hero-sub' }, (c.mode === 'remission' ? '距上次发作（医生记录的结束日）' + c.sinceFlare + ' 天 · ' : '医生记录的开始日 ' + c.last.start + ' · ') + '近 90 天发作 ' + flares90(p) + ' 次'),
      h('div', { class: 'hero-sub', style: 'font-size:12.5px;color:var(--soft-fg)' }, '状态文字（医生原文）：' + c.last.stateText),
      h('div', { class: 'hero-actions' },
        h('button', { class: 'primary', 'data-action': 'go', 'data-view': 'episode/ep-timeline' }, '看发作时间线 →'),
        h('button', { class: 'soft-btn', 'data-action': 'primer' }, '疾病概要：TTP 是什么？')));
    root.appendChild(hero);

    /* 行动带：医生行动计划原话 / 空态 */
    if (p.plan) {
      root.appendChild(h('div', { class: 'action-strip danger' },
        h('div', { class: 'as-main' },
          h('div', { class: 'as-title' }, '紧急行动计划（医生原话）'),
          h('div', { class: 'as-text' }, p.plan.text.replace(/^「|」.*$/g, ''))),
        h('div', { class: 'as-actions' },
          h('button', { class: 'primary', 'data-action': 'go', 'data-view': 'urgent/urgent-plan' }, '打开完整行动卡'),
          h('button', { class: 'soft-btn', 'data-action': 'go', 'data-view': 'urgent/urgent-info' }, '就医信息'))));
    } else {
      root.appendChild(h('div', { class: 'action-strip' },
        h('div', { class: 'as-main' },
          h('div', { class: 'as-title' }, '还没有医生确认的行动计划'),
          h('div', { class: 'as-text' }, '下次复诊请医生写一句「什么情况要马上联系谁」，抄录到这里。本工作台不会替医生决定什么情况算急。')),
        h('div', { class: 'as-actions' },
          h('button', { class: 'soft-btn', 'data-action': 'go', 'data-view': 'urgent/urgent-plan' }, '去行动计划页'))));
    }

    /* 三张快捷卡（对齐小粉宝三连卡） */
    var quick = h('div', { class: 'quick-row' },
      quickCard('labs', '记录一次化验', '按报告单抄录，不抄结论', 'labs/labs-cat'),
      quickCard('pe', '整理置换次数', '按一次发作分组', 'pe/pe-list'),
      quickCard('review', '复诊准备清单', '资料与想问的问题', 'review/review-prep'));
    root.appendChild(quick);

    /* 最近化验 + 复诊节奏 */
    root.appendChild(secTitle('最近的化验', '私密记录不含 · 点「一图秀」看全期走势'));
    var pubLabs = DEMO.filterPublic(p.labs).slice().sort(function (a, b) { return (b.date || '') > (a.date || '') ? 1 : -1; }).slice(0, 4);
    var labCard = h('div', { class: 'card' },
      pubLabs.length ? h('table', { class: 'data' }, pubLabs.map(function (l) {
        var m = metricOf(l.metric);
        return h('tr', null,
          h('td', null, h('b', { style: 'font-size:15px;color:var(--brand-deep)' }, String(l.value)), ' ', h('span', { class: 'sub' }, m.name + ' · ' + m.unit)),
          h('td', { class: 'nowrap-num' }, l.date || '日期不详'),
          h('td', null, l.method + ' · ' + l.site));
      })) : h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '暂无化验记录'), h('button', { 'data-action': 'go', 'data-view': 'labs/labs-cat' }, '去录入一次化验')),
      h('div', { style: 'margin-top:10px' }, h('button', { class: 'text-button', 'data-action': 'go', 'data-view': 'labs/labs-trend' }, '打开一图秀 →')));
    var rhythmCard = h('div', { class: 'card' },
      h('div', { class: 'eyebrow', style: 'letter-spacing:.08em;color:var(--brand);font-size:11.5px;text-transform:uppercase;font-weight:600' }, '复诊节奏（医生提到）'),
      h('p', { style: 'margin:8px 0 4px;font-size:14.5px' }, p.followUp.text),
      h('div', { class: 'sub', style: 'font-size:12.5px;color:var(--soft-fg)' }, '来源：' + p.followUp.source + ' · 以你的医生安排为准'));
    var g = h('div', { class: 'grid grid-2' });
    [labCard, rhythmCard].forEach(function (x) { g.appendChild(x); });
    root.appendChild(g);

    root.appendChild(secTitle('摘要预览', '三出口之一 · 私密已排除（' + privateNote(p) + '）'));
    root.appendChild(h('div', { class: 'notice info' }, '本预览只汇总可公开的记录：病程位置、可公开化验、置换次数与资料清单。'));
    root.appendChild(h('div', { style: 'margin-top:14px;display:flex;gap:12px;flex-wrap:wrap;align-items:center' },
      aiBtn('dash'),
      h('span', { class: 'sub', style: 'font-size:12.5px;color:var(--soft-fg)' }, 'Demo 态：AI 只把问题填进草稿框，不会发送。')));
  }
  function statCard(value, label, note) {
    return h('div', { class: 'stat-card' },
      h('div', { class: 'stat-label' }, label),
      h('div', { class: 'stat-value' }, value),
      h('div', { class: 'stat-note' }, note || ''));
  }
  function quickCard(iconKey, title, note, route) {
    return h('button', { class: 'quick-card', 'data-action': 'go', 'data-view': route },
      h('span', { class: 'q-ic', html: navIcon(iconKey) }),
      h('span', { class: 'q-text' }, h('b', null, title), h('span', null, note)),
      h('span', { class: 'q-arrow', 'aria-hidden': 'true' }, '↗'));
  }

  function pageEpTimeline(root) {
    var p = P();
    root.appendChild(pageHead('发作与缓解', '时间线', '虚线带 = 一次发作（医生记录）；● = 置换；数据点来自化验'));
    var panel = h('div', { class: 'chart-panel' });
    var svg = svgEl('svg', { class: 'chart', viewBox: '0 0 720 300', role: 'img', 'aria-label': '发作—缓解时间线' });
    panel.appendChild(svg);
    var t0 = new Date(p.anchor + 'T00:00'), t1 = new Date(DEMO_NOW + 'T00:00');
    var span = Math.max(1, t1 - t0);
    var x = function (d) { var t = new Date(d + 'T00:00'); return 44 + (t - t0) / span * (720 - 100); };
    /* 年刻度 */
    var y0 = t0.getFullYear();
    for (var yy = y0; yy <= t1.getFullYear(); yy++) {
      var kx = x(yy + '-01-01'); if (kx < 44) kx = 44;
      svg.appendChild(svgEl('line', { class: 'gridline', x1: kx, y1: 20, x2: kx, y2: 262 }));
      svg.appendChild(svgEl('text', { x: Math.min(620, Math.max(30, kx - 14)), y: 288 }, String(yy)));
    }
    /* 泳道：发作带 / 置换 / 化验点（kind 体系换为 flare / pe / lab） */
    p.episodes.forEach(function (e, i) {
      var xs = x(e.start), xe = (e.endPrecision === 'day' && e.end) ? x(e.end) : 620;
      svg.appendChild(svgEl('rect', { class: 'band-flare', x: xs, y: 26 + i * 66, width: Math.max(3, xe - xs), height: 40, rx: 6, 'data-kind': 'flare', 'data-episode': e.id }));
      svg.appendChild(svgEl('text', { x: xs + 6, y: 42 + i * 66 }, e.label + (e.endPrecision === 'day' && e.end ? '' : '（进行中）')));
      svg.appendChild(svgEl('text', { x: xs + 6, y: 58 + i * 66, 'font-size': '10' }, e.stateText.slice(0, 30) + '…'));
    });
    var laneY = 26 + p.episodes.length * 66 + 10;
    DEMO.filterPublic(p.pe).forEach(function (s) {
      if (s.datePrecision !== 'day') return;
      var c = svgEl('circle', { class: 'dot dot-pe', cx: x(s.date), cy: laneY, r: 3.5, 'data-kind': 'pe' });
      c.addEventListener('click', function () { openPageView('pe/pe-session', { peId: s.id }); });
      svg.appendChild(c);
    });
    svg.appendChild(svgEl('text', { x: 8, y: laneY + 4, 'font-size': '10' }, '置换'));
    var labY = laneY + 34;
    DEMO.filterPublic(p.labs).forEach(function (l) {
      if (l.metric !== 'plt' || l.datePrecision !== 'day') return;
      var c = svgEl('circle', { class: 'dot dot-lab', cx: x(l.date), cy: labY, r: 3, 'data-kind': 'lab' });
      c.addEventListener('click', function () { openLabSource(l); });
      svg.appendChild(c);
    });
    svg.appendChild(svgEl('text', { x: 8, y: labY + 4, 'font-size': '10' }, '血小板'));
    root.appendChild(panel);
    root.appendChild(h('div', { class: 'chart-legend', style: 'margin-top:8px' },
      h('span', null, '泳道：发作带（医生记录）/ 置换 / 化验'),
      h('span', null, '私密 ' + DEMO.privateCount(p.pe.concat(p.labs)) + ' 条不在此图')));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('episode')));
  }

  function pageEpDetail(root) {
    var p = P(), last = p.episodes[p.episodes.length - 1];
    root.appendChild(pageHead('发作与缓解', '发作详情 · ' + last.label, '状态与结论文字全部来自医生原文'));
    var peList = p.pe.filter(function (s) { return s.episode === last.id; });
    var labList = DEMO.filterPublic(p.labs).filter(function (l) { return l.date && last.start && l.date >= last.start && (!last.end || l.date <= last.end); });
    root.appendChild(h('div', { class: 'card' },
      h('table', { class: 'data' },
        h('tr', null, h('th', null, '开始'), h('td', null, last.start + (last.startPrecision === 'month' ? '（仅记到月）' : ''))),
        h('tr', null, h('th', null, '结束'), h('td', null, (last.endPrecision === 'day' && last.end) ? last.end : '医生尚未记录结束日期')),
        h('tr', null, h('th', null, '医生原文状态'), h('td', null, last.stateText)),
        h('tr', null, h('th', null, '本次置换'), h('td', { class: 'nowrap-num' }, peList.length + ' 次（点「血浆置换」看逐次）')),
        h('tr', null, h('th', null, '本次期间化验'), h('td', { class: 'nowrap-num' }, labList.length + ' 条')))));
    root.appendChild(secTitle('本次用药（医嘱原文）'));
    var meds = p.meds.filter(function (m) { return m.episode === last.id; });
    root.appendChild(meds.length ? h('div', { class: 'card' }, h('table', { class: 'data' },
      meds.map(function (m) { return h('tr', null, h('td', null, m.name), h('td', null, m.doseText), h('td', null, m.start + (m.end ? ' → ' + m.end : ' → 进行中'))); })))
      : h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '本次未登记用药'), h('button', { 'data-action': 'go', 'data-view': 'tx/tx-meds' }, '去用药记录页补一条')));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('episode')));
  }

  function pageEpLog(root) {
    var p = P();
    root.appendChild(pageHead('发作与缓解', '发作记录', '更正=新增版本，不覆盖历史（无裸删除）'));
    root.appendChild(h('div', { class: 'card' }, h('table', { class: 'data' },
      h('tr', null, h('th', null, '发作'), h('th', null, '开始'), h('th', null, '结束'), h('th', null, '医生原文状态'), h('th', null, '置换次数')),
      p.episodes.map(function (e) {
        var n = p.pe.filter(function (s) { return s.episode === e.id; }).length;
        return h('tr', null, h('td', null, e.label), h('td', { class: 'nowrap-num' }, e.start),
          h('td', { class: 'nowrap-num' }, (e.endPrecision === 'day' && e.end) ? e.end : '未记录'),
          h('td', null, e.stateText), h('td', { class: 'nowrap-num' }, String(n)));
      }))));
    root.appendChild(h('div', { style: 'margin-top:10px;display:flex;gap:10px;flex-wrap:wrap' },
      h('button', { class: 'primary', 'data-action': 'add-episode' }, '+ 记录一次发作'),
      h('span', { class: 'sub', style: 'align-self:center;font-size:12.5px;color:var(--soft-fg)' }, '从医生记录抄日期与原话；记不清选「仅记到月」')));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('episode')));
  }

  function addEpisodeModal() {
    var p = P();
    inputModal('记录一次发作', [
      { key: 'start', label: '开始日期', type: 'date', required: true },
      { key: 'prec', label: '日期精度', type: 'select', options: [['day', '记到日'], ['month', '仅记到月']] },
      { key: 'end', label: '结束日期（医生记录了才填）', type: 'date' },
      { key: 'state', label: '医生原文状态', type: 'text', required: true, placeholder: '照抄医生原话，如：好转出院，继续随访' },
      { key: 'admitted', label: '本次住院', type: 'checkbox' }
    ], function (v) {
      p.episodes.push({ id: state.profile + '-EP' + (p.episodes.length + 1) + '-' + Date.now() % 1000,
        label: '第 ' + (p.episodes.length + 1) + ' 次发作', start: v.start, startPrecision: v.prec,
        end: v.end || null, endPrecision: v.end ? 'day' : 'unknown',
        stateText: v.state, admitted: v.admitted });
    });
  }

  function pageLabsCat(root) {
    var p = P();
    root.appendChild(pageHead('化验与趋势', '分类指标', '按指标分类展示 · 与一图秀同一目录、同一顺序（MT03）'));
    var cats = [];
    DEMO.metrics.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat); });
    var chipRow = h('div', { class: 'cat-chips' });
    cats.forEach(function (cat) {
      var n = DEMO.metrics.filter(function (m) { return m.cat === cat; }).length;
      chipRow.appendChild(h('a', { href: '#cat-' + cats.indexOf(cat), class: 'cat-chip', 'data-action': 'jump-cat', 'data-cat': cat }, cat + ' · ' + n + ' 项'));
    });
    root.appendChild(chipRow);
    cats.forEach(function (cat) {
      var sec = secTitle(cat, DEMO.metrics.filter(function (m) { return m.cat === cat; }).length + ' 项 · 同一类别独立网格（MT02）');
      sec.id = 'cat-' + cats.indexOf(cat);
      root.appendChild(sec);
      var g = h('div', { class: 'mcard-grid' });
      DEMO.metrics.filter(function (m) { return m.cat === cat; }).forEach(function (m) { g.appendChild(mcard(m)); });
      root.appendChild(g);
    });
    root.appendChild(secTitle('手工录入', '一次最多 6 个字段（IP6）；数字用数字键盘'));
    var form = h('form', { 'data-action': 'lab-form', class: 'card' },
      h('label', null, '指标：', h('select', { 'data-f': 'metric' }, DEMO.metrics.map(function (m) { return h('option', { value: m.key }, m.name); }))),
      h('label', null, '数值：', h('input', { 'data-f': 'value', inputmode: 'decimal', pattern: '[0-9.]*', required: true, 'aria-label': '化验数值（数字键盘）' })),
      h('label', null, '日期：', h('input', { 'data-f': 'date', type: 'date', 'aria-label': '化验日期' })),
      h('label', null, '机构：', h('input', { 'data-f': 'site', required: true, 'aria-label': '检查机构' })),
      h('label', null, '方法（可选）：', h('input', { 'data-f': 'method', 'aria-label': '检测方法' })),
      h('label', null, '私密：', h('input', { 'data-f': 'private', type: 'checkbox' })),
      h('div', { style: 'margin-top:8px;display:flex;gap:8px' },
        h('button', { class: 'primary', type: 'submit' }, '存为新版本'),
        h('span', { class: 'sub', style: 'align-self:center' }, '提交后写进事实层，可在发作记录页追溯')));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = form.querySelector('[data-f=value]').value;
      var num = Number(v);
      if (!isFinite(num)) { openModal('数值有误', [h('p', null, '数值需要是数字，例如 120 或 4.5。')]); return; }
      var metric = form.querySelector('[data-f=metric]').value;
      var site = form.querySelector('[data-f=site]').value || '未登记机构';
      var method = form.querySelector('[data-f=method]').value || '手工录入';
      var date = form.querySelector('[data-f=date]').value;
      var priv = form.querySelector('[data-f=private]').checked;
      var lab = { id: state.profile + '-H' + (P().labs.length + 1), metric: metric, date: date || null, datePrecision: date ? 'day' : 'unknown', value: num, method: method, site: site, reportId: null, source: '手工录入', private: priv };
      P().labs.push(lab);
      render();
      toast('已写入事实层（新版本），可继续录入下一条');
    });
    root.appendChild(form);
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('labs')));
  }

  function pageLabsTrend(root) {
    root.appendChild(pageHead('化验与趋势', '一图秀', '左侧勾选指标（按分类分组），右侧同图绘制；每条线按全期范围缩放，纵向不可比'));
    renderTrend(root);
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('labs')));
  }

  function pageLabsCompare(root) {
    var p = P();
    root.appendChild(pageHead('化验与趋势', '可比组', '同一指标下，方法+机构相同才算一组；跨组不合并、不做差'));
    DEMO.metrics.forEach(function (m) {
      var groups = comparableGroups(p.labs, m.key);
      if (!groups.length) return;
      root.appendChild(secTitle(m.name + '（' + m.unit + '）', groups.length + ' 个可比组'));
      var tw = h('div', { class: 'table-wrap' });
      tw.appendChild(h('table', { class: 'data' },
        h('tr', null, h('th', null, '组（方法·机构）'), h('th', null, '条数'), h('th', null, '起'), h('th', null, '止')),
        groups.map(function (gr) {
          return h('tr', null, h('td', null, gr.key.split('|').slice(1).join(' · ')),
            h('td', { class: 'nowrap-num' }, String(gr.items.length)),
            h('td', { class: 'nowrap-num' }, gr.items[0].date),
            h('td', { class: 'nowrap-num' }, gr.items[gr.items.length - 1].date));
        })));
      root.appendChild(tw);
      root.appendChild(h('div', { class: 'scroll-hint' }, '← 左右滑动查看 →'));
    });
    root.appendChild(h('div', { class: 'notice', style: 'margin-top:10px' }, '口径：不同方法不合并（家族口径）；ADAMTS13 方法学差异大【待核】，跨院数值请只对照同一张报告单上的参考区间。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('labs')));
  }

  function pagePeList(root) {
    var p = P();
    var pub = DEMO.filterPublic(p.pe);
    root.appendChild(pageHead('血浆置换', '置换记录', '共 ' + pub.length + ' 次（私密 ' + DEMO.privateCount(p.pe) + ' 次不含）· 按发作分组'));
    root.appendChild(secTitle('合计', '次数与时长都只做回顾'));
    root.appendChild(h('div', { class: 'stat-row' },
      statCard(String(pub.length), '累计置换次数', pub.length ? '最近一次 ' + pub[pub.length - 1].date : '—'),
      statCard(String(pub.reduce(function (a, s) { return a + s.durationMin; }, 0)), '累计记录时长（分钟）', '按记录单逐次累加，非医疗结论'),
      statCard(String(p.episodes.length), '发作次数', '状态文字均为医生原文')));
    root.appendChild(secTitle('按发作分组', '折叠卡：点发作标题展开'));
    p.episodes.forEach(function (e) {
      var sess = pub.filter(function (s) { return s.episode === e.id; });
      var body = h('div');
      body.appendChild(h('table', { class: 'data' },
        h('tr', null, h('th', null, '次序'), h('th', null, '日期'), h('th', null, '置换量'), h('th', null, '通路'), h('th', null, '时长'), h('th', null, '')),
        sess.map(function (s) {
          return h('tr', null,
            h('td', { class: 'nowrap-num' }, '#' + s.seq),
            h('td', { class: 'nowrap-num' }, s.date),
            h('td', { class: 'nowrap-num' }, s.volumeMl + ' ml'),
            h('td', null, s.access),
            h('td', { class: 'nowrap-num' }, s.durationMin + ' 分'),
            h('td', null, h('button', { class: 'text-button', 'data-action': 'pv-open', 'data-pe': s.id }, '详情')));
        })));
      body.appendChild(h('div', { class: 'sub', style: 'font-size:12.5px;color:var(--soft-fg);margin-top:6px' }, '置换量按医嘱原文范围 ' + (sess.length ? Math.min.apply(null, sess.map(function (s) { return s.volumeMl; })) + '–' + Math.max.apply(null, sess.map(function (s) { return s.volumeMl; })) : '—') + ' ml/次记录'));
      root.appendChild(fold([h('strong', null, e.label + ' · ' + sess.length + ' 次'), h('span', { class: 'pill' }, e.start)], [body], state.profile === 'A'));
    });
    root.appendChild(h('div', { style: 'margin-top:10px' },
      h('button', { class: 'primary', 'data-action': 'add-pe' }, '+ 记录一次置换'),
      h('span', { class: 'sub', style: 'margin-left:10px;align-self:center;font-size:12.5px;color:var(--soft-fg)' }, '支持连续录入：一个疗程可以一口气记完')));
    root.appendChild(h('div', { class: 'notice', style: 'margin-top:10px' }, '每次置换都可以加一行自己的体感备注，可标为私密（仅本机可见，导出与 AI 都不含）。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('pe')));
  }

  function addPeModal() {
    var p = P();
    if (!p.episodes.length) { toast('先在「发作与缓解」记录一次发作'); return; }
    inputModal('记录一次置换', [
      { key: 'ep', label: '属于哪次发作', type: 'select', options: p.episodes.map(function (e) { return [e.id, e.label]; }), required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'vol', label: '置换量（ml，医嘱单为准）', type: 'number', required: true, inputmode: 'numeric' },
      { key: 'access', label: '通路（左臂/右颈内…）', type: 'text' },
      { key: 'dur', label: '记录时长（分钟）', type: 'number', inputmode: 'numeric' },
      { key: 'note', label: '体感备注（私密，仅本机）', type: 'text' }
    ], function (v) {
      var epId = v.ep;
      var seq = p.pe.filter(function (x) { return x.episode === epId; }).length + 1;
      p.pe.push({ id: state.profile + '-P' + (p.pe.length + 1) + '-' + Date.now() % 1000, episode: epId, seq: seq,
        date: v.date, datePrecision: 'day', volumeMl: Number(v.vol), access: v.access || '', durationMin: Number(v.dur || 0),
        note: v.note || '', private: false });
    });
  }

  function pagePeSession(root) {
    /* 直达路由兜底：正常从置换记录或图上节点打开整页视图 */
    root.appendChild(pageHead('血浆置换', '单次详情', '请从置换记录或一图秀的置换节点进入'));
    root.appendChild(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '没有选中某一次置换'),
      h('button', { 'data-action': 'go', 'data-view': 'pe/pe-list' }, '去置换记录挑一次')));
  }

  function pageTxMeds(root) {
    var p = P();
    root.appendChild(pageHead('治疗与用药', '用药记录', '全部为医嘱/出院小结原文照抄；不做任何用药建议'));
    var body = h('div');
    body.appendChild(h('table', { class: 'data' },
      h('tr', null, h('th', null, '药名'), h('th', null, '医嘱原文'), h('th', null, '起'), h('th', null, '止'), h('th', null, '状态')),
      p.meds.map(function (m) {
        return h('tr', null, h('td', null, m.name), h('td', null, m.doseText),
          h('td', { class: 'nowrap-num' }, m.start + (m.startPrecision === 'month' ? '（月）' : '')),
          h('td', { class: 'nowrap-num' }, (m.endPrecision === 'day' && m.end) ? m.end : (m.endPrecision === 'month' && m.end) ? m.end + '（月）' : '未记录'),
          h('td', null, m.status));
      })));
    root.appendChild(h('div', { class: 'card' }, body));
    root.appendChild(h('div', { style: 'margin-top:10px' },
      h('button', { class: 'primary', 'data-action': 'add-med' }, '+ 记录一次用药 / 调药')));
    root.appendChild(h('div', { class: 'notice', style: 'margin-top:10px' }, '剂量没抄的部分就写「未抄录」，不要凭记忆补——这是整理原则，不是偷懒。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('tx')));
  }

  function addMedModal() {
    var p = P();
    var epOpts = [['', '（不挂在某次发作下）']].concat(p.episodes.map(function (e) { return [e.id, e.label]; }));
    inputModal('记录一次用药 / 调药', [
      { key: 'name', label: '药名', type: 'text', required: true },
      { key: 'dose', label: '医嘱原文', type: 'text', required: true, placeholder: '照抄医嘱；没抄的写「未抄录」' },
      { key: 'start', label: '开始日期', type: 'date', required: true },
      { key: 'end', label: '结束日期（还在用就不填）', type: 'date' },
      { key: 'status', label: '状态', type: 'select', options: [['进行中', '进行中'], ['已结束', '已结束']] },
      { key: 'ep', label: '属于哪次发作', type: 'select', options: epOpts }
    ], function (v) {
      p.meds.push({ id: state.profile + '-M' + (p.meds.length + 1) + '-' + Date.now() % 1000, episode: v.ep || null,
        name: v.name, doseText: v.dose, start: v.start, startPrecision: 'day',
        end: v.end || null, endPrecision: v.end ? 'day' : 'unknown', prescriber: '', status: v.status });
    });
  }

  function pageTxEpisodes(root) {
    var p = P();
    root.appendChild(pageHead('治疗与用药', '发作内治疗', '以一次发作 / 一次调药为单位，不套疗程编号'));
    p.episodes.forEach(function (e) {
      var meds = p.meds.filter(function (m) { return m.episode === e.id; });
      var body = h('div');
      body.appendChild(meds.length ? h('table', { class: 'data' },
        meds.map(function (m) { return h('tr', null, h('td', null, m.name), h('td', null, m.doseText)); }))
        : h('div', { class: 'sub' }, '本次未登记用药'));
      body.appendChild(h('div', { class: 'sub', style: 'margin-top:6px' }, '置换 ' + p.pe.filter(function (s) { return s.episode === e.id; }).length + ' 次 · ' + e.stateText));
      root.appendChild(fold([h('strong', null, e.label), h('span', { class: 'pill' }, e.start)], [body]));
    });
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('tx')));
  }

  function pageReviewPrep(root) {
    var p = P();
    root.appendChild(pageHead('复诊准备', '就诊准备', '勾选要带的内容，生成一页预览（不含私密）'));
    var items = [
      { k: 'labs', label: '最近化验汇总（一图秀截图或本页导出）' },
      { k: 'pe', label: '血浆置换次数统计' },
      { k: 'meds', label: '用药记录（医嘱原文）' },
      { k: 'docs', label: '资料清单（原件在资料库）' },
      { k: 'questions', label: '想问医生的问题（下面填写）' }
    ];
    var box = h('div', { class: 'card' });
    items.forEach(function (it) {
      var id = 'ck-' + it.k;
      box.appendChild(h('label', { style: 'display:flex;gap:8px;align-items:flex-start;margin:6px 0' },
        h('input', { type: 'checkbox', 'data-export': it.k, id: id, checked: state.exportSel[it.k] !== false }),
        h('span', null, it.label)));
    });
    var q = h('textarea', { style: 'width:100%;min-height:64px;margin-top:8px;border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit', placeholder: '想问的问题，一行一条（不是医疗建议，只是提醒自己）', 'aria-label': '想问医生的问题' });
    box.appendChild(q);
    box.appendChild(h('div', { style: 'margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
      h('button', { class: 'soft-btn', 'data-action': 'save-questions' }, '把上面每行存成一条问题'),
      h('span', { class: 'sub', style: 'font-size:12.5px;color:var(--soft-fg)' }, '已存 ' + (p.questions || []).length + ' 条，可反复追加')));
    var qlist = h('div', { class: 'card', style: 'margin-top:10px' });
    if ((p.questions || []).length) {
      qlist.appendChild(h('table', { class: 'data' },
        p.questions.map(function (x) { return h('tr', null, h('td', null, x.content), h('td', { class: 'sub' }, x.created)); })));
    } else qlist.appendChild(h('div', { class: 'sub' }, '还没有保存过问题。'));
    root.appendChild(secTitle('已保存的问题', '逐条记录，可多次追加'));
    root.appendChild(qlist);
    root.appendChild(box);
    root.appendChild(h('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' },
      h('button', { class: 'primary', 'data-action': 'preview-export' }, '生成一页预览'),
      h('button', { class: 'soft-btn', 'data-action': 'go', 'data-view': 'review/review-export' }, '去导出页')));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('review')));
  }

  function pageReviewExport(root) {
    var p = P();
    root.appendChild(pageHead('复诊准备', '导出与回顾', '导出永远不含私密记录（三出口之二）'));
    var pubNotes = DEMO.filterPublic(p.notes), pubLabs = DEMO.filterPublic(p.labs), pubDocs = DEMO.filterPublic(p.docs), pubPe = DEMO.filterPublic(p.pe);
    root.appendChild(h('div', { class: 'card' },
      h('div', { class: 'eyebrow' }, '导出会包含什么'),
      h('ul', { style: 'margin:6px 0;padding-left:18px' },
        h('li', null, '病程位置与近 90 天发作次数'),
        h('li', null, '化验 ' + pubLabs.length + ' 条、置换 ' + pubPe.length + ' 次、用药 ' + p.meds.length + ' 条、资料 ' + pubDocs.length + ' 份'),
        h('li', null, '感受记录 ' + pubNotes.length + ' 条（私密 ' + DEMO.privateCount(p.notes) + ' 条不含）')),
      h('button', { class: 'primary', 'data-action': 'do-export' }, '导出 Markdown（演示：本地生成）')));
    root.appendChild(secTitle('已保留的导出', '历史导出不随之后编辑改写'));
    var sv = h('div', { class: 'card' }, h('div', { class: 'sub' }, '还没有导出过。'));
    root.appendChild(sv);
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('review')));
    root._savedBox = sv;
  }

  function doExport() {
    var p = P(), c = coursePos(p);
    var labs = DEMO.filterPublic(p.labs), pe = DEMO.filterPublic(p.pe), notes = DEMO.filterPublic(p.notes), pubDocs = DEMO.filterPublic(p.docs);
    var text = '# 小宁宝 · 复诊摘要（合成示例）\n\n生成时间：' + DEMO_NOW + ' · 全部数据为演示数据，仅整理，不解读。\n\n'
      + '## 病程位置\n' + (c.mode === 'remission' ? '缓解第 ' + c.dayN + ' 天，距上次发作 ' + c.sinceFlare + ' 天' : '发作中第 ' + c.dayN + ' 天') + '；近 90 天发作 ' + flares90(p) + ' 次。\n状态文字（医生原文）：' + c.last.stateText + '\n\n'
      + '## 化验（' + labs.length + ' 条，不含私密）\n' + labs.slice().sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; }).slice(0, 12).map(function (l) { var m = metricOf(l.metric); return '- ' + (l.date || '日期不详') + ' ' + m.name + ' ' + l.value + ' ' + m.unit + '（' + l.method + ' · ' + l.site + '）'; }).join('\n') + '\n\n'
      + '## 血浆置换（' + pe.length + ' 次）\n按发作：' + p.episodes.map(function (e) { return e.label + ' ' + pe.filter(function (s) { return s.episode === e.id; }).length + ' 次'; }).join('；') + '\n\n'
      + '## 用药（医嘱原文）\n' + p.meds.map(function (m) { return '- ' + m.name + '：' + m.doseText; }).join('\n') + '\n\n'
      + '## 资料清单（' + pubDocs.length + ' 份）\n' + pubDocs.map(function (d) { return '- ' + d.name + '（' + (d.date || '日期不详') + '）' + (d.hasOriginal ? '' : '：未取得原件，据二次来源'); }).join('\n') + '\n\n'
      + '## 感受记录（' + notes.length + ' 条，不含私密）\n' + notes.map(function (n) { return '- ' + n.date + '：' + n.text; }).join('\n') + '\n\n'
      + '## 口径\n不同方法/机构不合并；本摘要不构成任何医学判断；解读归医生。';
    var url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = '小宁宝-复诊摘要-演示.md'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    appendAgentLog('（演示）已生成「复诊摘要」文件；私密 ' + DEMO.privateCount([].concat(p.notes, p.labs, p.pe)) + ' 条未包含。');
    toast('导出完成（私密不含）');
  }

  function pageUrgentPlan(root) {
    var p = P();
    root.appendChild(pageHead('就医与紧急', '行动计划', '只呈现你的医生已确认的原话；本页永远不替医生说话'));
    if (p.plan) {
      root.appendChild(h('div', { class: 'card', style: 'border-left:6px solid var(--danger)' },
        h('div', { class: 'eyebrow', style: 'color:var(--danger)' }, '医生行动计划（原话）'),
        h('p', { style: 'font-size:17px;line-height:1.7;margin:8px 0' }, p.plan.text),
        h('div', { class: 'sub', style: 'font-size:12.5px;color:var(--soft-fg)' }, '来源：' + p.plan.source)));
      root.appendChild(h('div', { class: 'notice', style: 'margin-top:10px' }, '如果现在情况很急：拨打 120 或前往最近急诊，以现场医护判断为准。'));
    } else {
      root.appendChild(h('div', { class: 'empty' },
        h('div', { class: 'empty-title' }, '还没有行动计划'),
        h('div', null, '本工作台不会替医生决定什么情况算急。下次复诊时请医生写一句「出现 X 联系 Y」，抄录到这里。'),
        h('button', { 'data-action': 'go', 'data-view': 'review/review-prep' }, '把这句话加进复诊要问的清单')));
    }
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('urgent')));
  }

  /* 通用录入窗口：字段 ≤6（IP6），「保存并继续」支持连续多条录入（多记录）；
     每条写入事实层 = 新记录/新版本（IP8）。 */
  function inputModal(title, fields, onSave, opts) {
    opts = opts || {};
    var form = h('form', { class: 'card', style: 'box-shadow:none', onsubmit: function (ev) { ev.preventDefault(); } });
    fields.forEach(function (f) {
      var input;
      if (f.type === 'select') {
        input = h('select', { 'data-f': f.key, 'aria-label': f.label }, (f.options || []).map(function (o) { return h('option', { value: o[0] }, o[1]); }));
      } else if (f.type === 'textarea') {
        input = h('textarea', { 'data-f': f.key, 'aria-label': f.label, placeholder: f.placeholder || '', style: 'min-height:56px' });
      } else if (f.type === 'checkbox') {
        input = h('input', { type: 'checkbox', 'data-f': f.key, 'aria-label': f.label });
      } else {
        input = h('input', { type: f.type || 'text', 'data-f': f.key, 'aria-label': f.label, inputmode: f.inputmode || (f.type === 'number' ? 'decimal' : undefined), pattern: f.pattern, required: f.required ? true : undefined, placeholder: f.placeholder || '' });
      }
      form.appendChild(h('label', null, f.label + (f.required ? ' *' : '') + '：', input));
    });
    var foot = h('div', { class: 'form-actions' },
      h('button', { class: 'primary', type: 'button', 'data-action': 'save-continue' }, '保存并继续录入'),
      h('button', { class: 'soft-btn', type: 'button', 'data-action': 'save-close' }, '保存并关闭'),
      h('button', { type: 'button', class: 'text-button', 'data-action': 'modal-close' }, '取消'));
    form.appendChild(foot);
    function collect() {
      var v = {};
      fields.forEach(function (f) {
        var el = form.querySelector('[data-f=' + f.key + ']');
        if (f.type === 'checkbox') v[f.key] = el.checked;
        else v[f.key] = el.value.trim();
      });
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].required && !v[fields[i].key]) { toast(fields[i].label + '必填'); return null; }
      }
      return v;
    }
    function save(again) {
      var v = collect();
      if (!v) return;
      try { onSave(v); } catch (e) { openModal('保存出错', [h('p', null, String(e && e.message || e))]); return; }
      if (again) {
        fields.forEach(function (f) { var el = form.querySelector('[data-f=' + f.key + ']'); if (f.type !== 'checkbox' && f.keep) return; if (f.type === 'checkbox') el.checked = false; else el.value = ''; });
        toast('已保存，可继续录入下一条');
      } else { closeModal(); render(); }
    }
    foot.querySelector('[data-action=save-continue]').addEventListener('click', function () { save(true); });
    foot.querySelector('[data-action=save-close]').addEventListener('click', function () { save(false); });
    openModal(title, [form]);
  }

  function pageUrgentInfo(root) {
    var p = P();
    root.appendChild(pageHead('就医与紧急', '就医信息', '常去医院由你自己维护；每条可修改，改错不丢历史（更正=新版本）'));
    var sites = (p.sites || []).slice().sort(function (a, b) { return (a.ord || 0) - (b.ord || 0); });
    if (sites.length) {
      sites.forEach(function (st) {
        root.appendChild(h('div', { class: 'card', style: 'margin-bottom:10px' },
          h('div', { style: 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap' },
            h('b', { style: 'font-size:16px' }, st.name),
            st.department ? h('span', { class: 'pill' }, st.department) : null,
            h('span', { class: 'sub', style: 'margin-left:auto;font-size:12px;color:var(--soft-fg)' }, '版本 ' + (st.revision || 1))),
          st.contact ? h('p', { style: 'margin:6px 0 0;font-size:14px' }, '联系方式：' + st.contact) : h('p', { style: 'margin:6px 0 0;color:var(--soft-fg);font-size:13px' }, '联系方式未填——可写护士站/值班电话，或写「出处：复诊记录第 X 页」'),
          h('div', { style: 'margin-top:8px' },
            h('button', { class: 'text-button', 'data-action': 'site-edit', 'data-site': st.id }, '修改这条'),
            h('button', { class: 'text-button', 'data-action': 'site-edit', 'data-site': st.id, style: 'color:var(--soft-fg)' }, '查看历史（原型展示占位）'))));
      });
    } else {
      root.appendChild(h('div', { class: 'empty' },
        h('div', { class: 'empty-title' }, '还没有常去医院'),
        h('div', null, '可添加多家：主诊医院、备诊医院、社区随访点都可以。'),
        h('button', { 'data-action': 'site-edit' }, '添加第一家')));
    }
    root.appendChild(h('div', { style: 'margin-top:10px;display:flex;gap:10px;flex-wrap:wrap' },
      h('button', { class: 'primary', 'data-action': 'site-edit' }, '+ 添加医院 / 就诊点')));
    root.appendChild(h('div', { class: 'notice info', style: 'margin-top:10px' }, '隐私：本页信息只存在本机，不会上传；联系方式可以填电话，也可以只写「在哪份记录里」的出处。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('urgent')));
  }

  /* 就医信息编辑（唯一显式编辑入口 IP6；表单 ≤6 字段 IP6/IP7；多医院 = 多行 visit_site） */
  function siteEditModal(siteId) {
    var p = P();
    var st = siteId ? (p.sites || []).filter(function (x) { return x.id === siteId; })[0] : null;
    var form = h('form', { class: 'card', style: 'box-shadow:none', onsubmit: function (ev) {
      ev.preventDefault();
      var name = form.querySelector('[data-f=name]').value.trim();
      var dep = form.querySelector('[data-f=dep]').value.trim();
      var contact = form.querySelector('[data-f=contact]').value.trim();
      var note = form.querySelector('[data-f=note]').value.trim();
      if (!name) { toast('名称必填'); return; }
      if (st) { st.name = name; st.department = dep; st.contact = contact; st.note = note; st.revision = (st.revision || 1) + 1; toast('已修改（新版本 v' + st.revision + '，旧版本保留）'); }
      else {
        p.sites = p.sites || [];
        var maxOrd = p.sites.reduce(function (a, x) { return Math.max(a, x.ord || 0); }, -1);
        p.sites.push({ id: state.profile + '-S' + (p.sites.length + 1) + '-' + Date.now() % 1000, name: name, department: dep, contact: contact, note: note, ord: maxOrd + 1, revision: 1 });
        toast('已添加（写入事实层新版本）');
      }
      closeModal(); render();
    } },
      h('label', null, '名称 *：', h('input', { 'data-f': 'name', required: true, value: st ? st.name : '', 'aria-label': '医院名称' })),
      h('label', null, '科室：', h('input', { 'data-f': 'dep', value: st ? (st.department || '') : '', 'aria-label': '科室' })),
      h('label', null, '联系方式：', h('input', { 'data-f': 'contact', value: st ? (st.contact || '') : '', 'aria-label': '联系方式（电话或出处）' })),
      h('label', null, '备注（私密）：', h('input', { 'data-f': 'note', value: st ? (st.note || '') : '', 'aria-label': '备注' })),
      h('div', { class: 'form-actions' },
        h('button', { class: 'primary', type: 'submit' }, st ? '保存为新版本' : '添加'),
        h('button', { type: 'button', class: 'text-button', 'data-action': 'modal-close' }, '取消')));
    openModal(st ? '修改 · ' + st.name : '添加医院 / 就诊点', [form]);
  }
  function pageMindFeel(root) {
    var p = P();
    var pub = DEMO.filterPublic(p.notes);
    root.appendChild(pageHead('心理与照护', '当下感受', '记录不是评判；私密 ' + DEMO.privateCount(p.notes) + ' 条不在本页'));
    if (pub.length) {
      pub.slice().reverse().forEach(function (n) {
        root.appendChild(h('div', { class: 'card', style: 'margin-bottom:10px' },
          h('div', { class: 'eyebrow' }, n.date),
          h('p', { style: 'margin:4px 0' }, n.text)));
      });
    } else {
      root.appendChild(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '还没有记录'), h('div', null, '今天感觉怎么样？一句话也行。')));
    }
    root.appendChild(h('div', { style: 'margin-top:10px' },
      h('button', { class: 'primary', 'data-action': 'add-note' }, '+ 记一条感受')));
    root.appendChild(h('div', { class: 'notice', style: 'margin-top:10px' }, '这些记录只帮你回看自己的状态；情绪支持请找专业渠道（如病友组织或心理门诊）。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('mind')));
  }

  function addNoteModal() {
    var p = P();
    inputModal('记一条感受', [
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'text', label: '感受', type: 'textarea', required: true, placeholder: '一句话也行' },
      { key: 'priv', label: '仅自己可见（私密）', type: 'checkbox' }
    ], function (v) {
      p.notes = p.notes || [];
      p.notes.push({ id: state.profile + '-N' + (p.notes.length + 1) + '-' + Date.now() % 1000, date: v.date, text: v.text, private: v.priv });
    });
  }

  function pageMindBurden(root) {
    var p = P();
    root.appendChild(pageHead('心理与照护', '家庭与照护', '照护者记录与生活影响（aml 心智负担线的非血液版本）'));
    var caregiver = p.notes.filter(function (n) { return !n.private; });
    root.appendChild(h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, '生活影响回顾'),
        h('ul', { style: 'margin:6px 0;padding-left:18px' },
          h('li', null, '住院次数：' + p.episodes.filter(function (e) { return e.admitted; }).length + ' 次（医生记录）'),
          h('li', null, '置换总次数：' + DEMO.filterPublic(p.pe).length + ' 次'),
          h('li', null, '最近一次就诊相关记录：' + (caregiver.length ? caregiver[caregiver.length - 1].date : '—')))),
      h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, '给照护者'),
        h('p', { style: 'margin:4px 0' }, '代记时请注明「代记」，患者本人与照护者的记录会分开呈现（二期功能，本原型先留位）。'))));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('mind')));
  }

  function pageDocsLib(root) {
    var p = P();
    root.appendChild(pageHead('资料与导入', '资料库', '共 ' + p.docs.length + ' 份；原件未取得的如实标注'));
    var tw = h('div', { class: 'table-wrap' });
    tw.appendChild(h('table', { class: 'data' },
      h('tr', null, h('th', null, '名称'), h('th', null, '日期'), h('th', null, '类型'), h('th', null, '原件'), h('th', null, '状态')),
      p.docs.map(function (d) {
        return h('tr', null, h('td', null, d.name), h('td', { class: 'nowrap-num' }, d.date || '日期不详'),
          h('td', null, d.kind),
          h('td', null, d.hasOriginal ? '已存档' : '未取得原件，据二次来源'),
          h('td', null, d.status));
      })));
    root.appendChild(tw);
    root.appendChild(h('div', { class: 'scroll-hint' }, '← 左右滑动查看 →'));
    root.appendChild(h('div', { style: 'margin-top:10px' },
      h('button', { class: 'primary', 'data-action': 'add-doc' }, '+ 登记一份资料'),
      h('span', { class: 'sub', style: 'margin-left:10px;align-self:center;font-size:12.5px;color:var(--soft-fg)' }, '出院小结 / 化验单 / 门诊病历都能登记')));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('docs')));
  }

  function addDocModal() {
    var p = P();
    inputModal('登记一份资料', [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '如：出院小结 · 2026-09' },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'kind', label: '类型', type: 'select', options: [['PDF', 'PDF'], ['照片', '照片'], ['其他', '其他']] },
      { key: 'orig', label: '原件已存档', type: 'checkbox' }
    ], function (v) {
      p.docs.push({ id: state.profile + '-D' + (p.docs.length + 1) + '-' + Date.now() % 1000, name: v.name,
        date: v.date || null, kind: v.kind, hasOriginal: v.orig,
        status: v.orig ? '待核对' : '未取得原件，据二次来源' });
    });
  }

  function pageDocsImport(root) {
    var p = P();
    root.appendChild(pageHead('资料与导入', '导入与解析', '演示链路：选文件 → 抽取草稿 → 进整理草稿核对（核对前不入图，MT10）'));
    root.appendChild(h('div', { class: 'card' },
      h('p', { style: 'margin:4px 0' }, '点击「模拟导入」生成两条候选（演示解析，不真的读文件）：'),
      h('button', { class: 'primary', 'data-action': 'mock-import' }, '模拟导入一份化验单')));
    root.appendChild(secTitle('最近导入'));
    root.appendChild(h('div', { class: 'sub' }, '本原型未接入文档解析（MinerU 未接入，见 DEV-REQUIREMENTS §五）。'));
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('docs')));
  }

  function pageDocsCandidates(root) {
    var p = P();
    var cands = state.candidates.labs.filter(function (c) { return !state.checks[c.id]; });
    var done = state.candidates.labs.filter(function (c) { return state.checks[c.id]; });
    root.appendChild(pageHead('资料与导入', '整理草稿', '候选逐项核对：收下才入图；拒收零副作用（IP5 / MT10）'));
    if (!state.candidates.labs.length) {
      root.appendChild(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '草稿是空的'),
        h('div', null, '从「导入与解析」模拟导入一份化验单，就会出现在这里。'),
        h('button', { 'data-action': 'go', 'data-view': 'docs/docs-import' }, '去导入')));
      return;
    }
    var tw = h('div', { class: 'table-wrap' });
    tw.appendChild(h('table', { class: 'data' },
      h('tr', null, h('th', null, '候选'), h('th', null, '值'), h('th', null, '出处'), h('th', null, '操作')),
      cands.map(function (c) {
        var m = metricOf(c.metric);
        return h('tr', { 'data-cand': c.id },
          h('td', null, m.name + (c.date ? ' · ' + c.date : ' · 日期不详')),
          h('td', { class: 'nowrap-num' }, c.value + ' ' + m.unit),
          h('td', null, c.from),
          h('td', null,
            h('button', { class: 'soft-btn', 'data-action': 'cand-accept', 'data-cand': c.id, style: 'min-height:36px' }, '核对无误，收下'),
            ' ',
            h('button', { class: 'text-button', 'data-action': 'cand-reject', 'data-cand': c.id }, '拒收')));
      })));
    root.appendChild(tw);
    if (done.length) {
      root.appendChild(secTitle('已收下'));
      root.appendChild(h('div', { class: 'sub' }, done.map(function (c) { return metricOf(c.metric).name + ' ' + c.value + '（' + (c.date || '日期不详') + '）'; }).join('；') + ' —— 已入图，可在分类指标页看到。'));
    }
    root.appendChild(h('div', { style: 'margin-top:12px' }, aiBtn('docs')));
  }

  /* ---------- 渲染框架 ---------- */
  var RENDERERS = {
    'dash': pageDash,
    'episode/ep-timeline': pageEpTimeline, 'episode/ep-detail': pageEpDetail, 'episode/ep-log': pageEpLog,
    'labs/labs-cat': pageLabsCat, 'labs/labs-trend': pageLabsTrend, 'labs/labs-compare': pageLabsCompare,
    'pe/pe-list': pagePeList, 'pe/pe-session': pagePeSession,
    'tx/tx-meds': pageTxMeds, 'tx/tx-episodes': pageTxEpisodes,
    'review/review-prep': pageReviewPrep, 'review/review-export': pageReviewExport,
    'urgent/urgent-plan': pageUrgentPlan, 'urgent/urgent-info': pageUrgentInfo,
    'mind/mind-feel': pageMindFeel, 'mind/mind-burden': pageMindBurden,
    'docs/docs-lib': pageDocsLib, 'docs/docs-import': pageDocsImport, 'docs/docs-candidates': pageDocsCandidates
  };

  function renderNav() {
    var nav = document.getElementById('nav');
    nav.innerHTML = '';
    PAGES.forEach(function (pg) {
      var b = h('button', { class: 'nav-button', 'data-action': 'go', 'data-view': pg.key, 'data-nav': pg.key, html: navIcon(pg.key) + '<span>' + esc(pg.name) + '</span>' });
      if (state.view === pg.key) b.setAttribute('aria-current', 'page');
      nav.appendChild(b);
    });
  }
  function renderSubnav() {
    var old = document.querySelector('.subnav');
    if (old) old.remove();
    var subs = SUBPAGES[state.view];
    if (!subs) return;
    var sn = h('div', { class: 'subnav', role: 'tablist', 'aria-label': '二级页签' });
    subs.forEach(function (s) {
      var route = state.view + '/' + s[0];
      var t = h('button', { role: 'tab', 'data-action': 'go', 'data-view': route, 'aria-selected': String(state.sub === s[0]) }, s[1]);
      sn.appendChild(t);
    });
    var main = document.getElementById('main');
    main.insertBefore(sn, main.firstChild);
  }
  function render() {
    renderNav();
    var main = document.getElementById('main');
    main.innerHTML = '';
    var route = state.view + (state.sub ? '/' + state.sub : '');
    var fn = RENDERERS[route] || RENDERERS[state.view] || pageDash;
    fn(main);
    renderSubnav();
    var pageName = (PAGES.filter(function (p) { return p.key === state.view; })[0] || {}).name || '看板';
    var fullName = pageName + (state.sub ? ' · ' + (SUBPAGES[state.view].filter(function (s) { return s[0] === state.sub; })[0] || ['', ''])[1] : '');
    var crumbs = document.querySelector('.topbar .crumbs');
    if (crumbs) crumbs.innerHTML = '小宁宝工作台 / <b id="top-title">' + esc(fullName) + '</b>';
    var pn = P();
    document.getElementById('profile-name').textContent = pn.name;
    document.getElementById('profile-tag').textContent = pn.tag;
    var av = document.getElementById('profile-avatar');
    if (av) av.textContent = (state.profile === 'A' ? 'A' : 'B');
  }
  function go(route) {
    if (route.indexOf('/') > 0) { var parts = route.split('/'); state.view = parts[0]; state.sub = parts[1]; }
    else { state.view = route; state.sub = SUBPAGES[route] ? SUBPAGES[route][0][0] : null; }
    document.getElementById('main').scrollTop = 0;
    try { history.replaceState(null, '', '#page=' + state.view + (state.sub ? '-' + state.sub : '')); } catch (e) { }
    render();
  }
  function toast(msg) {
    var t = h('div', { class: 'notice ok', style: 'position:fixed;bottom:64px;left:50%;transform:translateX(-50%);z-index:60;' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-action]');
    if (!t) return;
    var act = t.getAttribute('data-action');
    if (act === 'go') { ev.preventDefault(); go(t.getAttribute('data-view')); }
    else if (act === 'profiles') openProfiles();
    else if (act === 'use-profile') { state.profile = t.getAttribute('data-profile'); state.flipped = {}; state.candidates = { labs: [] }; state.checks = {}; closeModal(); render(); toast('已切换到 ' + P().name); }
    else if (act === 'dataroot') openModal('资料目录（演示）', [h('p', null, '原型未接入宿主：正式版里这里会显示工作区资料目录与连接状态。')]);
    else if (act === 'settings') openSettings();
    else if (act === 'font') { var b = document.body; b.classList.toggle('large'); t.setAttribute('aria-pressed', String(b.classList.contains('large'))); }
    else if (act === 'ai') toggleAI();
    else if (act === 'ai-collapse') toggleAI(false);
    else if (act === 'ai-discuss') { ev.preventDefault(); var pk = t.getAttribute('data-ai-page'); var mk = AI_PROMPTS[pk] ? pk : 'dash'; agentDraft(AI_PROMPTS[mk](), false); }
    else if (act === 'ai-send') { toast('演示态：未接通，不会发送'); }
    else if (act === 'primer') { if (window.DiseasePrimer && window.DiseasePrimer.open) window.DiseasePrimer.open(); }
    else if (act === 'about') openModal('关于小宁宝（演示）', [h('p', null, '交互原型 v0.2 · 全部数据为合成示例。版本以仓库 VERSION 为准。')]);
    else if (act === 'pv-open') { ev.preventDefault(); openPageView('pe/pe-session', { peId: t.getAttribute('data-pe') }); }
    else if (act === 'pv-close') closePageView(true);
    else if (act === 'pv-back') closePageView(true);
    else if (act === 'modal-close') closeModal();
    else if (act === 'tw') { state.timeWindow = t.getAttribute('data-tw'); render(); }
    else if (act === 'jump-cat') {
      ev.preventDefault();
      var chips = Array.prototype.slice.call(document.querySelectorAll('.cat-chips .cat-chip'));
      var target = document.getElementById('cat-' + chips.indexOf(t));
      if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    else if (act === 'sel-metric') {
      var mk = t.getAttribute('data-metric');
      var i = state.sel.indexOf(mk);
      if (t.checked) {
        if (state.sel.length >= 4) { t.checked = false; toast('一图秀一次最多画 4 条，先取消一条再勾'); return; }
        if (i < 0) state.sel.push(mk);
      } else if (i >= 0) { state.sel.splice(i, 1); }
      render();
    }
    else if (act === 'settings-tab') { state.settingsTab = t.getAttribute('data-tab'); openSettings(); }
    else if (act === 'consent') { state.cfg.consent = t.checked; openSettings(); }
    else if (act === 'mineru-show') { state.cfg.showToken = !state.cfg.showToken; openSettings(); }
    else if (act === 'mineru-guide') { var g = document.getElementById('mineru-guide'); if (g) g.hidden = !g.hidden; }
    else if (act === 'site-edit') { siteEditModal(t.getAttribute('data-site') || null); }
    else if (act === 'add-episode') { addEpisodeModal(); }
    else if (act === 'add-pe') { addPeModal(); }
    else if (act === 'add-med') { addMedModal(); }
    else if (act === 'add-note') { addNoteModal(); }
    else if (act === 'add-doc') { addDocModal(); }
    else if (act === 'save-questions') {
      var ta = document.querySelector('textarea[aria-label="想问医生的问题"]');
      if (!ta) return;
      var lines = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      if (!lines.length) { toast('先写至少一行问题'); return; }
      var p = P();
      p.questions = p.questions || [];
      var today = DEMO_NOW;
      lines.forEach(function (l) { p.questions.push({ id: state.profile + '-Q' + (p.questions.length + 1) + '-' + Date.now() % 1000, kind: 'view', content: l, created: today }); });
      ta.value = '';
      toast('已保存 ' + lines.length + ' 条问题');
      render();
    }
    else if (act === 'demo-toast') { toast('原型演示：此操作在正式版接入'); }
    else if (act === 'toggle-pe') { state.showPE = !state.showPE; render(); }
    else if (act === 'flip') {
      var k = t.getAttribute('data-metric');
      state.flipped[k] = !state.flipped[k];
      t.setAttribute('aria-pressed', String(state.flipped[k]));
      var back = t.querySelector('.mface.back');
      back.setAttribute('aria-hidden', String(!state.flipped[k]));
      if (!state.flipped[k]) back.setAttribute('inert', ''); else back.removeAttribute('inert');
    }
    else if (act === 'mock-import') {
      if (!state.candSeq) state.candSeq = 0;
      var cA = ++state.candSeq, cB = ++state.candSeq;
      state.candidates.labs.push(
        { id: 'C' + cA, metric: 'plt', date: '2026-10-20', value: 146, from: '模拟导入 · 化验单照片（演示解析）' },
        { id: 'C' + cB, metric: 'ldh', date: '2026-10-20', value: 226, from: '模拟导入 · 化验单照片（演示解析）' });
      render(); toast('两条候选已进整理草稿（未入图）');
    }
    else if (act === 'cand-accept') {
      var cid = t.getAttribute('data-cand');
      var c = state.candidates.labs.filter(function (x) { return x.id === cid; })[0];
      if (c) {
        state.checks[cid] = true;
        P().labs.push({ id: state.profile + '-C' + cid, metric: c.metric, date: c.date, datePrecision: 'day', value: c.value, method: '模拟导入', site: '演示机构', reportId: 'CAND-' + cid, source: c.from });
        render(); toast('已收下并入图');
      }
    }
    else if (act === 'cand-reject') {
      var cid2 = t.getAttribute('data-cand');
      state.candidates.labs = state.candidates.labs.filter(function (x) { return x.id !== cid2; });
      render(); toast('已拒收（零副作用：事实层未变）');
    }
    else if (act === 'preview-export') {
      var p2 = P(), c2 = coursePos(p2);
      var sel = [];
      document.querySelectorAll('[data-export]').forEach(function (cb) { if (cb.checked) sel.push(cb.parentNode.textContent.trim()); });
      openModal('一页预览（三出口之预览）', [
        h('p', null, '病程：' + (c2.mode === 'remission' ? '缓解第 ' + c2.dayN + ' 天' : '发作中第 ' + c2.dayN + ' 天') + ' · 近 90 天发作 ' + flares90(p2) + ' 次'),
        h('p', null, '会包含：' + (sel.length ? sel.join('；') : '（未勾选）')),
        h('p', { style: 'color:var(--soft-fg);font-size:12.5px' }, privateNote(p2) + '。私密记录在任何出口都不会出现。'),
        h('button', { class: 'primary', 'data-action': 'do-export' }, '确认并导出')
      ]);
    }
    else if (act === 'do-export') { closeModal(); doExport(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!document.getElementById('modal-back').hidden) { closeModal(); return; }
    if (state.pvStack.length) { closePageView(true); return; }
  });
  window.addEventListener('popstate', function () {
    /* 显式关闭已弹过栈：popstate 只负责重绘，不再弹（否则双弹栈） */
    if (state._pvClosing) { state._pvClosing = false; renderPageView(); return; }
    if (state.pvStack.length) { state.pvStack.pop(); renderPageView(); }
  });
  /* 面板拖宽 25–45%（Q5/Q18） */
  (function initSplitter() {
    var sp = document.getElementById('splitter');
    function onDown(e) {
      e.preventDefault();
      var ws = sp.parentNode;
      function move(ev2) {
        var rect = ws.getBoundingClientRect();
        var pct = Math.round((rect.right - ev2.clientX) / rect.width * 100);
        pct = Math.max(25, Math.min(45, pct));
        document.documentElement.style.setProperty('--aiw', pct + '%');
        sp.setAttribute('aria-valuenow', String(pct));
      }
      function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    }
    sp.addEventListener('mousedown', onDown);
    sp.addEventListener('keydown', function (e) {
      var cur = Number(sp.getAttribute('aria-valuenow') || 35);
      if (e.key === 'ArrowLeft') { e.preventDefault(); var v = Math.max(25, cur - 2); document.documentElement.style.setProperty('--aiw', v + '%'); sp.setAttribute('aria-valuenow', String(v)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); var v2 = Math.min(45, cur + 2); document.documentElement.style.setProperty('--aiw', v2 + '%'); sp.setAttribute('aria-valuenow', String(v2)); }
    });
  })();
  function openProfiles() {
    var rows = [];
    Object.keys(DEMO.profiles).forEach(function (k) {
      var p = DEMO.profiles[k];
      rows.push(h('button', { class: 'profile-row' + (state.profile === k ? ' on' : ''), 'data-action': 'use-profile', 'data-profile': k },
        h('div', null, h('div', { class: 'p-name' }, p.name), h('div', { class: 'p-tag' }, p.tag))));
    });
    rows.push(h('button', { class: 'profile-row', disabled: true, title: '原型演示：正式版提供空档案起步' },
      h('div', null, h('div', { class: 'p-name' }, '新建我的档案（从零开始）'), h('div', { class: 'p-tag' }, '原型未实现：正式版提供空档案起步'))));
    openModal('切换档案', rows);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var hash = location.hash || '';
    var m = hash.match(/#page=([a-z-]+)/);
    if (m) {
      var r = m[1];
      Object.keys(RENDERERS).forEach(function (k) { if (k.replace('/', '-') === r) go(k); });
    }
    /* 探针入口（只读驱动，不影响正常用户） */
    try {
      var qp = new URLSearchParams(location.search);
      if (qp.get('profile') && DEMO.profiles[qp.get('profile')]) state.profile = qp.get('profile');
      if (qp.get('s1')) state.sel[0] = qp.get('s1');
      if (qp.get('s2')) state.sel[1] = qp.get('s2');
      if (qp.get('tw')) state.timeWindow = qp.get('tw');
      if (qp.get('hidepe') === '1') state.showPE = false;
    } catch (e) { /* 老浏览器忽略 */ }
    document.body.classList.add('ai-collapsed');
    render();
    document.getElementById('foot-version').textContent = '版本：交互原型 v0.2（构建自仓库 VERSION）';
  }
  /* 深链接与浏览器前进/后退：hash 是导航真源之一（A7/A3） */
  window.addEventListener('hashchange', function () {
    var m = (location.hash || '').match(/#page=([a-z-]+)/);
    if (!m) return;
    var r = m[1];
    var target = null;
    Object.keys(RENDERERS).forEach(function (k) { if (k.replace('/', '-') === r) target = k; });
    if (target && (target !== state.view + (state.sub ? '/' + state.sub : ''))) go(target);
  });
  boot();

  /* 探针接口：只暴露只读状态与路由表 */
  window.__APP__ = { state: state, ROUTES: ROUTES, RENDERERS: RENDERERS, go: go, render: render, PAGES: PAGES, SUBPAGES: SUBPAGES, coursePos: coursePos, flares90: flares90, DEMO: function () { return DEMO; } };
})();


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
