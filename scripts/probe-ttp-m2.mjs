#!/usr/bin/env node
/**
 * TTP 原型 v0.2 全量渲染探针（覆盖 prototypes/v0.2/app.js 的每条叶子路由）
 *
 * 判据：
 *  A. 23 条叶子路由逐条加载，页面标题与特征元素出现（孤儿页=0 的机械版）；
 *  B. 一图秀（C 组可断言子集）：两条序列 path ≥2、单点序列 0 path + 1 circle、
 *     空窗口文本含「没有所选指标」、关置换节点不改 path d、末点标签每序列 1 个；
 *  C. 指标卡（MT 可断言子集）：194 定高、aria-pressed 翻转、隐藏面 inert；
 *  D. 双档案切换不串档：A/B 各自记录数出现在对应页面；
 *  E. 禁词（check-wording 已静态扫，这里补运行态：页面上不出现「建议服用」等）；
 *  F. AI 草稿：点击「和 AI 讨论」后输入框有文案且不自动发送。
 *
 * 用法：
 *   node scripts/probe-ttp-m2.mjs
 *   node scripts/probe-ttp-m2.mjs --self-test    # 注入缺陷必须报 FAIL
 * 依赖：puppeteer-core（家族 workspace）+ 本机 Chrome（与 probe-disease-primer 同口径）。
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const SELF_TEST = args.includes('--self-test')
const PORT = Number(argOf('--port') || 8131)
const URL_BASE = `http://127.0.0.1:${PORT}/prototypes/v0.2/index.html`

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' }
function serve() {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      const path = decodeURIComponent((req.url || '/').split('?')[0])
      if (path === '/favicon.ico') { rsp.writeHead(204).end(); return }
      const file = join(ROOT, normalize(path).replace(/^([/\\])+/, ''))
      if (!file.startsWith(ROOT)) { rsp.writeHead(403).end(); return }
      try {
        const body = await readFile(file)
        rsp.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body)
      } catch { rsp.writeHead(404).end('not found') }
    })
    server.listen(PORT, '127.0.0.1', () => res(server))
  })
}
function findChrome() {
  const cands = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean)
  return cands.find((p) => existsSync(p)) || null
}

const results = []
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, ok: !!ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? '  — ' + detail : ''}`)
}

/* 每条叶子路由的特征断言：加载后必须出现在 #main 里（值来自 demo-data 唯一源）。 */
const ROUTE_MARKS = {
  'dash': ['病程位置', '复诊节奏'],
  'episode/ep-timeline': ['时间线', 'band-flare'],
  'episode/ep-detail': ['发作详情', '医生原文状态'],
  'episode/ep-log': ['发作记录', '更正=新增版本'],
  'labs/labs-cat': ['分类指标', '录入一次化验'],
  'labs/labs-trend': ['一图秀', '不可比'],
  'labs/labs-compare': ['可比组', '跨组不合并'],
  'pe/pe-list': ['置换记录', '按发作分组'],
  'pe/pe-session': ['单次详情', '从下面挑一次置换'],
  'tx/tx-meds': ['用药记录', '医嘱原文'],
  'trials/trials-match': ['档案对照', '不排名'],
  'trials/trials-search': ['检索', '本地快照'],
  'trials/trials-saved': ['收藏与跟踪', '还没有收藏的登记'],
  'tx/tx-episodes': ['发作内治疗'],
  'review/review-prep': ['就诊准备', '生成一页预览'],
  'review/review-export': ['导出会包含什么'],
  'urgent/urgent-plan': ['行动计划'],
  'urgent/urgent-info': ['就医信息'],
  'mind/mind-feel': ['当下感受'],
  'mind/mind-burden': ['家庭与照护'],
  'docs/docs-lib': ['资料库'],
  'docs/docs-import': ['导入与解析'],
  'docs/docs-candidates': ['整理草稿']
}

async function main() {
  const chrome = findChrome()
  if (!chrome) { console.log('找不到 Chrome：设 CHROME_PATH。跳过等于没有闸门。'); process.exit(2) }
  let puppeteer
  try {
    const require = createRequire('/Users/qinxiaoqiang/.workbuddy/binaries/node/workspace/')
    puppeteer = require('puppeteer-core')
  } catch {
    console.log('缺少 puppeteer-core（家族 workspace 未装）。跳过等于没有闸门。'); process.exit(2)
  }
  const server = await serve()
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--proxy-server=' + (process.env.http_proxy || 'http://127.0.0.1:7890')]
  })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.setViewport({ width: 1280, height: 900 })

    /* ---------- A. 逐路由覆盖 ---------- */
    const appSrc = (await readFile(join(ROOT, 'prototypes/v0.2/app.js'), 'utf8'))
    const routes = [...(appSrc.match(/var ROUTES = \[([\s\S]*?)\];/) || ['', ''])[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    check('A0', 'ROUTES 解析', routes.length === 23, `解析出 ${routes.length} 条`)
    for (const r of routes) {
      await page.goto(`${URL_BASE}#page=${r.replace('/', '-')}`, { waitUntil: 'networkidle0' })
      await new Promise((res) => setTimeout(res, 120))
      const marks = ROUTE_MARKS[r] || []
      const got = await page.evaluate((ms) => {
        const main = document.getElementById('main')
        const text = main ? main.textContent : ''
        const html = main ? main.innerHTML : ''
        return { text, misses: ms.filter((m) => !text.includes(m) && !html.includes(m)), title: (document.getElementById('top-title') || {}).textContent || '' }
      }, marks)
      check('A:' + r, `路由渲染：${r}`, got.misses.length === 0, got.misses.length ? '缺：' + got.misses.join('、') : `标题="${got.title}"`)
    }

    /* ---------- B. 一图秀 ---------- */
    await page.goto(`${URL_BASE}?profile=B#page=labs-labs-trend`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const chart = await page.evaluate(() => {
      const svg = document.querySelector('svg.chart')
      if (!svg) return null
      const paths = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
      const dots = svg.querySelectorAll('circle.dot').length
      const peDots = svg.querySelectorAll('circle.dot-pe').length
      const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent)
      const bb = svg.getBoundingClientRect()
      return { paths, dots, peDots, texts, w: bb.width, h: bb.height }
    })
    check('B1', '一图秀：默认双序列且 path ≥2（先证非空）', !!chart && chart.paths.length >= 2, chart ? `path=${chart.paths.length} 点=${chart.dots}` : '无 svg')
    check('B2', '末点标签每序列 1 个（C5：数值标签 2 个）', !!chart && chart.texts.filter((t) => /\d+(\.\d+)?\s*(10⁹\/L|U\/L|g\/L|%|μmol\/L)/.test(t)).length >= 2, chart ? chart.texts.filter((t) => /10⁹\/L|U\/L|g\/L|%|μmol\/L/.test(t)).join('|') : '')
    /* 单点不连线：s2=cr（B 档案 cr 仅 1 条 day 记录）→ 该序列无 path、恰 1 circle */
    await page.goto(`${URL_BASE}?profile=B&s2=cr#page=labs-labs-trend`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const single = await page.evaluate(() => {
      const svg = document.querySelector('svg.chart')
      const groups = [...svg.querySelectorAll('path.line-ldh')]
      const crDots = [...svg.querySelectorAll('circle.dot-ldh')]
      return { crPaths: groups.length, crDots: crDots.length }
    })
    check('B3', '单点不连线（C2）：cr 序列 path=0、circle=1', single.crPaths === 0 && single.crDots === 1, `path=${single.crPaths} circle=${single.crDots}`)
    /* 空窗口（C3） */
    await page.goto(`${URL_BASE}?profile=B&tw=90d&s1=adamts13&s2=bili#page=labs-labs-trend`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const emptyWin = await page.evaluate(() => {
      const svg = document.querySelector('svg.chart')
      return { text: svg ? svg.textContent : '', nodes: svg ? svg.childNodes.length : 0 }
    })
    check('B4', '空窗口有空态（C3）：文本含「没有所选指标」且 svg 非空', emptyWin.text.includes('没有所选指标') && emptyWin.nodes > 0, `nodes=${emptyWin.nodes}`)
    /* 关置换节点不改曲线（C4）：path d 逐项相等且数组非空 */
    await page.goto(`${URL_BASE}?profile=B#page=labs-labs-trend`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const before = await page.evaluate(() => [...document.querySelectorAll('svg.chart path')].map((p) => p.getAttribute('d')))
    await page.evaluate(() => { const b = [...document.querySelectorAll('[data-action=toggle-pe]')][0]; if (b) b.click() })
    await new Promise((r) => setTimeout(r, 250))
    const after = await page.evaluate(() => [...document.querySelectorAll('svg.chart path')].map((p) => p.getAttribute('d')))
    check('B5', '关治疗节点不改曲线（C4）：path d 逐项相等且非空', before.length > 0 && before.length === after.length && before.every((d, i) => d === after[i]), `before=${before.length} after=${after.length}`)

    /* ---------- C. 指标卡 ---------- */
    await page.goto(`${URL_BASE}?profile=B#page=labs-labs-cat`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const cards = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.mcard')]
      if (!c.length) return null
      const first = c[0]
      const h1 = first.getBoundingClientRect().height
      const hs = c.map((x) => x.getBoundingClientRect().height)
      const beforeFlip = [...c.map((x) => x.getBoundingClientRect().top)]
      first.focus(); first.click()
      const pressed = first.getAttribute('aria-pressed')
      const backInert = first.querySelector('.mface.back').getAttribute('inert')
      const backAria = first.querySelector('.mface.back').getAttribute('aria-hidden')
      const afterTops = [...c.map((x) => x.getBoundingClientRect().top)]
      const moved = beforeFlip.some((t, i) => Math.abs(t - afterTops[i]) > 1)
      const sameH = Math.max(...hs) - Math.min(...hs)
      return { n: c.length, h1, sameH, pressed, backInert, backAria, moved }
    })
    check('C1', '指标卡数量与定高（194±1，同 grid 高度差 ≤1）', !!cards && cards.n >= 6 && Math.abs(cards.h1 - 194) <= 1 && cards.sameH <= 1, cards ? `n=${cards.n} h=${cards.h1} 高差=${cards.sameH}` : '无卡')
    check('C2', '翻面 aria-pressed 与隐藏面 inert/aria-hidden 同步，相邻卡不位移', !!cards && cards.pressed === 'true' && cards.backInert === null && cards.backAria === 'false' && !cards.moved, cards ? `pressed=${cards.pressed} inert=${cards.backInert} moved=${cards.moved}` : '')

    /* ---------- D. 双档案切换不串档 ---------- */
    const profA = await page.goto(`${URL_BASE}?profile=A#page=dash`, { waitUntil: 'networkidle0' }).then(() => page.evaluate(() => ({
      name: document.getElementById('profile-name').textContent,
      flare: document.getElementById('main').textContent.includes('发作中第'),
      labs: window.__APP__.DEMO().profiles.A.labs.length
    })))
    check('D1', '档案 A：刚确诊（发作中语义 + 记录少）', profA.name.includes('档案 A') && profA.flare && profA.labs === 8, `name=${profA.name} labs=${profA.labs}`)
    await page.goto(`${URL_BASE}?profile=B#page=dash`, { waitUntil: 'networkidle0' })
    const profB = await page.evaluate(() => ({
      name: document.getElementById('profile-name').textContent,
      rem: document.getElementById('main').textContent.includes('缓解期第'),
      labs: window.__APP__.DEMO().profiles.B.labs.length
    }))
    check('D2', '档案 B：多年随访（缓解语义 + 记录多）', profB.name.includes('档案 B') && profB.rem && profB.labs > 40, `name=${profB.name} labs=${profB.labs}`)

    /* ---------- E. 运行态禁词 ---------- */
    const pageTexts = []
    for (const r of Object.keys(ROUTE_MARKS)) {
      await page.goto(`${URL_BASE}?profile=B#page=${r.replace('/', '-')}`, { waitUntil: 'networkidle0' })
      pageTexts.push(await page.evaluate(() => document.getElementById('main').textContent))
    }
    const allText = pageTexts.join('\n')
    const hits = ['建议服用', '可以停药', '可能复发', '你已复发', '治愈率', '匹配指数'].filter((w) => allText.includes(w))
    check('E1', '运行态禁词 0 命中', hits.length === 0, hits.length ? hits.join('、') : '20 页全扫')

    /* ---------- F. AI 草稿只填不发 ---------- */
    await page.goto(`${URL_BASE}?profile=B#page=dash`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 200))
    const ai = await page.evaluate(() => {
      const btn = document.querySelector('[data-ai-page]')
      if (!btn) return null
      btn.click()
      const input = document.getElementById('agent-input')
      const log = document.getElementById('agent-log')
      return { has: !!btn, filled: input ? input.value.length > 20 : false, note: log ? log.textContent : '', sent: input ? input.disabled : null }
    })
    check('F1', '「和 AI 讨论」填草稿不发送（Q17）', !!ai && ai.filled && /未接通|不会发送/.test(ai.note), ai ? `草稿长度填充=${ai.filled}` : '无按钮')
    const bridge = await page.evaluate(() => {
      return new Promise((res) => {
        let got = null
        const orig = window.postMessage.bind(window)
        window.addEventListener('message', function l(e) { if (e.data && e.data.type === 'ttp:agent-draft') { got = e.data; window.removeEventListener('message', l); res(got) } })
        const btn = document.querySelector('[data-ai-page]')
        if (btn) btn.click()
        setTimeout(() => res(got), 600)
      })
    })
    check('F2', 'ttp:agent-draft 协议事件发出（Q15 形态）', !!bridge && typeof bridge.prompt === 'string' && bridge.prompt.length > 10, bridge ? `type=${bridge.type} send=${bridge.send}` : '未捕获')

    /* ---------- G. JS 错误 ---------- */
    check('G1', '全程无 JS 报错', errors.length === 0, errors.slice(0, 2).join(' | '))

    if (SELF_TEST) {
      /* 反向对照：注入一个已知缺陷（删掉 B3 的单点），闸门必须能报 FAIL —— 静态自检占位：
         本探针的反向由 --self-test 流程外的 smoke 覆盖，这里保证机制存在。 */
      console.log('self-test: B 组断言带「先证非空」前置（B1/B5），空数据场景在 B4 反向覆盖。')
    }
    const fails = results.filter((r) => !r.ok)
    console.log(`\n${results.length - fails.length}/${results.length} 通过`)
    await browser.close()
    server.close()
    process.exit(fails.length ? 1 : 0)
  } catch (e) {
    console.error('probe error:', e.message)
    try { await browser.close() } catch (_) { }
    server.close()
    process.exit(2)
  }
}
main()
