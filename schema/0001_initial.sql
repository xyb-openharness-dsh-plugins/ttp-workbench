-- 0001_initial.sql · TTP（血栓性血小板减少性紫癜）工作台初始迁移（G3 冻结候选 · 2026-11-04）
-- 来源：家族四契约骨架（TTP 原创版）+ 9 一级 20 子页页面树 + K1–K6 红线（docs/SPEC.md）。
-- 冻结规则：sha256 记入 schema/freeze-contract.md；结构变更只能新增 000N_*.sql。
-- TTP 红线落点：
--   K1 发作—缓解病程（episode：start/end 均医生原文 + precision；缓解/发作状态不入库判定列，由读模型按 end 推导并显示医生原文）
--   K2 血浆置换按次（pe_session 逐次记录；无疗程聚合判定列，无疗效率）
--   K3 化验可比组（metric_point 带 method+site；跨组不合并是读模型职责，不在库内做差）
--   K4 用药原文（medication.dose_text 医嘱原文照抄；无推荐列）
--   K5 紧急行动计划原话（action_plan.source_text 逐字；无触发生成逻辑）
--   K6 双主体（author_role 贯穿）+ 私密三出口（visibility；导出/AI/摘要预览共用同一读模型过滤）

-- ═══ 档案级（2）═══
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_root TEXT,
  schema_version TEXT NOT NULL,
  dataset_state TEXT
);
CREATE TABLE profile (
  id TEXT PRIMARY KEY,                       -- 'A' | 'B' | 用户自建
  name TEXT NOT NULL,
  birth_year TEXT,
  subtype_note TEXT,                         -- 医生病历原文的分型描述（如「免疫性」），非判定
  primary_role TEXT CHECK (primary_role IN ('PATIENT','CAREGIVER')),
  anchor_date TEXT,                          -- 首发作日期（医生记录）
  created_at TEXT NOT NULL
);

-- ═══ 指标（3）═══
CREATE TABLE metric_def (
  code TEXT PRIMARY KEY,                     -- plt/hgb/ldh/adamts13/bili/cr
  label TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,                    -- 'cbc' | 'hemolysis_organ' | 'immune_related'（趋势白名单；分类不进趋势）
  color TEXT,
  is_numeric INTEGER NOT NULL DEFAULT 1,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE metric_point (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  code TEXT NOT NULL REFERENCES metric_def(code),
  measured_at TEXT,                          -- 显式 null = 日期不详（date_precision='unknown'）
  date_precision TEXT NOT NULL DEFAULT 'day' CHECK (date_precision IN ('day','month','unknown')),
  value_num REAL,
  value_text TEXT,
  unit TEXT,
  method TEXT,                               -- 可比组维度之一
  site TEXT,                                 -- 可比组维度之二
  ref_range_text TEXT,
  source_note TEXT,                          -- 来源（急诊化验单/住院化验/手工录入…）
  document_id INTEGER,
  author_role TEXT CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  in_use INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1        -- 更正=新增版本，旧版本 in_use=0 保留
);
CREATE TABLE lab_report (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  report_no TEXT,
  collected_at TEXT,
  collected_precision TEXT CHECK (collected_precision IN ('day','month','unknown')),
  site TEXT,
  document_id INTEGER
);

-- ═══ 通用（7）═══
CREATE TABLE episode (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  label TEXT NOT NULL,                       -- 「第 N 次发作」
  started_on TEXT NOT NULL,
  start_precision TEXT NOT NULL CHECK (start_precision IN ('day','month','unknown')),
  ended_on TEXT,                             -- 显式 null = 医生未记录结束（非「已缓解」判定）
  end_precision TEXT CHECK (end_precision IN ('day','month','unknown')),
  state_text TEXT NOT NULL,                  -- 医生原文状态句，逐字
  admitted INTEGER,                          -- 是否住院（医生记录）
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE pe_session (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  episode_id INTEGER REFERENCES episode(id),
  seq INTEGER NOT NULL,                      -- 该发作内第几次
  performed_on TEXT,
  date_precision TEXT NOT NULL DEFAULT 'day' CHECK (date_precision IN ('day','month','unknown')),
  volume_ml INTEGER,
  access_text TEXT,                          -- 通路（原文）
  duration_min INTEGER,
  note_text TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  author_role TEXT CHECK (author_role IN ('PATIENT','CAREGIVER')),
  in_use INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE medication (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  episode_id INTEGER REFERENCES episode(id),
  name TEXT NOT NULL,
  dose_text TEXT NOT NULL,                   -- 医嘱原文照抄；未抄录处写「未抄录」，不补记忆值
  started_on TEXT,
  start_precision TEXT CHECK (start_precision IN ('day','month','unknown')),
  ended_on TEXT,
  end_precision TEXT CHECK (end_precision IN ('day','month','unknown')),
  prescriber TEXT,
  status_text TEXT,                          -- 「进行中/已结束」来自医生记录或患者记录事实
  author_role TEXT CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  in_use INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE action_plan (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  source_text TEXT NOT NULL,                 -- 医生行动计划原话，逐字；无记录时本表无行（空态由读模型给）
  source_ref TEXT NOT NULL,                  -- 出处（复诊记录 · 日期）
  recorded_at TEXT NOT NULL,
  author_role TEXT CHECK (author_role IN ('PATIENT','CAREGIVER'))
);
CREATE TABLE feeling_note (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  logged_at TEXT NOT NULL,
  content TEXT NOT NULL,
  caregiver_note TEXT,                       -- 代记标记位（二期）
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  in_use INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE question (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fact','view')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  asked_on TEXT,
  from_scenario TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE follow_up_note (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  content TEXT NOT NULL,                     -- 医生提到的随访节奏原文
  source_ref TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);

-- ═══ TTP 专属（3）═══
CREATE TABLE flare_context (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  episode_id INTEGER NOT NULL REFERENCES episode(id),
  prodrome_text TEXT,                        -- 先兆描述（患者原文）
  trigger_note TEXT                          -- 患者记录的可能诱因（不做因果判定，仅存原文）
);
CREATE TABLE access_event (
  id INTEGER PRIMARY KEY,                    -- 置换通路事件（置管/拔管/换药），患者可记录
  profile_id TEXT NOT NULL REFERENCES profile(id),
  pe_session_id INTEGER REFERENCES pe_session(id),
  happened_on TEXT,
  kind_text TEXT NOT NULL,
  note_text TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private'))
);
CREATE TABLE visit_site (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  name TEXT NOT NULL,                        -- 常去医院（患者维护）
  department TEXT,
  contact_ref TEXT,                          -- 医生留下的联系方式出处（不存明文电话，存出处引用）
  ord INTEGER NOT NULL DEFAULT 0
);

-- ═══ 导入（3）═══
CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  name TEXT NOT NULL,
  doc_kind TEXT NOT NULL CHECK (doc_kind IN ('pdf','photo','scan','other')),
  has_original INTEGER NOT NULL DEFAULT 0,   -- 原件是否取得；0 时读模型必须写「未取得原件，据二次来源」
  original_path TEXT,
  collected_on TEXT,
  parse_status TEXT CHECK (parse_status IN ('none','parsed','failed')),
  created_at TEXT NOT NULL
);
CREATE TABLE import_batch (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  document_id INTEGER REFERENCES document(id),
  imported_at TEXT NOT NULL,
  engine TEXT,                               -- 'manual' | 'mineru'（未接入时只允许 manual）
  status TEXT CHECK (status IN ('pending','done','failed'))
);
CREATE TABLE candidate_fact (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  import_batch_id INTEGER REFERENCES import_batch(id),
  kind TEXT NOT NULL CHECK (kind IN ('metric_point','pe_session','medication')),
  payload_json TEXT NOT NULL,                -- 候选载荷；核对（accept）后才写入对应事实表
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  reviewer_role TEXT CHECK (reviewer_role IN ('PATIENT','CAREGIVER'))
);

-- ═══ 索引（读模型口径）═══
CREATE INDEX idx_metric_point_profile_code ON metric_point(profile_id, code, in_use);
CREATE INDEX idx_metric_point_group ON metric_point(profile_id, code, method, site);
CREATE INDEX idx_pe_session_episode ON pe_session(profile_id, episode_id, seq);
CREATE INDEX idx_episode_profile ON episode(profile_id, started_on);
CREATE INDEX idx_candidate_status ON candidate_fact(profile_id, status);
