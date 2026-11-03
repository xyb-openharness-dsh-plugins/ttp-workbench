# 小宁宝 · 血栓性血小板减少性紫癜（TTP）工作台

本机优先的血栓性血小板减少性紫癜（TTP）发作—缓解病程资料整理工作台：血浆置换疗程、血小板/LDH/ADAMTS13 化验趋势、缓解期复发监测与复诊准备（品牌名「小宁宝」为占位，待晨审追认）

这是接入骨架，尚未实现真实业务。初始化后先将 [项目设计提示词](docs/DESIGN-PROMPT.md) 交给当前Agent；它应展示实际路径并以已有用户/场景/流程素材对齐设计者、研究与取舍原则。癌种项目另有 [完整专用提示词](prompts/NEW-CANCER-WORKBENCH.md)。需求见 [BRIEF](docs/BRIEF.md)，规格见 [SPEC](docs/SPEC.md)，任务见 [TASKS](docs/TASKS.md)；先读 [AGENTS](AGENTS.md)。CLI输出交接与首问，实际对话由Agent接续。

## 开发顺序

先共创SPEC和候选数据关系，再交付HTML交互工作台；由用户确认对应版本/模块后，复核SCHEMA/API并实现生产功能。确认记录见docs/PROTOTYPE-REVIEW.md；模型不依赖前端Tab/流程。模板骨架不是业务已确认。

## 当前能力

- 一个 DSH 工作台注册、认证的健康接口、版本展示与标准/大字切换。
- 已明确选择布局：business-first。business-first 使用 customFrame；模板不创建会话或复制聊天。需要 AI 协助时按官方合同接入原生 conversation 和会话管理。
- 无业务数据库、无演示患者、无真实密钥；所有业务页按确认 spec 逐项实现。

## 开发与本地验收

需要 Node.js 22+、Git、包管理器和可用 DSH Desktop；采用 SQLite 时另核验 node:sqlite 版本条件。宿主 peers 的范围仅是模板基线，请与目标 Desktop 实际依赖核对。

```bash
npm install
npm run check
npm run pack:check
npm pack
```

`npm run check` 只保证"能装"（语法 + 装包合同），第一天就该是绿的。`npm run audit` 管"还是不是家族里的一员"：版本三处一致、`lib/layout.js` 面板参数单一来源、检查链完整、文档与密钥卫生，**只看代码与文件，不看文档自述**。新项目刚生成时 audit 必然有 fail，那是待办清单；交付/发布前必须清零，存在 fail 不得发布（`npm run release:check` 一次跑完两者）。

跑的时间点：**每次改完**跑 `check`；**G2 原型确认后、写业务代码前**先跑一次 `audit`（这时缺的多是 `lib/layout.js`、`VERSION` 这类结构，越早补越便宜）；**交付/装机前**必须跑 `release:check`；**发布或投稿前**把 `npm run audit --json` 的 `xx/xx 通过 · N 失败 · M 待人工` 抄进 `docs/RELEASE.md` 的「家族一致性」一行。`✗` 是结构缺口（补齐，或在 `docs/DEV-REQUIREMENTS-<日期>.md` 写明偏离理由并由用户确认），`!` 是需人工判断的项（逐条给「已人工确认 / 确实没有」）。

`npm install` 可能按 npm 策略解析 peer；勿为消警告重复打包宿主 runtime。客户端本身是单文件；引入 TS/组件库后需添加构建步骤并保留单文件导出。

本地安装入口以当前 Desktop/CLI 帮助为准。安装后按 [docs/06-VALIDATION-AND-RELEASE.md](docs/06-VALIDATION-AND-RELEASE.md) 与官方自测完成真实 UI 验收，并填写 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。静态检查不代表已加载。

Logo 来源与使用限制见 assets/README.md。许可证、作者、仓库/发布策略由本项目维护者确认后填写；模板默认为 private/UNLICENSED。

感谢小x宝社区、DataElement 社区，以及 sam / hhx / 繁华的 ❤️ 贡献。

初始化来源记录见 `.dsh-wb-starter.json`。更新社区脚手架不会覆盖本项目；需要升级时先用相同确认配置在临时目录生成，再审阅差异。CLI 用法见 [docs/CLI-GIT.md](docs/CLI-GIT.md)。

## HTML先行与数据演进

业务开发前先交付HTML交互工作台原型、实际预览并由用户确认版本/hash和范围。数据设计先区分领域事实、流程状态和页面读模型，走查前端/流程变化、兼容与迁移；原型对象不直接作为表。见[规范](docs/14-HTML-AND-DATA-CONTRACT.md)。

## 疾病概要

顶栏「?」打开整页《疾病概要》：定义 → 医学资料规范和指南情况 → 治疗全景 → 发展趋势，四段都带来源行与核验状态（原件已核 / 官方入口页 / 未取得原件）。中国口径只认官方来源：国家卫健委《86 个罕见病病种诊疗指南（2025 年版）》#79（印刷页 472，PDF 原件已核）、第二批罕见病目录公报（2023）、WS/T 404.7-2015。本页按受累器官与病情轻重排列相关资料；不代表任何一项适合你，需要问你的医生。

## 关键功能（截图墙）

![看板：病程位置与医生行动计划原话](docs/screenshots/v0-2-dashboard-b.png)
看板——缓解第 N 天、距上次发作多少天、近 90 天发作次数；紧急行动计划只呈现医生已确认的原话。

![一图秀：血小板与 LDH 双序列](docs/screenshots/v0-2-trend-b.png)
一图秀——两条线各按全期范围缩放（纵向不可比）；发作区间为背景带；置换节点单独一层；点数据点看原始报告。

![血浆置换折叠卡收起](docs/screenshots/v0-2-pe-list-folded.png) ![血浆置换折叠卡展开](docs/screenshots/v0-2-pe-list-open.png)
血浆置换——按一次发作分组、逐次记录置换量/通路/时长，收展两态。

![指标卡翻面](docs/screenshots/v0-2-mcard-flipped.png)
分类指标卡——正面最近值与「较上次」（仅回顾不解读），翻面看最近几次与可比组说明；194px 定高翻面。

![疾病概要整页](docs/screenshots/v0-2-primer.png)
疾病概要整页——四段齐全、每段强制来源行。

![档案 A 空态](docs/screenshots/v0-2-dashboard-a-empty.png)
刚确诊档案 A——多处空态给下一步按钮；两套合成档案可随时切换对照。

## 怎么用

双击打开 `prototypes/v0.2/index.html`（或任意静态服务器）。顶栏：资料目录 / 设置 / 大字 / AI / 版本 / ?。左栏九个一级页：看板、发作与缓解、化验与趋势、血浆置换、治疗与用药、复诊准备、就医与紧急、心理与照护、资料与导入。演示版顶栏 AI 未接通：点「和 AI 讨论」只填草稿，不会发送。

## 数据与口径

- 全部数据为合成示例（`demo-data.js` 是唯一来源），标注「未连接宿主」；不含任何真实病历。
- 隐私：私密记录在看板摘要预览、导出、AI 上下文三个出口一律排除，页内标注「N 条中私密 M 条」。
- 化验按「指标+方法+机构」分可比组：不同方法不合并、不做差、不连线。
- 无判读列：不诊断、不分级、不做复发判定；阈值与参考区间标【待核】或「以你的医生安排为准」。

## 开发

- 原型 v0.2：`prototypes/v0.2/`（五件）。检查链：`npm run check`（含探针覆盖、禁词、链接断言、底本残留）。
- 全量走查探针：`node scripts/probe-ttp-m2.mjs`（20 条叶子路由 + 一图秀/指标卡断言，需本机 Chrome）。
- 截图：`node scripts/capture-screens.mjs`（README 用，文件名含版本）。
- 版本唯一来源：仓根 `VERSION`；里程碑状态见 `docs/DEV-PLAN.md`，签认见 `docs/signoffs/`。
