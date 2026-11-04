-- 0003_visit_site_edit.sql · 就医信息支持增改与多医院（2026-11-05，只增不改）
-- visit_site 已是多行/档案（0001）；本迁移补齐可编辑所需的版本列与联系方式明文列：
--   contact_text：用户自填的联系方式（本机数据；与 contact_ref「出处引用」并存，二选一填写）
--   in_use/revision：更正=新增版本（IP8 无裸删除）；废弃走 in_use=0 保留历史
--   updated_at：最后修改时间（展示用）
ALTER TABLE visit_site ADD COLUMN contact_text TEXT;
ALTER TABLE visit_site ADD COLUMN note TEXT;
ALTER TABLE visit_site ADD COLUMN in_use INTEGER NOT NULL DEFAULT 1;
ALTER TABLE visit_site ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE visit_site ADD COLUMN updated_at TEXT;
