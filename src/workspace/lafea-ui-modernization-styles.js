/** Presentation-only styles for the modern LAFEA workspace hierarchy. */
export const LAFEA_UI_MODERNIZATION_STYLES = `
.lafea-ui-icon{
  width:16px;
  height:16px;
  flex:0 0 auto;
  color:#9fb8cf;
}
.lafea-workbench{
  gap:10px!important;
  padding:14px 16px 20px!important;
}
.lafea-workbench__header{
  padding:2px 2px 12px;
  border-bottom:1px solid #223247;
}
.lafea-workbench__header h1{
  margin:3px 0 4px!important;
  font-size:22px;
  letter-spacing:-.01em;
}
.lafea-workbench__status{
  border-radius:5px!important;
  padding:5px 8px!important;
  font-size:11px;
  letter-spacing:.025em;
}
[data-lafea-slot="navigation"]{
  min-width:0;
  overflow:hidden;
}
.lafea-workbench__stages{
  display:flex!important;
  flex-wrap:nowrap!important;
  gap:4px!important;
  min-width:0;
  overflow-x:auto;
  padding:2px 0 4px;
  scrollbar-width:thin;
}
.lafea-workbench__stages button{
  flex:0 0 auto;
  min-height:32px;
  padding:6px 9px!important;
  border-radius:4px!important;
  background:#091322!important;
  border-color:#26364d!important;
  color:#9fb0c5!important;
  font-size:11px;
  font-weight:650;
}
.lafea-workbench__stages button[aria-current="step"]{
  border-color:#0284c7!important;
  background:#0b1d2f!important;
  color:#e0f2fe!important;
  box-shadow:inset 0 -2px 0 #38bdf8;
}
[data-lafea-slot="toolbar"]{
  padding:7px 8px;
  border:1px solid #223247;
  border-radius:6px;
  background:#07111c;
}
[data-lafea-slot="toolbar"] .lafea-workbench__toolbar{
  gap:6px!important;
}
[data-lafea-slot="toolbar"] button,
[data-lafea-slot="toolbar"] label,
[data-lafea-slot="toolbar"] input{
  font-size:11px;
}
.lafea-engineering-overview{
  gap:11px!important;
  padding:13px!important;
  border-color:#26384b!important;
  border-radius:8px!important;
  background:#0a1422!important;
  box-shadow:none!important;
}
.lafea-engineering-overview__heading h2{
  font-size:18px!important;
}
.lafea-engineering-overview__card{
  border-radius:6px!important;
  background:#08121f!important;
}
.lafea-guided-shell{
  grid-template-columns:minmax(0,1fr)!important;
  gap:12px!important;
}
.lafea-guided-shell__nav{
  position:sticky!important;
  top:0!important;
  z-index:8;
  max-height:none!important;
  overflow:visible!important;
  display:block!important;
  padding:8px 10px!important;
  border-color:#26364d!important;
  border-radius:8px!important;
  background:#081322!important;
}
.lafea-guided-workflow{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto;
  gap:6px 12px!important;
  align-items:start;
}
.lafea-guided-workflow>h2{display:none}
.lafea-guided-workflow__areas{
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:6px!important;
}
.lafea-guided-workflow__areas>li{min-width:0;align-content:start}
.lafea-guided-workflow__area{
  grid-template-columns:18px minmax(0,1fr) auto!important;
  min-height:40px;
  padding:7px 9px!important;
}
.lafea-guided-workflow__icon{
  width:15px;
  height:15px;
  color:#7dd3fc;
}
.lafea-guided-workflow__reasons{
  display:block!important;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.lafea-guided-workflow__technical{
  display:block!important;
}
.lafea-guided-workflow__technical>summary{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.lafea-guided-workflow__release{
  display:none!important;
}
.lafea-cae-workspace{
  grid-template-columns:minmax(0,1fr) minmax(340px,380px)!important;
  gap:14px!important;
}
.lafea-cae-workspace__viewport-card .lafea-workbench__svg{
  min-height:520px!important;
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
.lafea-numerical-verification{
  display:grid;
  gap:8px;
}
.lafea-numerical-verification__intro{
  margin:0;
  color:#9fb0c5;
  font-size:11px;
}
.lafea-numerical-verification__summary{
  display:grid;
  gap:7px;
}
.lafea-numerical-verification__summary>h3{
  margin:0;
  font-size:13px;
}
.lafea-numerical-verification__summary-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
  gap:6px;
}
.lafea-numerical-verification__summary-item{
  display:grid;
  gap:2px;
  padding:7px 8px;
  border:1px solid #26364d;
  border-radius:5px;
  background:#07111c;
}
.lafea-numerical-verification__summary-item>span{
  color:#9fb0c5;
  font-size:10px;
}
.lafea-numerical-verification__summary-item>strong{
  font-size:12px;
}
.lafea-numerical-verification__summary-item>strong[data-tone="positive"]{color:#86efac}
.lafea-numerical-verification__summary-item>strong[data-tone="warning"]{color:#fde68a}
.lafea-numerical-verification__summary-item>strong[data-tone="critical"]{color:#fca5a5}
.lafea-numerical-verification__evidence{
  border-top:1px solid #26364d;
  padding-top:7px;
}
.lafea-numerical-verification__evidence>summary{
  cursor:pointer;
  color:#9fb8cf;
  font-size:11px;
  font-weight:700;
}
.lafea-numerical-verification__evidence>section{
  margin-top:8px;
}
.lafea-cae-workspace__context{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:16px;
}
.lafea-engineering-evidence-drawer{
  border:1px solid rgba(148,163,184,.22);
  border-radius:8px;
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
@media (max-width:1100px){
  .lafea-cae-workspace{
    grid-template-columns:minmax(0,1fr)!important;
  }
  .lafea-cae-workspace__inspector{
    position:static!important;
    max-height:none!important;
    overflow:visible!important;
  }
}
@media (max-width:760px){
  .lafea-guided-workflow{
    grid-template-columns:minmax(0,1fr)!important;
  }
  .lafea-guided-workflow__areas{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
  .lafea-cae-workspace__viewport-card .lafea-workbench__svg{
    min-height:360px!important;
  }
}
@media (max-width:520px){
  .lafea-guided-workflow__areas{
    grid-template-columns:minmax(0,1fr);
  }
}
`;
