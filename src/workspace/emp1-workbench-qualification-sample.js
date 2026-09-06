import { sourceFixture as lafea1SourceFixture } from '../../scripts/lafea.1-fixtures.mjs';
import {
  ENVELOPE_QUANTITIES,
  QUALIFICATION_PROFILE,
  REQUEST_SCHEMA,
  RADIUS_BASES,
  SECTION_BASIS,
} from '../core/local-attachment-screening/index.js';
import { refreshEmp1BSourceEvidence } from '../core/emp1/emp1-a-to-b-refresh.js';
import { executeLafeaStage, normalizeLafeaStageDocument } from './lafea-workbench-model.js';
import {
  EMP1_WORKBENCH_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WORKBENCH_ATTACHMENT_PHYSICAL_LOCATION,
  EMP1_WORKBENCH_ATTACHMENT_STATION_BASIS,
  EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
  EMP1_WORKBENCH_CYLINDER_LENGTH_BASIS,
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
  normalizeEmp1WorkbenchRunInput,
} from './emp1-workbench-run-state.js';

export const EMP1_QUALIFICATION_SAMPLE_SCHEMA = 'emp1-workbench-qualification-sample/v1';

/**
 * Build the complete [SIMULATED] EMP.1 qualification source bundle.
 *
 * This helper deliberately returns only A/B source documents plus the typed C
 * source-binding command. It never supplies a C result, route authorization,
 * WRC load components, gamma/beta, nearest-end distance, coefficients, stresses
 * or a governing point.
 *
 * B is made importable by executing the real A stage and passing that result
 * through the same refreshEmp1BSourceEvidence() custody seam used by a real
 * unified EMP.1 transaction. The raw fixture is first normalized through the
 * public LAFEA.1 workbench document boundary so the returned A document is the
 * same retained source identity carried by execution.source. The private factory
 * execution is still not returned or injected into runtime custody.
 */
export function createEmp1WorkbenchQualificationSample() {
  const rawAInput = createQualificationAInput();
  const aDocument = normalizeLafeaStageDocument('LAFEA.1', rawAInput);
  const aExecution = executeLafeaStage('LAFEA.1', aDocument);
  if (aExecution.status !== 'QUALIFIED' || aExecution.result?.qualification?.state !== 'ACCEPTED') {
    throw sampleError('EMP1_QUALIFICATION_SAMPLE_A_NOT_QUALIFIED');
  }
  const bDocument = refreshEmp1BSourceEvidence({
    aDocument,
    aExecution,
    bDocument: createQualificationBTemplate(),
  });
  const runInput = normalizeEmp1WorkbenchRunInput(createQualificationRunInput());
  return deepFreeze({
    schema: EMP1_QUALIFICATION_SAMPLE_SCHEMA,
    label: '[SIMULATED] Complete EMP.1 qualification sample',
    aDocument,
    bDocument,
    runInput,
  });
}

function createQualificationAInput() {
  return lafea1SourceFixture((source) => {
    const meanRadius = 100;
    const shellThickness = 20;
    const outerRadius = meanRadius + shellThickness / 2;
    const innerRadius = meanRadius - shellThickness / 2;
    source.modelIdentity = 'EMP1-QUALIFICATION-SAMPLE-A';
    source.pipeGeometry.outsideDiameter.value = 2 * outerRadius;
    source.thicknessBasis.nominalPipeThickness.value = shellThickness;
    source.thicknessBasis.corrosionAllowance.value = 0;
    source.thicknessBasis.assessmentPipeThickness.value = shellThickness;
    source.loadCases[0].force.value = [-400, -250, -1000];
    source.loadCases[0].moment.value = [-750000, 1000000, -700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
    source.resultRequests.pressure[0].requestedRadii[0].value = innerRadius;
    source.resultRequests.pressure[0].requestedRadii[1].value = outerRadius;
    source.limitations = [
      '[SIMULATED] Qualification input only; no production/release authority.',
    ];
  });
}

function createQualificationBTemplate() {
  return {
    schema: REQUEST_SCHEMA,
    requestIdentity: 'EMP1-QUALIFICATION-SAMPLE-B',
    requestVersion: '1',
    // Deliberately non-authoritative. refreshEmp1BSourceEvidence() overwrites it
    // from the actual current A execution before B is canonicalized/imported.
    sourceEvidence: null,
    sectionBasis: { basis: SECTION_BASIS },
    screeningCases: [{
      screeningCaseId: 'CASE-WRC',
      mechanicalTerms: [{ loadCaseId: 'LC-1', factor: 1 }],
      pressureDefinitionId: 'P-CLOSED',
      pressureFactor: 0,
      sourceReference: 'SIMULATED/EMP1-QUALIFICATION/B/CASE-WRC',
    }],
    evaluationLocations: [
      location('L0', RADIUS_BASES.OUTER_SURFACE, 0),
      location('L90', RADIUS_BASES.OUTER_SURFACE, Math.PI / 2),
      location('L180', RADIUS_BASES.OUTER_SURFACE, Math.PI),
      location('L270', RADIUS_BASES.OUTER_SURFACE, 3 * Math.PI / 2),
      location('LMID', RADIUS_BASES.MID_SURFACE, Math.PI / 4),
    ],
    resultRequests: { envelopeQuantities: [...ENVELOPE_QUANTITIES] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [
      '[SIMULATED] Qualification input only; retained A evidence is refreshed by CORE.',
    ],
  };
}

function createQualificationRunInput() {
  return {
    schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
    localMethod: {
      routeRequest: {
        schema: EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
        loadCaseIdentity: 'LC-1',
        pressureResultIdentity: 'PR-1',
      },
      attachmentGeometry: {
        geometryIdentity: 'EMP1-QUALIFICATION-SAMPLE-ATTACHMENT',
        // Source/sample dimension. CORE, not this fixture, derives r0/beta.
        attachmentDiameter: 35.42857142857143,
        diameterBasis: EMP1_WORKBENCH_ATTACHMENT_DIAMETER_BASIS,
        physicalLocation: EMP1_WORKBENCH_ATTACHMENT_PHYSICAL_LOCATION,
        unit: 'mm',
        sourceReference: 'SIMULATED/EMP1-QUALIFICATION/ATTACHMENT-OD-AT-SHELL-JUNCTURE',
      },
      applicabilityGeometry: {
        geometryIdentity: 'EMP1-QUALIFICATION-SAMPLE-CYLINDER',
        cylinderLengthBasis: EMP1_WORKBENCH_CYLINDER_LENGTH_BASIS,
        cylinderLength: 300,
        attachmentStationBasis: EMP1_WORKBENCH_ATTACHMENT_STATION_BASIS,
        attachmentStationFromCylinderStart: 80,
        unit: 'mm',
        cylinderLengthSourceReference: 'SIMULATED/EMP1-QUALIFICATION/CYLINDER-END-PLANE-LENGTH',
        attachmentStationSourceReference: 'SIMULATED/EMP1-QUALIFICATION/WRC-ATTACHMENT-STATION',
      },
    },
  };
}

function location(evaluationLocationId, radiusBasis, angle) {
  return {
    evaluationLocationId,
    radiusBasis,
    explicitRadius: null,
    angle,
    sourceReference: `SIMULATED/EMP1-QUALIFICATION/B/LOCATION/${evaluationLocationId}`,
  };
}
function sampleError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
