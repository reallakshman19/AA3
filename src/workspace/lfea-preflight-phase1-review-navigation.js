import {
  LFEA_PREFLIGHT_COLUMN_PRESETS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
  LFEA_PREFLIGHT_FACET_MODE,
} from './lfea-preflight-phase1-schema.js';
import {
  setLfeaPreflightPhase1ColumnPreset,
  setLfeaPreflightPhase1Filter,
  setLfeaPreflightPhase1Queue,
  setLfeaPreflightPhase1Sort,
} from './lfea-preflight-phase1-viewport.js';

const QUEUES = Object.freeze([
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.MISSING, label: 'Missing' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS, label: 'Ambiguous' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.CONFLICTING, label: 'Conflicting' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.STALE, label: 'Stale' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.PROPOSED, label: 'Proposed' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.DEFERRED, label: 'Deferred' }),
]);

const FACETS = Object.freeze([
  Object.freeze({ facetId: 'service', label: 'Service', allLabel: 'All services' }),
  Object.freeze({ facetId: 'rating', label: 'Rating', allLabel: 'All ratings' }),
  Object.freeze({ facetId: 'pipingClass', label: 'Piping class', allLabel: 'All piping classes' }),
  Object.freeze({ facetId: 'readiness', label: 'Readiness', allLabel: 'All readiness states' }),
]);

const SORTS = Object.freeze([
  Object.freeze({ value: 'TARGET_ID_ASC', label: 'Stable target ID' }),
  Object.freeze({ value: 'LINE_KEY_ASC', label: 'Line key' }),
  Object.freeze({ value: 'SERVICE_ASC', label: 'Service' }),
  Object.freeze({ value: 'READINESS_ASC', label: 'Readiness' }),
]);

const COMBINE_OPTIONS = Object.freeze([
  Object.freeze({ value: LFEA_PREFLIGHT_FACET_MODE.AND, label: 'Match all active facets (AND)' }),
  Object.freeze({ value: LFEA_PREFLIGHT_FACET_MODE.OR, label: 'Match any active facet (OR)' }),
]);

/**
 * Mount read-only navigation over the indexed Phase-1 viewport.
 *
 * Queue and facet counts are copied from the complete index at mount time. The
 * controls only submit filter/query state to the existing viewport authority;
 * they never derive engineering status from DOM state.
 */
export function mountLfeaPreflightPhase1ReviewNavigation(toolbar, viewport, options = {}) {
  if (!toolbar || typeof toolbar.append !== 'function') {
    throw new TypeError('Phase-1 review navigation requires a toolbar host.');
  }
  if (typeof options.getModel !== 'function' || typeof options.paint !== 'function') {
    throw new TypeError('Phase-1 review navigation requires model and paint callbacks.');
  }
  const documentRef = options.documentRef ?? toolbar.ownerDocument ?? document;
  const initial = options.getModel();
  const queueButtons = new Map();

  const queueGroup = element(documentRef, 'div', 'lfea-preflight-phase1__queues');
  queueGroup.setAttribute('role', 'group');
  queueGroup.setAttribute('aria-label', 'Exception queues — complete dataset counts');
  queueButtons.set('', queueButton(documentRef, '', 'All', () => {
    setLfeaPreflightPhase1Queue(viewport, null);
    options.paint();
  }));
  queueGroup.append(queueButtons.get(''));
  for (const queue of QUEUES) {
    const control = queueButton(documentRef, queue.queueId, queue.label, () => {
      setLfeaPreflightPhase1Queue(viewport, queue.queueId);
      options.paint();
    });
    queueButtons.set(queue.queueId, control);
    queueGroup.append(control);
  }
  toolbar.append(queueGroup);

  const combineSelect = labelledSelect(
    documentRef,
    toolbar,
    'Facet logic',
    COMBINE_OPTIONS,
    applyFacets,
  );
  combineSelect.dataset.role = 'lfea-preflight-facet-combine';
  combineSelect.value = initial.filter.combine;

  const facetSelects = new Map();
  for (const facet of FACETS) {
    const select = labelledSelect(
      documentRef,
      toolbar,
      facet.label,
      [{ value: '', label: facet.allLabel }, ...facetOptions(initial, facet.facetId)],
      applyFacets,
    );
    select.dataset.role = `lfea-preflight-facet-${facet.facetId}`;
    facetSelects.set(facet.facetId, select);
  }

  const presetSelect = labelledSelect(
    documentRef,
    toolbar,
    'Columns',
    Object.keys(LFEA_PREFLIGHT_COLUMN_PRESETS).map((value) => ({ value, label: value })),
    () => {
      setLfeaPreflightPhase1ColumnPreset(viewport, presetSelect.value);
      (options.measureAndPaint ?? options.paint)();
    },
  );
  presetSelect.value = initial.presetId;

  const sortSelect = labelledSelect(documentRef, toolbar, 'Sort', SORTS, () => {
    setLfeaPreflightPhase1Sort(viewport, sortSelect.value);
    options.paint();
  });
  sortSelect.value = initial.sortId;

  const logic = element(documentRef, 'output', 'lfea-preflight-phase1__filter-logic');
  logic.dataset.role = 'lfea-preflight-filter-logic';
  logic.setAttribute('aria-live', 'polite');
  toolbar.append(logic);

  if (typeof options.renderCallback === 'function') {
    const refresh = element(documentRef, 'button', 'lfea-preflight-phase1__refresh');
    refresh.type = 'button';
    refresh.dataset.role = 'lfea-preflight-refresh';
    refresh.textContent = 'Reload source and master data';
    refresh.addEventListener('click', () => options.renderCallback());
    toolbar.append(refresh);
  }

  function applyFacets() {
    const clauses = [];
    for (const facet of FACETS) {
      const selected = facetSelects.get(facet.facetId).value;
      if (selected === '') continue;
      clauses.push(Object.freeze({
        facetId: facet.facetId,
        mode: LFEA_PREFLIGHT_FACET_MODE.OR,
        values: Object.freeze([selected]),
      }));
    }
    setLfeaPreflightPhase1Filter(viewport, {
      combine: combineSelect.value,
      clauses,
    });
    options.paint();
  }

  function refresh(model) {
    for (const [queueId, control] of queueButtons) {
      const active = (model.queueId ?? '') === queueId;
      const count = queueId === '' ? model.targetCount : (model.queueCounts?.[queueId] ?? 0);
      const label = queueId === '' ? 'All' : QUEUES.find((queue) => queue.queueId === queueId)?.label ?? queueId;
      control.textContent = `${label} (${count})`;
      control.setAttribute('aria-pressed', active ? 'true' : 'false');
      control.dataset.count = String(count);
    }
    combineSelect.value = model.filter.combine;
    logic.textContent = model.filter.clauses.length === 0
      ? 'Facet logic inactive — counts are for the complete indexed dataset.'
      : `Facet logic ${model.filter.combine}: ${model.filter.clauses.length} active facet(s). Counts are complete-dataset counts.`;
  }

  refresh(initial);
  return Object.freeze({ refresh });
}

function facetOptions(model, facetId) {
  const counts = model.facetCounts?.[facetId] ?? {};
  return Object.keys(counts).sort(compareAscii).map((value) => Object.freeze({
    value,
    label: `${value} (${counts[value]})`,
  }));
}

function queueButton(documentRef, queueId, label, onClick) {
  const node = element(documentRef, 'button', 'lfea-preflight-phase1__queue');
  node.type = 'button';
  node.dataset.queueId = queueId;
  node.setAttribute('aria-pressed', 'false');
  node.textContent = label;
  node.addEventListener('click', onClick);
  return node;
}

function labelledSelect(documentRef, toolbar, labelText, options, onChange) {
  const label = element(documentRef, 'label', 'lfea-preflight-phase1__control');
  label.append(documentRef.createTextNode(`${labelText} `));
  const select = element(documentRef, 'select');
  for (const option of options) {
    const node = element(documentRef, 'option');
    node.value = option.value;
    node.textContent = option.label;
    select.append(node);
  }
  select.addEventListener('change', onChange);
  label.append(select);
  toolbar.append(label);
  return select;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function element(documentRef, tagName, className) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  return node;
}
