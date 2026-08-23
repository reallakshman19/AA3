import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../linear-fea-b31-factor-calculator/index.js';
import { deriveB31JDirectionalBranchEndModifiers } from '../linear-fea-piping-components/index.js';
import {
  requireInputXmlProductionBranchFactorAuthority,
} from './inputxml-production-branch-factor-authority.js';
import { elementAuthorityError } from './inputxml-linear-element-authority-support.js';

const WELDING_TEE_TYPE = 3;
const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const RUN_COLLINEARITY_TOLERANCE = Object.freeze({
  value: 1e-9,
  source: 'LFEA-B3.2_DIRECTION_VECTOR_TOPOLOGY_V1',
});
const NOMINAL_DIAMETER_RELATIVE_TOLERANCE = Object.freeze({
  value: 1e-3,
  source: 'BM4L_CAESAR14_M047_TEE_KB_PARITY_V1',
});

/**
 * Derive B31J directional modifiers for existing production spans.
 * No duplicate tee elements are created: every accepted modifier has exactly
 * one existing structural carrier and one source welding-tee junction.
 */
export function compileInputXmlProductionBranchModifiers(input) {
  const sourcePreparation = requireRecord(input?.sourcePreparation, 'sourcePreparation');
  const structuralPreparation = requireRecord(input?.structuralPreparation, 'structuralPreparation');
  const factorAuthority = requireInputXmlProductionBranchFactorAuthority(input?.factorAuthority);
  const segments = sourcePreparation.normalizedGeometry?.segments;
  const nodes = sourcePreparation.normalizedGeometry?.nodes;
  if (!Array.isArray(segments) || !Array.isArray(nodes)) {
    fail('BRANCH_SOURCE_GEOMETRY_MISSING', 'Branch production authority requires normalized source geometry.');
  }

  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const sourceBindingById = new Map(sourcePreparation.segmentBindings
    .map((row) => [String(row.segmentId), row]));
  const structuralBySource = groupStructuralBindings(structuralPreparation.segmentBindings);
  const materialByHash = new Map(sourcePreparation.materialResolutions.map((row) => [row.semanticHash, row]));
  const sectionByHash = new Map(sourcePreparation.sectionResolutions.map((row) => [row.semanticHash, row]));
  const teeNodeIds = weldingTeeNodeIds(segments);
  const modifierByElementId = new Map();
  const junctions = [];

  for (const junctionNodeId of teeNodeIds) {
    const incident = segments.filter((segment) =>
      String(segment.startNodeId) === junctionNodeId || String(segment.endNodeId) === junctionNodeId);
    if (incident.length !== 3) {
      fail('BRANCH_TOPOLOGY_UNSUPPORTED',
        `Welding tee node ${junctionNodeId} requires exactly three incident source spans; found ${incident.length}.`,
        { junctionNodeId, incidentSegmentIds: incident.map((row) => String(row.id)) });
    }
    const junction = point(nodeById, junctionNodeId);
    const legs = incident.map((segment) => buildLeg({
      segment, junctionNodeId, nodeById, sourceBindingById, structuralBySource,
      materialByHash, sectionByHash,
    }));
    const factorGeometry = teeFactorGeometry(legs, junctionNodeId);
    const factorResult = calculateB31Factors({
      schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
      calculationId: `PROD-TEE-${safe(junctionNodeId)}-FACTORS`,
      componentId: `PROD-TEE-${safe(junctionNodeId)}`,
      editionProfileId: factorAuthority.editionProfileId,
      componentType: 'WELDING_TEE',
      geometry: {
        schema: COMPONENT_GEOMETRY_SCHEMA,
        componentType: 'WELDING_TEE',
        lengthUnit: 'm',
        runOuterDiameter: factorGeometry.runSection.dimensions.outerDiameter,
        runWallThickness: factorGeometry.runSection.dimensions.wallThickness,
        branchOuterDiameter: factorGeometry.factorBranchOuterDiameter,
        branchWallThickness: factorGeometry.branchSection.dimensions.wallThickness,
        fittingQuality: 'UNVERIFIED',
        sourceEvidence: {
          sourceId: `SOURCE:SIF:TYPE3:NODE:${junctionNodeId}`,
          sourceRevision: String(sourcePreparation.sourceBundleSemanticHash),
        },
      },
      momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
      semanticHash: '',
    });
    if (factorResult.status !== 'QUALIFIED') {
      fail('BRANCH_FACTOR_SET_NOT_QUALIFIED',
        `Welding tee node ${junctionNodeId} did not produce qualified B31J directional factors.`,
        { junctionNodeId, applicability: factorResult.applicability });
    }
    const modifiers = deriveB31JDirectionalBranchEndModifiers({
      componentId: `PROD-TEE-${safe(junctionNodeId)}`,
      factorResult,
      junctionPosition: junction,
      legs: legs.map((leg) => ({
        legId: leg.sourceSegmentId,
        junctionEnd: leg.junctionEnd,
        endPoint: leg.endPoint,
        material: leg.material,
        section: leg.section,
      })),
      runCollinearityTolerance: RUN_COLLINEARITY_TOLERANCE,
    });
    const legBySource = new Map(legs.map((leg) => [leg.sourceSegmentId, leg]));
    const runLegs = modifiers.modifiers
      .filter((modifier) => modifier.role === 'RUN')
      .map((modifier) => legBySource.get(modifier.legId));
    const runThermalAuthority = commonRunThermalAuthority(runLegs, junctionNodeId);

    for (const modifier of modifiers.modifiers) {
      const leg = legBySource.get(modifier.legId);
      if (modifierByElementId.has(leg.elementId)) {
        fail('BRANCH_ELEMENT_MULTIPLE_JUNCTIONS',
          `Structural element ${leg.elementId} is incident to more than one exact tee junction.`);
      }
      modifierByElementId.set(leg.elementId, Object.freeze({
        junctionNodeId,
        elementId: leg.elementId,
        sourceSegmentId: leg.sourceSegmentId,
        junctionEnd: modifier.junctionEnd,
        role: modifier.role,
        referenceVector: modifier.referenceVector,
        rotationalSprings: modifier.rotationalSprings,
        rigidOffset: modifier.rigidOffset,
        physicalJunctionPosition: modifier.physicalJunctionPosition,
        factorValues: modifier.factorValues,
        factorCalculationId: factorResult.calculationId,
        factorResultSemanticHash: factorResult.semanticHash,
        factorSourceIdentity: modifiers.factorSourceIdentity,
        springRule: modifiers.springRule,
        runThermalAuthority,
      }));
    }
    junctions.push(Object.freeze({
      junctionNodeId,
      factorResultSemanticHash: factorResult.semanticHash,
      factorCalculationId: factorResult.calculationId,
      modifierSemanticHash: modifiers.semanticHash,
      incidentElementIds: Object.freeze(legs.map((leg) => leg.elementId).sort(compareAscii)),
      diameterReconciliation: factorGeometry.reconciliation,
    }));
  }

  return Object.freeze({
    factorAuthority,
    junctions: Object.freeze(junctions.sort((a, b) => compareAscii(a.junctionNodeId, b.junctionNodeId))),
    modifierByElementId,
    eligibleTeeJunctionCount: teeNodeIds.length,
    exactTeeJunctionCount: junctions.length,
  });
}

function weldingTeeNodeIds(segments) {
  const ids = new Set();
  for (const segment of segments) {
    for (const sif of segment.meta?.analysis?.sifs ?? []) {
      if (Number(sif.typeCode) === WELDING_TEE_TYPE && sif.nodeId != null) ids.add(String(sif.nodeId));
    }
  }
  return [...ids].sort(compareAscii);
}

function buildLeg(input) {
  const sourceSegmentId = String(input.segment.id);
  const sourceBinding = input.sourceBindingById.get(sourceSegmentId) ?? null;
  const carriers = input.structuralBySource.get(sourceSegmentId) ?? [];
  if (sourceBinding === null || carriers.length !== 1) {
    fail('BRANCH_STRUCTURAL_CARRIER_UNRESOLVED',
      `Tee leg ${sourceSegmentId} requires exactly one retained structural carrier; found ${carriers.length}.`);
  }
  const carrier = carriers[0];
  if (carrier.bendChordOf !== null || carrier.retopologyRole === 'BEND_ARC_CHORD') {
    fail('BRANCH_BEND_OVERLAP_UNQUALIFIED',
      `Tee leg ${sourceSegmentId} overlaps bend retopology; combined bend/tee ownership is not qualified.`);
  }
  const material = input.materialByHash.get(sourceBinding.materialResolutionSemanticHash) ?? null;
  const section = input.sectionByHash.get(sourceBinding.physicalSectionSemanticHash) ?? null;
  if (material === null || section === null) {
    fail('BRANCH_STATE_AUTHORITY_MISSING', `Tee leg ${sourceSegmentId} lacks physical material/section authority.`);
  }
  const atI = String(input.segment.startNodeId) === input.junctionNodeId;
  const otherNodeId = String(atI ? input.segment.endNodeId : input.segment.startNodeId);
  return Object.freeze({
    sourceSegmentId,
    elementId: carrier.elementId,
    junctionEnd: atI ? 'I' : 'J',
    endPoint: point(input.nodeById, otherNodeId),
    material,
    section,
  });
}

function teeFactorGeometry(legs, junctionNodeId) {
  const temp = deriveB31JDirectionalBranchEndModifiers;
  void temp;
  const directions = legs.map((leg) => ({ leg, direction: unit(leg.endPoint) }));
  const pairs = [];
  for (let i = 0; i < directions.length; i += 1) for (let j = i + 1; j < directions.length; j += 1) {
    const dot = directions[i].direction.reduce((sum, value, k) => sum + value * directions[j].direction[k], 0);
    pairs.push({ i, j, residual: Math.abs(1 + dot) });
  }
  pairs.sort((a, b) => a.residual - b.residual);
  if (pairs[0].residual > RUN_COLLINEARITY_TOLERANCE.value) {
    fail('BRANCH_RUN_NOT_IDENTIFIED', `Tee node ${junctionNodeId} has no collinear run pair.`);
  }
  const runLegs = [legs[pairs[0].i], legs[pairs[0].j]];
  const branchLeg = legs.find((leg) => !runLegs.includes(leg));
  const runOd = runLegs[0].section.dimensions.outerDiameter;
  const otherRunOd = runLegs[1].section.dimensions.outerDiameter;
  if (Math.abs(runOd - otherRunOd) > RUN_COLLINEARITY_TOLERANCE.value * Math.max(runOd, otherRunOd)) {
    fail('BRANCH_RUN_SECTION_MISMATCH', `Tee node ${junctionNodeId} run legs do not share one outside diameter.`);
  }
  const branchOd = branchLeg.section.dimensions.outerDiameter;
  if (branchOd <= runOd) return {
    runSection: runLegs[0].section, branchSection: branchLeg.section,
    factorBranchOuterDiameter: branchOd, reconciliation: null,
  };
  const relativeDifference = (branchOd - runOd) / runOd;
  if (relativeDifference > NOMINAL_DIAMETER_RELATIVE_TOLERANCE.value) {
    fail('BRANCH_NOMINAL_DIAMETER_RECONCILIATION_BLOCKED',
      `Tee node ${junctionNodeId} branch OD exceeds run OD by ${relativeDifference}.`, {
        relativeDifference, tolerance: NOMINAL_DIAMETER_RELATIVE_TOLERANCE,
      });
  }
  return {
    runSection: runLegs[0].section, branchSection: branchLeg.section,
    factorBranchOuterDiameter: runOd,
    reconciliation: Object.freeze({
      rule: 'EQUAL_NOMINAL_DIAMETER_WITHIN_DECLARED_RELATIVE_TOLERANCE_V1',
      declaredBranchOuterDiameter: branchOd, factorBranchOuterDiameter: runOd,
      runOuterDiameter: runOd, relativeDifference,
      relativeTolerance: NOMINAL_DIAMETER_RELATIVE_TOLERANCE.value,
      toleranceSource: NOMINAL_DIAMETER_RELATIVE_TOLERANCE.source,
    }),
  };
}

function commonRunThermalAuthority(runLegs, junctionNodeId) {
  const hashes = new Set(runLegs.map((leg) => leg.material.semanticHash));
  if (runLegs.length !== 2 || hashes.size !== 1) {
    fail('BRANCH_RUN_THERMAL_MATERIAL_MISMATCH',
      `Tee node ${junctionNodeId} requires one common run material state for rigid-offset thermal growth.`);
  }
  const material = runLegs[0].material.materialState;
  return Object.freeze({
    runElementIds: Object.freeze(runLegs.map((leg) => leg.elementId).sort(compareAscii)),
    materialStateId: material.materialStateId,
    thermalExpansionCoefficient: material.thermalExpansionCoefficient,
  });
}

function groupStructuralBindings(bindings) {
  const result = new Map();
  for (const binding of bindings ?? []) {
    const key = String(binding.sourceSegmentId ?? binding.segmentId);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(binding);
  }
  return result;
}

function point(nodeById, nodeId) {
  const node = nodeById.get(String(nodeId));
  if (!node || ![node.x, node.y, node.z].every(Number.isFinite)) {
    fail('BRANCH_NODE_POSITION_MISSING', `Tee node ${nodeId} lacks a finite source coordinate.`);
  }
  return [node.x, node.y, node.z];
}

function unit(vector) {
  const length = Math.hypot(...vector);
  if (!(length > 0)) fail('BRANCH_LEG_DEGENERATE', 'Tee leg endpoint is coincident with its junction.');
  return vector.map((value) => value / length);
}
function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('BRANCH_AUTHORITY_RECORD_REQUIRED', `${field} must be a record.`);
  return value;
}
function safe(value) { return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-'); }
function compareAscii(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
function fail(code, message, data) { throw elementAuthorityError(code, message, data); }
