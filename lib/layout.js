/**
 * 面板参数**唯一来源**。
 *
 * 为什么单列一个文件：customFrame 下"业务区宽度"与"AI 面板宽度"必须互补，
 * 且在 register() 时会被宿主校验（businessSide ∈ left|right，businessWidth ∈ 0.25–0.7，
 * 越界直接抛错 → 插件 apply 失败 → 宿主把插件卸掉）。家族统一 businessSide='left'。
 *
 * 客户端不许多写第二个 0.65 / 0.35——由 scripts/build-client.mjs 注入本文件的值。
 * 来源：starter prompts/ZERO-TO-DEV.md §2.2 + docs/20-AGENT-PANE-DESIGN.md。
 */

export const PANEL = Object.freeze({
  /* 开了 customFrame 的第一行必须是它：没有这句宿主会退回标准分栏（顶栏无 AI 按钮、分栏不可拖） */
  customFrame: true,
  /* 业务区在左、原生会话在最右（家族统一，不许各仓自定） */
  businessSide: 'left',
  /* 0.65 与 AGENT_PANE.default 0.35 互补；两者必须一起改 */
  businessWidth: 0.65,
  /* 可拖范围：25%–45%（宿主 register 硬上限 0.7，这里给保守上限） */
  businessWidthMin: 0.55,
  businessWidthMax: 0.7,
});

export const AGENT_PANE = Object.freeze({
  default: 0.35,
  min: 0.25,
  max: 0.45,
  /* 面板可收起可重开；隐藏不结束会话、不清空草稿 */
  hideable: true,
  resizable: true,
});

/** 宿主 register() 会校验的两条；本地先钉一次，避免装机才炸。 */
export function assertPanelConfig(panel = PANEL) {
  const problems = [];
  if (!['left', 'right'].includes(panel.businessSide)) problems.push(`businessSide 必须是 left|right，当前 ${panel.businessSide}`);
  if (!(panel.businessWidth >= 0.25 && panel.businessWidth <= 0.7)) problems.push(`businessWidth 必须在 0.25–0.7，当前 ${panel.businessWidth}`);
  if (Math.abs((panel.businessWidth + AGENT_PANE.default) - 1) > 1e-9) {
    problems.push(`businessWidth(${panel.businessWidth}) 与 AGENT_PANE.default(${AGENT_PANE.default}) 必须互补为 1`);
  }
  if (problems.length) throw new Error('面板配置不合法：' + problems.join('；'));
  return true;
}

/** 三档面板宽度（顶栏「窄/标准/宽」），百分比字符串供 CSS 变量用。 */
export const AGENT_SIZES = Object.freeze({ narrow: '24%', std: '32%', wide: '44%' });

/** 窄宽断点（30 号三档；数值按业务区自身宽度，不是窗口宽度）。 */
export const BREAKPOINTS = Object.freeze({ wide: 1180, mid: 900, narrow: 600 });
