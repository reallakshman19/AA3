export const EMP1_ANALYTICAL_LAYOUT_STYLES = `
.lafea-analytical-calc{display:grid;gap:10px;min-width:0}
.lafea-analytical-calc[data-emp1-split-console]{grid-template-rows:auto auto minmax(0,1fr) auto;height:calc(100vh - 24px);max-height:900px;min-height:520px;overflow:hidden;overscroll-behavior:contain}
.emp1-analytical-layout__lanes{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.85fr);gap:10px;align-items:stretch;min-width:0;min-height:0;overflow:hidden}
.emp1-analytical-layout__region{display:grid;gap:10px;align-content:start;min-width:0}
.emp1-analytical-layout__region>[data-emp1-layout-surface]{min-width:0}
.emp1-analytical-layout__region[data-emp1-layout-region="ACTIVE_TASK"]{grid-column:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:2px}
.emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{grid-column:2;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:2px}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]{width:100%;min-width:0;max-height:min(42vh,440px);overflow:auto;overscroll-behavior:contain}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"][data-emp1-evidence-open="false"]{overflow:hidden}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>.lafea-workbench__card,
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>[data-emp1-layout-surface]{max-width:100%;overflow-x:auto}
.lafea-analytical-calc [data-emp1-layout-surface][hidden],
.lafea-analytical-calc .lafea-doc-table-section[hidden]{display:none!important}
.emp1-split-console__mode-tabs{display:none;gap:6px;align-items:center;min-width:0}
.emp1-split-console__mode-tabs [data-role="emp1-console-mode-tab"],
.emp1-split-console__inspector-tabs [data-role="emp1-inspector-tab"],
.emp1-task-shell__evidence-tabs [data-role="emp1-evidence-tab"]{min-height:34px;padding:6px 10px;border-radius:6px;white-space:nowrap}
.emp1-split-console__mode-tabs [aria-selected="true"],
.emp1-split-console__inspector-tabs [aria-selected="true"],
.emp1-task-shell__evidence-tabs [aria-selected="true"]{font-weight:700;box-shadow:inset 0 -2px currentColor}
.emp1-split-console__inspector-tabs{display:flex;gap:6px;overflow-x:auto;align-items:center;position:sticky;top:0;z-index:1;padding:2px 0 4px;scrollbar-width:thin}
.emp1-split-console__evidence-toggle{justify-self:start;min-height:34px;padding:6px 10px;font-weight:700}
.emp1-task-shell__evidence-tabs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:2px 0}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"][data-emp1-evidence-open="false"]>.emp1-task-shell__evidence-tabs,
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"][data-emp1-evidence-open="false"]>[data-emp1-layout-surface]{display:none!important}
[data-role="emp1-c-route-capability-tabs"]{display:flex;gap:6px;overflow-x:auto;align-items:center;padding:2px 0 4px;scrollbar-width:thin}
[data-role="emp1-c-route-capability-tab"]{min-height:34px;padding:6px 10px;white-space:nowrap}
[data-role="emp1-c-route-capability-tab"][aria-selected="true"]{font-weight:700;box-shadow:inset 0 -2px currentColor}
[data-role="emp1-c-route-capability-panel"][hidden]{display:none!important}
[data-role="emp1-c-route-limitations"],
[data-role="emp1-c-route-detail"]{margin-top:6px}
[data-role="emp1-workflow"]>[class=""]{min-width:0}
[data-role="emp1-professional-workflow-steps"]{display:flex;gap:6px;overflow-x:auto;list-style:none;margin:6px 0;padding:2px 0 4px;scrollbar-width:thin}
[data-role="emp1-professional-workflow-steps"]>li{flex:1 0 126px;min-width:0}
[data-role="emp1-professional-workflow-steps"] button{width:100%;min-height:36px;padding:5px 8px;line-height:1.2;text-align:left}
[data-role="emp1-professional-workflow-steps"] button[aria-current="step"]{font-weight:700;box-shadow:inset 0 -2px currentColor}
[data-role="emp1-workflow-compact-status"]{display:flex;flex-wrap:wrap;gap:5px 12px;align-items:center;margin:4px 0}
[data-role="emp1-workflow-details"]{margin-top:4px}
[data-role="emp1-workflow-details"]>summary{cursor:pointer;font-weight:600}
[data-role="emp1-workflow-details"][open]{max-height:min(48vh,480px);overflow:auto;overscroll-behavior:contain}
@media(max-width:1050px){
  .lafea-analytical-calc[data-emp1-split-console]{grid-template-rows:auto auto minmax(0,1fr);height:calc(100vh - 16px);max-height:none;min-height:480px}
  .emp1-split-console__mode-tabs{display:flex;overflow-x:auto;scrollbar-width:thin}
  .emp1-analytical-layout__lanes{grid-template-columns:minmax(0,1fr);min-height:0}
  .emp1-analytical-layout__region[data-emp1-layout-region="ACTIVE_TASK"],
  .emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{grid-column:1;min-height:0;height:100%;overflow:auto;padding-right:0}
  .lafea-analytical-calc[data-emp1-console-mode="WORK"] .emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{display:none}
  .lafea-analytical-calc[data-emp1-console-mode="BASIS"] .emp1-analytical-layout__region[data-emp1-layout-region="ACTIVE_TASK"]{display:none}
  .lafea-analytical-calc[data-emp1-console-mode="WORK"] .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"],
  .lafea-analytical-calc[data-emp1-console-mode="BASIS"] .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]{display:none}
  .lafea-analytical-calc[data-emp1-console-mode="EVIDENCE"] .emp1-analytical-layout__lanes{display:none}
  .lafea-analytical-calc[data-emp1-console-mode="EVIDENCE"] .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]{display:grid;max-height:none;height:100%;overflow:auto}
  .lafea-analytical-calc[data-emp1-console-mode="EVIDENCE"] .emp1-split-console__evidence-toggle{display:none}
  .lafea-analytical-calc[data-emp1-console-mode="EVIDENCE"] .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>.emp1-task-shell__evidence-tabs{display:flex!important}
  .lafea-analytical-calc[data-emp1-console-mode="EVIDENCE"] .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>[data-emp1-layout-surface]:not([hidden]){display:block!important}
  [data-role="emp1-professional-workflow-steps"]>li{flex-basis:112px}
}
`;
