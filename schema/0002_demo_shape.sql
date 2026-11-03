-- 0002_demo_shape.sql · 对齐原型 demo 形状所需的补充列（2026-11-04，只增不改）
-- 原型 prototypes/v0.2/demo-data.js 是唯一视觉与形状基准；读模型必须还原该形状。
-- 0001 冻结哈希不变；本文件按「结构变更只新增 000N」规则追加。
ALTER TABLE metric_def ADD COLUMN dec INTEGER NOT NULL DEFAULT 0;
ALTER TABLE metric_def ADD COLUMN note TEXT;
ALTER TABLE profile ADD COLUMN tag TEXT;
ALTER TABLE metric_point ADD COLUMN report_id TEXT;
ALTER TABLE document ADD COLUMN status_text TEXT;
