/** Isolated styles for the guided workflow, discretization, and retained mesh overlay. */
export const LAFEA_GUIDED_WORKBENCH_STYLES = `
.lafea-guided-shell{display:grid;grid-template-columns:minmax(200px,236px) minmax(0,1fr);gap:14px;align-items:start}
.lafea-guided-shell__nav{position:sticky;top:12px;display:grid;gap:8px;padding:12px;border:1px solid #334155;border-radius:8px;background:#0b1628;max-height:calc(100vh - 24px);overflow:auto}
.lafea-guided-shell__main{display:block;min-width:0}
.lafea-cae-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,340px);gap:12px;align-items:start;min-width:0}
.lafea-cae-workspace__viewport{min-width:0}.lafea-cae-workspace__viewport-card{min-width:0}
.lafea-cae-workspace__viewport-card .lafea-workbench__svg{min-height:440px}
.lafea-cae-workspace__inspector{position:sticky;top:12px;display:grid;gap:12px;align-content:start;max-height:calc(100vh - 24px);overflow:auto;min-width:0}
.lafea-cae-workspace__inspector-card{min-width:0}
.lafea-cae-workspace__context{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;min-width:0}
.lafea-cae-workspace__context>[data-guided-target="results"],.lafea-cae-workspace__context>[data-guided-target="lineage"]{grid-column:1/-1}
.lafea-guided-workflow{display:grid;gap:6px}.lafea-guided-workflow__step{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:start;text-align:left;width:100%}
.lafea-guided-workflow__step[data-status="COMPLETE"]{border-color:#15803d}.lafea-guided-workflow__step[data-status="WARNING"]{border-color:#d97706}.lafea-guided-workflow__step[data-status="BLOCKED"]{border-color:#b91c1c}.lafea-guided-workflow__reasons{grid-column:2/-1;margin:0;color:#94a3b8;font-size:11px}
.lafea-workbench__custody{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.lafea-workbench__custody span{padding:4px 7px;border:1px solid #334155;border-radius:999px;font-size:11px;background:#0b1628}
.lafea-discretization{display:grid;gap:12px}.lafea-discretization__section{padding:10px;border:1px solid #26364d;border-radius:6px;background:#091322}.lafea-discretization__section h3{margin:0 0 8px;color:#38bdf8;font-size:13px}
.lafea-discretization__modes,.lafea-discretization__actions,.lafea-discretization__facts{display:grid;gap:7px}.lafea-discretization__mode{display:flex;justify-content:space-between;gap:8px;align-items:center}.lafea-discretization__mode code{font-size:11px}.lafea-discretization__reason{color:#fbbf24;font-size:11px}.lafea-discretization__facts{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.lafea-discretization__fact{padding:6px;border-left:3px solid #334155;background:#0b1628;overflow-wrap:anywhere}
.lafea-discretization__state{font-weight:800}.lafea-discretization__state[data-state="CURRENT_PASS"]{color:#86efac}.lafea-discretization__state[data-state="CURRENT_WARNING"]{color:#fde68a}.lafea-discretization__state[data-state="CURRENT_BLOCK"],.lafea-discretization__state[data-state="INVALID"]{color:#fca5a5}.lafea-discretization__state[data-state="STALE"]{color:#fdba74}
.lafea-discretization__finding-list{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none}.lafea-discretization__finding-list button{padding:5px 7px;font-size:11px}
.lafea-discretization__generation-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.lafea-discretization__generation-controls label{display:grid;gap:4px;font-size:11px;color:#94a3b8}.lafea-discretization__generation-controls input{width:120px}
.lafea-discretization__profile-binding{display:grid;gap:9px}.lafea-discretization__profile-binding>label{display:grid;gap:5px}.lafea-discretization__profile-binding input,.lafea-discretization__profile-binding select{width:100%;box-sizing:border-box}
.lafea-discretization__technical-evidence{margin-bottom:8px}.lafea-discretization__technical-evidence summary{cursor:pointer;color:#9fb8cf;font-size:11px;font-weight:700}
.lafea-discretization__plan{margin-top:9px;padding:8px;border-left:3px solid #38bdf8;background:#0b1628}.lafea-discretization__plan[data-disposition="BLOCK"]{border-color:#b91c1c}.lafea-discretization__plan[data-strategy="CONSTRAINED_DELAUNAY"]{border-color:#d97706}
.lafea-discretization__disclosure{margin:8px 0 0;color:#fbbf24;font-size:11px}.lafea-discretization__status{margin:8px 0 0;color:#cbd5e1;font-size:12px}
.lafea-discretization__section[data-generation-available="false"] .lafea-discretization__status{color:#fbbf24}
.lafea-guided-summary{display:grid;gap:6px}.lafea-guided-summary__row{padding:7px;border-left:3px solid #334155;background:#0b1628}.lafea-guided-summary__row[data-status="BLOCKED"]{border-color:#b91c1c}.lafea-guided-summary__row[data-status="WARNING"]{border-color:#d97706}.lafea-guided-summary__row[data-status="COMPLETE"]{border-color:#15803d}
.lafea-retained-mesh__element{fill:rgba(56,189,248,.04);stroke:#38bdf8;stroke-width:1.25;vector-effect:non-scaling-stroke;pointer-events:stroke}.lafea-retained-mesh__element--warning{stroke:#f59e0b;stroke-width:2}.lafea-retained-mesh__element--block{stroke:#ef4444;stroke-width:2.5}.lafea-retained-mesh__element--focused{stroke:#f8fafc;stroke-width:4;filter:drop-shadow(0 0 5px #38bdf8)}
@media(max-width:1360px){.lafea-guided-shell{grid-template-columns:minmax(190px,220px) minmax(0,1fr)}.lafea-cae-workspace{grid-template-columns:minmax(0,1fr) minmax(280px,310px)}.lafea-cae-workspace__context{grid-template-columns:1fr}}
@media(max-width:1100px){.lafea-cae-workspace{grid-template-columns:1fr}.lafea-cae-workspace__inspector{position:static;max-height:none;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}}
@media(max-width:900px){.lafea-guided-shell{grid-template-columns:1fr}.lafea-guided-shell__nav{position:static;max-height:none}.lafea-cae-workspace__inspector{grid-template-columns:1fr}.lafea-cae-workspace__viewport-card .lafea-workbench__svg{min-height:360px}}
`;
