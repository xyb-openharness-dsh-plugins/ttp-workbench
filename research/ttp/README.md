# research/ttp · TTP 2026 临床试验快照

- manifest.json：计数、hash、查询口径（与 docs/CLINICAL-DATA-2026.md 一致）
- trials-2026.jsonl：193 条（同登记号合并后），逐条 statusNote=「登记状态，未核实」
- ttp_trials_2026.sqlite：trials 193 行 + source_statuses 36 行（含 FAILED 如实记录）
- **FAILED 如实声明**：chictr_online 全程 FAILED（6 查询）；ictrp 两次 FAILED（血栓性血小板减少性紫癜、血栓性微血管病、获得性TTP 查询时）——这些通道**不是零结果，是查过但服务失败**； chictr_pancreatic_archive NEEDS_SETUP（离线语料仅胰腺癌覆盖，未配置）。
- 重建命令：node scripts/fetch-ttp-trials-2026.mjs
