import { semanticHash } from '../core/shared-primitives/canonical-json.js';
import {
  createLocalAttachmentScreeningAssessment,
} from '../core/local-attachment-screening/index.js';
import {
  createEmp1RetainedFoundationLayer,
  emp1Wrc537Gamma5ZeroDpOrchestrationQualification,
  prepareEmp1Wrc537Gamma5ZeroDpLocalSource,
  refreshEmp1BSourceEvidence,
  runEmp1,
  runEmp1Wrc537Gamma5ZeroDpLocalCorrelation,
} from '../core/emp1/index.js';
import { executeLafeaStage } from './lafea-workbench-model.js';

export const EMP1_WORKBENCH_RUN_INPUT_SCHEMA = 'emp1-workbench-run-input/v1';
export const EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA = 'emp1-workbench-product-execution/v1';

const RUN_INPUT_KEYS = Object.freeze(['schema', 'screeningAssessment', 'localMethod']);
const SCREENING_KEYS = Object.freeze([
  'assessmentIdentity', 'assessmentProfileId', 'governingQuantity', 'applicabilityRecords',
]);
const LOCAL_METHOD_KEYS = Object.freeze(['routeRequest']);

/**
 * Execute the public EMP.1 product over the retained analytical engines.
 *
 * This coordinator owns orchestration only. It does not alter either retained
 * LAFEA document, create source authority, qualify release, invent screening
 * applicability, or infer WRC inputs. B source evidence is refreshed in-memory
 * from the actual A execution before B is calculated.
 */
export async function executeEmp1WorkbenchProduct(options = {}) {
  const aDocument = requireRecord(options.aDocument, 'EMP1_WORKBENCH_A_DOCUMENT_REQUIRED');
  const bDocument = requireRecord(options.bDocument, 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED');
  const runInput = normalizeEmp1WorkbenchRunInput(options.runInput);
  const inputHashes = currentInputHashes({ aDocument, bDocument, runInput });
  const previous = normalizePrevious(options.previous);
  const changeClasses = reconcileChangeClasses(
    options.changeClasses,
    previous?.inputHashes,
    inputHashes,
  );
  const productSource = buildProductSource(runInput);
  const sourceHash = semanticHash({
    schema: 'emp1-workbench-source-binding/v1',
    inputHashes,
    productSource,
  });
  const qualification = emp1Wrc537Gamma5ZeroDpOrchestrationQualification();
  const hasLocalRoute = Boolean(runInput.localMethod?.routeRequest);
  const invocations = { loadTransfer: 0, sectionScreening: 0, localCorrelation: 0, localPreparation: 0 };

  const adapters = {
    runLoadTransfer: () => {
      invocations.loadTransfer += 1;
      const execution = qualifiedStageExecution('LAFEA.1', aDocument);
      const retained = createEmp1RetainedFoundationLayer(execution.result);
      return deepFreeze({ ...retained, execution });
    },
    runSectionScreening: ({ loadTransfer }) => {
      invocations.sectionScreening += 1;
      const aExecution = requireLayerExecution(loadTransfer, 'LAFEA.1');
      const refreshed = refreshEmp1BSourceEvidence({
        aDocument,
        aExecution,
        bDocument,
      });
      const execution = qualifiedStageExecution('LAFEA.2', refreshed);
      return screeningLayer(execution, runInput.screeningAssessment);
    },
    runLocalCorrelation: (context) => {
      invocations.localCorrelation += 1;
      if (!hasLocalRoute) throw workbenchError('EMP1_WORKBENCH_LOCAL_ROUTE_NOT_CONFIGURED');
      return runEmp1Wrc537Gamma5ZeroDpLocalCorrelation(context);
    },
  };
  if (hasLocalRoute) {
    adapters.prepareLocalCorrelationSource = (context) => {
      invocations.localPreparation += 1;
      return prepareEmp1Wrc537Gamma5ZeroDpLocalSource(context);
    };
  }

  const result = await runEmp1({
    source: productSource,
    sourceHash,
    previous: previous?.result,
    changeClasses,
    methodQualification: qualification.methodQualification,
    benchmarkQualification: qualification.benchmarkQualification,
    adapters,
  });

  return deepFreeze({
    schema: EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
    productId: 'EMP.1',
    status: 'CALCULATED',
    decision: result.assessment.decision,
    sourceHash,
    inputHashes,
    changeClasses,
    runInput,
    invocations,
    result,
    stageExecutions: {
      loadTransfer: result.loadTransfer?.execution ?? null,
      sectionScreening: result.sectionScreening?.execution ?? null,
    },
    currentness: {
      state: 'CURRENT',
      pendingChangeClasses: [],
    },
    authority: {
      codeComplianceProduced: false,
      releaseQualified: false,
      globalEmp1CRouteAuthority: false,
      boundedLocalRouteRequested: hasLocalRoute,
    },
  });
}

export function normalizeEmp1WorkbenchRunInput(value) {
  if (value == null) {
    return deepFreeze({
      schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
      screeningAssessment: null,
      localMethod: null,
    });
  }
  const input = exactRecord(value, RUN_INPUT_KEYS, 'EMP1_WORKBENCH_RUN_INPUT_KEYS_INVALID');
  if (input.schema !== EMP1_WORKBENCH_RUN_INPUT_SCHEMA) {
    throw workbenchError('EMP1_WORKBENCH_RUN_INPUT_SCHEMA_INVALID');
  }
  return deepFreeze({
    schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
    screeningAssessment: normalizeScreeningAssessment(input.screeningAssessment),
    localMethod: normalizeLocalMethod(input.localMethod),
  });
}

export function emp1WorkbenchRunInputHash(value) {
  return semanticHash(normalizeEmp1WorkbenchRunInput(value));
}

function screeningLayer(execution, assessmentInput) {
  const screeningResultHash = execution.result?.semanticHashes?.screeningResultPayloadSemanticHash;
  if (typeof screeningResultHash !== 'string') {
    throw workbenchError('EMP1_WORKBENCH_B_RESULT_HASH_REQUIRED');
  }
  if (!assessmentInput) {
    const reasons = Object.freeze(['EMP1_SCREENING_APPLICABILITY_EVIDENCE_REQUIRED']);
    return deepFreeze({
      schema: 'emp1-b-workbench-layer/v1',
      qualification: 'FAIL',
      decision: 'BLOCKED',
      reasons,
      assessment: null,
      execution,
      resultHash: semanticHash({ screeningResultHash, decision: 'BLOCKED', reasons }),
    });
  }
  const assessment = createLocalAttachmentScreeningAssessment({
    screeningResult: execution.result,
    ...assessmentInput,
  });
  const reasons = [...new Set(
    assessment.decisions.flatMap((row) => row.rationaleCodes ?? []),
  )].sort();
  return deepFreeze({
    schema: 'emp1-b-workbench-layer/v1',
    qualification: assessment.state === 'BLOCKED' ? 'FAIL' : 'PASS',
    decision: assessment.state,
    reasons,
    assessment,
    execution,
    resultHash: semanticHash({ screeningResultHash, assessment }),
  });
}

function qualifiedStageExecution(stageId, document) {
  const execution = executeLafeaStage(stageId, document);
  if (execution.status !== 'QUALIFIED') {
    const code = execution.diagnostics?.[0]?.code ?? 'LAFEA_CALCULATION_NOT_QUALIFIED';
    throw workbenchError(`EMP1_WORKBENCH_${stageId.replace('.', '_')}_${code}`);
  }
  return execution;
}

function requireLayerExecution(layer, stageId) {
  if (layer?.execution?.stageId !== stageId || layer.execution.status !== 'QUALIFIED') {
    throw workbenchError(`EMP1_WORKBENCH_${stageId.replace('.', '_')}_EXECUTION_REQUIRED`);
  }
  return layer.execution;
}

function buildProductSource(runInput) {
  const localMethod = runInput.localMethod?.routeRequest
    ? { requested: true, routeRequest: runInput.localMethod.routeRequest }
    : { requested: false };
  return deepFreeze({
    schema: 'emp1-workbench-orchestration-source/v1',
    sourceId: 'EMP1-WORKBENCH-TRANSACTION',
    localMethod,
  });
}

function currentInputHashes({ aDocument, bDocument, runInput }) {
  return deepFreeze({
    loadTransferDocument: semanticHash(aDocument),
    sectionScreeningDocument: semanticHash(bDocument),
    screeningAssessment: semanticHash(runInput.screeningAssessment),
    localMethod: semanticHash(runInput.localMethod),
  });
}

function reconcileChangeClasses(declared, previousHashes, nextHashes) {
  const classes = new Set(Array.isArray(declared) ? declared : []);
  if (!previousHashes) classes.add('SOURCE_IDENTITY');
  else {
    if (previousHashes.loadTransferDocument !== nextHashes.loadTransferDocument) {
      classes.add('SOURCE_IDENTITY');
    }
    if (previousHashes.sectionScreeningDocument !== nextHashes.sectionScreeningDocument
      || previousHashes.screeningAssessment !== nextHashes.screeningAssessment) {
      classes.add('SECTION');
    }
    if (previousHashes.localMethod !== nextHashes.localMethod) classes.add('LOCAL_METHOD');
  }
  return Object.freeze([...classes]);
}

function normalizePrevious(value) {
  if (value == null) return null;
  if (value.schema !== EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA
    || !value.result || !value.inputHashes) {
    throw workbenchError('EMP1_WORKBENCH_PREVIOUS_EXECUTION_INVALID');
  }
  return value;
}

function normalizeScreeningAssessment(value) {
  if (value == null) return null;
  const source = exactRecord(value, SCREENING_KEYS,
    'EMP1_WORKBENCH_SCREENING_ASSESSMENT_KEYS_INVALID');
  requiredText(source.assessmentIdentity, 'EMP1_WORKBENCH_ASSESSMENT_IDENTITY_REQUIRED');
  requiredText(source.assessmentProfileId, 'EMP1_WORKBENCH_ASSESSMENT_PROFILE_REQUIRED');
  requiredText(source.governingQuantity, 'EMP1_WORKBENCH_GOVERNING_QUANTITY_REQUIRED');
  if (!Array.isArray(source.applicabilityRecords)) {
    throw workbenchError('EMP1_WORKBENCH_APPLICABILITY_RECORDS_REQUIRED');
  }
  return structuredClone(source);
}

function normalizeLocalMethod(value) {
  if (value == null) return null;
  const source = exactRecord(value, LOCAL_METHOD_KEYS,
    'EMP1_WORKBENCH_LOCAL_METHOD_KEYS_INVALID');
  requireRecord(source.routeRequest, 'EMP1_WORKBENCH_LOCAL_ROUTE_REQUEST_REQUIRED');
  return structuredClone(source);
}

function exactRecord(value, keys, code) {
  requireRecord(value, code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw workbenchError(code);
  return structuredClone(value);
}

function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw workbenchError(code);
  return value;
}
function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw workbenchError(code);
  return value.trim();
}
function workbenchError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
