import * as XLSX from 'xlsx';
import { INTERFACE_SIGN_CONVENTIONS } from '../core/linear-piping-interface/index.js';
import { requireCurrentLinearPipingPresentation } from '../core/linear-piping-presentation/index.js';
import { requireSupportActionTriad } from '../core/linear-piping-support-action-triad/index.js';
import { canonicalStringify, semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';

export const SUPPORT_ACTION_XLSX_SCHEMA = 'linear-piping-support-action-xlsx-export/v1';
export const SUPPORT_ACTION_XLSX_MEDIA_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/u;
const ENGINEERING_SHEET = 'Engineering Loads';
const AUDIT_SHEET = 'Audit Actions';

export function createLinearPipingSupportActionWorkbookModel(input) {
  requireRecord(input, 'supportActionXlsxInput');
  const presentation = requireCurrentLinearPipingPresentation(
    input.presentation,
    input.applicationResult,
  );
  const sourceSemanticHash = requireHash(input.sourceSemanticHash, 'sourceSemanticHash');
  const modelVersion = requireVersion(input.modelVersion);
  const forceUnit = requireText(input.forceUnit, 'forceUnit');
  const actions = requireActions(input.actions, presentation);
  const eligibility = presentation.exportEligibility;
  const engineeringAllowed = eligibility === 'ENGINEERING_EXPORT_ALLOWED';
  const cover = coverSheet(presentation, sourceSemanticHash, modelVersion, engineeringAllowed);
  const audit = actionSheet(
    AUDIT_SHEET,
    actions,
    presentation,
    sourceSemanticHash,
    modelVersion,
    forceUnit,
    false,
  );
  const sheets = [cover];
  if (engineeringAllowed) {
    sheets.push(actionSheet(
      ENGINEERING_SHEET,
      actions,
      presentation,
      sourceSemanticHash,
      modelVersion,
      forceUnit,
      true,
    ));
  }
  sheets.push(audit, limitationsSheet(presentation));
  sheets.push(engineeringAllowed
    ? signOffSheet(presentation, sourceSemanticHash, modelVersion)
    : conditionalNoticeSheet(presentation));

  const semanticMaterial = {
    schema: SUPPORT_ACTION_XLSX_SCHEMA,
    applicationId: presentation.applicationId,
    presentationSemanticHash: presentation.semanticHash,
    applicationResultSemanticHash: presentation.applicationResultSemanticHash,
    sourceSemanticHash,
    modelVersion,
    exportEligibility: eligibility,
    qualificationStatus: presentation.status,
    forceUnit,
    sheets,
  };
  const exportSemanticHash = semanticHash(semanticMaterial);
  return deepFreeze({
    ...semanticMaterial,
    exportSemanticHash,
    fileName: `${safeName(presentation.applicationId)}-support-actions.xlsx`,
    mediaType: SUPPORT_ACTION_XLSX_MEDIA_TYPE,
  });
}

export function linearPipingSupportActionWorkbook(input) {
  const model = createLinearPipingSupportActionWorkbookModel(input);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'LFEA Support Action Engineering Export',
    Subject: `${model.exportEligibility} · ${model.applicationId}`,
    Author: 'Advanced Analysis',
    Company: 'Advanced Analysis',
    Comments: `Export authority ${model.exportSemanticHash}; source ${model.sourceSemanticHash}; model version ${model.modelVersion}`,
  };
  for (const sheet of model.sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...sheet.rows], { sheetStubs: true });
    if (sheet.columns.length > 0 && sheet.rows.length > 0) {
      worksheet['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: sheet.rows.length, c: sheet.columns.length - 1 },
        }),
      };
    }
    worksheet['!cols'] = sheet.columns.map((column, index) => ({
      wch: columnWidth(column, sheet.rows, index),
    }));
    if (sheet.name === ENGINEERING_SHEET || sheet.name === AUDIT_SHEET) {
      addCellProvenanceComments(worksheet, sheet, model);
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  return workbook;
}

export function linearPipingSupportActionXlsxBytes(input) {
  return XLSX.write(linearPipingSupportActionWorkbook(input), {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
  });
}

function requireActions(value, presentation) {
  if (!Array.isArray(value) || value.length === 0) {
    fail('At least one support action is required.', 'PIPING_SUPPORT_ACTION_XLSX_ACTIONS_REQUIRED');
  }
  const seen = new Set();
  const rows = value.map((action, index) => {
    requireRecord(action, `actions[${index}]`);
    const interfaceId = requireText(action.interfaceId, `actions[${index}].interfaceId`);
    const nodeId = requireText(action.nodeId, `actions[${index}].nodeId`);
    const entityId = requireText(action.entityId, `actions[${index}].entityId`);
    const loadCaseId = requireText(action.loadCaseId, `actions[${index}].loadCaseId`);
    const reportingSignConvention = requireReportingSignConvention(
      action.reportingSignConvention,
      `actions[${index}].reportingSignConvention`,
    );
    const physicalLoadCaseHash = requireHash(action.physicalLoadCaseHash, `actions[${index}].physicalLoadCaseHash`);
    const analysisResultSemanticHash = requireHash(action.analysisResultSemanticHash, `actions[${index}].analysisResultSemanticHash`);
    const executionHash = requireHash(action.executionHash, `actions[${index}].executionHash`);
    const recoverySemanticHash = requireHash(action.recoverySemanticHash, `actions[${index}].recoverySemanticHash`);
    const triad = requireSupportActionTriad(action.triad);
    const key = `${interfaceId}\u0000${loadCaseId}`;
    if (seen.has(key)) {
      fail(`Duplicate support action ${interfaceId}/${loadCaseId}.`, 'PIPING_SUPPORT_ACTION_XLSX_ACTION_DUPLICATE');
    }
    seen.add(key);

    const interfaceRow = presentation.interfaceRows.find((row) => (
      row.interfaceId === interfaceId && row.loadCaseId === loadCaseId
    ));
    if (!interfaceRow || interfaceRow.nodeId !== nodeId || interfaceRow.recoverySemanticHash !== recoverySemanticHash) {
      fail(
        `Support action ${interfaceId}/${loadCaseId} is stale against the current interface presentation.`,
        'PIPING_SUPPORT_ACTION_XLSX_INTERFACE_STALE',
      );
    }
    if (interfaceRow.reportingSignConvention !== reportingSignConvention) {
      fail(
        `Support action ${interfaceId}/${loadCaseId} reporting sign convention does not match the current interface presentation.`,
        'PIPING_SUPPORT_ACTION_XLSX_SIGN_CONVENTION_STALE',
      );
    }
    const analysisRow = presentation.analysisRows.find((row) => (
      row.analysisResultSemanticHash === analysisResultSemanticHash
      && row.executionHash === executionHash
      && row.physicalLoadCaseHash === physicalLoadCaseHash
    ));
    if (!analysisRow) {
      fail(
        `Support action ${interfaceId}/${loadCaseId} is stale against the current analysis presentation.`,
        'PIPING_SUPPORT_ACTION_XLSX_ANALYSIS_STALE',
      );
    }
    return deepFreeze({
      entityId,
      nodeId,
      interfaceId,
      loadCaseId,
      reportingSignConvention,
      physicalLoadCaseHash,
      analysisResultSemanticHash,
      executionHash,
      recoverySemanticHash,
      triad,
    });
  });
  rows.sort((left, right) => (
    compareAscii(left.loadCaseId, right.loadCaseId)
    || compareAscii(left.interfaceId, right.interfaceId)
    || compareAscii(left.entityId, right.entityId)
  ));
  return Object.freeze(rows);
}

function coverSheet(presentation, sourceSemanticHash, modelVersion, engineeringAllowed) {
  const issueStatus = engineeringAllowed
    ? 'ENGINEERING ISSUE ELIGIBLE'
    : 'AUDIT ONLY — CONDITIONAL — NOT FOR ENGINEERING ISSUE';
  const rows = [
    ['Export purpose', 'LFEA recovered support-action review'],
    ['Issue status', issueStatus],
    ['Application ID', presentation.applicationId],
    ['Qualification status', presentation.status],
    ['Export eligibility', presentation.exportEligibility],
    ['Presentation hash', presentation.semanticHash],
    ['Presentation evidence hash', presentation.evidenceHash],
    ['Application result hash', presentation.applicationResultSemanticHash],
    ['Application evidence hash', presentation.applicationResultEvidenceHash],
    ['Source semantic hash', sourceSemanticHash],
    ['Model version', modelVersion],
    ['Signed force convention', 'Per action row; must match current interface presentation'],
  ];
  return sheet('Cover', ['Field', 'Value'], rows);
}

function actionSheet(name, actions, presentation, sourceSemanticHash, modelVersion, forceUnit, engineering) {
  const columns = [
    'Entity ID', 'Node ID', 'Interface ID', 'Load Case ID', 'Reporting Sign Convention',
    `Fa [${forceUnit}]`, `Fl [${forceUnit}]`, `Fv [${forceUnit}]`,
    'Triad Status', 'Triad Reason',
    'Source Semantic Hash', 'Model Version', 'Physical Load Case Hash',
    'Analysis Result Hash', 'Execution Hash', 'Recovery Hash', 'Triad Hash',
    'Presentation Hash', 'Export Eligibility',
  ];
  const rows = actions.map((action) => [
    action.entityId,
    action.nodeId,
    action.interfaceId,
    action.loadCaseId,
    action.reportingSignConvention,
    action.triad.fAxial,
    action.triad.fLateral,
    action.triad.fVertical,
    action.triad.status,
    action.triad.reason,
    sourceSemanticHash,
    modelVersion,
    action.physicalLoadCaseHash,
    action.analysisResultSemanticHash,
    action.executionHash,
    action.recoverySemanticHash,
    action.triad.semanticHash,
    presentation.semanticHash,
    presentation.exportEligibility,
  ]);
  return deepFreeze({ ...sheet(name, columns, rows), engineering });
}

function limitationsSheet(presentation) {
  const rows = [];
  for (const limitation of presentation.limitations) {
    rows.push(['LIMITATION', limitation.code ?? '', canonicalText(limitation)]);
  }
  for (const item of presentation.notConfigured) {
    rows.push(['NOT_CONFIGURED', item.code ?? '', canonicalText(item)]);
  }
  if (rows.length === 0) rows.push(['NONE', '', 'No retained limitations or not-configured items.']);
  return sheet('Limitations', ['Kind', 'Code', 'Evidence'], rows);
}

function signOffSheet(presentation, sourceSemanticHash, modelVersion) {
  return sheet('Sign-off', ['Field', 'Value'], [
    ['Engineering issue permitted', 'YES'],
    ['Application ID', presentation.applicationId],
    ['Presentation hash', presentation.semanticHash],
    ['Source semantic hash', sourceSemanticHash],
    ['Model version', modelVersion],
    ['Stress engineer', ''],
    ['Checked by', ''],
    ['Sign-off date', ''],
    ['Signature / approval reference', ''],
  ]);
}

function conditionalNoticeSheet(presentation) {
  return sheet('Conditional Notice', ['Field', 'Value'], [
    ['Engineering issue permitted', 'NO'],
    ['Status', 'AUDIT ONLY — CONDITIONAL'],
    ['Application ID', presentation.applicationId],
    ['Reason', 'Current presentation is not eligible for engineering issue. Review the Limitations sheet.'],
  ]);
}

function sheet(name, columns, rows) {
  return deepFreeze({
    name,
    columns: Object.freeze([...columns]),
    rows: Object.freeze(rows.map((row) => Object.freeze([...row]))),
  });
}

function addCellProvenanceComments(worksheet, sheetModel, exportModel) {
  const forceColumns = [5, 6, 7];
  sheetModel.rows.forEach((row, rowIndex) => {
    const provenance = [
      `Application: ${exportModel.applicationId}`,
      `Presentation: ${exportModel.presentationSemanticHash}`,
      `Source: ${row[10]}`,
      `Model version: ${row[11]}`,
      `Load case: ${row[3]}`,
      `Reporting sign: ${row[4]}`,
      `Physical load case: ${row[12]}`,
      `Analysis result: ${row[13]}`,
      `Execution: ${row[14]}`,
      `Recovery: ${row[15]}`,
      `Triad: ${row[16]}`,
      `Triad status: ${row[8]}${row[9] ? ` (${row[9]})` : ''}`,
    ].join('\n');
    for (const columnIndex of forceColumns) {
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = worksheet[address] ?? { t: 'z', v: null };
      cell.c = [{ a: 'Advanced Analysis', t: provenance }];
      worksheet[address] = cell;
    }
  });
}

function columnWidth(header, rows, index) {
  const values = rows.slice(0, 200).map((row) => String(row[index] ?? '').length);
  return Math.min(54, Math.max(10, String(header).length + 2, ...values) + 1);
}

function canonicalText(value) {
  return canonicalStringify(value);
}

function safeName(value) {
  const normalized = String(value).replace(/[^A-Za-z0-9._-]+/gu, '_');
  if (!normalized) fail('Application identity cannot form an XLSX file name.', 'PIPING_SUPPORT_ACTION_XLSX_NAME_INVALID');
  return normalized;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${field} must be a record.`, 'PIPING_SUPPORT_ACTION_XLSX_INPUT_INVALID');
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${field} must be a non-empty string.`, 'PIPING_SUPPORT_ACTION_XLSX_INPUT_INVALID');
  }
  return value;
}

function requireReportingSignConvention(value, field) {
  if (!INTERFACE_SIGN_CONVENTIONS.includes(value)) {
    fail(
      `${field} must be a recognized interface reporting sign convention.`,
      'PIPING_SUPPORT_ACTION_XLSX_SIGN_CONVENTION_INVALID',
    );
  }
  return value;
}

function requireHash(value, field) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail(`${field} must be a semantic hash.`, 'PIPING_SUPPORT_ACTION_XLSX_INPUT_INVALID');
  }
  return value;
}

function requireVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('modelVersion must be a non-negative safe integer.', 'PIPING_SUPPORT_ACTION_XLSX_INPUT_INVALID');
  }
  return value;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message, code) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}
