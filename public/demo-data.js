/* 小宁宝 TTP 工作台 · 演示数据唯一源（v0.2）
 *
 * 红线：
 *  - 全部为合成示例，不冒充真实病历；页面所有数字只从这里读，不写死在渲染代码里。
 *  - 两套档案必须同屏可切：A 刚确诊（记录少、多处未知）、B 多年随访（发作与指标都多）。
 *  - 日期未知 → date: null + datePrecision:'unknown'，不用空串冒充。
 *  - 私密记录打 private:true；看板/导出/AI 三出口共用同一过滤。
 *  - 化验跨方法/机构不合并：method + site 进可比组 key。
 *  - 不含任何判定列（无 diagnosis/risk_level/活动度）；缓解/发作状态只来自医生原文记录。
 */
(function () {
  'use strict';

  var METRICS = [
    { key: 'plt',     name: '血小板计数',       unit: '10⁹/L',  cat: '血常规',       color: 'var(--brand)',  dec: 0, note: '不同实验室参考区间不合并；同方法同机构可比' },
    { key: 'hgb',     name: '血红蛋白',         unit: 'g/L',    cat: '血常规',       color: 'var(--warn)',   dec: 0, note: '输注后需标注，不与其他指标互算' },
    { key: 'ldh',     name: 'LDH 乳酸脱氢酶',   unit: 'U/L',    cat: '溶血与器官',   color: 'var(--action)', dec: 0, note: '与疾病活动相关，非诊断；参考区间据 WS/T 404.7-2015（120–250），以报告单为准' },
    { key: 'adamts13',name: 'ADAMTS13 活性',    unit: '%',      cat: '疾病活动相关', color: 'var(--ok)',     dec: 1, note: '方法学差异大【待核】；跨方法不合并、不做差' },
    { key: 'bili',    name: '间接胆红素',       unit: 'μmol/L', cat: '溶血与器官',   color: 'var(--danger)', dec: 1, note: '溶血相关参考【待核】' },
    { key: 'cr',      name: '肌酐',             unit: 'μmol/L', cat: '溶血与器官',   color: 'var(--soft-fg)',dec: 0, note: '器官受累参考【待核】' }
  ];

  var DEMO = {
    version: 'demo-v1',
    banner: '全部为合成示例 · 仅演示 · 未连接宿主 · 不含真实病历',
    metrics: METRICS,
    profiles: {}
  };

  /* ---------------- 档案 A：刚确诊，记录少，多处未知 ---------------- */
  var labsA = [
    { id: 'A-L1', metric: 'plt', date: '2026-09-09', datePrecision: 'day',   value: 8,     method: '阻抗法',       site: '市一医院', reportId: 'R-2609-011', source: '急诊化验单' },
    { id: 'A-L2', metric: 'hgb', date: '2026-09-09', datePrecision: 'day',   value: 96,    method: '阻抗法',       site: '市一医院', reportId: 'R-2609-011', source: '急诊化验单' },
    { id: 'A-L3', metric: 'ldh', date: '2026-09-09', datePrecision: 'day',   value: 512,   method: '乳酸→丙酮酸法', site: '市一医院', reportId: 'R-2609-011', source: '急诊化验单' },
    { id: 'A-L4', metric: 'cr',  date: '2026-09-09', datePrecision: 'day',   value: 88,    method: '酶法',         site: '市一医院', reportId: 'R-2609-011', source: '急诊化验单' },
    { id: 'A-L5', metric: 'plt', date: '2026-09-14', datePrecision: 'day',   value: 34,    method: '阻抗法',       site: '市一医院', reportId: 'R-2609-102', source: '住院化验' },
    { id: 'A-L6', metric: 'ldh', date: '2026-09-14', datePrecision: 'day',   value: 388,   method: '乳酸→丙酮酸法', site: '市一医院', reportId: 'R-2609-102', source: '住院化验' },
    { id: 'A-L7', metric: 'adamts13', date: null,    datePrecision: 'unknown', value: 3,  method: '荧光底物法',   site: '外送检验所', reportId: null, source: '外送报告（日期不详）' },
    { id: 'A-L8', metric: 'plt', date: '2026-09',    datePrecision: 'month', value: 61,    method: '阻抗法',       site: '市一医院', reportId: 'R-2609-2xx', source: '出院随访单（仅记到月）' }
  ];
  var peA = [
    { id: 'A-P1', episode: 'A-EP1', seq: 1, date: '2026-09-09', datePrecision: 'day', volumeMl: 2400, access: '右颈内静脉置管', durationMin: 105, note: '第一次做，有点紧张', private: false },
    { id: 'A-P2', episode: 'A-EP1', seq: 2, date: '2026-09-10', datePrecision: 'day', volumeMl: 2600, access: '右颈内静脉置管', durationMin: 98,  note: '置换后手脚发凉（仅自己看）', private: true },
    { id: 'A-P3', episode: 'A-EP1', seq: 3, date: '2026-09-11', datePrecision: 'day', volumeMl: 2600, access: '右颈内静脉置管', durationMin: 96,  note: '', private: false },
    { id: 'A-P4', episode: 'A-EP1', seq: 4, date: '2026-09-12', datePrecision: 'day', volumeMl: 2400, access: '右颈内静脉置管', durationMin: 94,  note: '', private: false },
    { id: 'A-P5', episode: 'A-EP1', seq: 5, date: '2026-09-13', datePrecision: 'day', volumeMl: 2400, access: '右颈内静脉置管', durationMin: 92,  note: '', private: false },
    { id: 'A-P6', episode: 'A-EP1', seq: 6, date: '2026-09-14', datePrecision: 'day', volumeMl: 2200, access: '右颈内静脉置管', durationMin: 90,  note: '护士说可以准备出院了', private: false }
  ];
  var medsA = [
    { id: 'A-M1', episode: 'A-EP1', name: '甲泼尼龙', doseText: '40 mg 静脉滴注 每日一次（医嘱原文）', start: '2026-09-09', startPrecision: 'day', end: null, endPrecision: 'unknown', prescriber: '血液科', status: '进行中' },
    { id: 'A-M2', episode: 'A-EP1', name: '血浆置换（治疗性）', doseText: '每次 2000–3000 ml，每日 1–2 次（医嘱原文）', start: '2026-09-09', startPrecision: 'day', end: null, endPrecision: 'unknown', prescriber: '血液科', status: '进行中' }
  ];
  var epsA = [
    { id: 'A-EP1', label: '第 1 次发作', start: '2026-09-09', startPrecision: 'day', end: null, endPrecision: 'unknown', stateText: '医生原文：出院时「血小板回升，继续口服药随访」（未写缓解二字）', admitted: true }
  ];
  var docsA = [
    { id: 'A-D1', name: '急诊病历（手机拍照）', date: '2026-09-09', kind: '照片', hasOriginal: true,  status: '待核对' },
    { id: 'A-D2', name: '出院小结',             date: '2026-09-15', kind: 'PDF',  hasOriginal: false, status: '未取得原件，据口述整理' }
  ];
  var notesA = [
    { id: 'A-N1', date: '2026-09-16', text: '出院后第三天，腿上又有一小块瘀青，先拍了照片存档。', private: false },
    { id: 'A-N2', date: '2026-09-17', text: '夜里睡不好，总担心再住院。', private: true }
  ];

  /* ---------------- 档案 B：三年随访，发作与指标都多 ---------------- */
  var labsB = [];
  (function seed() {
    /* 2023-10 首发住院（密集），其后每 3 个月随访 + 2025-06 复发住院 + 缓解期随访。
       生成时保留同日双方法（adamts13），未知日期 1 条，私密报告 1 条。 */
    function L(id, m, d, v, mth, site, rid, src) {
      labsB.push({ id: id, metric: m, date: d, datePrecision: 'day', value: v, method: mth, site: site, reportId: rid, source: src || '门诊化验' });
    }
    var mPlt = '阻抗法', mBio = '乳酸→丙酮酸法', mFlu = '荧光底物法';
    /* 首发 2023-10 */
    L('B-L001','plt','2023-10-02',6,mPlt,'省血液病中心','B23-1002','急诊化验');
    L('B-L002','ldh','2023-10-02',610,mBio,'省血液病中心','B23-1002','急诊化验');
    L('B-L003','hgb','2023-10-02',82,mPlt,'省血液病中心','B23-1002','急诊化验');
    L('B-L004','bili','2023-10-02',38.2,'重氮法','省血液病中心','B23-1002','急诊化验');
    L('B-L005','plt','2023-10-05',21,mPlt,'省血液病中心','B23-1005','住院化验');
    L('B-L006','plt','2023-10-09',48,mPlt,'省血液病中心','B23-1009','住院化验');
    L('B-L007','plt','2023-10-14',103,mPlt,'省血液病中心','B23-1014','住院化验');
    L('B-L008','ldh','2023-10-14',296,mBio,'省血液病中心','B23-1014','住院化验');
    L('B-L009','adamts13','2023-10-04',2,mFlu,'外送检验所','B23-1004x','外送报告');
    L('B-L010','adamts13','2023-10-04',5,'FRETs 法','省血液病中心','B23-1004y','住院化验（同日另法）');
    /* 缓解期随访：2024 每季度 + 2025 每半年（前 6 月每月 1 次的节奏在 A 之外，按医生安排记录） */
    var fu = [
      ['2024-01-16', 176, 198], ['2024-04-17', 202, 176], ['2024-07-16', 188, 184],
      ['2024-10-15', 194, 172], ['2025-01-14', 181, 190], ['2025-04-15', 176, 196]
    ];
    fu.forEach(function (r, i) {
      L('B-L02' + i + 'a', 'plt', r[0], r[1], mPlt, '省血液病中心', 'B24-0' + (i + 1) + '16');
      L('B-L02' + i + 'b', 'ldh', r[0], r[2], mBio, '省血液病中心', 'B24-0' + (i + 1) + '16');
      if (i % 2 === 0) L('B-L02' + i + 'c', 'adamts13', r[0], i < 3 ? 12 : 28, mFlu, '外送检验所', 'B24-0' + (i + 1) + '16x');
    });
    /* 2025-06 复发 */
    L('B-L030','plt','2025-06-03',9,mPlt,'省血液病中心','B25-0603','急诊化验');
    L('B-L031','ldh','2025-06-03',542,mBio,'省血液病中心','B25-0603','急诊化验');
    L('B-L032','plt','2025-06-06',27,mPlt,'省血液病中心','B25-0606','住院化验');
    L('B-L033','plt','2025-06-12',96,mPlt,'省血液病中心','B25-0612','住院化验');
    L('B-L034','adamts13','2025-06-04',4,mFlu,'外送检验所','B25-0604x','外送报告');
    /* 复发后随访 */
    L('B-L040','plt','2025-09-16',167,mPlt,'省血液病中心','B25-0916');
    L('B-L041','ldh','2025-09-16',214,mBio,'省血液病中心','B25-0916');
    L('B-L042','plt','2025-12-16',152,mPlt,'省血液病中心','B25-1216');
    L('B-L043','ldh','2025-12-16',232,mBio,'省血液病中心','B25-1216');
    L('B-L044','plt','2026-03-17',171,mPlt,'省血液病中心','B26-0317');
    L('B-L045','ldh','2026-03-17',205,mBio,'省血液病中心','B26-0317');
    L('B-L046','plt','2026-06-16',163,mPlt,'省血液病中心','B26-0616');
    L('B-L047','ldh','2026-06-16',218,mBio,'省血液病中心','B26-0616');
    L('B-L048','plt','2026-09-15',158,mPlt,'省血液病中心','B26-0915');
    L('B-L049','ldh','2026-09-15',224,mBio,'省血液病中心','B26-0915');
    L('B-L050','cr','2026-09-15',74,'酶法','省血液病中心','B26-0915');
    labsB.push({ id: 'B-L051', metric: 'hgb', date: null, datePrecision: 'unknown', value: 110, method: mPlt, site: '社区医院', reportId: null, source: '口头告知（日期不详）' });
    labsB.push({ id: 'B-L052', metric: 'plt', date: '2026-08', datePrecision: 'month', value: 149, method: mPlt, site: '社区医院', reportId: 'B26-08xx', source: '社区化验（仅记到月）' });
  })();
  var peB = [];
  (function seed() {
    function P(id, ep, seq, d, vol, acc, dur, note, priv) {
      peB.push({ id: id, episode: ep, seq: seq, date: d, datePrecision: 'day', volumeMl: vol, access: acc, durationMin: dur, note: note || '', private: !!priv });
    }
    /* EP1 2023-10：8 次 */
    P('B-P101','B-EP1',1,'2023-10-02',2800,'右颈内静脉置管',112,'');
    P('B-P102','B-EP1',2,'2023-10-03',3000,'右颈内静脉置管',108,'');
    P('B-P103','B-EP1',3,'2023-10-04',3000,'右颈内静脉置管',106,'');
    P('B-P104','B-EP1',4,'2023-10-05',2800,'右颈内静脉置管',104,'');
    P('B-P105','B-EP1',5,'2023-10-06',2800,'右颈内静脉置管',101,'');
    P('B-P106','B-EP1',6,'2023-10-07',2600,'右颈内静脉置管',98,'置管处换药');
    P('B-P107','B-EP1',7,'2023-10-08',2600,'右颈内静脉置管',97,'');
    P('B-P108','B-EP1',8,'2023-10-09',2400,'右颈内静脉置管',95,'');
    /* EP2 2024-11 短发作：4 次 */
    P('B-P201','B-EP2',1,'2024-11-08',2800,'左臂肘静脉',118,'门诊狭路相逢排了 2 小时（仅自己看）',true);
    P('B-P202','B-EP2',2,'2024-11-09',2800,'左臂肘静脉',110,'');
    P('B-P203','B-EP2',3,'2024-11-10',2600,'左臂肘静脉',104,'');
    P('B-P204','B-EP2',4,'2024-11-11',2600,'左臂肘静脉',102,'');
    /* EP3 2025-06 复发：7 次 */
    P('B-P301','B-EP3',1,'2025-06-03',3000,'右颈内静脉置管',115,'');
    P('B-P302','B-EP3',2,'2025-06-04',3000,'右颈内静脉置管',110,'');
    P('B-P303','B-EP3',3,'2025-06-05',2800,'右颈内静脉置管',107,'');
    P('B-P304','B-EP3',4,'2025-06-06',2800,'右颈内静脉置管',103,'');
    P('B-P305','B-EP3',5,'2025-06-08',2600,'右颈内静脉置管',99,'');
    P('B-P306','B-EP3',6,'2025-06-10',2600,'右颈内静脉置管',96,'');
    P('B-P307','B-EP3',7,'2025-06-12',2400,'右颈内静脉置管',93,'最后一次，医生说反应不错（转述）');
  })();
  var medsB = [
    { id: 'B-M1', episode: 'B-EP1', name: '甲泼尼龙', doseText: '住院期间静脉激素（剂量按医嘱原文，未抄录）', start: '2023-10-02', startPrecision: 'day', end: '2023-10-20', endPrecision: 'day', prescriber: '血液科', status: '已结束' },
    { id: 'B-M2', episode: 'B-EP1', name: '利妥昔单抗', doseText: '缓解后按医嘱原文使用（出院小结未附剂量）', start: '2023-11-06', startPrecision: 'day', end: '2023-12-04', endPrecision: 'day', prescriber: '血液科', status: '已结束' },
    { id: 'B-M3', episode: 'B-EP2', name: '甲泼尼龙', doseText: '短期静脉激素（剂量未抄录）', start: '2024-11-08', startPrecision: 'day', end: '2024-11-15', endPrecision: 'day', prescriber: '血液科', status: '已结束' },
    { id: 'B-M4', episode: 'B-EP3', name: '卡普赛珠单抗', doseText: '复发住院期间使用（剂量按医嘱原文，未抄录；批准状态【待核】）', start: '2025-06-03', startPrecision: 'day', end: '2025-06-14', endPrecision: 'day', prescriber: '血液科', status: '已结束' },
    { id: 'B-M5', episode: 'B-EP3', name: '利妥昔单抗', doseText: '复发后免疫维持（方案按医生原文）', start: '2025-07-01', startPrecision: 'month', end: '2025-09-30', endPrecision: 'month', prescriber: '血液科', status: '已结束' },
    { id: 'B-M6', episode: null,     name: '阿司匹林（医生处方）', doseText: '缓解期口服（剂量未抄录）', start: '2026-01-05', startPrecision: 'month', end: null, endPrecision: 'unknown', prescriber: '血液科', status: '进行中' }
  ];
  var epsB = [
    { id: 'B-EP1', label: '第 1 次发作', start: '2023-10-02', startPrecision: 'day', end: '2023-10-20', endPrecision: 'day', stateText: '医生原文：临床缓解出院', admitted: true },
    { id: 'B-EP2', label: '第 2 次发作', start: '2024-11-08', startPrecision: 'day', end: '2024-11-16', endPrecision: 'day', stateText: '医生原文：缓解（门诊病历）', admitted: false },
    { id: 'B-EP3', label: '第 3 次发作', start: '2025-06-03', startPrecision: 'day', end: '2025-06-14', endPrecision: 'day', stateText: '医生原文：好转出院，继续随访', admitted: true }
  ];
  var docsB = [
    { id: 'B-D1', name: '出院小结 · 首发住院', date: '2023-10-21', kind: 'PDF', hasOriginal: true,  status: '已核对' },
    { id: 'B-D2', name: '门诊病历 · 第 2 次发作', date: '2024-11-18', kind: '照片', hasOriginal: true, status: '已核对' },
    { id: 'B-D3', name: '出院小结 · 复发住院', date: '2025-06-15', kind: 'PDF', hasOriginal: true,  status: '已核对' },
    { id: 'B-D4', name: '外送 ADAMTS13 报告', date: '2025-06-04', kind: 'PDF', hasOriginal: true, status: '待核对' },
    { id: 'B-D5', name: '首发急诊化验单', date: '2023-10-02', kind: '照片', hasOriginal: false, status: '原件未取得，据报告编号登记' }
  ];
  var notesB = [
    { id: 'B-N1', date: '2023-10-05', text: '住院第 4 天，第一次听说这个病的名字。', private: false },
    { id: 'B-N2', date: '2024-11-09', text: '凌晨发热 38.6，按医生留的联系方式打了电话，去了急诊。', private: false },
    { id: 'B-N3', date: '2025-06-04', text: '复发那周情绪很差，跟家里人也吵了架。', private: true },
    { id: 'B-N4', date: '2026-09-16', text: '最近一次复诊，医生说节奏不变，下次 12 月见。', private: false }
  ];
  var planB = {
    text: '「若出现新发瘀斑、牙龈出血不止、尿色加深或意识改变，立即拨打血液科值班电话并前往急诊。」——复诊记录 2026-03-17 医生原话（患者抄录）',
    source: '复诊记录 · 2026-03-17'
  };

  var sitesA = [
    { id: 'A-S1', name: '市一医院', department: '血液科', contact: '021-6324xxxx（急诊转血液科）', ord: 0 }
  ];
  var sitesB = [
    { id: 'B-S1', name: '省血液病中心', department: '血液科 · 门诊 3 楼', contact: '021-6xxx0xxx（护士站）', ord: 0 },
    { id: 'B-S2', name: '社区医院', department: '全科随访', contact: '', ord: 1 }
  ];

  DEMO.profiles.A = {
    id: 'A', name: '档案 A · 刚确诊', tag: '合成示例 · 记录少、多处未知',
    anchor: '2026-09-09', anchorLabel: '首发日期',
    episodes: epsA, labs: labsA, pe: peA, meds: medsA, docs: docsA, notes: notesA, sites: sitesA, plan: null,
    followUp: { text: '医生提到的随访安排：出院后先每月复查（医生口头），具体以医生安排为准', source: '出院随访单（未取得原件）' }
  };
  DEMO.profiles.B = {
    id: 'B', name: '档案 B · 多年随访', tag: '合成示例 · 三年三次发作、指标与置换记录齐全',
    anchor: '2023-10-02', anchorLabel: '首发日期',
    episodes: epsB, labs: labsB, pe: peB, meds: medsB, docs: docsB, notes: notesB, sites: sitesB, plan: planB,
    followUp: { text: '医生 2026-03-17 提到的节奏：前半年每 3 个月复诊一次，之后按医生安排（患者记录）', source: '复诊记录 · 2026-03-17' }
  };

  /* 唯一过滤口径：看板/导出/AI 三出口与「私密改写」同规则 */
  DEMO.privateCount = function (items) { return (items || []).filter(function (x) { return x.private; }).length; };
  DEMO.filterPublic = function (items) { return (items || []).filter(function (x) { return !x.private; }); };
  window.DEMO = DEMO;
})();
