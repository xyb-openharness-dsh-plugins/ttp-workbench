# PROGRESS · 小宁宝 TTP 工作台

> 更新：2026-11-05（Inspector 修复轮 + M6–M9 复推）。模式：无人值守为主，全部闸口为「自动签认（待晨审追认）」。

## 当前状态：v0.2.8；M0–M9 全走完；V3 部分通过（0.2.8 复走查与实机截图待人工）

## 里程碑账

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| M0–M5 | 完成 | 733b122 → ed37260；0.2.1 装机缺陷修复（令牌注入） |
| Inspector 审查 | 完成 | 16 项失败（A/B/C/D/E/F/I），见对话记录与整改说明 |
| Inspector 修复 | 完成 | 临床试验一级菜单（档案对照/检索/收藏+右浮窗，快照 75 条）、设置终态照表、掩码方向、三态化验表单、0004 版本列、点焦点、图例私密、README/CHANGELOG、trial-matching 检查器进链 |
| M6 装机 | 完成（V2 过 / V3 部分） | 0.2.8 tgz 装机；生产库 0001–0004 应用；演示医院 3 条回填；宿主加载确认 |
| M7 发布 | 冻结草稿（0.2.8） | docs/release-draft/M7-release-draft.md（sha256 + 待执行命令） |
| M8 回填 | 冻结草稿（0.2.8） | docs/release-draft/M8-backlog-pr-draft.md |
| M9 回流 | 完成 | starter LESSONS L54–L55 + rc.11（见 starter 仓） |

## 闸口

G1/G2/G3/V1/V2：自动签认通过（待晨审追认）；V3：部分通过（0.2.7 面板加载实测；0.2.8 复走查/实机截图待人工）。

## 待晨审追认

1. 全部自动签认；V3 重启后复走查与截图
2. 品牌占位名「小宁宝」；MinerU 未接入默认值
3. 发布：tag v0.2.8 + release（命令已备）；BACKLOG PR（只改状态列）
4. NMPA 批准文号人工核；0 访谈、0 临床审核（阈值/频次全部【待核】）

## 2026-11-07 装机热修（0.2.10）
- 用户反馈：装机态「疾病概要」两处点击无效（顶栏 ? 与状态卡按钮）。
- 根因：primer 资源用越级相对路径（public/index.html 的 ../assets/patterns/disease-primer.js），装机态 UI 挂 /api/ttp/ui/ → 解析成 /api/ttp/assets/... → 404 → DiseasePrimer 未定义。
- 修复：primer.css/primer.js 同目录化（原型与 public 各自携带，引用改同目录）；装机态模拟（public 挂 /api/ttp/ui/ 前缀）两入口实测可开面板。
- 发布：0.2.10 tgz 重新装入 Desktop profile（含 primer.js 实查）；共享 profile 的 aatd 悬空 pin 顺带对齐 0.6.1（仅修引用）。
- 回流：starter LESSONS L66（越级相对路径在装机态必 404；primer 资源同目录化）。
