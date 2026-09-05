export const EMP1_ANALYTICAL_LAYOUT_STYLES = `
.lafea-analytical-calc{display:grid;gap:12px;min-width:0}
.emp1-analytical-layout__lanes{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(290px,.8fr);gap:12px;align-items:start;min-width:0}
.emp1-analytical-layout__region{display:grid;gap:12px;align-content:start;min-width:0}
.emp1-analytical-layout__region>[data-emp1-layout-surface]{min-width:0}
.emp1-analytical-layout__region[data-emp1-layout-region="ACTIVE_TASK"]{grid-column:1}
.emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{grid-column:2;position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain;padding-right:2px}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]{width:100%;min-width:0;max-height:min(72vh,760px);overflow:auto;overscroll-behavior:contain}
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>.lafea-workbench__card,
.emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]>[data-emp1-layout-surface]{max-width:100%;overflow-x:auto}
.lafea-analytical-calc [data-emp1-layout-surface][hidden],
.lafea-analytical-calc .lafea-doc-table-section[hidden]{display:none!important}
.emp1-task-shell__evidence-tabs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:2px 0}
.emp1-task-shell__evidence-tabs [data-role="emp1-evidence-tab"]{min-height:34px;padding:6px 10px;border-radius:6px;white-space:nowrap}
.emp1-task-shell__evidence-tabs [data-role="emp1-evidence-tab"][aria-selected="true"]{font-weight:700;box-shadow:inset 0 -2px currentColor}
[data-role="emp1-workflow"]>[class=""]{min-width:0}
[data-role="emp1-professional-workflow-steps"]{display:flex;gap:6px;overflow-x:auto;list-style:none;margin:8px 0;padding:2px 0 5px;scrollbar-width:thin}
[data-role="emp1-professional-workflow-steps"]>li{flex:1 0 126px;min-width:0}
[data-role="emp1-professional-workflow-steps"] button{width:100%;min-height:38px;padding:6px 8px;line-height:1.2;text-align:left}
[data-role="emp1-professional-workflow-steps"] button[aria-current="step"]{font-weight:700;box-shadow:inset 0 -2px currentColor}
[data-role="emp1-workflow-compact-status"]{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:6px 0}
[data-role="emp1-workflow-details"]{margin-top:6px}
[data-role="emp1-workflow-details"]>summary{cursor:pointer;font-weight:600}
[data-role="emp1-workflow-details"][open]{max-height:min(62vh,660px);overflow:auto;overscroll-behavior:contain}
@media(max-width:1050px){
  .emp1-analytical-layout__lanes{grid-template-columns:minmax(0,1fr)}
  .emp1-analytical-layout__region[data-emp1-layout-region="ACTIVE_TASK"],
  .emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{grid-column:1}
  .emp1-analytical-layout__region[data-emp1-layout-region="BASIS_RAIL"]{position:static;max-height:min(54vh,560px);overflow:auto;padding-right:0}
  .emp1-analytical-layout__region[data-emp1-layout-region="EVIDENCE_WORKSPACE"]{max-height:min(68vh,620px)}
  [data-role="emp1-professional-workflow-steps"]>li{flex-basis:112px}
}
`;
