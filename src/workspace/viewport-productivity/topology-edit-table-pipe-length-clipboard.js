import {
  stageTopologyEditTablePipeLengthRange,
} from './topology-edit-table-pipe-length-runtime.js';

const PIPE_CELL_KIND = 'PIPE_LENGTH';

export function parseTopologyEditTablePipeLengthClipboard(textInput) {
  const normalized = String(textInput ?? '').replace(/\r\n?/gu, '\n').replace(/\n+$/gu, '');
  if (!normalized.length) {
    throw new TypeError('Engineering Table PIPE length paste: clipboard is empty.');
  }
  const rows = normalized.split('\n').map((line) => line.split('\t'));
  const width = rows[0]?.length ?? 0;
  if (!width || rows.some((row) => row.length !== width)) {
    throw new RangeError('Engineering Table PIPE length paste: clipboard rows must be rectangular TSV.');
  }
  return Object.freeze(rows.map((row, rowIndex) => Object.freeze(row.map((value, columnIndex) => {
    if (!String(value).trim()) {
      throw new RangeError(
        `Engineering Table PIPE length paste: cell ${rowIndex + 1},${columnIndex + 1} is blank.`,
      );
    }
    const number = Number(value);
    if (!Number.isFinite(number) || !(number > 0)) {
      throw new RangeError(
        `Engineering Table PIPE length paste: cell ${rowIndex + 1},${columnIndex + 1} must be a finite positive length.`,
      );
    }
    return number;
  }))));
}

export function planTopologyEditTablePipeLengthPaste({
  clipboardText,
  startRowIndex,
  startColumnIndex,
  grid,
} = {}) {
  const values = parseTopologyEditTablePipeLengthClipboard(clipboardText);
  const rowStart = nonNegativeInteger(startRowIndex, 'startRowIndex');
  const columnStart = nonNegativeInteger(startColumnIndex, 'startColumnIndex');
  if (!Array.isArray(grid) || !grid.length || grid.some((row) => !Array.isArray(row))) {
    throw new TypeError('Engineering Table PIPE length paste: target grid is required.');
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
          `Engineering Table PIPE length paste: target rectangle exceeds rendered Table at row ${rowIndex + 1}, column ${columnIndex + 1}.`,
        );
      }
      if (cell.editKind !== PIPE_CELL_KIND || cell.editable === false) {
        throw new RangeError(
          `Engineering Table PIPE length paste: target ${cell.columnKey ?? columnIndex} on ${cell.canonicalId ?? rowIndex} is not an editable PIPE length cell.`,
        );
      }
      const canonicalId = requiredText(cell.canonicalId, 'canonicalId');
      if (seen.has(canonicalId)) {
        throw new RangeError(`Engineering Table PIPE length paste: duplicate target ${canonicalId}.`);
      }
      seen.add(canonicalId);
      assignments.push(Object.freeze({
        canonicalId,
        columnKey: requiredText(cell.columnKey, 'columnKey'),
        lengthMm: values[rowOffset][columnOffset],
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

export function handleTopologyEditTablePipeLengthPaste(runtime, event) {
  const input = event.target?.closest?.('input[data-table-cell-edit="PIPE_LENGTH"]');
  if (!input || !runtime?.element?.contains(input)) return false;
  event.preventDefault();
  try {
    const policy = explicitRangePolicy(runtime, input);
    const startRow = input.closest('tbody tr');
    const startCell = input.closest('td');
    const tbody = startRow?.parentElement;
    if (!startRow || !startCell || !tbody) {
      throw new RangeError('Engineering Table PIPE length paste: active cell is not in the rendered grid.');
    }
    const rows = [...tbody.querySelectorAll(':scope > tr')];
    const startRowIndex = rows.indexOf(startRow);
    const startColumnIndex = [...startRow.children].indexOf(startCell);
    const grid = rows.map((row) => [...row.children].map(domCellDescriptor));
    const plan = planTopologyEditTablePipeLengthPaste({
      clipboardText: event.clipboardData?.getData?.('text/plain') ?? '',
      startRowIndex,
      startColumnIndex,
      grid,
    });
    const result = stageTopologyEditTablePipeLengthRange(runtime, plan.assignments.map((assignment) => ({
      canonicalId: assignment.canonicalId,
      lengthMm: assignment.lengthMm,
      anchor: policy.anchor,
      propagation: policy.propagation,
    })));
    if (!result.ok) throw new RangeError(result.error);
    runtime.error = null;
    runtime.message = `${plan.assignmentCount} PIPE length value(s) staged atomically with explicit ${policy.anchor} / ${policy.propagation} policy; canonical authority is unchanged and governed Preview refresh is queued.`;
    runtime.element.dataset.tablePipeLengthPasteAssignmentCount = String(plan.assignmentCount);
    runtime.element.dataset.tablePipeLengthPasteRows = String(plan.rowCount);
    runtime.element.dataset.tablePipeLengthPasteColumns = String(plan.columnCount);
    runtime.element.dataset.tablePipeLengthPasteAnchor = policy.anchor;
    runtime.element.dataset.tablePipeLengthPastePropagation = policy.propagation;
    runtime.render();
    return true;
  } catch (error) {
    runtime.error = error instanceof Error ? error.message : String(error);
    runtime.message = 'PIPE length paste rejected before staged Table authority changed.';
    runtime.render();
    return true;
  }
}

function explicitRangePolicy(runtime, input) {
  const canonicalId = requiredText(input.dataset?.tableCellCanonicalId, 'canonicalId');
  const primary = runtime.projection?.rows.find((row) => row.rowId === runtime.viewState?.primaryRowId);
  if (primary?.identity?.canonicalId !== canonicalId) {
    throw new RangeError(
      'Engineering Table PIPE length paste: select the starting PIPE row first so its visible Anchor/Propagation controls explicitly govern the range.',
    );
  }
  const editor = [...(runtime.element?.querySelectorAll?.('[data-table-editor-id]') ?? [])]
    .find((candidate) => candidate.dataset.tableEditorId === canonicalId);
  const anchor = String(editor?.querySelector?.('[data-table-edit-anchor]')?.value ?? '').trim().toUpperCase();
  const propagation = String(editor?.querySelector?.('[data-table-edit-propagation]')?.value ?? '').trim().toUpperCase();
  const supported = (anchor === 'FROM' && propagation === 'DOWNSTREAM')
    || (anchor === 'TO' && propagation === 'UPSTREAM');
  if (!supported) {
    throw new RangeError(
      `Engineering Table PIPE length paste: explicit policy ${anchor || '(blank)'} / ${propagation || '(blank)'} is unsupported; use FROM / DOWNSTREAM or TO / UPSTREAM.`,
    );
  }
  return Object.freeze({ anchor, propagation });
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
    canonicalId: input.dataset.tableCellCanonicalId ?? null,
    columnKey: cell.dataset?.tableColumnKey ?? null,
  };
}
function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new RangeError(`Engineering Table PIPE length paste: ${label} must be a non-negative integer.`);
  }
  return number;
}
function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`Engineering Table PIPE length paste: ${label} is required.`);
  return text;
}
