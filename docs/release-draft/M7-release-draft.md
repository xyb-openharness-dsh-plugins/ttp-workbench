# M7 发布草稿（冻结：无人值守不发布，待晨审追认后执行）

- 版本：**v0.2.9**（2026-11-05）｜tgz：`release/xyb-community-ttp-workbench-0.2.9.tgz`
- sha256：`f35d9a8a340f8381b41d4c7056e1f09933f8be707eac2210b130ce2b12bad5e1`
- 待执行命令（追认后）：
  1. `git tag v0.2.9 && git push origin v0.2.9`
  2. `gh release create v0.2.9 release/xyb-community-ttp-workbench-0.2.9.tgz --title "v0.2.9" --notes-file docs/release-draft/RELEASE-NOTES-0.2.9.md`
- 前置检查（已实测 2026-11-05）：npm run check exit=0；npm test 13/13；npm run audit 32/33·0 失败·1 待人工（家族一致性 1 项由本次 CHANGELOG 补录后复跑确认）；probe-ttp-m2 37/37；probe-disease-primer 10/10；dsh-wb-cli audit 40/40（上一轮）；V2 装机 0.2.9 已装且宿主加载；V3 真机 DOM 走查于 0.2.7 完成，0.2.9 待用户重启后复走查；实机截图仍待人工。
- 冻结原因：对外发布/tag/release 属夜班冻结动作。

## RELEASE-NOTES-0.2.9.md（草稿）

# 小宁宝 · TTP 工作台 v0.2.9

- 新增「临床试验」一级菜单：档案对照 / 检索 / 收藏与跟踪（本地快照 75 条，登记状态未核实，不做排名与百分数）
- 设置三 tab：工作区 / 文档解析（MinerU）/ 临床数据库；通道终态照 source_statuses 如实展示
- 六类录入窗口支持「保存并继续录入」；就医信息支持多医院与版本号
- 一图秀 rail 双栏（时间范围/分类勾选指标/显示节点），数据点可键盘访问
- schema 0001–0004（冻结 0001；0003 就医信息版本列；0004 episode/document 版本列）
- 0 访谈、0 临床审核；阈值与频次文案【待核】；全部演示数据
