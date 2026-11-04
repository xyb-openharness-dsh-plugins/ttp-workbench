-- 0004_revision_all.sql · 补齐更正=新版本所需的版本列（2026-11-05，只增不改）
-- Inspector F5：episode/document 缺 revision/in_use，界面无法显示版本号、无法保留旧版本。
ALTER TABLE episode ADD COLUMN in_use INTEGER NOT NULL DEFAULT 1;
ALTER TABLE episode ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE document ADD COLUMN in_use INTEGER NOT NULL DEFAULT 1;
ALTER TABLE document ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
