/** Presentation-only styles for the modern LAFEA workspace hierarchy. */
export const LAFEA_UI_MODERNIZATION_STYLES = `
.lafea-ui-icon{
  width:16px;
  height:16px;
  flex:0 0 auto;
  color:#9fb8cf;
}
.lafea-guided-workflow__area{
  grid-template-columns:18px minmax(0,1fr) auto!important;
}
.lafea-guided-workflow__icon{
  width:15px;
  height:15px;
  color:#7dd3fc;
}
.lafea-button--primary{
  min-height:34px!important;
  border-color:#0284c7!important;
  background:#075985!important;
  color:#e0f2fe!important;
  font-weight:750!important;
}
.lafea-button--primary:hover:not(:disabled){
  border-color:#38bdf8!important;
  background:#0c4a6e!important;
}
.lafea-button--primary:focus-visible{
  outline:2px solid #7dd3fc;
  outline-offset:2px;
}
.lafea-mesh-workspace-summary__state[data-tone="positive"]{color:#86efac}
.lafea-mesh-workspace-summary__state[data-tone="warning"]{color:#fde68a}
.lafea-mesh-workspace-summary__state[data-tone="critical"]{color:#fca5a5}
.lafea-discretization__reason-list{
  display:grid;
  gap:5px;
  margin:0 0 8px;
  padding-left:18px;
  color:#fbbf24;
  font-size:11px;
}
.lafea-discretization__advanced-evidence{
  border-top:1px solid #26364d;
  padding-top:8px;
}
.lafea-discretization__advanced-evidence>summary{
  cursor:pointer;
  color:#9fb8cf;
  font-size:11px;
  font-weight:700;
}
.lafea-discretization__advanced-evidence-body{
  display:grid;
  gap:8px;
  margin-top:8px;
}
.lafea-discretization__advanced-evidence-body>.lafea-discretization__section{
  margin:0;
  background:#07111c;
}
.lafea-cae-workspace__context{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:16px;
}
.lafea-engineering-evidence-drawer{
  border:1px solid rgba(148,163,184,.22);
  border-radius:12px;
  background:rgba(15,23,42,.58);
  overflow:hidden;
}
.lafea-engineering-evidence-drawer__summary{
  display:grid;
  grid-template-columns:18px minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  padding:14px 16px;
  cursor:pointer;
  list-style:none;
}
.lafea-engineering-evidence-drawer__summary::-webkit-details-marker{display:none}
.lafea-engineering-evidence-drawer__icon{
  width:16px;
  height:16px;
  color:#7dd3fc;
}
.lafea-engineering-evidence-drawer__heading{
  display:grid;
  gap:2px;
  min-width:0;
}
.lafea-engineering-evidence-drawer__heading strong{font-size:14px}
.lafea-engineering-evidence-drawer__heading span{
  color:#94a3b8;
  font-size:12px;
  line-height:1.35;
}
.lafea-engineering-evidence-drawer__count{
  flex:0 0 auto;
  color:#cbd5e1;
  font-size:12px;
  font-variant-numeric:tabular-nums;
}
.lafea-engineering-evidence-drawer[open]>.lafea-engineering-evidence-drawer__summary{
  border-bottom:1px solid rgba(148,163,184,.18);
}
.lafea-engineering-evidence-drawer__body{
  display:grid;
  gap:12px;
  padding:12px;
}
.lafea-engineering-evidence-drawer__body>.lafea-workbench__card{
  margin:0;
  box-shadow:none;
}
.lafea-next-action-banner[data-intent="model"]{border-left:3px solid #64748b!important}
.lafea-next-action-banner[data-intent="mesh"]{border-left:3px solid #0284c7!important}
.lafea-next-action-banner[data-intent="solve"][data-run-eligible="false"]{border-left:3px solid #d97706!important}
.lafea-next-action-banner[data-intent="solve"][data-run-eligible="true"]{border-left:3px solid #15803d!important}
.lafea-next-action-banner[data-intent="results"]{border-left:3px solid #15803d!important}
.lafea-diagnostics__list{
  display:grid;
  gap:7px;
  margin:8px 0 0;
  padding:0;
  list-style:none;
}
.lafea-diagnostics__item{
  display:grid;
  grid-template-columns:auto minmax(0,1fr);
  gap:4px 8px;
  padding:8px 9px;
  border-left:3px solid #475569;
  background:#0b1628;
}
.lafea-diagnostics__item[data-severity="WARNING"],
.lafea-diagnostics__item[data-severity="WARN"]{border-left-color:#d97706}
.lafea-diagnostics__item[data-severity="ERROR"],
.lafea-diagnostics__item[data-severity="CRITICAL"]{border-left-color:#b91c1c}
.lafea-diagnostics__item>strong{font-size:11px}
.lafea-diagnostics__item>span{font-size:11px;line-height:1.4;color:#cbd5e1}
.lafea-diagnostics__item>code{
  grid-column:2;
  color:#7f91a6;
  font-size:10px;
  overflow-wrap:anywhere;
}
@media (min-width:1180px){
  .lafea-cae-workspace__context{
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  }
  .lafea-cae-workspace__context>[data-guided-target="results"],
  .lafea-cae-workspace__context>.lafea-engineering-evidence-drawer{
    grid-column:1/-1;
  }
}
`;
