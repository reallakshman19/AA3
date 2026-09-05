/**
 * Interpolated cylindrical adapter — engineering comparison only.
 *
 * Mirrors `emp1-wrc537-cylindrical-bounded-adapter.js` but resolves curve ordinates
 * through the gamma interpolation module instead of requiring an exact source row,
 * so non-tabulated gamma becomes evaluable. The bounded adapter and its qualified
 * gamma=5 domain gate are untouched by this file.
 *
 * Every engineering module in the pipeline is shared with the bounded adapter —
 * geometry derivation, the WRC frame and load conversion, applicability, load
 * custody, longitudinal-moment curve selection and Table 5 — so only the
 * orchestration is new and the physics cannot drift between the two paths.
 *
 * Results are stamped:
 *   productionRouteAuthority   : false
 *   globalEmp1CRouteAuthority  : false
 *   codeComplianceAuthority    : false
 * and, whenever a bracket was used:
 *   sourceQualifiedGammaSelection : false
 *   wrcMethodFidelityClaim        : false
 */
import { EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY } from './emp1-wrc537-cylindrical-index.js';
import { requireEmp1Wrc537InterpolatedDomain } from './emp1-wrc537-cylindrical-interpolated-domain.js';
import { buildEmp1Wrc537InterpolatedTable5Ordinates }
  from './emp1-wrc537-cylindrical-gamma-interpolation.js';
import {
  buildEmp1Wrc537CylindricalFrame,
  emp1GlobalLoadsToWrc537,
} from './emp1-wrc537-cylindrical-frame.js';
import { evaluateEmp1Wrc537CylindricalTable5 } from './emp1-wrc537-cylindrical-table5.js';
import { requireEmp1Wrc537ComparisonLoadCustody } from './emp1-wrc537-load-custody.js';
import { resolveEmp1Wrc537LongitudinalMomentBendingSelection }
  from './emp1-wrc537-longitudinal-moment-curve-selection.js';
import {
  evaluateEmp1Wrc537CylindricalApplicability,
  requireEmp1Wrc537CylindricalApplicabilityForNumerics,
} from './emp1-wrc537-cylindrical-applicability.js';
import { deriveEmp1Wrc537CylindricalBoundedGeometry }
  from './emp1-wrc537-cylindrical-bounded-adapter.js';

export const EMP1_WRC537_INTERPOLATED_ADAPTER_SCHEMA =
  'emp1-wrc537-cylindrical-interpolated-adapter-result/v1';

const UNIT_SYSTEMS = Object.freeze({
  SI_MM: Object.freeze({ force: 'N', length: 'mm', moment: 'N*mm', stress: 'N/mm^2' }),
  US_IN: Object.freeze({ force: 'lbf', length: 'in', moment: 'lbf*in', stress: 'psi' }),
});

export function evaluateEmp1Wrc537CylindricalInterpolatedAdapter(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw adapterError('EMP1_WRC537_INTERPOLATED_ADAPTER_INPUT_REQUIRED');
  }
  const loadCustody = requireEmp1Wrc537ComparisonLoadCustody(input.loadCustody);
  const units = UNIT_SYSTEMS[input.units] ?? UNIT_SYSTEMS.SI_MM;
  const geometry = deriveEmp1Wrc537CylindricalBoundedGeometry(input.geometry);
  const lmSelection = resolveEmp1Wrc537LongitudinalMomentBendingSelection(
    input.longitudinalMomentBendingSelection,
  );
  const variant = requiredString(input.variant, 'VARIANT');
  const sourceDocumentSha256 = requiredString(input.sourceDocumentSha256, 'SOURCE_SHA256');
  const datasetHash = requiredString(input.datasetHash, 'DATASET_HASH');

  const domain = requireEmp1Wrc537InterpolatedDomain({
    shellFamily: input.shellFamily,
    attachmentShape: input.attachmentShape,
    sourceDocumentSha256,
    datasetHash,
    expectedDatasetHash: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
    variant,
    gamma: geometry.gamma,
    beta: geometry.beta,
    coordinate: input.coordinate,
    betaDomain: input.betaDomain,
  });

  const frame = buildEmp1Wrc537CylindricalFrame({
    vesselCenterlineGlobal: input.axes?.vesselCenterlineGlobal,
    nozzleCenterlineGlobal: input.axes?.nozzleCenterlineGlobal,
  });
  const wrcLoads = emp1GlobalLoadsToWrc537(frame, {
    forceGlobal: input.loadsAtWrcReference?.forceGlobal,
    momentGlobal: input.loadsAtWrcReference?.momentGlobal,
  });
  const applicability = evaluateEmp1Wrc537CylindricalApplicability({
    meanRadius: geometry.meanRadius,
    loads: wrcLoads,
    evidence: input.applicabilityEvidence,
  });
  requireEmp1Wrc537CylindricalApplicabilityForNumerics(applicability);

  const ordinateSet = buildEmp1Wrc537InterpolatedTable5Ordinates({
    variant,
    gamma: geometry.gamma,
    beta: geometry.beta,
    coordinate: input.coordinate,
    betaDomain: input.betaDomain,
    longitudinalMomentFigures: {
      circumferential: lmSelection.circumferentialFigure,
      longitudinal: lmSelection.longitudinalFigure,
    },
  });

  // The bounded adapter rejects a negative source ordinate outright. That guard
  // never fires at gamma=5, but figure 2C is genuinely negative at gamma=50 for
  // beta above roughly 0.4, so rejecting would remove valid higher-gamma cases.
  // Table 5 consumes ordinate magnitudes and owns the sign matrix, so the
  // magnitude is used and the negative source values are reported instead of
  // being either fatal or silently swallowed.
  const negativeSourceOrdinates = [];
  for (const family of ['circ', 'long']) {
    for (const [quantity, row] of Object.entries(ordinateSet.provenance[family])) {
      if (row.y < 0) negativeSourceOrdinates.push({ family, quantity, figure: row.figure, y: row.y });
    }
  }

  const table5 = evaluateEmp1Wrc537CylindricalTable5({
    geometry: {
      meanRadius: geometry.meanRadius,
      shellThickness: geometry.shellThickness,
      attachmentRadius: geometry.attachmentOutsideRadius,
      beta: geometry.beta,
    },
    stressConcentration: input.stressConcentration,
    loads: wrcLoads,
    curveOrdinates: ordinateSet.ordinates,
  });

  return deepFreeze({
    schema: EMP1_WRC537_INTERPOLATED_ADAPTER_SCHEMA,
    state: ordinateSet.interpolationUsed
      ? 'EVALUATED_INTERPOLATED_TABLE5_COMPARISON'
      : 'EVALUATED_EXACT_ROW_TABLE5_COMPARISON',
    engineeringComparisonUseAuthorized: true,
    engineeringApplicabilityAuthorized: applicability.engineeringUseAuthorized === true,
    interpolationUsed: ordinateSet.interpolationUsed,
    sourceQualifiedGammaSelection: ordinateSet.sourceQualifiedGammaSelection,
    wrcMethodFidelityClaim: ordinateSet.wrcMethodFidelityClaim,
    qualifiedInputAuthority: false,
    productionRouteAuthority: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthority: false,
    releaseQualified: false,
    sourceDocumentSha256,
    datasetHash,
    datasetIdentity: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY,
    units,
    domain,
    geometry,
    applicability,
    stressScope: table5.stressScope,
    extremaScope: table5.extremaScope,
    loadCustody,
    frame,
    wrcLoads,
    longitudinalMomentBendingSelection: lmSelection,
    interpolationPolicy: ordinateSet.policy,
    interpolationPlan: domain.plan,
    curveProvenance: ordinateSet.provenance,
    curveOrdinates: ordinateSet.ordinates,
    signChanges: ordinateSet.signChanges,
    negativeSourceOrdinates: deepFreeze(negativeSourceOrdinates),
    table5,
    stresses: table5.stresses,
  });
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw adapterError(`EMP1_WRC537_INTERPOLATED_ADAPTER_${label}_REQUIRED`);
  }
  return value;
}

function adapterError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
