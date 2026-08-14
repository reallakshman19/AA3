const NODE_CELL_KIND = 'NODE_POSITION';

export function parseTopologyEditTableXyzClipboard(textInput) {
  const normalized = String(textInput ?? '').replace(/\r\n?/gu, '\n').replace(/\n+$/gu, '');
  if (!normalized.length) {
    throw new TypeError('Engineering Table XYZ paste: clipboard is empty.');
  }
  const rows = normalized.split('\n').map((line) => line.split('\t'));
  const width = rows[0]?.length ?? 0;
  if (!width || rows.some((row) => row.length !== width)) {
    throw new RangeError('Engineering Table XYZ paste: clipboard rows must be rectangular TSV.');
  }
  return Object.freeze(rows.map((row, rowIndex) => Object.freeze(row.map((value, columnIndex) => {
    if (!String(value).trim()) {
      throw new RangeError(
        `Engineering Table XYZ paste: cell ${rowIndex + 1},${columnIndex + 1} is blank.`,
      );
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new RangeError(
        `Engineering Table XYZ paste: cell ${rowIndex + 1},${columnIndex + 1} must be finite.`,
      );
    }
    return number;
  }))));
}

export function planTopologyEditTableXyzDraftPaste({
  clipboardText,
  startRowIndex,
  startColumnIndex,
  grid,
} = {}) {
  const values = parseTopologyEditTableXyzClipboard(clipboardText);
  const rowStart = nonNegativeInteger(startRowIndex, 'startRowIndex');
  const columnStart = nonNegativeInteger(startColumnIndex, 'startColumnIndex');
  if (!Array.isArray(grid) || !grid.length || grid.some((row) => !Array.isArray(row))) {
    throw new TypeError('Engineering Table XYZ paste: target grid is required.');
  }
  const assignments = [];
  const seen = new Set();
  for (let rowOffset = 0; rowOffset < values.length; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < values[rowOffset].length; columnOffset += 1) {
      const rowIndex = rowStart + rowOffset;
      const columnIndex = columnStart + columnOffset;
      const cell = grid[rowIndex]?.[columnIndex];
      if (!cell) {
        throw new RangeError(
          `Engineering Table XYZ paste: target rectangle exceeds rendered Table at row ${rowIndex + 1}, column ${columnIndex + 1}.`,
        );
      }
      if (cell.editKind !== NODE_CELL_KIND || cell.editable === false) {
        throw new RangeError(
          `Engineering Table XYZ paste: target ${cell.columnKey ?? columnIndex} on ${cell.canonicalId ?? rowIndex} is not an editable XYZ cell.`,
        );
      }
      const draftKey = requiredText(cell.draftKey, 'draftKey');
      if (seen.has(draftKey)) {
        throw new RangeError(`Engineering Table XYZ paste: duplicate target ${draftKey}.`);
      }
      seen.add(draftKey);
      assignments.push(Object.freeze({
        draftKey,
        canonicalId: requiredText(cell.canonicalId, 'canonicalId'),
        endpoint: requiredEndpoint(cell.endpoint),
        axis: requiredAxis(cell.axis),
        columnKey: requiredText(cell.columnKey, 'columnKey'),
        value: values[rowOffset][columnOffset],
        rowIndex,
        columnIndex,
      }));
    }
  }
  return Object.freeze({
    rowCount: values.length,
    columnCount: values[0].length,
    assignmentCount: assignments.length,
    assignments: Object.freeze(assignments),
  });
}

export function handleTopologyEditTableXyzPaste(runtime, event) {
  const input = event.target?.closest?.('input[data-table-cell-edit="NODE_POSITION"]');
  if (!input || !runtime?.element?.contains(input)) return false;
  event.preventDefault();
  const startRow = input.closest('tbody tr');
  const startCell = input.closest('td');
  const tbody = startRow?.parentElement;
  if (!startRow || !startCell || !tbody) return failRuntime(runtime, 'Engineering Table XYZ paste: active cell is not in the rendered grid.');
  const rows = [...tbody.querySelectorAll(':scope > tr')];
  const startRowIndex = rows.indexOf(startRow);
  const startColumnIndex = [...startRow.children].indexOf(startCell);
  const grid = rows.map((row) => [...row.children].map(domCellDescriptor));
  const startDraftKey = input.dataset.tableCellDraftKey ?? '';
  try {
    const plan = planTopologyEditTableXyzDraftPaste({
      clipboardText: event.clipboardData?.getData?.('text/plain') ?? '',
      startRowIndex,
      startColumnIndex,
      grid,
    });
    for (const assignment of plan.assignments) {
      runtime.cellDrafts.set(assignment.draftKey, String(assignment.value));
    }
    runtime.cellErrorId = null;
    runtime.error = null;
    runtime.message = `${plan.assignmentCount} XYZ cell draft(s) pasted atomically; canonical and staged authority are unchanged. Press Enter/Tab on an endpoint to stage its certified NODE_POSITION intent.`;
    runtime.element.dataset.tableXyzPasteAssignmentCount = String(plan.assignmentCount);
    runtime.element.dataset.tableXyzPasteRows = String(plan.rowCount);
    runtime.element.dataset.tableXyzPasteColumns = String(plan.columnCount);
    runtime.render();
    queueMicrotask(() => focusDraft(runtime, startDraftKey));
    return true;
  } catch (error) {
    runtime.cellErrorId = startDraftKey || null;
    runtime.error = error instanceof Error ? error.message : String(error);
    runtime.message = 'XYZ paste rejected before any Table draft was changed.';
    runtime.render();
    queueMicrotask(() => focusDraft(runtime, startDraftKey));
    return true;
  }
}

function domCellDescriptor(cell) {
  const input = cell.querySelector?.('input[data-table-cell-edit]');
  if (!input) {
    return {
      editKind: null,
      editable: false,
      canonicalId: cell.closest?.('tr')?.dataset?.canonicalId ?? null,
      columnKey: cell.dataset?.tableColumnKey ?? null,
    };
  }
  return {
    editKind: input.dataset.tableCellEdit ?? null,
    editable: !input.disabled && input.getAttribute('aria-disabled') !== 'true',
    draftKey: input.dataset.tableCellDraftKey ?? null,
    canonicalId: input.dataset.tableCellCanonicalId ?? null,
    endpoint: input.dataset.tableCellEndpoint ?? null,
    axis: input.dataset.tableCellAxis ?? null,
    columnKey: cell.dataset?.tableColumnKey ?? null,
  };
}
function focusDraft(runtime, draftKey) {
  if (!draftKey || !runtime?.element) return;
  const input = [...runtime.element.querySelectorAll('input[data-table-cell-draft-key]')]
    .find((candidate) => candidate.dataset.tableCellDraftKey === draftKey);
  input?.focus?.();
}
function failRuntime(runtime, message) {
  runtime.error = message;
  runtime.message = 'XYZ paste rejected before any Table draft was changed.';
  runtime.render?.();
  return true;
}
function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new RangeError(`Engineering Table XYZ paste: ${label} must be a non-negative integer.`);
  }
  return number;
}
function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`Engineering Table XYZ paste: ${label} is required.`);
  return text;
}
function requiredEndpoint(value) {
  const endpoint = requiredText(value, 'endpoint').toUpperCase();
  if (!['FROM', 'TO'].includes(endpoint)) {
    throw new RangeError(`Engineering Table XYZ paste: endpoint ${endpoint} is unsupported.`);
  }
  return endpoint;
}
function requiredAxis(value) {
  const axis = requiredText(value, 'axis').toUpperCase();
  if (!['X', 'Y', 'Z'].includes(axis)) {
    throw new RangeError(`Engineering Table XYZ paste: axis ${axis} is unsupported.`);
  }
  return axis;
}
