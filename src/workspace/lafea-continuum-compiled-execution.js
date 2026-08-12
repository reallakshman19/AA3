/** Parity-only execution bridge from a compiled LAFEA.3 solver model to the existing continuum kernel. */
import {
  CANONICAL_UNITS,
  MODEL_SCHEMA,
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
} from '../core/local-continuum/index.js';
import { lafeaUnitFactor } from '../core/lafea-common-input/units.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { LAFEA_CONTINUUM_SOLVER_MODEL_SCHEMA } from './lafea-continuum-solver-model.js';

export const LAFEA_CONTINUUM_COMPILED_EXECUTION_SCHEMA =
  'lafea-continuum-compiled-execution/v1';
export const LAFEA_CONTINUUM_COMPILED_EXECUTION_MODE = 'PARITY_ONLY_NOT_RETAINED';

const STAGE_ID = 'LAFEA.3';
const KINDS = new Set([
  'RESTRAINT', 'IMPOSED_DISPLACEMENT', 'CONCENTRATED_LOAD', 'TRACTION',
  'PRESSURE', 'BODY_FORCE', 'TEMPERATURE',
]);

export function executeLafeaContinuumCompiledForParity(value) {
  const solverModel = validateSolverModel(value);
  const executionInput = buildExecutionInput(solverModel);
  const canonicalInput = createCanonicalLocalContinuumModel(executionInput);
  const executionResult = calculateLocalContinuum(canonicalInput);
  const base = freeze({
    schema: LAFEA_CONTINUUM_COMPILED_EXECUTION_SCHEMA,
    stageId: STAGE_ID,
    mode: LAFEA_CONTINUUM_COMPILED_EXECUTION_MODE,
    solverModelHash: solverModel.solverModelHash,
    canonicalExecutionInputHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-compiled-execution-input-hash/v1',
      canonicalInput,
    }),
    qualificationState: executionResult.qualification?.state ?? null,
    executionResult,
    lifecycleExecutionPublished: false,
    lifecycleRecoveryPublished: false,
    releaseQualified: false,
  });
  return freeze({
    ...base,
    parityEvidenceHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-compiled-execution-hash-input/v1', evidence: base,
    }),
  });
}

function buildExecutionInput(model) {
  const sections = new Map(model.sections.map((row) => [row.sectionId, row]));
  const nodeIds = new Set(model.nodes.map((row) => row.nodeId));
  const elementIds = new Set(model.elements.map((row) => row.elementId));
  const caseMap = new Map(model.physicalCases.map((row) => [row.caseId, emptyCase(row.caseId)]));
  const constraints = [];
  const allCaseIds = [...caseMap.keys()].sort(compare);

  for (const attachment of model.attachments) {
    requireAttachmentCases(attachment, caseMap);
    requireCompiledTarget(attachment, nodeIds, elementIds);
    if (attachment.kind === 'RESTRAINT') {
      if (!sameIds(attachment.physicalCaseIds, allCaseIds)) {
        fail('LAFEA_CONTINUUM_COMPILED_CASE_SPECIFIC_RESTRAINT_UNSUPPORTED');
      }
      appendRestraints(constraints, attachment);
      continue;
    }
    for (const caseId of attachment.physicalCaseIds) {
      appendCaseAttachment(caseMap.get(caseId), attachment, model);
    }
  }

  return {
    schema: MODEL_SCHEMA,
    modelIdentity: model.sourceModel.modelIdentity,
    modelVersion: model.sourceModel.modelVersion,
    sourceAncestry: { ...model.sourceModel.sourceAncestry },
    units: { ...model.units },
    formulation: model.formulation,
    materials: model.materials.map((row) => ({
      materialId: row.materialId,
      elasticModulus: row.elasticModulus,
      poissonRatio: row.poissonRatio,
      sourceReference: ref(model, `MATERIAL/${row.materialId}`),
    })),
    nodes: model.nodes.map((row) => ({
      nodeId: row.nodeId, x: row.x, y: row.y,
      sourceReference: ref(model, `NODE/${row.nodeId}`),
    })),
    elements: model.elements.map((row) => {
      const section = sections.get(row.sectionId);
      if (!section) fail('LAFEA_CONTINUUM_COMPILED_SECTION_REFERENCE_MISSING');
      return {
        elementId: row.elementId,
        elementType: row.elementType,
        nodeIds: [...row.nodeIds],
        materialId: row.materialId,
        thickness: section.thickness,
        sourceReference: ref(model, `ELEMENT/${row.elementId}`),
      };
    }),
    elementTypePolicy: { ...model.sourceModel.elementTypePolicy },
    constraints,
    loadCases: [...caseMap.values()],
    resultRequests: { loadCaseIds: [...model.requestedCaseIds] },
    qualificationProfile: structuredClone(model.qualificationProfile),
    limitations: [...new Set([
      ...model.limitations,
      'DOMAIN_FIRST_COMPILED_PARITY_EXECUTION_ONLY',
    ])].sort(compare),
  };
}

function appendRestraints(output, attachment) {
  const payload = payloadObject(attachment, ['ux', 'uy'], []);
  const active = ['ux', 'uy'].filter((key) => payload[key] === true);
  for (const key of ['ux', 'uy']) {
    if (key in payload && typeof payload[key] !== 'boolean') {
      fail('LAFEA_CONTINUUM_COMPILED_RESTRAINT_PAYLOAD_INVALID');
    }
  }
  if (!active.length) fail('LAFEA_CONTINUUM_COMPILED_RESTRAINT_DOF_REQUIRED');
  for (const nodeId of attachment.compiledTarget.nodeIds) {
    for (const key of active) {
      const dof = key.toUpperCase();
      output.push({
        constraintId: `${attachment.attachmentId}/${nodeId}/${dof}`,
        nodeId, dof, value: 0,
        sourceReference: `COMPILED_ATTACHMENT#${attachment.attachmentId}`,
      });
    }
  }
}

function appendCaseAttachment(loadCase, attachment, model) {
  if (attachment.kind === 'IMPOSED_DISPLACEMENT') return appendImposed(loadCase, attachment);
  if (attachment.kind === 'CONCENTRATED_LOAD') return appendForce(loadCase, attachment);
  if (attachment.kind === 'TRACTION') return appendEdge(loadCase, attachment, 'TRACTION');
  if (attachment.kind === 'PRESSURE') return appendEdge(loadCase, attachment, 'PRESSURE');
  if (attachment.kind === 'BODY_FORCE') return appendBodyForce(loadCase, attachment, model);
  if (attachment.kind === 'TEMPERATURE') {
    fail('LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED');
  }
  fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_KIND_UNSUPPORTED');
}

function appendImposed(loadCase, attachment) {
  const payload = payloadObject(attachment, ['ux', 'uy', 'unit'], ['unit']);
  const components = ['ux', 'uy'].filter((key) => key in payload);
  if (!components.length) fail('LAFEA_CONTINUUM_COMPILED_IMPOSED_DOF_REQUIRED');
  const factor = dimensionFactor('length', payload.unit);
  for (const key of components) {
    const value = finite(payload[key], 'LAFEA_CONTINUUM_COMPILED_IMPOSED_VALUE_INVALID') * factor;
    for (const nodeId of attachment.compiledTarget.nodeIds) {
      loadCase.imposedDisplacements.push({
        imposedDisplacementId: `${attachment.attachmentId}/${nodeId}/${key.toUpperCase()}`,
        nodeId, dof: key.toUpperCase(), value,
        sourceReference: `COMPILED_ATTACHMENT#${attachment.attachmentId}`,
      });
    }
  }
}

function appendForce(loadCase, attachment) {
  const payload = payloadObject(attachment, ['fx', 'fy', 'unit'], ['fx', 'fy', 'unit']);
  const [nodeId] = attachment.compiledTarget.nodeIds;
  if (attachment.compiledTarget.nodeIds.length !== 1) {
    fail('LAFEA_CONTINUUM_COMPILED_FORCE_VERTEX_MAPPING_INVALID');
  }
  const factor = dimensionFactor('force', payload.unit);
  loadCase.nodalForces.push({
    loadId: attachment.attachmentId,
    nodeId,
    fx: finite(payload.fx, 'LAFEA_CONTINUUM_COMPILED_FORCE_VALUE_INVALID') * factor,
    fy: finite(payload.fy, 'LAFEA_CONTINUUM_COMPILED_FORCE_VALUE_INVALID') * factor,
    sourceReference: `COMPILED_ATTACHMENT#${attachment.attachmentId}`,
  });
}

function appendEdge(loadCase, attachment, kind) {
  const pressure = kind === 'PRESSURE';
  const allowed = pressure ? ['pressure', 'unit'] : ['tx', 'ty', 'unit'];
  const payload = payloadObject(attachment, allowed, allowed);
  const target = attachment.compiledTarget;
  if (!target.edgeNodePaths.length || target.edgeNodePaths.length !== target.elementIds.length) {
    fail('LAFEA_CONTINUUM_COMPILED_EDGE_OWNER_MAPPING_INVALID');
  }
  const factor = dimensionFactor('stress', payload.unit);
  target.edgeNodePaths.forEach((edgeNodeIds, index) => {
    const common = {
      elementId: target.elementIds[index],
      edgeNodeIds: [...edgeNodeIds],
      sourceReference: `COMPILED_ATTACHMENT#${attachment.attachmentId}`,
    };
    if (pressure) {
      loadCase.pressureLoads.push({
        pressureLoadId: `${attachment.attachmentId}/${index + 1}`,
        ...common,
        pressure: finite(
          payload.pressure, 'LAFEA_CONTINUUM_COMPILED_PRESSURE_VALUE_INVALID',
        ) * factor,
      });
    } else {
      loadCase.edgeTractions.push({
        tractionId: `${attachment.attachmentId}/${index + 1}`,
        ...common,
        tx: finite(payload.tx, 'LAFEA_CONTINUUM_COMPILED_TRACTION_VALUE_INVALID') * factor,
        ty: finite(payload.ty, 'LAFEA_CONTINUUM_COMPILED_TRACTION_VALUE_INVALID') * factor,
      });
    }
  });
}

function appendBodyForce(loadCase, attachment, model) {
  if (!attachment.compiledTarget.elementIds.length) {
    fail('LAFEA_CONTINUUM_COMPILED_REGION_MAPPING_EMPTY');
  }
  const payload = payloadObject(attachment, ['bx', 'by', 'unit'], ['bx', 'by', 'unit']);
  const factor = bodyForceFactor(payload.unit, model);
  for (const elementId of attachment.compiledTarget.elementIds) {
    loadCase.bodyForces.push({
      bodyForceId: `${attachment.attachmentId}/${elementId}`,
      elementId,
      bx: finite(payload.bx, 'LAFEA_CONTINUUM_COMPILED_BODY_FORCE_VALUE_INVALID') * factor,
      by: finite(payload.by, 'LAFEA_CONTINUUM_COMPILED_BODY_FORCE_VALUE_INVALID') * factor,
      sourceReference: `COMPILED_ATTACHMENT#${attachment.attachmentId}`,
    });
  }
}

function validateSolverModel(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('LAFEA_CONTINUUM_COMPILED_SOLVER_MODEL_REQUIRED');
  }
  if (value.schema !== LAFEA_CONTINUUM_SOLVER_MODEL_SCHEMA
    || value.stageId !== STAGE_ID || value.status !== 'COMPILED') {
    fail('LAFEA_CONTINUUM_COMPILED_SOLVER_MODEL_SCHEMA_INVALID');
  }
  if (value.executionAuthorized !== false || value.releaseQualified !== false) {
    fail('LAFEA_CONTINUUM_COMPILED_AUTHORITY_STATE_INVALID');
  }
  if (value.coordinateSystemId !== 'GLOBAL_XY') {
    fail('LAFEA_CONTINUUM_COMPILED_COORDINATE_SYSTEM_UNSUPPORTED');
  }
  if (value.dofPolicy?.dofsPerNode !== 2
    || JSON.stringify(value.dofPolicy?.dofOrder) !== JSON.stringify(['UX', 'UY'])) {
    fail('LAFEA_CONTINUUM_COMPILED_DOF_POLICY_INVALID');
  }
  requireCanonicalUnits(value.units);
  requireSourceModel(value.sourceModel);
  for (const key of [
    'materials', 'sections', 'nodes', 'elements', 'physicalCases',
    'attachments', 'requestedCaseIds', 'limitations',
  ]) {
    if (!Array.isArray(value[key])) fail(`LAFEA_CONTINUUM_COMPILED_${key.toUpperCase()}_INVALID`);
  }
  if (!value.materials.length || !value.sections.length || !value.nodes.length
    || !value.elements.length || !value.physicalCases.length) {
    fail('LAFEA_CONTINUUM_COMPILED_SOLVER_MODEL_EMPTY');
  }
  if (!value.qualificationProfile || typeof value.qualificationProfile !== 'object') {
    fail('LAFEA_CONTINUUM_COMPILED_PROFILE_INVALID');
  }
  if (!value.attachments.every((row) => KINDS.has(row?.kind))) {
    fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_KIND_UNSUPPORTED');
  }
  const copy = structuredClone(value);
  delete copy.solverModelHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea-continuum-solver-model-hash-input/v1', model: copy,
  });
  if (value.solverModelHash !== expected) {
    fail('LAFEA_CONTINUUM_COMPILED_SOLVER_MODEL_HASH_INVALID');
  }
  return value;
}

function requireCanonicalUnits(units) {
  for (const key of ['length', 'force', 'stress', 'modulus']) {
    if (units?.[key] !== CANONICAL_UNITS[key]) {
      fail('LAFEA_CONTINUUM_COMPILED_CANONICAL_UNITS_INVALID');
    }
  }
}

function requireSourceModel(value) {
  if (!value || typeof value !== 'object' || !text(value.modelIdentity) || !text(value.modelVersion)
    || !value.sourceAncestry || typeof value.sourceAncestry !== 'object'
    || !value.elementTypePolicy || typeof value.elementTypePolicy !== 'object') {
    fail('LAFEA_CONTINUUM_COMPILED_SOURCE_MODEL_INVALID');
  }
}

function requireAttachmentCases(attachment, caseMap) {
  if (!Array.isArray(attachment.physicalCaseIds) || !attachment.physicalCaseIds.length
    || attachment.physicalCaseIds.some((caseId) => !caseMap.has(caseId))) {
    fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_CASE_INVALID');
  }
}

function requireCompiledTarget(attachment, nodeIds, elementIds) {
  const target = attachment.compiledTarget;
  if (!target || target.targetType !== attachment.targetType || target.featureId !== attachment.targetId
    || !Array.isArray(target.nodeIds) || !Array.isArray(target.edgeNodePaths)
    || !Array.isArray(target.elementIds)) {
    fail('LAFEA_CONTINUUM_COMPILED_TARGET_INVALID');
  }
  if (target.nodeIds.some((id) => !nodeIds.has(id))
    || target.elementIds.some((id) => !elementIds.has(id))) {
    fail('LAFEA_CONTINUUM_COMPILED_TARGET_REFERENCE_INVALID');
  }
  if (target.edgeNodePaths.flat().some((id) => !nodeIds.has(id))) {
    fail('LAFEA_CONTINUUM_COMPILED_EDGE_NODE_REFERENCE_INVALID');
  }
}

function payloadObject(attachment, allowed, required) {
  const value = attachment.payload;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_PAYLOAD_INVALID');
  }
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key))
    || required.some((key) => !(key in value))) {
    fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_PAYLOAD_INVALID');
  }
  return value;
}

function dimensionFactor(dimension, unit) {
  const factor = lafeaUnitFactor(dimension, unit);
  if (factor === null) fail('LAFEA_CONTINUUM_COMPILED_ATTACHMENT_UNIT_UNSUPPORTED');
  return factor;
}

function bodyForceFactor(unit, model) {
  const forceUnit = model.declaredUnits?.force;
  const lengthUnit = model.declaredUnits?.length;
  const stressUnit = model.declaredUnits?.stress;
  const forceFactor = lafeaUnitFactor('force', forceUnit);
  const lengthFactor = lafeaUnitFactor('length', lengthUnit);
  const stressFactor = lafeaUnitFactor('stress', stressUnit);
  if (forceFactor === null || lengthFactor === null || stressFactor === null) {
    fail('LAFEA_CONTINUUM_COMPILED_DECLARED_UNITS_INVALID');
  }
  if (unit === `${forceUnit}/${lengthUnit}^3`) return forceFactor / (lengthFactor ** 3);
  if (unit === `${stressUnit}/${lengthUnit}`) return stressFactor / lengthFactor;
  fail('LAFEA_CONTINUUM_COMPILED_BODY_FORCE_UNIT_UNSUPPORTED');
}

function emptyCase(loadCaseId) {
  return {
    loadCaseId,
    nodalForces: [],
    edgeTractions: [],
    pressureLoads: [],
    bodyForces: [],
    temperatureLoads: [],
    imposedDisplacements: [],
    sourceReference: `COMPILED_CASE#${loadCaseId}`,
  };
}

function ref(model, suffix) { return `SOLVER_MODEL#${model.solverModelHash}/${suffix}`; }
function finite(value, code) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(code);
  return value;
}
function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function sameIds(left, right) {
  return JSON.stringify([...left].sort(compare)) === JSON.stringify([...right].sort(compare));
}
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
