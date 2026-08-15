/**
 * Isolated styling for the CAESAR ACCDB friction-benchmark panel.
 *
 * The friction (diagnostic) section is deliberately styled differently from
 * the normal-reactions section - amber/muted rather than green/red - so it
 * never reads as a validated pass/fail table.
 *
 * @returns {string} CSS text consumed by the workbench controller.
 */
export function caesarAccdbBenchmarkStyles() {
  return `
.caesar-accdb-benchmark{display:grid;gap:12px;padding:14px;border:1px solid var(--workspace-border,#334155);border-radius:8px;background:var(--workspace-panel,#101b2e);color:var(--workspace-text,#e5edf8)}
.caesar-accdb-benchmark__header h2{margin:4px 0;font-size:16px}.caesar-accdb-benchmark__header p{margin:0;max-width:64ch;color:var(--workspace-muted,#94a3b8);font-size:12px}
.caesar-accdb-benchmark__controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.caesar-accdb-benchmark button{border:1px solid #334155;border-radius:5px;padding:7px 12px;background:#0b1628;color:inherit;font-weight:600}.caesar-accdb-benchmark button[aria-pressed="true"]{background:#1e293b;border-color:#38bdf8;color:#38bdf8}.caesar-accdb-benchmark button:disabled{opacity:.85;cursor:default}
.caesar-accdb-benchmark__custody{margin:0;padding:8px 10px;border-left:3px solid #38bdf8;background:#0b1628;font-size:12px;color:#cbd5e1}
.caesar-accdb-benchmark__section{display:grid;gap:6px}.caesar-accdb-benchmark__section h3{margin:4px 0;font-size:14px}
.caesar-accdb-benchmark__section-note{margin:0;font-size:12px;color:var(--workspace-muted,#94a3b8)}
.caesar-accdb-benchmark__section--diagnostic{padding:8px;border:1px dashed #b45309;border-radius:6px;background:#1c1408}
.caesar-accdb-benchmark__section-note--warning{color:#fcd34d;font-weight:600}
.caesar-accdb-benchmark__scroll{max-height:340px;overflow:auto}.caesar-accdb-benchmark table{width:100%;border-collapse:collapse;font-size:12px}.caesar-accdb-benchmark th,.caesar-accdb-benchmark td{padding:5px 7px;border:1px solid #334155;text-align:left;vertical-align:top}.caesar-accdb-benchmark__cell-number{text-align:right;font:12px ui-monospace,monospace;white-space:nowrap}
/* Status and restraint identifiers are single tokens: breaking them mid-word
   renders "PASS" as "PAS S" and splits a restraint id across lines. */
.caesar-accdb-benchmark__cell-status{font-weight:800;white-space:nowrap}
.caesar-accdb-benchmark td:nth-child(2),.caesar-accdb-benchmark__section--diagnostic td:first-child{white-space:nowrap}
.caesar-accdb-benchmark__section:not(.caesar-accdb-benchmark__section--diagnostic) tr[data-status="PASS"] .caesar-accdb-benchmark__cell-status{color:#86efac}
.caesar-accdb-benchmark__section:not(.caesar-accdb-benchmark__section--diagnostic) tr[data-status="FAIL"] .caesar-accdb-benchmark__cell-status{color:#fca5a5}
.caesar-accdb-benchmark__section--diagnostic tr[data-regime-match="false"]{background:#2a1a06}
.caesar-accdb-benchmark__imported{display:grid;gap:6px}.caesar-accdb-benchmark__imported h3{margin:4px 0;font-size:14px}
.caesar-accdb-benchmark__imported th{white-space:nowrap;color:var(--workspace-muted,#94a3b8);font-weight:600}
.caesar-accdb-benchmark__imported td{font:12px ui-monospace,monospace;word-break:break-all}
.caesar-accdb-benchmark__import-error{margin:0;padding:8px 10px;border-left:3px solid #b91c1c;background:#1b0f0f;color:#fca5a5;font-size:12px}
@media(max-width:700px){.caesar-accdb-benchmark__controls{display:grid}}
`;
}

export const CAESAR_ACCDB_BENCHMARK_STYLES = caesarAccdbBenchmarkStyles();
