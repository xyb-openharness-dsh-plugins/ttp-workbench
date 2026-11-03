/* 小宁宝 TTP 工作台 · 疾病概要数据（36 号口径，v0.2 · assets/patterns/disease-primer.js 合同版）
 *
 * 段序固定：definition → evidence → landscape → trend。
 * 只属第②层解释，不生成第③层判断；固定出口口径必须含「不代表任何一项适合你」「需要问你的医生」。
 * 来源对象含 org/doc/version/url/kind/original/entry/page/note：kind 供 check-primer-links 断言，
 * original/entry 供 pattern 渲染「原件已取得 / 官方入口」。
 */
(function () {
  'use strict';
  var GUIDE = 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2/files/86个罕见病病种诊疗指南（2025年版）-20250709181724664.pdf';
  var GUIDE_SRC = { org: '国家卫生健康委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#79 血栓性血小板减少性紫癜', version: '2025 年版', url: GUIDE, kind: 'pdf', original: true, page: '印刷页 472 / PDF 第 476 页（原件已核）' };
  window.DISEASE_PRIMER = {
    name: '血栓性血小板减少性紫癜（TTP）疾病概要',
    brand: '小宁宝',
    updated: '2026-11-03',
    fixedExit: '本页按受累器官与病情轻重排列相关资料；不代表任何一项适合你，需要问你的医生。',
    sections: [
      {
        id: 'definition', title: '定义', order: 1,
        intro: 'TTP 是一种以微小血管血栓形成为特征的罕见病，已列入国家第二批罕见病目录（2023 年，86 种），序号 79。本页只做解释，不代表任何一项适合你，需要问你的医生。',
        points: [
          '常见分型：免疫性（iTTP）与遗传性（cTTP，Upshaw-Schulman 综合征）；分型边界以你的医生出具的病历为准。',
          '病程表达：发作—缓解。缓解期与发作期的划分来自医生记录（出院小结/门诊病历原文），本工作台不做任何判定。',
          '受累器官：微小血管血栓可影响血液、神经系统、肾脏、心脏等（据 2025 版指南临床表现节）；你的情况以医生评估为准。'
        ],
        table: {
          head: ['名称', '口径', '来源状态'],
          rows: [
            ['TTP 血栓性血小板减少性紫癜', '罕见病目录第二批 #79', { text: '官方公报 PDF', url: 'https://www.nhc.gov.cn/bgt/c100264/202311/1b4c8ebd22a54b2180d63e8edb3f73fb/files/1733795787562_85421.pdf' }],
            ['iTTP / cTTP 分型', '分型由医生依据检查结果判定', '指南原件已核；你的分型看医生病历']
          ]
        },
        sources: [
          GUIDE_SRC,
          { org: '国家卫生健康委', doc: '第二批罕见病目录公报', version: '2023', url: 'https://www.nhc.gov.cn/bgt/c100264/202311/1b4c8ebd22a54b2180d63e8edb3f73fb/files/1733795787562_85421.pdf', kind: 'pdf', original: true }
        ]
      },
      {
        id: 'evidence', title: '医学资料规范和指南情况', order: 2,
        intro: '国内现行依据是《86 个罕见病病种诊疗指南（2025 年版）》收载的本病诊疗要点（2025-07 发布，原件已核）。',
        points: [
          '化验参考区间：LDH 有卫生行业标准 WS/T 404.7-2015（原件已核，120–250 U/L）；血小板/胆红素/肌酐标准数值原件未取得【待核】；ADAMTS13 活性阈值无可靠中国官方数据【待核】。',
          '随访频次的规范出处：2022 版共识原文（据二次来源，原件未取得）为缓解第 1 年前 6 月每月 1 次、后 6 月每 3 月 1 次、第 2 年每 6 月 1 次；你的实际节奏以你的医生安排为准。',
          '未取得原件的一律不当作结论使用；本页所有「据二次来源」处均已标注。'
        ],
        table: {
          head: ['资料', '版本', '状态'],
          rows: [
            ['罕见病诊疗指南（含本病 #79）', '2025 年版', { text: '官方 PDF', url: GUIDE }],
            ['WS/T 404.7-2015 LDH 参考区间', '2015', { text: '官方 PDF', url: 'https://www.nhc.gov.cn/ewebeditor/uploadfile/2015/04/20150429115838426.pdf' }],
            ['中国 TTP 专家共识', '2022', '未取得原件，据二次来源']
          ]
        },
        sources: [
          { org: '国家卫生健康委', doc: 'WS/T 404.7-2015 临床常用检验项目参考区间', version: '2015', url: 'https://www.nhc.gov.cn/ewebeditor/uploadfile/2015/04/20150429115838426.pdf', kind: 'pdf', original: true },
          { org: '国家卫生健康委', doc: '罕见病诊疗指南发布页', url: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2.shtml', kind: 'fulltext', entry: true, note: '官方发布页；指南全文以页内 PDF 附件为准' }
        ]
      },
      {
        id: 'landscape', title: '治疗全景', order: 3,
        intro: '本段只列医生可能提到的方向名词，按受累器官与病情轻重排列；不代表任何一项适合你，需要问你的医生。',
        points: [
          '血浆置换（按次进行）——急性期的常规手段（据 2025 版指南）。',
          '糖皮质激素、免疫抑制治疗（如抗 CD20 单抗）——医生可能提到的方向（据指南；是否使用由医生决定）。',
          '针对 vWF 的治疗药物——境外获批后国内处于申报阶段（见发展趋势段）。',
          '遗传性 cTTP——以血浆输注为主（据 2025 版指南）。',
          '紧急口径：出现症状变化时的行动，只按你的医生已确认的行动计划原话执行；没有记录时本工作台不给出任何行动指引。'
        ],
        table: {
          head: ['方向名词', '说明口径', '来源状态'],
          rows: [
            ['血浆置换', '按次记录；本工作台不做效果评价', '指南原件已核'],
            ['糖皮质激素 / 抗 CD20', '仅方向名词；剂量与方案归医生', '指南原件已核'],
            ['抗 vWF 药物', '国内批准状态未核实', 'CDE 入口页（entry）']
          ]
        },
        sources: [GUIDE_SRC]
      },
      {
        id: 'trend', title: '发展趋势', order: 4,
        intro: '本段只记录可查证的事实（带日期或版本），不预测任何疗法对你的效果；新治疗的信息请与你的医生核对。',
        points: [
          '事实：血浆置换自上世纪 90 年代起成为本病的基础治疗（据 2025 版指南回顾）。',
          '事实：针对 vWF 的治疗药物在境外获批后，国内已有企业按优先审评程序申报（CDE 公示，2025；批准状态未核实）。',
          '事实：国际上存在长期登记与队列随访研究（据二次来源，未取得原件）。'
        ],
        groups: [
          { label: '登记与监测', points: ['国际登记研究与队列随访持续发表（据二次来源）。'] },
          { label: '药物申报动态', points: ['国内优先审评受理记录（CDE 入口页可查，2026-11-03 核验）。'] }
        ],
        table: {
          head: ['事实', '时间/版本', '来源状态'],
          rows: [
            ['血浆置换成为基础治疗', '据 2025 版指南回顾', '原件已核'],
            ['国内优先审评申报（抗 vWF 药物）', 'CDE 公示 2025', { text: 'CDE 入口页', url: 'https://www.cde.org.cn/main/xxgk/listpage/2f78f372d351c6851af7431c7710a731' }]
          ]
        },
        sources: [
          { org: '国家药监局药品审评中心（CDE）', doc: '公开受理与优先审评信息公示', url: 'https://www.cde.org.cn/main/xxgk/listpage/2f78f372d351c6851af7431c7710a731', kind: 'registry', entry: true, note: '受理号 JXSS2500053 于 2026-11-03 核验；批准状态未核实' },
          GUIDE_SRC
        ]
      }
    ]
  };
})();
