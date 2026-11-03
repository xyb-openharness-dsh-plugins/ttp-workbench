# 临床数据采集口径（M4 · 2026）

- 唯一入口：unified-trial-mcp（MCP stdio），不自己拼 URL。
- 采集关键词（改口径两处同改：本文件 + scripts/fetch-ttp-trials-2026.mjs）：
  血栓性血小板减少性紫癜（中文标准名）/ TTP（英文缩写）/ thrombotic thrombocytopenic purpura（英文标准名）/ 血栓性微血管病（上位词，宽检索，去重靠登记号）/ Upshaw-Schulman（遗传型别名）/ 获得性TTP（中文别名）
- 每源上限 200；同登记号合并，其余并排。
- 状态口径：登记 ≠ 有效 ≠ 安全 ≠ 可入组；一律「登记状态，未核实」。
- 断言：manifest 计数 = jsonl 行数 = sqlite 行数；失败来源如实进 source_statuses，不写「零结果」。
