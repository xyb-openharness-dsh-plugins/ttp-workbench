/* 由 scripts/build-client.mjs 从 src/client.js 生成，勿手改。 */
/* 面板参数来自 lib/layout.js，版本来自 lib/version.js（VERSION 派生）。 */
window.__ModuleLoader__.load({
  id: "@xyb-community/ttp-workbench",
  factory(require) {
    const React = require('react')
    /* 注入点：与 lib/layout.js 同源，客户端不许另写一份 0.65 */
    const __PANEL_LAYOUT__ = {"customFrame":true,"businessSide":"left","businessWidth":0.65,"businessWidthMin":0.55,"businessWidthMax":0.7}
    /* 会话面板参数（默认/最小/最大/步进）同源于 lib/layout.js */
    const __AGENT_PANE__ = {"default":0.35,"min":0.25,"max":0.45,"hideable":true,"resizable":true}
    const __VERSION__ = "0.2.7"

    /**
     * 宿主接线件 ③：DSH Desktop 工作台客户端外壳。
     *
     * 家族口径：客户端插件只做「入口 + 装界面 + 连接状态」，**不重画业务界面**——
     * 业务界面全部来自 `public/`，由 iframe 装进面板。这样原型、dev-server、装机三处
     * 看到的是同一份 HTML/CSS/JS，不会出现"开发版一套、装机另一套"。
     *
     * 面板形态（家族 2026-10-21 实机反馈后统一）：`customFrame: true` 自绘外壳。
     * 宿主把原生会话节点作为 `conversation` prop 交给我们排版：
     * - 顶栏有「AI 对话 / 收起」按钮；splitter 可拖/键盘调（25%–45%，步进 2%）；
     * - 收起只隐藏不结束会话；宽度存 localStorage；容器窄于 760px 改覆盖式抽屉；
     * - 原生会话**始终挂载**（只用 display 控显隐）——卸载会丢输入框状态。
     *
     * 本文件由 `scripts/build-client.mjs` 打包成 `lib/client.js`（宿主加载的就是后者）。
     * 面板参数不在这里手写第二份：layout 与 AGENT_PANE 由构建时从 lib/layout.js 注入。
     *
     * 本仓策略不变：草稿只填入、**不自动发送**（页面里的「填入 AI 对话」同样只填草稿）。
     */

    const UI_ENTRY = '/ttp/'
    const HEALTH_URL = '/api/ttp/api/health'

    const META = {
      title: '小宁宝 · 血栓性血小板减少性紫癜（TTP）工作台',
      panelTitle: '小宁宝 · TTP 工作台',
      icon: '🩸',
      repository: 'https://github.com/xyb-openharness-dsh-plugins/ttp-workbench',
      description: '本机优先的血栓性血小板减少性紫癜（TTP）发作—缓解病程资料整理工作台：血浆置换按次记录、血小板/LDH/ADAMTS13 化验趋势（跨方法不合并）、缓解期监测与复诊准备',
      audience: 'TTP 患者与授权代记者',
      requirements: '本机数据整理；不做诊断、不给处置建议、不做复发判定，判断由用户与其医生做出。',
      author: '小宁宝社区贡献者（品牌占位名待晨审追认）',
    }

    const CLIENT_NAME = 'ttp-workbench'
    const INJECT = ['desktopWorkbenches', 'sessions']

    /* 等待 iframe 首次 load 的宽限：宿主刚重启时插件可能还没就绪，过早报错会吓人 */
    const LOAD_GRACE_MS = 8000

    /* 宿主缺 ensureSession 时按钮禁用，同时把原因写到顶栏：不能点了没反应，也不能只留灰按钮 */
    const NO_SESSION_CAPABILITY_NOTE = '当前 Desktop 版本不支持从面板调起会话；请从左侧会话列表新建会话'

    /* 会话面板参数：由 scripts/build-client.mjs 从 lib/layout.js 的 AGENT_PANE 注入 */
    const AGENT = __AGENT_PANE__
    const AGENT_DEFAULT = Number(AGENT.default)
    const AGENT_MIN = Number(AGENT.min)
    const AGENT_MAX = Number(AGENT.max)
    const AGENT_STEP = Number(AGENT.step || 0.02)
    const NARROW_BELOW = 760
    const DRAWER_MAX = 520
    const WIDTH_KEY = 'ttp.agent-pane.v1'
    const DRAFT_KEY = 'ttp.agent-drafts.v1'

    const clampWidth = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return AGENT_DEFAULT
      return Math.min(AGENT_MAX, Math.max(AGENT_MIN, n))
    }
    const snapWidth = (value) => clampWidth(Math.round(value / AGENT_STEP) * AGENT_STEP)
    const round4 = (n) => Math.round(n * 10000) / 10000

    function loadWidth() {
      try {
        const saved = JSON.parse(localStorage.getItem(WIDTH_KEY) || 'null')
        return clampWidth(saved?.width)
      } catch { return AGENT_DEFAULT }
    }
    function saveWidth(width) {
      try { localStorage.setItem(WIDTH_KEY, JSON.stringify({ width: round4(width) })) } catch { /* 隐私模式忽略 */ }
    }

    /* ---------------- 样式（小宁宝紫褐主色，配米白底） ---------------- */

    const rootStyle = {
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0,
      position: 'relative', width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      background: '#f7faf8', font: '12.5px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
      color: '#596c62',
    }
    // 首个子元素必须是语义 <header>：宿主为 macOS 窗口按钮预留了 --dsh-frame-leading-clearance。
    const headerStyle = {
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
      paddingInlineStart: 'calc(14px + var(--dsh-frame-leading-clearance, 0px))',
      borderBottom: '1px solid #dce7df', background: '#fff', flex: '0 0 auto', flexWrap: 'wrap',
    }
    const hintStyle = {
      flex: '1 1 auto', minWidth: 120, marginInlineStart: 8, color: '#8fa39b', fontSize: 11.5,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }
    const bodyStyle = { position: 'relative', display: 'flex', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }
    const businessStyle = { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }
    const frameStyle = { flex: '1 1 auto', width: '100%', minHeight: 0, border: 0, display: 'block', background: '#f7faf8' }
    const paneStyle = {
      display: 'flex', flexDirection: 'column', flex: '0 0 auto', minWidth: 0, minHeight: 0,
      borderLeft: '1px solid #dce7df', background: '#fff', overflow: 'hidden',
    }
    const drawerStyle = {
      position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 3,
      boxShadow: '-8px 0 24px rgba(52, 65, 60, 0.18)',
    }
    /* 分隔线：1px 常规线条，绝对定位在业务区/会话边界上，不占布局宽度。 */
    const splitterStyle = {
      position: 'absolute', top: 0, bottom: 0, width: 1, marginRight: -0.5,
      zIndex: 2, background: '#dce7df', cursor: 'col-resize', touchAction: 'none',
      transition: 'background .15s ease, box-shadow .15s ease',
    }
    const SPLITTER_BRAND = '#b95023'
    const splitterRgba = (hex, alpha) => {
      const n = parseInt(String(hex).replace('#', ''), 16)
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
    }
    const splitterHoverStyle = {
      ...splitterStyle,
      background: SPLITTER_BRAND,
      boxShadow: `0 0 6px ${splitterRgba(SPLITTER_BRAND, 0.55)}`,
    }
    const splitterDragStyle = {
      ...splitterHoverStyle,
      boxShadow: `0 0 10px ${splitterRgba(SPLITTER_BRAND, 0.8)}`,
    }
    const splitterHitStyle = {
      position: 'absolute', top: 0, bottom: 0, left: -5, width: 11,
      background: 'transparent', cursor: 'col-resize',
    }
    const splitterGripStyle = {
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 14, height: 22, borderRadius: 4, background: SPLITTER_BRAND,
      color: '#fff', fontSize: 11, lineHeight: '22px', letterSpacing: '-1px', textAlign: 'center',
      opacity: 0.95, pointerEvents: 'none', userSelect: 'none',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.18)',
    }
    const dragShieldStyle = {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 4,
      cursor: 'col-resize', background: 'transparent', touchAction: 'none',
    }
    const buttonStyle = {
      minHeight: 30, border: 0, borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
      background: '#b95023', color: '#fff', font: 'inherit', fontWeight: 600, cursor: 'pointer',
    }
    const ghostStyle = {
      ...buttonStyle, background: 'transparent', color: '#b95023', border: '1px solid #e3cbbd',
    }
    const padStyle = {
      display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center',
      padding: 20, color: '#596c62', fontSize: 12.5, lineHeight: 1.75,
    }
    const loadingStyle = {
      position: 'absolute', inset: '38px 0 0', display: 'grid', placeItems: 'center',
      color: '#596c62', font: '13px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
    }

    function buildPanel(React, layout, host) {
      const h = React.createElement
      const { useState, useEffect, useRef } = React
      const service = host?.desktopWorkbenches

      /* ---------------- 会话归属（与家族其它工作台同一套判定） ---------------- */

      function currentSession() {
        if (typeof service?.currentSession === 'function') return service.currentSession() || null
        const snapshot = host?.sessions?.list?.getSnapshot?.()
        return snapshot?.current || Object.keys(snapshot?.byId || {}).find((id) =>
          (snapshot.byId[id]?.retainedBy?.mainView ?? 0) > 0) || null
      }
      function workbenchOwnsSession(sessionId) {
        if (!sessionId) return false
        return typeof service?.ownsSession === 'function' ? Boolean(service.ownsSession(sessionId)) : false
      }
      function ownedSession() {
        const id = currentSession()
        return workbenchOwnsSession(id) ? id : null
      }

      /* ---------------- 原生草稿：只填不发 ---------------- */

      function appendDraft(sessionId, prompt) {
        if (!sessionId || ownedSession() !== sessionId) throw new Error('会话已切换，请回到本工作台再操作')
        const scoped = host.sessions.scope?.(sessionId)
        const conversation = scoped?.get?.('conversation')
        if (!conversation) throw new Error('对话输入不可用')
        const input = conversation.input.for(scoped)
        const snapshot = input.state.getSnapshot()
        if (snapshot.occurrences?.length || (snapshot.phase && snapshot.phase !== 'plain')) {
          throw new Error('当前草稿含引用或正在提交，请先在原生会话里处理')
        }
        const current = snapshot.draft || ''
        input.setDraft(current.trim() ? `${current}\n\n${prompt}` : prompt)
      }

      let pendingDraft = null
      try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
        if (saved?.sessionId && saved?.prompt) pendingDraft = saved
      } catch { /* 隐私模式忽略 */ }
      function rememberDraft(entry) {
        pendingDraft = entry
        try {
          if (entry) localStorage.setItem(DRAFT_KEY, JSON.stringify(entry))
          else localStorage.removeItem(DRAFT_KEY)
        } catch { /* 隐私模式忽略 */ }
      }
      function flushDraft() {
        if (!pendingDraft) return false
        try {
          appendDraft(pendingDraft.sessionId, pendingDraft.prompt)
          rememberDraft(null)
          return true
        } catch { return false /* composer 未就绪：留到下一轮 */ }
      }

      function onboardingPrompt() {
        return [
          '你正在协助我使用「小宁宝 TTP 工作台」。它只整理本机资料，不做诊断、不给处置建议、不做复发判定。',
          '里面是我自己记录的肺功能、氧状态、急性加重事件、用药与影像、复诊准备问题。',
          '分工：你帮我汇总已记录的内容、指出缺项；判断和处置由我和我的医生决定。',
          '没有记录的项请写“没有”，不要补写或推测。',
        ].join('\n')
      }

      return function Panel({ conversation }) {
        const [phase, setPhase] = useState('loading')   // loading | ready | broken
        const [version, setVersion] = useState('')
        const [detail, setDetail] = useState('')
        const [attempt, setAttempt] = useState(0)
        const [width, setWidth] = useState(loadWidth)
        const [paneOpen, setPaneOpen] = useState(true)
        const [connecting, setConnecting] = useState(false)
        const [narrow, setNarrow] = useState(false)
        const [dragging, setDragging] = useState(false)
        const [hovering, setHovering] = useState(false)
        const [note, setNote] = useState('')

        const timer = useRef(null)
        const shellRef = useRef(null)
        const dragHostRef = useRef(null)
        const frameRef = useRef(null)

        const hasConversation = Boolean(conversation)
        const canOpenSession = typeof service?.ensureSession === 'function'

        useEffect(() => {
          setPhase('loading'); setDetail('')
          const controller = new AbortController()
          fetch(HEALTH_URL, { signal: controller.signal, credentials: 'same-origin' })
            .then(async (response) => {
              if (!response.ok) throw new Error(`服务连接失败 (${response.status})`)
              return response.json()
            })
            .then((health) => { if (!controller.signal.aborted) setVersion(health.version || '') })
            .catch((failure) => {
              if (controller.signal.aborted) return
              setDetail(failure.message)
              setPhase('broken')
            })
          timer.current = setTimeout(() => {
            setPhase((current) => (current === 'loading' ? 'broken' : current))
            setDetail((d) => d || '页面加载超时')
          }, LOAD_GRACE_MS)
          return () => { controller.abort(); clearTimeout(timer.current) }
        }, [attempt])

        // 挂载后消化未送达的草稿（composer 就绪一轮一次），并订阅会话变化。
        useEffect(() => {
          const interval = setInterval(() => { if (flushDraft()) setNote('草稿已填入会话，按回车发送') }, 500)
          const unsubscribe = service?.subscribe?.(() => setNote(''))
          return () => { clearInterval(interval); unsubscribe?.() }
        }, [])

        // 窄屏判定用**容器宽度**而不是窗口宽度：宿主主区宽度不等于窗口宽度（合同基线）。
        useEffect(() => {
          const node = shellRef.current
          if (!node || typeof ResizeObserver !== 'function') return undefined
          const observer = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width ?? 0
            setNarrow(w > 0 && w < NARROW_BELOW)
          })
          observer.observe(node)
          return () => observer.disconnect()
        }, [])

        const applyWidth = (next) => {
          const snapped = round4(snapWidth(next))
          setWidth(snapped)
          saveWidth(snapped)
        }

        const stopDrag = () => {
          dragHostRef.current = null
          setDragging(false)
        }

        useEffect(() => {
          if (!dragging) return undefined
          const onMove = (event) => {
            const rect = dragHostRef.current?.getBoundingClientRect?.()
            if (!rect?.width) return
            // 会话在右侧：指针越靠左，会话越宽
            applyWidth((rect.right - event.clientX) / rect.width)
          }
          document.addEventListener('pointermove', onMove)
          document.addEventListener('pointerup', stopDrag)
          document.addEventListener('pointercancel', stopDrag)
          return () => {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', stopDrag)
            document.removeEventListener('pointercancel', stopDrag)
          }
        }, [dragging])

        const onSplitterPointerDown = (event) => {
          event.preventDefault()
          try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* 旧宿主无指针捕获：document 监听仍可拖动 */ }
          dragHostRef.current = shellRef.current
          setDragging(true)
        }

        const onSplitterKeyDown = (event) => {
          const delta = { ArrowLeft: AGENT_STEP, ArrowRight: -AGENT_STEP }[event.key] // 会话在右：← 变宽
          if (delta !== undefined) { event.preventDefault(); applyWidth(width + delta); return }
          if (event.key === 'Home') { event.preventDefault(); applyWidth(AGENT_MAX); return }
          if (event.key === 'End') { event.preventDefault(); applyWidth(AGENT_MIN) }
        }

        /* ---- 打开 / 复用 AI 会话（不自动发送） ---- */

        async function openAgent(prompt = null) {
          setNote('')
          if (!canOpenSession) {
            setNote(NO_SESSION_CAPABILITY_NOTE)
            return
          }
          const existing = ownedSession()
          if (existing) {
            setPaneOpen(true)
            if (prompt) {
              rememberDraft({ sessionId: existing, prompt })
              setNote(flushDraft() ? '已填入会话草稿，按回车发送' : '会话输入框还没就绪；内容已暂存')
            }
            return
          }
          setConnecting(true)
          try {
            const id = await service.ensureSession({})
            setPaneOpen(true)
            rememberDraft({ sessionId: id, prompt: prompt || onboardingPrompt() })
            setNote(flushDraft()
              ? '会话已就绪：草稿已填入右侧输入框，按回车发送'
              : '会话已就绪；输入框就绪后草稿会自动填入')
          } catch (error) {
            setNote(`没能调起会话：${error?.message ?? error}`)
          } finally {
            setConnecting(false)
          }
        }

        function onAgentClick() {
          if (!hasConversation) { void openAgent(); return }
          setPaneOpen((open) => !open)
          setNote('')
        }

        async function deliverContext(prompt) {
          const id = ownedSession()
          if (id) {
            setPaneOpen(true)
            rememberDraft({ sessionId: id, prompt })
            setNote(flushDraft() ? '已填入会话草稿，按回车发送' : '会话输入框还没就绪；内容已暂存')
            return
          }
          await openAgent(prompt)
        }

        // 业务 iframe 只认「自己 + 同源」发来的消息；handler 每轮换最新闭包，effect 只注册一次。
        const deliverRef = useRef(null)
        deliverRef.current = deliverContext
        useEffect(() => {
          function onMessage(event) {
            const data = event.data
            if (!data || typeof data !== 'object') return
            if (!frameRef.current || event.source !== frameRef.current.contentWindow) return
            if (event.origin !== window.location.origin) return
            if (data.type === 'ttp:agent-open') { void openAgent(); return }
            if (data.type !== 'ttp:agent-draft') return
            const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : ''
            if (prompt) void deliverRef.current?.(prompt.slice(0, 8000))
          }
          window.addEventListener('message', onMessage)
          return () => window.removeEventListener('message', onMessage)
        }, [])

        const agentLabel = !canOpenSession
          ? 'AI 对话暂不可用'
          : connecting ? '正在连接…'
            : !hasConversation ? 'AI 对话'
              : paneOpen ? '收起 AI 对话' : '打开 AI 对话'
        // 能力缺失时的说明不能被会话订阅回调里的 setNote('') 冲掉：渲染期兜一层。
        const shownNote = note || (canOpenSession ? '' : NO_SESSION_CAPABILITY_NOTE)

        if (phase === 'broken') {
          return h('main', {
            style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 12,
              justifyContent: 'center', alignItems: 'center', padding: 28, textAlign: 'center',
              font: '15px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', color: '#34413c' },
          },
            h('strong', { style: { fontSize: 17 } }, `工作台没能打开${version ? `（v${version}）` : ''}`),
            h('p', { role: 'status', style: { margin: 0, maxWidth: 520, color: '#596c62' } },
              detail || '页面没有加载成功。'),
            h('p', { style: { margin: 0, maxWidth: 560, color: '#596c62' } },
              '常见原因：Harness 刚重启、插件还没加载完，或还没有在本机新建会话（首次使用需要先建一个会话再回到工作台）。'),
            h('button', {
              type: 'button',
              onClick: () => { setAttempt((n) => n + 1) },
              style: { minHeight: 44, padding: '9px 20px', borderRadius: 999, border: 0,
                background: '#b95023', color: '#fff', cursor: 'pointer', font: 'inherit' },
            }, '重新加载'))
        }

        const percent = Math.round(width * 100)
        const paneVisible = paneOpen && (hasConversation || connecting)

        return h('main', { style: rootStyle },
          // 首个子元素必须是语义 <header>：避让 macOS 窗口按钮（--dsh-frame-leading-clearance）。
          h('header', { style: headerStyle },
            h('span', null, `${META.icon} ${META.panelTitle}`),
            h('span', { 'aria-hidden': true }, '·'),
            h('span', { 'aria-live': 'polite' }, version ? `v${version}` : '连接中'),
            h('span', { style: hintStyle, title: shownNote || '界面由 public/ 提供，与原型同源' },
              shownNote || '本机数据'),
            h('button', {
              type: 'button',
              style: buttonStyle,
              onClick: onAgentClick,
              disabled: connecting || (!hasConversation && !canOpenSession),
              'aria-label': `AI 对话：${agentLabel}`,
            }, agentLabel),
            hasConversation && paneOpen && h('button', {
              type: 'button', style: ghostStyle, onClick: () => setPaneOpen(false),
              'aria-label': '收起 AI 对话面板',
            }, '×')),
          h('div', { ref: shellRef, style: bodyStyle },
            h('div', { style: businessStyle },
              h('iframe', {
                key: attempt,
                ref: frameRef,
                src: UI_ENTRY,
                title: META.title,
                sandbox: 'allow-scripts allow-same-origin allow-forms allow-downloads',
                style: frameStyle,
                onLoad: () => { clearTimeout(timer.current); setPhase('ready') },
              })),
            // 分隔线夹在业务区与会话之间：放到 aside 之后会贴到面板最右缘，既不高亮也拖不动。
            !narrow && paneVisible && h('div', {
              role: 'separator',
              'aria-orientation': 'vertical',
              'aria-label': '调整 AI 对话面板宽度',
              'aria-valuemin': Math.round(AGENT_MIN * 100),
              'aria-valuemax': Math.round(AGENT_MAX * 100),
              'aria-valuenow': percent,
              tabIndex: 0,
              style: {
                ...(dragging ? splitterDragStyle : hovering ? splitterHoverStyle : splitterStyle),
                right: `${percent}%`,
              },
              onPointerDown: onSplitterPointerDown,
              onPointerEnter: () => setHovering(true),
              onPointerLeave: () => setHovering(false),
              onKeyDown: onSplitterKeyDown,
            },
              h('span', { style: splitterHitStyle, 'aria-hidden': 'true' }),
              (hovering || dragging) ? h('span', { style: splitterGripStyle, 'aria-hidden': 'true' }, '⠿') : null),
            // 原生会话**始终挂载**：隐藏走 display，不卸载（否则丢输入框与草稿状态）。
            h('aside', {
              style: {
                ...paneStyle,
                ...(narrow ? drawerStyle : null),
                width: narrow ? `min(92%, ${DRAWER_MAX}px)` : `${percent}%`,
                display: paneVisible ? 'flex' : 'none',
              },
              'aria-label': 'AI 对话',
              'aria-hidden': paneVisible ? undefined : 'true',
            }, conversation ?? h('div', { style: padStyle },
              h('b', null, 'AI 对话还没开始'),
              h('span', null, '点顶栏「AI 对话」调起 DSH 原生会话后，它会固定出现在这一侧。'),
              h('span', null, '没有会话也不影响记录：业务区的资料整理照常可用。'))),
            // 拖动遮罩：指针掠到业务 iframe 上时事件归子文档，遮罩让整块面板仍是我们的命中区。
            dragging && !narrow && h('div', { 'aria-hidden': 'true', style: dragShieldStyle })),
          phase === 'loading'
            ? h('div', { style: loadingStyle }, '正在打开工作台…')
            : null)
      }
    }

    function apply(ctx) {
      const layout = __PANEL_LAYOUT__
      const Panel = buildPanel(React, layout, ctx)
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: META.title,
        panelTitle: META.panelTitle,
        icon: META.icon,
        repository: META.repository,
        description: META.description,
        audience: META.audience,
        requirements: META.requirements,
        initialization: 'empty',
        embedded: true,
        version: __VERSION__,
        author: META.author,
        layout: { businessSide: layout.businessSide, businessWidth: layout.businessWidth },
        customFrame: layout.customFrame,
      }, Panel))
    }

    return { apply, inject: INJECT }
  }
})
