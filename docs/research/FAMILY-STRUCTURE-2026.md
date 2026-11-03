# 家族结构对照实测（2026-11-03）

由只读子代理从三仓 prototypes 提取（file:line 证据见子代理对话记录，本文存结论）：

## 一级导航（key+文案，逐字）
见 DIFF-MATRIX「M1 实测结果」。

## 结构元素取用清单（M2 对照）

| 元素 | 来源 | 取用 |
| --- | --- | --- |
| hero 文案模板「{患者名}，这次想先看什么」 | cervical app.js L492 | 仿结构改 TTP 文案 |
| 疾病概要入口：顶栏 ?（dp-trigger/primer-btn） | 三家一致 | 取用，唯一入口 |
| 折叠卡 details.phase-fold + fold() helper | aml L943 | 取用（发作分组） |
| 泳道 treatmentBands()/bandsFor() kind 体系 | cervical cycle/mark；aml cycle/feverb/tx | 换 kind：flare（发作带）/ pe（置换节点）/ lab（化验节点） |
| 档案切换 profile-btn → modal 列表 | 三家一致 | 取用，2 档案 A/B |
| top-actions 顺序：资料目录→设置→大字→AI→版本→? | cervical/aml | 取用（按 40 号取 aml 顺序） |
| SUBPAGES 二级页签 data-sub 机制 | 三家一致 | 取用 |
| 空态下一步按钮 | breast p2「资料极少」画像 | 取用（A 档案多处空态） |

## 不取用（肿瘤/血液肿瘤语义）
分期档案、治疗线序、MRD 双口径、移植 Day+N、粒缺发热轨道、肿瘤标志物目录、试验匹配指数。
