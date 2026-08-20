#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HP_REFERENTIAL_AUDIT_SCHEMA = 'high-pr-master-data-referential-audit/v1';
export const HP_REFERENTIAL_AUTHORITY = 'REFERENTIAL_CONTAINMENT_ONLY_NOT_CODE_QUALIFICATION';

const BLOCKED_PREFIX = 'BLOCKED_';
const NONE = new Set(['', 'NONE', 'NOT_APPLICABLE', 'N/A', 'NULL']);

function text(value) {
  return String(value ?? '').trim();
}

function isNone(value) {
  return NONE.has(text(value).toUpperCase());
}

function isBlockedStatus(value) {
  const status = text(value).toUpperCase();
  return status.startsWith(BLOCKED_PREFIX) || status === 'NOT_QUALIFIED';
}

export function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/u, ''));
      if (row.some((value) => text(value) !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ''));
    if (row.some((value) => text(value) !== '')) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map(text);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, text(values[index])])));
}

function loadCsv(dir, name, { optional = false } = {}) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    if (optional) return [];
    throw new Error(`HP_REFERENTIAL_REQUIRED_MASTER_MISSING: ${name}`);
  }
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = text(row[key]);
    if (!value) continue;
    if (map.has(value)) throw new Error(`HP_REFERENTIAL_DUPLICATE_KEY: ${key}=${value}`);
    map.set(value, row);
  }
  return map;
}

function setOf(rows, key) {
  return new Set(rows.map((row) => text(row[key])).filter(Boolean));
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = text(row[key]);
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function recordId(type, row) {
  const keys = {
    MATERIAL_IDENTITY: 'material_id',
    CYCLE_SPECTRUM: 'spectrum_id',
    FATIGUE_CURVE: 'fatigue_curve_id',
    COMPONENT_QUALIFICATION: 'qualification_id',
    PIPING_CLASS_ITEM: 'qualification_id',
    PIPING_CLASS: 'class_id',
    ANALYSIS_MAPPING: 'mapping_id',
    APPROVAL_RECORD: 'object_id',
  };
  return text(row[keys[type]]) || 'UNKNOWN';
}

function statusField(type) {
  return type === 'APPROVAL_RECORD' ? 'disposition' : (type === 'FATIGUE_CURVE' ? 'qualification_state' : 'status');
}

function unique(values) {
  return [...new Set(values)].sort();
}

export function auditHighPrReferences(dir) {
  const data = {
    methodManifest: loadCsv(dir, 'method_manifest.csv'),
    materialIdentity: loadCsv(dir, 'material_identity.csv'),
    materialProperty: loadCsv(dir, 'material_property.csv'),
    pipeProduct: loadCsv(dir, 'pipe_product.csv'),
    corrosionModel: loadCsv(dir, 'corrosion_model.csv'),
    cycleSpectrum: loadCsv(dir, 'cycle_spectrum.csv'),
    operatingState: loadCsv(dir, 'operating_state.csv'),
    cycleTransition: loadCsv(dir, 'cycle_transition.csv'),
    fatigueCurve: loadCsv(dir, 'fatigue_curve.csv'),
    fatigueCurvePoint: loadCsv(dir, 'fatigue_curve_point.csv'),
    componentCatalog: loadCsv(dir, 'component_catalog.csv'),
    sifStressIndex: loadCsv(dir, 'sif_stress_index.csv'),
    componentQualification: loadCsv(dir, 'component_qualification.csv'),
    pipingClass: loadCsv(dir, 'piping_class.csv'),
    pipingClassItem: loadCsv(dir, 'piping_class_item.csv'),
    fatigueEnvelopePoint: loadCsv(dir, 'fatigue_envelope_point.csv'),
    analysisMapping: loadCsv(dir, 'analysis_mapping.csv'),
    approvalRecord: loadCsv(dir, 'approval_record.csv'),
    feaEvidence: loadCsv(dir, 'fea_evidence.csv', { optional: true }),
    vendorEvidence: loadCsv(dir, 'vendor_evidence.csv', { optional: true }),
    materialMap: loadCsv(dir, 'material_map.csv', { optional: true }),
    loadCaseTemplate: loadCsv(dir, 'load_case_template.csv', { optional: true }),
  };

  const methodById = indexBy(data.methodManifest, 'method_id');
  const materialById = indexBy(data.materialIdentity, 'material_id');
  const productById = indexBy(data.pipeProduct, 'product_id');
  const corrosionById = indexBy(data.corrosionModel, 'corrosion_model_id');
  const spectrumById = indexBy(data.cycleSpectrum, 'spectrum_id');
  const curveById = indexBy(data.fatigueCurve, 'fatigue_curve_id');
  const componentById = indexBy(data.componentCatalog, 'component_id');
  const qualificationById = indexBy(data.componentQualification, 'qualification_id');
  const classById = indexBy(data.pipingClass, 'class_id');
  indexBy(data.analysisMapping, 'mapping_id');

  const propertiesByMaterial = groupBy(data.materialProperty, 'material_id');
  const statesBySpectrum = groupBy(data.operatingState, 'spectrum_id');
  const transitionsBySpectrum = groupBy(data.cycleTransition, 'spectrum_id');
  const curvePointsByCurve = groupBy(data.fatigueCurvePoint, 'fatigue_curve_id');
  const itemsByClass = groupBy(data.pipingClassItem, 'class_id');
  const envelopes = setOf(data.fatigueEnvelopePoint, 'envelope_id');
  const sifGeometry = setOf(data.sifStressIndex, 'geometry_key');
  const feaEvidence = setOf(data.feaEvidence, 'evidence_id');
  const vendorEvidence = setOf(data.vendorEvidence, 'evidence_id');
  const materialMaps = setOf(data.materialMap, 'material_map_id');
  const loadCaseTemplates = setOf(data.loadCaseTemplate, 'load_case_template_id');

  const unresolved = [];
  const issueKeysByRecord = new Map();
  const missing = {
    materialPropertyIds: [],
    envelopeIds: [],
    feaEvidenceIds: [],
    vendorEvidenceIds: [],
    materialMapIds: [],
    loadCaseTemplateIds: [],
    approvalTargets: [],
  };

  function addIssue(type, row, code, detail = {}) {
    const id = recordId(type, row);
    const field = statusField(type);
    const status = text(row[field]);
    const key = `${type}:${id}`;
    if (!issueKeysByRecord.has(key)) issueKeysByRecord.set(key, []);
    issueKeysByRecord.get(key).push(code);
    unresolved.push({ type, id, code, status, blocked: isBlockedStatus(status), ...detail });
  }

  for (const row of data.materialIdentity) {
    const id = text(row.material_id);
    if ((propertiesByMaterial.get(id) ?? []).length === 0) {
      missing.materialPropertyIds.push(id);
      addIssue('MATERIAL_IDENTITY', row, 'HP_ACTIVE_MATERIAL_WITHOUT_PROPERTIES', { materialId: id });
    }
  }

  for (const row of data.cycleSpectrum) {
    const id = text(row.spectrum_id);
    const states = statesBySpectrum.get(id) ?? [];
    const transitions = transitionsBySpectrum.get(id) ?? [];
    if (states.length === 0 || transitions.length === 0) {
      addIssue('CYCLE_SPECTRUM', row, 'HP_SPECTRUM_INCOMPLETE', {
        stateCount: states.length,
        transitionCount: transitions.length,
      });
    }
  }

  for (const row of data.cycleTransition) {
    const spectrum = text(row.spectrum_id);
    const states = new Set((statesBySpectrum.get(spectrum) ?? []).map((state) => text(state.state_id)));
    for (const [field, code] of [['from_state_id', 'HP_TRANSITION_FROM_STATE_MISSING'], ['to_state_id', 'HP_TRANSITION_TO_STATE_MISSING']]) {
      if (!states.has(text(row[field]))) {
        unresolved.push({
          type: 'CYCLE_TRANSITION',
          id: `${spectrum}/${text(row.cycle_id)}`,
          code,
          status: text(row.status),
          blocked: isBlockedStatus(row.status),
          missingStateId: text(row[field]),
        });
      }
    }
  }

  for (const row of data.fatigueCurve) {
    const id = text(row.fatigue_curve_id);
    const points = curvePointsByCurve.get(id) ?? [];
    if (points.length < 2) addIssue('FATIGUE_CURVE', row, 'HP_FATIGUE_CURVE_POINTS_INCOMPLETE', { pointCount: points.length });
  }

  const qualificationIssueIds = new Set();
  for (const row of data.componentQualification) {
    const id = text(row.qualification_id);
    const reasons = [];
    if (!componentById.has(text(row.component_id))) reasons.push('HP_QUALIFICATION_COMPONENT_MISSING');
    if (!sifGeometry.has(text(row.b31j_geometry_key))) reasons.push('HP_QUALIFICATION_GEOMETRY_MISSING');
    const envelopeId = text(row.fatigue_envelope_id);
    if (!isNone(envelopeId) && !envelopes.has(envelopeId)) {
      reasons.push('HP_QUALIFICATION_ENVELOPE_MISSING');
      missing.envelopeIds.push(envelopeId);
    }
    const feaId = text(row.fea_evidence_id);
    if (!isNone(feaId) && !feaEvidence.has(feaId)) {
      reasons.push('HP_QUALIFICATION_FEA_EVIDENCE_MISSING');
      missing.feaEvidenceIds.push(feaId);
    }
    const vendorId = text(row.vendor_evidence_id);
    if (!isNone(vendorId) && !vendorEvidence.has(vendorId)) {
      reasons.push('HP_QUALIFICATION_VENDOR_EVIDENCE_MISSING');
      missing.vendorEvidenceIds.push(vendorId);
    }
    if (reasons.length > 0) {
      qualificationIssueIds.add(id);
      for (const code of reasons) addIssue('COMPONENT_QUALIFICATION', row, code);
    }
  }

  const classItemIssueKeys = new Set();
  for (const [index, row] of data.pipingClassItem.entries()) {
    const key = `${text(row.class_id)}:${index}`;
    const reasons = [];
    if (!classById.has(text(row.class_id))) reasons.push('HP_CLASS_ITEM_CLASS_MISSING');
    if (!componentById.has(text(row.component_id))) reasons.push('HP_CLASS_ITEM_COMPONENT_MISSING');
    if (!productById.has(text(row.product_id))) reasons.push('HP_CLASS_ITEM_PRODUCT_MISSING');
    const qid = text(row.qualification_id);
    if (!qualificationById.has(qid)) reasons.push('HP_CLASS_ITEM_QUALIFICATION_MISSING');
    if (qualificationIssueIds.has(qid) || isBlockedStatus(qualificationById.get(qid)?.status)) reasons.push('HP_CLASS_ITEM_QUALIFICATION_INCOMPLETE');
    if (reasons.length > 0) {
      classItemIssueKeys.add(key);
      for (const code of reasons) {
        unresolved.push({
          type: 'PIPING_CLASS_ITEM',
          id: `${text(row.class_id)}/${text(row.component_type)}/${text(row.size_from_nps)}-${text(row.size_to_nps)}`,
          code,
          status: text(row.status),
          blocked: isBlockedStatus(row.status),
          qualificationId: qid,
        });
      }
    }
  }

  const classIssueIds = new Set();
  for (const row of data.pipingClass) {
    const id = text(row.class_id);
    const reasons = [];
    const spectrum = spectrumById.get(text(row.spectrum_id));
    if (!corrosionById.has(text(row.corrosion_model_id))) reasons.push('HP_CLASS_CORROSION_MODEL_MISSING');
    if (!spectrum) reasons.push('HP_CLASS_SPECTRUM_MISSING');
    if (spectrum && text(spectrum.class_id) !== id) reasons.push('HP_CLASS_SPECTRUM_OWNERSHIP_MISMATCH');
    if (spectrum && issueKeysByRecord.has(`CYCLE_SPECTRUM:${text(spectrum.spectrum_id)}`)) reasons.push('HP_CLASS_SPECTRUM_INCOMPLETE');
    const items = itemsByClass.get(id) ?? [];
    if (items.length === 0) reasons.push('HP_CLASS_ITEMS_MISSING');
    if (items.some((item) => {
      const globalIndex = data.pipingClassItem.indexOf(item);
      return classItemIssueKeys.has(`${id}:${globalIndex}`);
    })) reasons.push('HP_CLASS_HAS_INCOMPLETE_ITEMS');
    if (reasons.length > 0) {
      classIssueIds.add(id);
      for (const code of reasons) addIssue('PIPING_CLASS', row, code);
    }
  }

  for (const row of data.analysisMapping) {
    const materialMapId = text(row.material_map_id);
    const loadCaseTemplateId = text(row.load_case_template_id);
    if (!isNone(materialMapId) && !materialMaps.has(materialMapId)) {
      missing.materialMapIds.push(materialMapId);
      addIssue('ANALYSIS_MAPPING', row, 'HP_ANALYSIS_MATERIAL_MAP_MISSING', { materialMapId });
    }
    if (!isNone(loadCaseTemplateId) && !loadCaseTemplates.has(loadCaseTemplateId)) {
      missing.loadCaseTemplateIds.push(loadCaseTemplateId);
      addIssue('ANALYSIS_MAPPING', row, 'HP_ANALYSIS_LOAD_CASE_TEMPLATE_MISSING', { loadCaseTemplateId });
    }
    if (!curveById.has(text(row.fatigue_curve_id))) addIssue('ANALYSIS_MAPPING', row, 'HP_ANALYSIS_FATIGUE_CURVE_MISSING');
  }

  const approvalResolvers = {
    METHOD_MANIFEST: (id) => ({ exists: methodById.has(id), incomplete: false }),
    MATERIAL_DATA: (id) => ({ exists: materialById.has(id), incomplete: issueKeysByRecord.has(`MATERIAL_IDENTITY:${id}`) }),
    FATIGUE_CURVE: (id) => ({ exists: curveById.has(id), incomplete: issueKeysByRecord.has(`FATIGUE_CURVE:${id}`) }),
    PIPING_CLASS: (id) => ({ exists: classById.has(id), incomplete: classIssueIds.has(id) }),
  };
  for (const row of data.approvalRecord) {
    const type = text(row.object_type);
    const id = text(row.object_id);
    const resolver = approvalResolvers[type];
    if (!resolver) {
      missing.approvalTargets.push(`${type}:${id}`);
      addIssue('APPROVAL_RECORD', row, 'HP_APPROVAL_TARGET_TYPE_UNRESOLVED', { objectType: type });
      continue;
    }
    const target = resolver(id);
    if (!target.exists) {
      missing.approvalTargets.push(`${type}:${id}`);
      addIssue('APPROVAL_RECORD', row, 'HP_APPROVAL_TARGET_MISSING', { objectType: type });
    } else if (target.incomplete) {
      addIssue('APPROVAL_RECORD', row, 'HP_APPROVAL_TARGET_INCOMPLETE', { objectType: type });
    }
  }

  const unsafe = unresolved.filter((issue) => !issue.blocked);
  const unresolvedRecords = unique(unresolved.map((issue) => `${issue.type}:${issue.id}`));
  const unsafeRecords = unique(unsafe.map((issue) => `${issue.type}:${issue.id}`));

  return {
    schema: HP_REFERENTIAL_AUDIT_SCHEMA,
    authority: HP_REFERENTIAL_AUTHORITY,
    referentialCompleteness: unresolved.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
    failClosedContainment: unsafe.length === 0 ? 'PASS' : 'FAIL',
    releaseReady: false,
    unresolvedIssueCount: unresolved.length,
    unresolvedRecordCount: unresolvedRecords.length,
    unsafeActiveIssueCount: unsafe.length,
    unsafeActiveRecordCount: unsafeRecords.length,
    unresolvedRecords,
    unsafeActiveRecords: unsafeRecords,
    missingReferences: Object.fromEntries(Object.entries(missing).map(([key, values]) => [key, unique(values)])),
    issues: unresolved,
  };
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('docs/High Pr');
  const result = auditHighPrReferences(dir);
  console.log(JSON.stringify(result, null, 2));
  if (result.failClosedContainment !== 'PASS') process.exitCode = 1;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) main();
