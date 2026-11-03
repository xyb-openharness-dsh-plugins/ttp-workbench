# PROGRESS · 小宁宝 TTP 工作台

> 更新：2026-11-04 03:1x（夜班收尾）。模式：无人值守，全部闸口为「自动签认（待晨审追认）」。

## 当前状态：M0–M9 全部走完；M7/M8 按冻结规则只备草稿；V3 部分通过（截图待人工）

## 里程碑账

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| M0 骨架 | 完成 | 733b122；staticPass=true；文档九件 |
| M1 调研与 SPEC / G1 | 完成（自动签认） | 916edaa；医学 10 主题（2025 指南 #79 原件已核 PDF 第 476 页）；重名率 2/9=22% |
| M2 原型 / G2 | 完成（自动签认） | 1cd7935；探针 34/34；primer 10/10；独立评审 P0=0 + 5×P1 修复；README 7 截图 |
| M3 数据模型 / G3 | 完成（自动签认） | fc4b664；18 表内存全建；判读列 0 命中；freeze-contract sha256 |
| M4 临床库 | 完成 | 494594b；193 条（chictr_online FAILED 如实记）；manifest=jsonl=sqlite 一致性 PASS |
| M5 开发版 / V1 | 完成（自动签认） | ed37260；真客户端链路 528 行；test 13/13；audit 33/33；dev-server 双形态烟测 |
| M6 装机 / V2/V3 | V2 通过；V3 部分通过 | 83e5969；0.2.1 装 Desktop profile + bundles；真机 DOM 走查过；截图待人工 |
| M7 发布 | 冻结草稿 | 4da06c8 docs/release-draft/M7-release-draft.md（含 sha256 与待执行命令） |
| M8 回填 | 冻结草稿 | 4da06c8 docs/release-draft/M8-backlog-pr-draft.md（精确改动行） |
| M9 回流 | 完成 | fc2660d（check-public-tokens 进链 + §六 六坑）；starter 321754a（LESSONS L51–L53 + rc.4，自检过 66/66） |

## 阻塞 / 待晨审追认

1. 全部自动签认（G1/G2/G3/V1/V2）待追认；V3 截图与逐页走查待人工
2. 品牌占位名「小宁宝」待定名
3. NMPA 批准文号原件待人工浏览器核（nmpa.gov.cn 自动化 412）
4. 患者访谈 0、临床审核 0：随访频次/阈值文案全部【待核】
5. 同 profile 四仓激活失败（esophageal/gastric/gist/colorectal，缺 demo/ 打包）——非本仓问题，已回流
