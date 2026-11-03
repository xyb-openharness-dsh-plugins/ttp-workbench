# MORNING-REVIEW · 2026-11-04 晨审

## 一句话结论

从 BACKLOG 领取 TTP（罕见病 #79 · R2 · T2，Issue #57 claimed）建仓 `ttp-workbench`，无人值守走完 M0–M9：G1–G3、V1、V2 自动签认（待追认），V3 部分通过（真机业务面板加载实测通过、截图待人工）；M7/M8 按冻结规则只备草稿未发布；回流 starter rc.4。

## 原型审查入口

- 打开方式：双击 `prototypes/v0.2/index.html`（Chrome），或 `npm start -- --root <资料目录>`（独立开发版），或 Desktop 工作台切换器选「小宁宝 · 血栓性血小板减少性紫癜（TTP）工作台」（已装 v0.2.1）
- 截图：`docs/screenshots/`（v0-2-* 7 张实渲 + 待补 1 张真机位 v0-2-1-desktop-live.png）
- 走查清单：`scripts/probe-ttp-m2.mjs`（34 断言）+ `probe-disease-primer`（10 断言）；勾选记录在 `docs/PROTOTYPE-REVIEW.md`

## 自动签认清单（全部待晨审追认）

docs/signoffs/：G1（业务流程/交互路径）· G2（原型）· G3（数据合同）· V1（检查链）· V2（装机）。V3 为「部分通过」非自动签认通过。都不是用户确认。

## 待用户决策项

1. **默认值追认**（DEV-REQUIREMENTS §五）：服务主体（TTP 患者与授权代记者）、病程覆盖（出院后→缓解期）、MinerU 未接入、品牌占位名「小宁宝」、置换按发作分组
2. **发布追认**：M7 草稿（tag v0.2.1 + GitHub release + tgz，sha256 已录）；M8 BACKLOG PR 草稿（只改状态列）
3. **待人工补**：真机截图（Desktop 打开小宁宝后补 README Q30 位）；逐页真机走查；nmpa.gov.cn 人工查卡普赛珠单抗批准文号；患者访谈 ≥2 与临床核对补位
4. **V3 部分通过的处理**：接受现状则发 v0.2.1；或先补截图再发

## 消耗

- 时长：2026-11-03 23:09 开工 → 2026-11-04 03:2x 收尾（约 4 小时 15 分，含等装包/网络）
- token：客户端可见数据未取得（如实记：本报告不提供 token 数）

## 未验证与异常

- V3 实机截图未取得（IAB 截图通道超时）；逐页真机走查未做
- NMPA 批准文号未核实（官网自动化 412）；血小板/胆红素/肌酐参考区间原件未取得【待核】；卡普赛珠单抗获批仅二手来源
- chictr_online 全程 FAILED、ictrp 两次 FAILED（查过但服务失败，非零结果）；chictr_pancreatic_archive 未配置
- 0 患者访谈、0 临床审核：全部场景为假设，全部阈值为待核占位
- config.root 服务端声明：装机后已实测（数据目录 ttp-workbench.sqlite 生成）✓
- 同 profile 四仓（esophageal/gastric/gist/colorectal）激活失败为存量问题，与本仓无关，已回流 LESSONS L53
