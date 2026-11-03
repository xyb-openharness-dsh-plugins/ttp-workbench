# 小宁宝 TTP 工作台开发计划

> 文档编号：DEV-PLAN ｜ 版本：v0.1.0-draft.1（2026-11-03）｜ 状态：无人值守夜间开发，全部签认为「自动签认（待晨审追认）」。
> 本文是里程碑状态与判据的唯一来源（22 号口径）。服务成年 TTP 患者及授权代记者，覆盖急性发作出院后至缓解期长期随访；不覆盖未确诊人群的鉴别诊断。
> 当前患者访谈 0、临床审核 0；场景与优先级均为假设，不得当作患者引语或临床结论。

## 领取与定位

- 认领 Issue：xyb-openharness-dsh-plugins/.github#57（2026-11-03，claimed 标签已由认领机器人确认）
- BACKLOG 位置：R2 非肿瘤慢性病型（FSHD 形态）#79，级别 T2；T0/T1 均已有主，本仓按「随访天然结构化 + 差异化」下沉选择，理由见 DIFF-MATRIX
- 波次与形态：确诊档案 + 发作—缓解病程 + 化验趋势 + 治疗记录 + 复诊准备；无肿瘤分期/线序语义

## 里程碑与闸口

| 阶段 | 工作与产物 | 完成判据 | 当前状态 |
| --- | --- | --- | --- |
| M0 骨架 | 认领四步 + 文档九件 + 基线 check | staticPass=true；文档为本病种原创 | 完成（本次夜班） |
| M1 调研与 SPEC | 医学约束/用户研究/家族对照三路 → DIFF-MATRIX、SPEC、USER-RESEARCH、INTERACTION-DESIGN | 重名率实测 ≤70%；K1–K6 红线落文档；G1 决策点显式 | 进行中 |
| G1 业务流程 | 场景/页面树/交互路径同批确认 | 自动签认，留证据路径 | 待做 |
| M2 原型 | 演示数据构建器（A/B 两套）+ prototypes/v0.2 四件套 + 独立评审 | 页签走查数字、禁词 0、切换不串档、检查点 IP/X/C/MT/A/P/Q 记证据 | 待做 |
| G2 原型确认 | 逐项走查 + hash 留痕 | 自动签认 | 待做 |
| M3 数据模型 | schema/0001_initial.sql + freeze-contract（sha256） | 内存全建；无 diagnosis/risk_level 类判定列 | 待做 |
| G3 数据合同 | 判读列断言 | 自动签认 | 待做 |
| M4 临床库 | scripts/fetch-ttp-trials-2026.mjs + research/ttp/ 四件套 | manifest=jsonl=sqlite 计数/hash 断言；未查不得写零结果 | 待做 |
| M5 开发版 | 七步移植 + apiBase 契约 + test 五套 + check 全绿 | 版本十处同源；单测全过；audit 全过 | 待做 |
| V1 检查链 | 逐项实测 | 自动签认 | 待做 |
| M6 装机 | 改包必升版 → pack → 装本机 DSH Desktop profile → 真机走查 | 四要素；Desktop 不可用则如实写未验证 | 待做 |
| V2/V3 | 装机与真机业务闭环 | Desktop 可用才可过；否则跳过（注明） | 待做 |
| M7 发布 | tag + GitHub release + CHANGELOG | 冻结：只备草稿 docs/release-draft/，不发布 | 草稿待做 |
| M8 回填 | BACKLOG 状态行 PR | 冻结：只备 PR 草稿，不推送 | 草稿待做 |
| M9 回流 | 经验收敛 → starter docs/LESSONS.md + 检查器 | 下一轮直接受益项 ≥1 条 | 待做 |

## 已知环境限制（如实记录）

- 本机无 /usr/bin/chromium；浏览器类测试与走查用 CHROMIUM 环境变量指向本机 Google Chrome，实测口径不变
- config.root 服务端声明未核验（装机时核）
- 指南原件未取得：《86 个罕见病病种诊疗指南（2025 年版）》#79 仅目录级引用，正文未核数
