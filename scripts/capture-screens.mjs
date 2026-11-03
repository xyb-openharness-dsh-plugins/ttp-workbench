#!/usr/bin/env node
/* 33 号 README 截图：实渲（headless Chrome），文件名含版本。
 * 用法：node scripts/capture-screens.mjs
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8139
const BASE = `http://127.0.0.1:${PORT}/prototypes/v0.2/index.html`
const OUT = join(ROOT, 'docs/screenshots')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }

function serve() {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      const path = decodeURIComponent((req.url || '/').split('?')[0])
      if (path === '/favicon.ico') { rsp.writeHead(204).end(); return }
      const file = join(ROOT, normalize(path).replace(/^([/\\])+/, ''))
      if (!file.startsWith(ROOT)) { rsp.writeHead(403).end(); return }
      try { rsp.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(await readFile(file)) }
      catch { rsp.writeHead(404).end('nf') }
    })
    server.listen(PORT, '127.0.0.1', () => res(server))
  })
}
function findChrome() {
  return [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter((p) => p && existsSync(p))[0]
}
const shots = [
  ['v0-2-dashboard-b', `${BASE}?profile=B#page=dash`, '看板（档案 B）'],
  ['v0-2-trend-b', `${BASE}?profile=B#page=labs-labs-trend`, '一图秀'],
  ['v0-2-pe-list-folded', `${BASE}?profile=B#page=pe-pe-list`, '置换折叠卡收起'],
  ['v0-2-pe-list-open', `${BASE}?profile=B#page=pe-pe-list`, '置换折叠卡展开'],
  ['v0-2-mcard-flipped', `${BASE}?profile=B#page=labs-labs-cat`, '指标卡翻面'],
  ['v0-2-primer', `${BASE}?profile=B#page=dash`, '疾病概要整页'],
  ['v0-2-dashboard-a-empty', `${BASE}?profile=A#page=urgent-urgent-plan`, '档案 A 空态（行动计划）']
]
const main = async () => {
  mkdirSync(OUT, { recursive: true })
  const chrome = findChrome()
  const require = createRequire('/Users/qinxiaoqiang/.workbuddy/binaries/node/workspace/')
  const puppeteer = require('puppeteer-core')
  const server = await serve()
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--proxy-server=' + (process.env.http_proxy || 'http://127.0.0.1:7890')] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 })
  for (const [name, url, label] of shots) {
    await page.goto(url, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 250))
    if (name === 'v0-2-pe-list-open') {
      await page.evaluate(() => { document.querySelectorAll('details.phase-fold').forEach((d) => d.setAttribute('open', '')) })
      await new Promise((r) => setTimeout(r, 150))
    }
    if (name === 'v0-2-mcard-flipped') {
      await page.evaluate(() => { document.querySelectorAll('.mcard')[2].click() })
      await new Promise((r) => setTimeout(r, 500))
    }
    if (name === 'v0-2-primer') {
      await page.evaluate(() => document.querySelector('[data-primer-open]').click())
      await new Promise((r) => setTimeout(r, 350))
    }
    await page.screenshot({ path: join(OUT, name + '.png') })
    console.log('shot:', name, '—', label)
  }
  await browser.close()
  server.close()
}
main()
