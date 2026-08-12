import { LINEAR_FEA_UNITS, TRANSLATIONAL_DOFS } from '../core/linear-fea-contract/index.js';

const ACTION_FIELDS = Object.freeze(['fx', 'fy', 'fz', 'mx', 'my', 'mz']);
const CSV_HEADER = Object.freeze([
  'Case', 'CaseRole', 'Table', 'NodeId', 'ElementId', 'End', 'Basis', 'Field', 'Value', 'Unit', 'Authority',
]);

/**
 * Export downloads are a presentation-format change over already-rendered
 * evidence (native-results-view.js, native-evidence-dossier.js). Nothing here
 * recomputes an engineering quantity; every value is read from the sealed
 * batch/dossier object exactly as retained.
 */
export function buildLfeaNativeDossierJsonExport(dossier) {
  if (!dossier || dossier.schema !== 'lfea-native-evidence-dossier/v1') {
    throw exportError('LFEA_EXPORT_DOSSIER_REQUIRED', 'A current native evidence dossier is required to export.');
  }
  const runId = dossier.evidence?.runId ?? 'UNKNOWN-RUN';
  const shortHash = String(dossier.semanticHash ?? '').replace(/^fnv1a64:/u, '').slice(0, 16) || 'UNSEALED';
  return Object.freeze({
    fileName: `${runId}-evidence-dossier-${shortHash}.json`,
    mediaType: 'application/json',
    content: JSON.stringify(dossier, null, 2),
  });
}

export function buildLfeaNativeResultsCsvExport(executionState, resultsState) {
  if (resultsState?.currentness !== 'CURRENT' || !resultsState.results) {
    throw exportError('LFEA_EXPORT_RESULTS_CURRENT_REQUIRED', 'CURRENT native Results are required to export.');
  }
  const batch = resultsState.results;
  const rows = [];
  for (const caseResult of batch.caseRecoveries) {
    const rawCase = executionState?.execution?.caseExecutions
      ?.find((candidate) => candidate.caseId === caseResult.caseId) ?? null;
    if (rawCase) {
      appendVectorRows(rows, caseResult, rawCase.execution.displacement, 'RAW_B3.3_DISPLACEMENT', displacementUnit);
      appendVectorRows(rows, caseResult, rawCase.execution.reactions, 'RAW_B3.3_REACTION', reactionUnit);
    }
    appendActionRows(rows, caseResult);
  }
  return Object.freeze({
    fileName: `${batch.recoveryBatchId}-results.csv`,
    mediaType: 'text/csv',
    content: toCsv(rows),
  });
}

export function downloadLfeaNativeResultsCsv(doc, executionState, resultsState) {
  const record = buildLfeaNativeResultsCsvExport(executionState, resultsState);
  downloadLfeaNativeFile(doc, doc.defaultView?.URL ?? globalThis.URL, record);
  return record;
}

/** Browser download via object URL. Mirrors the pattern already proven in linear-piping-results-workbench.js. */
export function downloadLfeaNativeFile(doc, urlApi, record) {
  if (!urlApi || typeof urlApi.createObjectURL !== 'function' || typeof urlApi.revokeObjectURL !== 'function') {
    throw exportError('LFEA_EXPORT_DOWNLOAD_API_UNAVAILABLE', 'Browser object URL API is unavailable.');
  }
  const blob = new Blob([record.content], { type: `${record.mediaType};charset=utf-8` });
  const href = urlApi.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = href;
  anchor.download = record.fileName;
  anchor.hidden = true;
  const parent = doc.body ?? doc.documentElement;
  parent.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    urlApi.revokeObjectURL(href);
  }
}

function appendVectorRows(rows, caseResult, vectorRows, authority, unitForDof) {
  for (const row of vectorRows) {
    rows.push({
      Case: caseResult.caseId, CaseRole: caseResult.caseRole, Table: authority,
      NodeId: row.nodeId, ElementId: '', End: '', Basis: 'GLOBAL',
      Field: row.dof, Value: row.value, Unit: unitForDof(row.dof), Authority: authority,
    });
  }
}

function appendActionRows(rows, caseResult) {
  for (const action of caseResult.recovery.elementActions) {
    for (const end of ['I', 'J']) {
      for (const basis of ['local', 'global']) {
        for (const field of ACTION_FIELDS) {
          rows.push({
            Case: caseResult.caseId, CaseRole: caseResult.caseRole, Table: 'RECOVERED_B3.4_ELEMENT_ACTION',
            NodeId: '', ElementId: action.elementId, End: end, Basis: basis.toUpperCase(),
            Field: field, Value: action[basis][end][field], Unit: actionUnit(field),
            Authority: 'RECOVERED_B3.4_ELEMENT_ACTION',
          });
        }
      }
    }
  }
}

function displacementUnit(dof) {
  return TRANSLATIONAL_DOFS.includes(dof) ? LINEAR_FEA_UNITS.length : LINEAR_FEA_UNITS.rotation;
}
function reactionUnit(dof) {
  return TRANSLATIONAL_DOFS.includes(dof) ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment;
}
function actionUnit(field) {
  return field.startsWith('f') ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment;
}

function toCsv(rows) {
  const lines = [CSV_HEADER.map(csvField).join(',')];
  for (const row of rows) lines.push(CSV_HEADER.map((key) => csvField(row[key])).join(','));
  return lines.join('\r\n');
}

function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_EXPORT';
  return error;
}
