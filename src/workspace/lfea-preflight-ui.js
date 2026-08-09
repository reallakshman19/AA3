/**
 * Source enrichment pre-flight review surface.
 *
 * Read-only. This module reports what the active shared model and the saved
 * master Line List already say about each isolated line key. It resolves
 * nothing by guessing, publishes no Project Data, mutates no shared model, and
 * carries no solver, empirical-load or topology authority.
 *
 * Dispositions applied here come from docs/enrichment-ui-phase0-inventory.md:
 *   RETIRE  first-found containment match, demonstration data,
 *           sharedModel.supports mutation, fallback verification
 *   RELOCATE topology autofix, DTXR derivation
 *   REPLACE render-all DOM, Map<string,Row> lookup, inline editable cells,
 *           service/class fill-down
 *   RETAIN  Service -> Rating -> Class -> Line Key hierarchy, collapse/expand,
 *           the Load Process Data source action
 *
 * Still outstanding against docs/enrichment-ui-phase1-acceptance-checklist.md:
 * indexed bitset facets, an immutable review-event ledger, proposal flows, and
 * true row/column virtualization. Until those land, live DOM is bounded by the
 * explicit caps declared below and surplus rows are reported, never dropped
 * silently.
 */
import {
  PREFLIGHT_MATCH_STATUS,
  projectPreflightModel,
} from './lfea-preflight-resolution.js';
import { masterDataController } from './master-data-controller.js';
import { renderProjectDataView } from './project-data/project-data-view.js';

export {
  PREFLIGHT_MATCH_STATUS,
  buildNormalizedKeyBuckets,
  deriveWallThicknessFromDtxr,
  projectPreflightModel,
  resolveLineKeyCandidates,
} from './lfea-preflight-resolution.js';

/** Bounded live DOM. Surplus is reported, never silently truncated. */
export const PREFLIGHT_LINE_KEY_ROW_CAP = 500;
export const PREFLIGHT_COMPONENT_ROW_CAP = 200;

const STYLE_ROLE = 'lfea-preflight-styles';

export function renderProjectConfiguration(container, renderCallback) {
  renderProjectDataView(container, renderCallback);
}

/**
 * Render the read-only pre-flight review grid into a host element.
 *
 * @param {Element} container Host element, cleared on every render.
 * @param {unknown} model Shared-model carrier, or null.
 * @param {Function|undefined} renderCallback Optional re-render request.
 * @returns {object} The projection that was rendered.
 */
export function renderPreflightGrid(container, model, renderCallback) {
  if (!container || typeof container.replaceChildren !== 'function') {
    throw new TypeError('Preflight grid requires a DOM host.');
  }
  const doc = container.ownerDocument ?? document;
  ensureStyles(doc);
  const lineRows = normalizedLineRows();
  const projection = projectPreflightModel(model, lineRows);

  const wrap = create(doc, 'div', 'preflight-grid-wrap');
  wrap.dataset.role = 'lfea-preflight-grid';
  wrap.dataset.blocked = projection.blocked ? 'true' : 'false';
  wrap.append(
    header(doc, projection, lineRows, renderCallback),
    projection.blocked ? blockedNotice(doc, projection.blocked) : grid(doc, projection),
  );
  container.replaceChildren(wrap);
  return projection;
}

function normalizedLineRows() {
  const master = masterDataController.getMasterData()?.lineList?.normalizedRows;
  if (Array.isArray(master) && master.length) return master;
  const legacy = masterDataController.getLegacyContext()?.lineRows;
  return Array.isArray(legacy) ? legacy : [];
}

function header(doc, projection, lineRows, renderCallback) {
  const block = create(doc, 'header', 'preflight-header');
  const title = create(doc, 'h3');
  title.textContent = 'Source Enrichment Pre-Flight';
  const summary = create(doc, 'p', 'preflight-header__summary');
  summary.textContent = projection.blocked
    ? 'No source model.'
    : [
      `${projection.lineKeyCount} isolated line keys`,
      `${projection.componentCount} member components`,
      `${lineRows.length} master Line List rows`,
      `${projection.groups.filter((row) => row.resolution.status === PREFLIGHT_MATCH_STATUS.EXACT).length} exact`,
      `${projection.groups.filter((row) => row.resolution.status === PREFLIGHT_MATCH_STATUS.BLOCKED_AMBIGUOUS).length} ambiguous`,
      `${projection.groups.filter((row) => row.resolution.status === PREFLIGHT_MATCH_STATUS.BLOCKED_MISSING).length} missing`,
    ].join(' | ');
  const note = create(doc, 'p', 'preflight-header__note');
  note.textContent = 'Read-only review. Values shown are the master row this line key resolves to exactly; '
    + 'ambiguous and missing keys stay blocked and are never filled from a candidate.';
  block.append(title, summary, note);
  if (typeof renderCallback === 'function') {
    const refresh = create(doc, 'button', 'preflight-refresh');
    refresh.type = 'button';
    refresh.textContent = 'Reload source and master data';
    refresh.dataset.role = 'lfea-preflight-refresh';
    refresh.addEventListener('click', () => renderCallback());
    block.append(refresh);
  }
  return block;
}

function blockedNotice(doc, message) {
  const notice = create(doc, 'p', 'preflight-blocked');
  notice.dataset.role = 'lfea-preflight-blocked';
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  return notice;
}

const COLUMNS = Object.freeze([
  'Isolated line key', 'Class', 'Bore (mm)', 'Wall thk (mm)', 'P1 (kPa)',
  'T1 (°C)', 'T2 (°C)', 'T3 (°C)', 'Phase', 'Fluid ρ', 'Metal ρ', 'Resolution',
]);

function grid(doc, projection) {
  const scroller = create(doc, 'div', 'preflight-scroller');
  const table = create(doc, 'table', 'preflight-tree');
  const head = create(doc, 'thead');
  const headRow = create(doc, 'tr');
  for (const label of COLUMNS) {
    const cell = create(doc, 'th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.append(cell);
  }
  head.append(headRow);
  const body = create(doc, 'tbody');
  const rendered = projection.groups.slice(0, PREFLIGHT_LINE_KEY_ROW_CAP);
  rendered.forEach((entry, index) => body.append(lineKeyRow(doc, entry, index, body)));
  if (projection.groups.length > rendered.length) {
    body.append(capRow(doc, rendered.length, projection.groups.length));
  }
  table.append(head, body);
  scroller.append(table);
  return scroller;
}

function lineKeyRow(doc, entry, index, body) {
  const row = create(doc, 'tr', 'preflight-line-key');
  const rowId = `lk-${index}`;
  row.dataset.treeId = rowId;
  row.dataset.status = entry.resolution.status;

  const nameCell = create(doc, 'td');
  const toggle = create(doc, 'button', 'preflight-toggle');
  toggle.type = 'button';
  toggle.dataset.role = 'lfea-preflight-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = `▸ ${entry.isolatedLineKeyToken}`;
  // REPLACE of hidden render-all component rows: zero component rows exist
  // before expansion, and expansion materializes a bounded set.
  toggle.addEventListener('click', () => toggleComponents(doc, body, row, rowId, entry, toggle));
  const meta = create(doc, 'span', 'preflight-meta');
  meta.textContent = ` ${entry.fullLineKeyName} · ${entry.service} / ${entry.rating} · ${entry.items.length} components`;
  nameCell.append(toggle, meta);

  row.append(
    nameCell,
    textCell(doc, entry.cls),
    valueCell(doc, entry.bore),
    valueCell(doc, null),
    valueCell(doc, entry.p1),
    valueCell(doc, entry.t1),
    valueCell(doc, entry.t2),
    valueCell(doc, entry.t3),
    valueCell(doc, entry.phase),
    valueCell(doc, entry.fluidDensity),
    valueCell(doc, entry.metalDensity),
    resolutionCell(doc, entry),
  );
  return row;
}

function toggleComponents(doc, body, row, rowId, entry, toggle) {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  for (const child of [...body.querySelectorAll(`tr[data-parent-id="${rowId}"]`)]) child.remove();
  if (expanded) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = `▸ ${entry.isolatedLineKeyToken}`;
    return;
  }
  toggle.setAttribute('aria-expanded', 'true');
  toggle.textContent = `▾ ${entry.isolatedLineKeyToken}`;
  const visible = entry.items.slice(0, PREFLIGHT_COMPONENT_ROW_CAP);
  let anchor = row;
  for (const item of visible) {
    const leaf = create(doc, 'tr', 'preflight-leaf');
    leaf.dataset.parentId = rowId;
    leaf.append(
      textCell(doc, `↳ ${item.itemType} ${item.itemName}`),
      textCell(doc, entry.cls),
      valueCell(doc, item.bore ?? entry.bore),
      valueCell(doc, null),
      valueCell(doc, entry.p1),
      valueCell(doc, entry.t1),
      valueCell(doc, entry.t2),
      valueCell(doc, entry.t3),
      valueCell(doc, entry.phase),
      valueCell(doc, entry.fluidDensity),
      valueCell(doc, entry.metalDensity),
      textCell(doc, `Member of ${entry.isolatedLineKeyToken}`),
    );
    anchor.after(leaf);
    anchor = leaf;
  }
  if (entry.items.length > visible.length) {
    const notice = capRow(doc, visible.length, entry.items.length);
    notice.dataset.parentId = rowId;
    anchor.after(notice);
  }
}

function capRow(doc, shown, total) {
  const row = create(doc, 'tr', 'preflight-cap');
  const cell = create(doc, 'td');
  cell.colSpan = COLUMNS.length;
  cell.textContent = `Showing ${shown} of ${total}. Live DOM is capped until indexed virtualization lands; `
    + 'narrow the source model to review the remainder.';
  row.append(cell);
  return row;
}

function resolutionCell(doc, entry) {
  const cell = create(doc, 'td');
  const badge = create(doc, 'span', `preflight-status preflight-status--${entry.resolution.status}`);
  badge.textContent = entry.resolution.status === PREFLIGHT_MATCH_STATUS.EXACT
    ? 'EXACT — 1 master row'
    : `${entry.resolution.status} — ${entry.candidateCount} candidate${entry.candidateCount === 1 ? '' : 's'}`;
  cell.append(badge);
  return cell;
}

function textCell(doc, text) {
  const cell = create(doc, 'td');
  cell.textContent = String(text);
  return cell;
}

/** Blocked values stay blocked. No implicit zero, no hidden fallback. */
function valueCell(doc, value) {
  const cell = create(doc, 'td');
  if (value === null || value === undefined || value === '') {
    const blank = create(doc, 'span', 'preflight-status preflight-status--BLOCKED_MISSING');
    blank.textContent = 'BLOCKED';
    cell.append(blank);
    return cell;
  }
  cell.textContent = String(value);
  return cell;
}

function create(doc, tagName, className) {
  const element = doc.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function ensureStyles(doc) {
  if (doc.querySelector(`style[data-role="${STYLE_ROLE}"]`)) return;
  const style = doc.createElement('style');
  style.dataset.role = STYLE_ROLE;
  style.textContent = `
    .preflight-grid-wrap { display: flex; flex-direction: column; min-width: 0; padding: 12px; color: #e2e8f0; background: #0f172a; }
    .preflight-header h3 { margin: 0 0 4px; color: #38bdf8; font-size: 14px; }
    .preflight-header__summary { margin: 0 0 4px; color: #93c5fd; font-size: 11px; }
    .preflight-header__note { margin: 0 0 8px; max-width: 900px; color: #94a3b8; font-size: 11px; line-height: 1.4; }
    .preflight-refresh { border: 1px solid #334155; border-radius: 4px; padding: 5px 8px; background: #1e293b; color: #e2e8f0; font-size: 11px; font-weight: 700; cursor: pointer; align-self: flex-start; }
    .preflight-blocked { margin: 0; padding: 12px; border: 1px solid #7f1d1d; border-radius: 6px; background: #1f0a0a; color: #fecaca; font-size: 12px; }
    .preflight-scroller { max-height: 460px; overflow: auto; border: 1px solid #334155; border-radius: 6px; background: #0b1121; }
    .preflight-tree { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; }
    .preflight-tree th { position: sticky; top: 0; z-index: 1; padding: 6px 8px; border-bottom: 1px solid #334155; background: #1e293b; color: #7dd3fc; text-align: left; font-weight: 400; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
    .preflight-tree td { padding: 4px 8px; border-bottom: 1px solid rgba(51,65,85,0.4); white-space: nowrap; vertical-align: top; }
    .preflight-line-key { background: rgba(56,189,248,0.08); }
    .preflight-leaf { color: #cbd5e1; }
    .preflight-cap td { color: #fcd34d; white-space: normal; }
    .preflight-meta { color: #94a3b8; font-size: 10px; }
    .preflight-toggle { border: 0; background: transparent; color: #f8fafc; font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
    .preflight-status { border-radius: 2px; padding: 1px 4px; font-weight: 700; }
    .preflight-status--EXACT { background: rgba(16,185,129,0.2); color: #34d399; }
    .preflight-status--BLOCKED_AMBIGUOUS { background: rgba(234,179,8,0.15); color: #fde047; }
    .preflight-status--BLOCKED_MISSING { background: rgba(239,68,68,0.15); color: #fca5a5; }
  `;
  doc.head.append(style);
}

/**
 * Mount the pre-flight review surface on a stable application root.
 *
 * @param {Element} applicationRoot Application root containing the host.
 * @param {{getModel?:Function,selector?:string}} options Explicit model source.
 * @returns {{render:Function,destroy:Function}} Mounted handle.
 */
export function mountLfeaPreflightUi(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Preflight UI requires the application root.');
  }
  const selector = options.selector ?? '[data-role="lfea-preflight-root"]';
  const host = applicationRoot.querySelector(selector);
  if (!host) throw new TypeError(`Preflight UI could not find ${selector}.`);
  const getModel = typeof options.getModel === 'function' ? options.getModel : () => null;
  let projection = null;
  const handle = {
    render() {
      projection = renderPreflightGrid(host, getModel(), () => handle.render());
      return handle;
    },
    getProjection() {
      return projection;
    },
    destroy() {
      projection = null;
      host.replaceChildren();
    },
  };
  return handle.render();
}
