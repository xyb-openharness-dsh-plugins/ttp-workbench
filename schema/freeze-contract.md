# schema 冻结合同 · TTP（血栓性血小板减少性紫癜）· G3 · 2026-11-04

- 文件：`0001_initial.sql`（18 表：档案级 2 + 指标 3 + 通用 7 + TTP 专属 3 + 导入 3）
- sha256：`57b26c0b6f9c0393330fcf7c98e968bddc66aeb521fd9e3b2fecb8715516254f`
- 结构变更只允许新增 `000N_*.sql`；本文件哈希变动即冻结破坏，须评审留痕。

## 冻结断言（实测 2026-11-04，node:sqlite DatabaseSync 内存加载）

1. **判读列断言**：全表全列扫描 `/diagnosis|risk_level|relapse|eligible|verdict|recommend|activity_score|severity_level|flare_flag|remission_flag/i` → **0 命中**（18 表全过）。
2. 语法：`DatabaseSync.exec` 全量执行通过（18 表建成）。
3. K1–K6 落点：
   - K1 `episode(ended_on 显式 null + state_text 医生原文)` —— 缓解/发作由读模型按结束日期推导展示，无判定列；
   - K2 `pe_session(逐次 seq/volume_ml/access_text)` —— 按次记录，无疗程聚合、无疗效率；
   - K3 `metric_point(method+site)` —— 可比组在库层可分，跨组不合并是读模型职责，库内不做差；
   - K4 `medication(dose_text 医嘱原文)` —— 无推荐列；未抄录写「未抄录」；
   - K5 `action_plan(source_text 原话 + source_ref)` —— 无医生记录时无行，空态由读模型给；
   - K6 `author_role` 贯穿可写表 + `visibility`（feeling_note 默认 private；candidate_fact 核对后才入事实表）。
4. 排序口径：读模型一律 ORDER BY rowid 或显式列，不用隐式顺序；日期未知 date_precision='unknown' + measured_at 显式 null。

## G3 留痕

- 2026-11-04 夜班自动签认（待晨审追认）；用户未参与。

## 追加迁移 0003（2026-11-05）

- `0003_visit_site_edit.sql` sha256：`2e10808be9bff890b228554df68134574ac91bda1c9c6f772f7a7261a61e7b15`
- 内容：visit_site 补 contact_text/note/in_use/revision/updated_at——就医信息可增、可改（更正=新增版本）、支持多医院多行
- 0001/0002 哈希不变；判读列断言对新列复扫：0 命中
