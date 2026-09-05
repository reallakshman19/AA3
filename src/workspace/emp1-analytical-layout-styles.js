export const EMP1_ANALYTICAL_LAYOUT_STYLES = `
.lafea-analytical-calc{display:grid;gap:14px;min-width:0}
.emp1-analytical-layout__lanes{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,1fr);gap:14px;align-items:start;min-width:0}
.emp1-analytical-layout__region{display:grid;gap:14px;align-content:start;min-width:0}
.emp1-analytical-layout__region>[data-emp1-layout-surface]{min-width:0}
.emp1-analytical-layout__region[data-emp1-layout-region="PRIMARY_WORK"]{grid-column:1}
.emp1-analytical-layout__region[data-emp1-layout-region="ENGINEERING_BASIS"]{grid-column:2}
.emp1-analytical-layout__region[data-emp1-layout-region="FULL_WIDTH_DETAIL"]{width:100%;min-width:0}
.emp1-analytical-layout__region[data-emp1-layout-region="FULL_WIDTH_DETAIL"]>.lafea-workbench__card,
.emp1-analytical-layout__region[data-emp1-layout-region="FULL_WIDTH_DETAIL"]>[data-emp1-layout-surface]{max-width:100%;overflow-x:auto}
@media(max-width:1050px){
  .emp1-analytical-layout__lanes{grid-template-columns:minmax(0,1fr)}
  .emp1-analytical-layout__region[data-emp1-layout-region="PRIMARY_WORK"],
  .emp1-analytical-layout__region[data-emp1-layout-region="ENGINEERING_BASIS"]{grid-column:1}
}
`;
