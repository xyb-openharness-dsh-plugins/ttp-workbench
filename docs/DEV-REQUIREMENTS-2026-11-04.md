# 开发需求与红线

> 版本 v0.1.0-draft.1（2026-11-03）。

## §一 患者视角红线

- 功能按患者信息维度组织（病程位置/化验趋势/置换记录/复诊准备/紧急就医/资料）；医生任务冒充患者需求一票否决。
- 每条功能线挂患者原话：当前 0 访谈，全部为假设并标注；改写句不得冒充引语。

## §二 数据层纪律

ORDER BY rowid；显式 null；in_use；分节 *_title；分类不进趋势；演示数据唯一源；无判定列；派生读时算。

## §三 前端纪律

页脚贴底；[hidden]；字号 12.5–15；面板 25–45% 可拖可收；无判读列；私密三出口代码级过滤；断点 1180/900/600。

## §四 工程纪律

改包必升版；public 与原型 ui-parity 逐字符；check 链单次全量，失败只重跑相关子集；BACKLOG 改前先 pull。

## §五 可回退默认值（无人值守，待晨审追认）

| 项 | 默认值 | 回退 |
| --- | --- | --- |
| 服务主体 | 成年 TTP 患者及授权代记者 | 访谈后调整 |
| 病程覆盖 | 急性发作出院后 → 缓解期长期随访 | 不含未确诊鉴别 |
| MinerU | 未接入；导入走手工与 PDF 原件存档 | M5 后按 18 号接入 |
| 品牌占位名 | 小宁宝 | 晨审改名 |
| 置换疗程单元 | 一次发作内逐次置换 | 患者反馈后调整 |
| 化验可比组 | 指标+方法+单位+机构 | 临床审核后简化 |

## §六 夜班实测新增坑（M9 回流，均带错误来源）

| 坑 | 错误来源 | 断言/预防 |
| --- | --- | --- |
| 生成代码里令牌写成 `window.__API_BASE__`，宿主注入后变 `window./api/ttp` 语法错误 → 业务帧整帧不执行（dev-server 形态 API_BASE='' 看不出） | V2 装机实测（0.2.0 激活失败，harness.log 无报错行、主区空白） | scripts/check-public-tokens.mjs 进 check 链 |
| fetch 脚本 jsonl 字段 `sponsor` 与 sqlite 插入读取 `r.sponsors` 不一致 → 库内全 null、快照一致性检查 179 处 mismatch | M4 check-trial-snapshot 首跑全红 | 一致性检查器本身就是断言（已进链）；回流 starter LESSONS |
| dsh/demo.js import ../demo/build-demo-data.mjs 而 pack files 白名单缺 demo/ → 装机后 ERR_MODULE_NOT_FOUND（esophageal/gastric/gist/colorectal 四仓同坑激活失败） | 宿主 harness.log 2026-11-04 本次运行段 | files 白名单含 demo/（本仓已含）；LESSONS 已有同类条目（ATTR 0.2.1），回流补充「同坑四连」证据 |
| check-conformance trend 段解析依赖 `\n    }` 缩进形态 | dsh-wb-cli audit primer/趋势段 待人工 | primer-data trend 段闭合缩进按解析器约定 |
| README 疾病概要必须 ### 四段三级标题 | dsh-wb-cli audit primer/README fail | 已补 |
| SVG 文本必须经 textNode 追加（svgEl 不收子字符串则全部空文本，且无报错） | M2 探针 B2/B4 假绿暴露 | 探针「先证非空」前置断言兜住 |
| 只改 hash 的同文档导航不触发 boot（缺 hashchange 监听 → 探针 18 页假失败/假成功） | M2 探针 A 段 | hashchange 已挂；探针逐页断言 |
