# M7 发布草稿（冻结：无人值守不发布，待晨审追认后执行）

- 冻结原因：对外动作冻结（夜班禁公开发布/tag/release 推送）
- 待执行命令（晨审追认后）：
  1. `git tag v0.2.1 && git push origin v0.2.1`
  2. `gh release create v0.2.1 release/xyb-community-ttp-workbench-0.2.1.tgz --title "v0.2.1" --notes-file <本目录 RELEASE-NOTES.md>`
  3. sha256：见 RELEASE-NOTES.md（装包前核对）
- 前置检查（已实测 2026-11-04）：npm run check exit=0；npm test 13/13；npm run audit 33/33；dsh-wb-cli audit 40/40；V2 装机通过；V3 部分通过（截图待人工补——建议补图后再发）

## RELEASE-NOTES.md（草稿）

# 小宁宝 · TTP 工作台 v0.2.1

首个可装机版本：发作—缓解病程资料整理（血浆置换按次、血小板/LDH/ADAMTS13 趋势跨方法不合并、缓解期监测、复诊准备）。

- 全部数据为演示内容（合成示例）；私密记录三出口排除
- 疾病概要四段带来源（2025 版指南 #79 原件已核）
- 0 访谈、0 临床审核：随访频次/阈值文案均【待核】，不构成任何医学判断
- sha256: `91d386f7ff4dbd6c4a2879092c9c93169ea9f623304bbd5d3e470e4a2ee58da1`
