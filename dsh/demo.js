/**
 * 演示数据播种：把 demo/build-demo-data.mjs 的 buildDemoProfiles() 写进用户资料库。
 *
 * ① 幂等：库里已有 profile 就整批跳过；② 单事务；③ 唯一来源：本文件不重写任何一条内容。
 * 隐私在数据层落地：private → visibility='private'；候选核对（candidate_fact）不入事实表。
 */
import { buildDemoProfiles } from '../demo/build-demo-data.mjs';

export function hasDemoData(db) {
  return db.prepare('SELECT COUNT(*) c FROM profile').get().c > 0;
}

export function seedDemoData(db, { force = false } = {}) {
  if (!force && hasDemoData(db)) return { skipped: true, profiles: 0 };
  const demo = buildDemoProfiles();
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO workspace (id, data_root, schema_version, dataset_state) VALUES (1, ?, ?, ?)')
      .run(null, '0.1.0', 'demo-seeded');
    const insMetric = db.prepare('INSERT INTO metric_def (code,label,unit,category,color,is_numeric,ord,dec,note) VALUES (?,?,?,?,?,1,?,?,?)');
    demo.metrics.forEach((m, i) => insMetric.run(m.key, m.name, m.unit || null, catOf(m.cat), m.color || null, i, m.dec ?? 0, m.note || null));
    const insProfile = db.prepare('INSERT INTO profile (id,name,subtype_note,primary_role,anchor_date,tag,created_at) VALUES (?,?,?,?,?,?,?)');
    const insEpisode = db.prepare('INSERT INTO episode (profile_id,label,started_on,start_precision,ended_on,end_precision,state_text,admitted,ord) VALUES (?,?,?,?,?,?,?,?,?)');
    const insPoint = db.prepare('INSERT INTO metric_point (profile_id,code,measured_at,date_precision,value_num,method,site,ref_range_text,source_note,visibility,revision) VALUES (?,?,?,?,?,?,?,?,?,?,1)');
    const insPe = db.prepare('INSERT INTO pe_session (profile_id,episode_id,seq,performed_on,date_precision,volume_ml,access_text,duration_min,note_text,visibility) VALUES (?,?,?,?,?,?,?,?,?,?)');
    const insMed = db.prepare('INSERT INTO medication (profile_id,episode_id,name,dose_text,started_on,start_precision,ended_on,end_precision,prescriber,status_text,visibility) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const insDoc = db.prepare('INSERT INTO document (profile_id,name,doc_kind,has_original,collected_on,status_text,created_at,parse_status) VALUES (?,?,?,?,?,?,?,\'none\')');
    const insNote = db.prepare('INSERT INTO feeling_note (profile_id,logged_at,content,author_role,visibility) VALUES (?,?,?,?,?)');
    const insPlan = db.prepare('INSERT INTO action_plan (profile_id,source_text,source_ref,recorded_at,author_role) VALUES (?,?,?,?,?)');
    const insFu = db.prepare('INSERT INTO follow_up_note (profile_id,content,source_ref,recorded_at) VALUES (?,?,?,?)');

    for (const key of Object.keys(demo.profiles)) {
      const p = demo.profiles[key];
      insProfile.run(p.id, p.name, null, 'PATIENT', p.anchor, p.tag, new Date().toISOString());
      const epIds = {};
      p.episodes.forEach((e, i) => {
        insEpisode.run(p.id, e.label, e.start, e.startPrecision, (e.endPrecision === 'day' && e.end) ? e.end : null, e.endPrecision || 'unknown', e.stateText, e.admitted ? 1 : 0, i);
        epIds[e.id] = lastId(db, 'episode');
      });
      for (const l of p.labs) {
        insPoint.run(p.id, l.metric, l.date, l.datePrecision, l.value, l.method || null, l.site || null, null, l.source || null, l.private ? 'private' : 'public');
        /* reportId 以 source_note 关联；lab_report 不为演示数据强拆行 */
      }
      for (const s of p.pe) {
        insPe.run(p.id, epIds[s.episode] ?? null, s.seq, s.date, s.datePrecision, s.volumeMl, s.access || null, s.durationMin, s.note || null, s.private ? 'private' : 'public');
      }
      for (const m of p.meds) {
        insMed.run(p.id, m.episode ? (epIds[m.episode] ?? null) : null, m.name, m.doseText, m.start, m.startPrecision || 'day',
          (m.endPrecision === 'day' && m.end) ? m.end : ((m.endPrecision === 'month' && m.end) ? m.end : null), m.endPrecision || 'unknown', m.prescriber || null, m.status, 'public');
      }
      for (const d of p.docs) {
        insDoc.run(p.id, d.name, d.kind === 'PDF' ? 'pdf' : d.kind === '照片' ? 'photo' : 'other', d.hasOriginal ? 1 : 0, d.date || null, d.status, new Date().toISOString());
      }
      for (const n of p.notes) {
        insNote.run(p.id, n.date, n.text, 'PATIENT', n.private ? 'private' : 'public');
      }
      if (p.plan) insPlan.run(p.id, p.plan.text, p.plan.source, new Date().toISOString(), 'PATIENT');
      if (p.followUp) insFu.run(p.id, p.followUp.text, p.followUp.source, new Date().toISOString());
    }
    db.exec('COMMIT');
    return { skipped: false, profiles: Object.keys(demo.profiles).length };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function catOf(cat) {
  return cat === '血常规' ? 'cbc' : cat === '溶血与器官' ? 'hemolysis_organ' : 'immune_related';
}
function lastId(db, table) {
  return db.prepare('SELECT id FROM ' + table + ' ORDER BY rowid DESC LIMIT 1').get().id;
}
