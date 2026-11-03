/**
 * 读模型：把 SQLite 的行还原成 prototypes/v0.2/demo-data.js 同一形状（parity 唯一验收标准）。
 *
 * 规则：有 ord 的按 ord；其它列表按 rowid（裸 SELECT 一律 ORDER BY rowid）；
 * 私密在数据层不过滤——bootstrap 返回全量，私密标记随行返回，三出口过滤由前端 DEMO.filterPublic 统一执行
 * （与原型同一份口径；导出/AI 在原型层已挂接，宿主形态沿用同一函数）。
 * 派生值（缓解第 N 天/距上次发作）读取时算，不落库。
 */
const asStr = (v) => (v === null || v === undefined ? null : String(v));

export function readBootstrap(db, profileId) {
  const metrics = db.prepare('SELECT * FROM metric_def ORDER BY ord, rowid').all().map((m) => ({
    key: m.code, name: m.label, unit: m.unit || '', cat: catLabel(m.category), color: m.color || '', dec: m.dec ?? 0, note: m.note || '',
  }));
  const rows = profileId
    ? db.prepare('SELECT * FROM profile WHERE id = ? ORDER BY rowid').all(profileId)
    : db.prepare('SELECT * FROM profile ORDER BY rowid').all();
  const profiles = {};
  for (const pr of rows) profiles[pr.id] = readProfile(db, pr.id);
  const plans = {};
  db.prepare('SELECT * FROM action_plan ORDER BY rowid').all().forEach((a) => { if (!plans[a.profile_id]) plans[a.profile_id] = a; });
  const fus = {};
  db.prepare('SELECT * FROM follow_up_note ORDER BY rowid').all().forEach((f) => { if (!fus[f.profile_id]) fus[f.profile_id] = f; });
  for (const pr of rows) {
    const a = plans[pr.id];
    if (a) profiles[pr.id].plan = { text: a.source_text, source: a.source_ref };
    const f = fus[pr.id];
    if (f) profiles[pr.id].followUp = { text: f.content, source: f.source_ref };
  }
  return {
    version: 'db-v1',
    banner: '全部为合成示例 · 仅演示 · 未连接宿主 · 不含真实病历',
    metrics,
    profiles,
  };
}

export function readProfile(db, profileId) {
  const pr = db.prepare('SELECT * FROM profile WHERE id = ? ORDER BY rowid').get(profileId);
  if (!pr) return null;
  const episodes = db.prepare('SELECT * FROM episode WHERE profile_id = ? ORDER BY ord, rowid').all(profileId).map((e) => ({
    id: 'E' + e.id, label: e.label, start: e.started_on, startPrecision: e.start_precision,
    end: e.ended_on, endPrecision: e.end_precision || 'unknown', stateText: e.state_text, admitted: !!e.admitted,
  }));
  const epMap = {};
  db.prepare('SELECT * FROM episode WHERE profile_id = ? ORDER BY ord, rowid').all(profileId).forEach((e) => { epMap[e.id] = 'E' + e.id; });
  const labs = db.prepare('SELECT * FROM metric_point WHERE profile_id = ? ORDER BY rowid').all(profileId).map((l) => ({
    id: 'L' + l.id, metric: l.code, date: l.measured_at, datePrecision: l.date_precision, value: l.value_num,
    method: l.method || '未登记方法', site: l.site || '未登记机构', reportId: l.report_id || null, source: l.source_note || '化验单', private: l.visibility === 'private',
  }));
  const pe = db.prepare('SELECT * FROM pe_session WHERE profile_id = ? ORDER BY rowid').all(profileId).map((s) => ({
    id: 'P' + s.id, episode: s.episode_id ? epMap[s.episode_id] : null, seq: s.seq, date: s.performed_on, datePrecision: s.date_precision,
    volumeMl: s.volume_ml, access: s.access_text || '', durationMin: s.duration_min, note: s.note_text || '', private: s.visibility === 'private',
  }));
  const meds = db.prepare('SELECT * FROM medication WHERE profile_id = ? ORDER BY rowid').all(profileId).map((m) => ({
    id: 'M' + m.id, episode: m.episode_id ? epMap[m.episode_id] : null, name: m.name, doseText: m.dose_text,
    start: m.started_on, startPrecision: m.start_precision || 'day', end: m.ended_on, endPrecision: m.end_precision || 'unknown',
    prescriber: m.prescriber || '', status: m.status_text || '',
  }));
  const docs = db.prepare('SELECT * FROM document WHERE profile_id = ? ORDER BY rowid').all(profileId).map((d) => ({
    id: 'D' + d.id, name: d.name, date: d.collected_on, kind: d.doc_kind === 'pdf' ? 'PDF' : d.doc_kind === 'photo' ? '照片' : '其他',
    hasOriginal: !!d.has_original, status: d.status_text || (d.has_original ? '已核对' : '未取得原件，据二次来源'),
  }));
  const notes = db.prepare('SELECT * FROM feeling_note WHERE profile_id = ? ORDER BY rowid').all(profileId).map((n) => ({
    id: 'N' + n.id, date: n.logged_at, text: n.content, private: n.visibility === 'private',
  }));
  return {
    id: pr.id, name: pr.name, tag: pr.tag || '合成示例', anchor: pr.anchor_date, anchorLabel: '首发日期',
    episodes, labs, pe, meds, docs, notes, plan: null, followUp: null,
  };
}

function catLabel(c) {
  return c === 'cbc' ? '血常规' : c === 'hemolysis_organ' ? '溶血与器官' : '免疫相关指标';
}
