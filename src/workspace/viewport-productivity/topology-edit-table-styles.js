let installed = false;

export function ensureTopologyEditTableStyles(documentRef) {
  if (!documentRef || installed || documentRef.getElementById('topology-edit-table-styles')) return;
  const style = documentRef.createElement('style');
  style.id = 'topology-edit-table-styles';
  style.textContent = `
    .topology-edit-table-window { position:absolute; top:58px; right:14px; z-index:90; width:min(1120px,calc(100% - 28px)); height:min(720px,calc(100% - 82px)); min-width:420px; min-height:42px; max-width:calc(100% - 8px); max-height:calc(100% - 54px); overflow:hidden; resize:both; border:1px solid #315070; border-radius:8px; background:#06101c; box-shadow:0 18px 52px rgba(0,0,0,.58); color:#cbd5e1; box-sizing:border-box; }
    .topology-edit-table-window[open] { display:grid; grid-template-rows:36px minmax(0,1fr); }
    .topology-edit-table-window:not([open]) { top:auto; right:32%; bottom:0; width:220px; height:32px; min-width:0; min-height:32px; resize:none; }
    .topology-edit-table-window__titlebar { display:flex; align-items:center; gap:.55rem; min-width:0; height:36px; padding:0 8px; border-bottom:1px solid #1e344c; background:linear-gradient(180deg,#10233a,#0a1626); cursor:move; user-select:none; list-style:none; box-sizing:border-box; }
    .topology-edit-table-window__titlebar::-webkit-details-marker { display:none; }
    .topology-edit-table-window__titlebar::after { content:'▾'; margin-left:auto; color:#7dd3fc; font-size:11px; }
    .topology-edit-table-window:not([open]) .topology-edit-table-window__titlebar::after { content:'▸'; }
    .topology-edit-table-window__titlebar strong { flex:0 0 auto; color:#f8fafc; font-size:11px; letter-spacing:.01em; }
    .topology-edit-table-window__titlebar span { min-width:0; overflow:hidden; color:#94a3b8; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    .topology-edit-table-window[data-table-window-dragging="true"] .topology-edit-table-window__titlebar { cursor:grabbing; }
    .topology-edit-table-window__body { display:grid; grid-template-rows:minmax(0,1fr); min-width:0; min-height:0; overflow:hidden; padding:5px; background:#07101c; box-sizing:border-box; }
    .topology-edit-table-window__body > [data-role="topology-edit-table"] { min-width:0; min-height:0; height:100%; }
    .topology-edit-table { display:grid; gap:.4rem; min-width:0; min-height:0; height:100%; overflow:auto; scrollbar-gutter:stable; font-size:11px; line-height:1.25; color:#cbd5e1; }
    .topology-edit-table--populated { grid-template-rows:auto minmax(0,1fr) auto; overflow:hidden; }
    .topology-edit-table--empty-model { align-content:start; height:auto; min-height:100%; }
    .topology-edit-table__header { display:flex; align-items:end; justify-content:space-between; gap:.55rem; }
    .topology-edit-table__header > div { display:flex; flex-direction:column; gap:.1rem; min-width:0; }
    .topology-edit-table__header > div span { overflow:hidden; color:#94a3b8; text-overflow:ellipsis; white-space:nowrap; }
    .topology-edit-table__header label { display:grid; gap:.15rem; min-width:12rem; }
    .topology-edit-table input, .topology-edit-table select, .topology-edit-table textarea, .topology-edit-table button { font:inherit; }
    .topology-edit-table input, .topology-edit-table select, .topology-edit-table textarea { min-height:24px; min-width:0; width:100%; box-sizing:border-box; border:1px solid #315070; border-radius:.25rem; background:#07101c; color:#e2e8f0; padding:2px 5px; }
    .topology-edit-table textarea { resize:vertical; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; line-height:1.3; }
    .topology-edit-table button { min-height:26px; border:1px solid #315070; border-radius:.25rem; background:#0a1322; color:#cbd5e1; padding:2px 7px; cursor:pointer; }
    .topology-edit-table button:hover:not(:disabled), .topology-edit-table button:focus-visible { border-color:#60a5fa; background:#142239; color:#f8fafc; outline:none; }
    .topology-edit-table button:disabled { opacity:.45; cursor:not-allowed; }
    .topology-edit-table__scroll { min-width:0; min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable both-edges; border:1px solid #1e344c; border-radius:.3rem; background:#050c16; }
    .topology-edit-table__lower { display:grid; gap:.4rem; min-width:0; min-height:0; max-height:min(210px,38%); overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; padding-right:2px; }
    .topology-edit-table table { width:max-content; min-width:100%; border-collapse:separate; border-spacing:0; font-variant-numeric:tabular-nums; }
    .topology-edit-table th, .topology-edit-table td { padding:3px 5px; border-bottom:1px solid #14273c; white-space:nowrap; text-align:left; }
    .topology-edit-table tbody tr:hover { background:#0b1a2d; }
    .topology-edit-table tbody tr[data-selected="true"] { background:#0b2941; box-shadow:inset 3px 0 #38bdf8; }
    .topology-edit-table thead { position:sticky; top:0; z-index:4; background:#0c192b; }
    .topology-edit-table th button { min-height:20px; border:0; background:transparent; padding:0; font-weight:700; }
    .topology-edit-table [data-table-frozen] { position:sticky; box-sizing:border-box; }
    .topology-edit-table [data-table-frozen="select"] { left:0; width:58px; min-width:58px; max-width:58px; }
    .topology-edit-table [data-table-frozen="tag"] { left:58px; width:132px; min-width:132px; max-width:132px; overflow:hidden; text-overflow:ellipsis; }
    .topology-edit-table [data-table-frozen="elementType"] { left:190px; width:78px; min-width:78px; max-width:78px; overflow:hidden; text-overflow:ellipsis; }
    .topology-edit-table [data-table-frozen="connectFrom"] { left:268px; width:128px; min-width:128px; max-width:128px; overflow:hidden; text-overflow:ellipsis; }
    .topology-edit-table [data-table-frozen="connectTo"] { left:396px; width:128px; min-width:128px; max-width:128px; overflow:hidden; text-overflow:ellipsis; }
    .topology-edit-table thead [data-table-frozen] { z-index:6; background:#0c192b; }
    .topology-edit-table tbody [data-table-frozen] { z-index:2; background:#050c16; }
    .topology-edit-table tbody tr:hover [data-table-frozen] { background:#0b1a2d; }
    .topology-edit-table tbody tr[data-selected="true"] [data-table-frozen] { background:#0b2941; }
    .topology-edit-table tr[data-staged="true"] { outline:1px solid #38bdf8; outline-offset:-1px; }
    .topology-edit-table [data-table-select] { min-height:20px; border:0; background:transparent; padding:0 2px; color:#7dd3fc; }
    .topology-edit-table__editor, .topology-edit-table__staged, .topology-edit-table__all-properties { display:grid; gap:.4rem; padding:.45rem; border:1px solid #1e344c; border-radius:.3rem; background:#081321; }
    .topology-edit-table__identity { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; min-width:0; }
    .topology-edit-table__identity code { max-width:100%; overflow:hidden; color:#7dd3fc; opacity:.9; text-overflow:ellipsis; }
    .topology-edit-table__editor-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.4rem; align-items:end; }
    .topology-edit-table__editor-grid label { display:grid; gap:.15rem; min-width:0; }
    .topology-edit-table__editor-grid .topology-edit-table__wide { grid-column:1 / -1; }
    .topology-edit-table__editor-grid > button { grid-column:1 / -1; width:100%; }
    .topology-edit-table__first-pipe { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.5rem; }
    .topology-edit-table__first-pipe fieldset { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.3rem; min-width:0; margin:0; padding:.45rem; border:1px solid #1e344c; border-radius:.3rem; }
    .topology-edit-table__first-pipe legend { padding:0 .2rem; color:#bae6fd; font-weight:700; }
    .topology-edit-table__first-pipe label { display:grid; gap:.15rem; min-width:0; }
    .topology-edit-table__first-pipe > .topology-edit-table__wide { grid-column:1 / -1; }
    .topology-edit-table__custody { display:flex; gap:.55rem; flex-wrap:wrap; color:#94a3b8; font-size:10px; }
    .topology-edit-table__staged ul, .topology-edit-table__conflict ul { margin:.15rem 0 0; padding-left:1rem; }
    .topology-edit-table__conflict { padding:.4rem; border:1px solid #f59e0b; border-radius:.3rem; color:#fde68a; }
    .topology-edit-table__workflow { display:flex; gap:.3rem; flex-wrap:wrap; position:sticky; bottom:0; z-index:5; padding:.3rem 0; background:linear-gradient(180deg,rgba(7,16,28,.78),#07101c 35%); }
    .topology-edit-table__workflow [data-table-action="apply"] { border-color:#047857; background:#064e3b; color:#d1fae5; }
    .topology-edit-table__status, .topology-edit-table__notice, .topology-edit-table__empty { color:#94a3b8; }
    .topology-edit-table__all-properties > header { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
    .topology-edit-table__all-properties > header span { color:#94a3b8; font-size:10px; }
    .topology-edit-table__property-group { border:1px solid #1a3047; border-radius:.3rem; background:#060f1a; overflow:hidden; }
    .topology-edit-table__property-group > summary { padding:.3rem .4rem; cursor:pointer; color:#bae6fd; font-weight:700; background:#0a1727; }
    .topology-edit-table__property-scroll { max-height:14rem; overflow:auto; scrollbar-gutter:stable; }
    .topology-edit-table__property-group table { width:100%; min-width:560px; table-layout:auto; }
    .topology-edit-table__property-group tbody th { color:#bae6fd; font-weight:600; }
    .topology-edit-table__property-group td:nth-child(2) { max-width:44rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .topology-edit-table__property-group td:nth-child(3) { color:#94a3b8; }
    @media (max-width:900px) { .topology-edit-table-window { left:6px !important; right:6px !important; width:auto; max-width:none; } .topology-edit-table__lower { max-height:min(180px,42%); } }
    @media (max-width:760px) { .topology-edit-table__header { align-items:stretch; flex-direction:column; } .topology-edit-table__header label { min-width:0; } .topology-edit-table__editor-grid, .topology-edit-table__first-pipe { grid-template-columns:1fr; } .topology-edit-table__editor-grid .topology-edit-table__wide, .topology-edit-table__editor-grid > button, .topology-edit-table__first-pipe > .topology-edit-table__wide { grid-column:1; } }
  `;
  documentRef.head?.append(style);
  installed = true;
}
