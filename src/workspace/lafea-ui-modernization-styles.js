/** Presentation-only styles for the modern LAFEA workspace hierarchy. */
export const LAFEA_UI_MODERNIZATION_STYLES = `
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
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:14px 16px;
  cursor:pointer;
  list-style:none;
}
.lafea-engineering-evidence-drawer__summary::-webkit-details-marker{display:none}
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
