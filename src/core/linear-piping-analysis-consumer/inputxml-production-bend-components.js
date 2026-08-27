import { FRAME_LOCAL_AXIS_PROFILE } from '../centerline-beam-fea/index.js';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../linear-fea-b31-factor-calculator/index.js';
import { compilePipingComponent } from '../linear-fea-piping-components/index.js';
import { INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE } from './inputxml-linear-structural-profile.js';
import { bendComponentId } from './inputxml-linear-structural-retopology.js';
import { productionBendSourceEligible } from './production-capability-profile.js';
import { productionBendComponentProfile } from './production-bend-component-profile.js';
import { retopologiseDeclaredBends } from './bend-retopology.js';
import {
  requireInputXmlProductionBendFactorAuthority,
} from './inputxml-production-bend-factor-authority.js';
import {
  groupBendChordBindings,
  requireBendComponentMatchesTopology,
} from './inputxml-production-bend-topology.js';

const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });

/**
 * Compile S3 bend stiffness authorities from an already-governed preparation.
 * Factor edition and B31J smooth-90 policy are explicit sealed authorities;
 * neither is inferred from CAESAR version, benchmark precedent, or current year.
 * Bend pressure stiffening uses the element's DECLARED pressure, not the load
 * case's. That is CAESAR's own model -- a bend is stiffened by the pressure the
 * line is designed for, as a property of the model, and only a hydrotest case
 * substitutes a different one. It matters structurally as well as physically:
 * a stiffness that varied per case would break the single sealed
 * effectiveStiffnessStateHash that every execution result is required to match.
 * Taking the declared pressure keeps stiffness case-independent, so the custody
 * check stays exactly as strong as it was.
 */
export function compileInputXmlProductionBendComponents(input) {
  const sourcePreparation = requireRecord(input?.sourcePreparation, 'sourcePreparation');
  const structuralPreparation = requireRecord(input?.structuralPreparation, 'structuralPreparation');
  const frameElementProfile = requireRecord(input?.frameElementProfile, 'frameElementProfile');
  const factorAuthority = requireInputXmlProductionBendFactorAuthority(input?.factorAuthority);
  const capability = requireRecord(input?.capabilityProfile, 'capabilityProfile');
  const sourceSegments = sourcePreparation.normalizedGeometry?.segments;
  if (!Array.isArray(sourceSegments)) fail(
    'BEND_FACTOR_SOURCE_GEOMETRY_MISSING', 'Source preparation has no normalized geometry.',
  );
  const retopology = retopologiseDeclaredBends(
    sourcePreparation.normalizedGeometry,
    INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE,
  );
  const bendRecordBySource = new Map(retopology.bendRecords.map((row) => [row.sourceSegmentId, row]));
  const sourceBindingById = new Map(sourcePreparation.segmentBindings.map((row) => [String(row.segmentId), row]));
  const materialByHash = new Map(sourcePreparation.materialResolutions.map((row) => [row.semanticHash, row]));
  const sectionByHash = new Map(sourcePreparation.sectionResolutions.map((row) => [row.semanticHash, row]));
  const chordBindingsBySource = groupBendChordBindings(structuralPreparation.segmentBindings);
  const components = [];
  const bendGeometry = new Map();
  const factorResults = [];

  for (const sourceSegment of sourceSegments) {
    if (!productionBendSourceEligible(sourceSegment)) continue;
    const sourceSegmentId = String(sourceSegment.id);
    const sourceBinding = sourceBindingById.get(sourceSegmentId) ?? null;
    const bendRecord = bendRecordBySource.get(sourceSegmentId) ?? null;
    if (sourceBinding === null || bendRecord === null) fail(
      'BEND_FACTOR_SOURCE_AUTHORITY_MISSING',
      `Bend ${sourceSegmentId} lacks retained source/retopology authority.`,
    );
    const material = materialByHash.get(sourceBinding.materialResolutionSemanticHash) ?? null;
    const physicalSection = sectionByHash.get(sourceBinding.physicalSectionSemanticHash) ?? null;
    const analysisSection = sectionByHash.get(sourceBinding.analysisSectionSemanticHash) ?? null;
    if (material === null || physicalSection === null || analysisSection === null) fail(
      'BEND_FACTOR_STATE_AUTHORITY_MISSING', `Bend ${sourceSegmentId} lacks material or section authority.`,
    );

    const componentId = bendComponentId(structuralPreparation.modelId, sourceBinding.sourceIndex);
    const stiffeningPressure = bendStiffeningPressure(capability, sourceSegment, sourceSegmentId);
    const factorResult = calculateB31Factors(factorRequest({
      componentId, sourceSegment, bendRecord, material, physicalSection,
      factorAuthority, sourcePreparation, stiffeningPressure,
    }));
    requireQualifiedFactorResult(factorResult, factorAuthority, sourceSegmentId, stiffeningPressure);
    const component = compilePipingComponent({
      componentId,
      componentType: 'BEND',
      profile: productionBendComponentProfile(stiffeningPressure > 0),
      arc: {
        tangentStart: vector(sourceSegment.meta.bendTangentStart),
        tangentEnd: vector(sourceSegment.meta.bendTangentEnd),
        incomingDirection: [...bendRecord.incomingDirection],
        declaredRadius: positive(sourceSegment.meta.bendDeclaredRadius, 'bendDeclaredRadius', sourceSegmentId),
      },
      material,
      section: analysisSection,
      frameElementProfile,
      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
      referenceVector: null,
      factorSet: factorResult.componentFactorSet,
    });
    requireAcceptedComponent(component, sourceSegmentId);
    requireBendComponentMatchesTopology({
      component,
      sourceSegmentId,
      bindings: chordBindingsBySource.get(sourceSegmentId) ?? [],
      conditionedGeometry: structuralPreparation.conditionedTopology.geometry,
      bendRecord,
    });
    components.push(component);
    factorResults.push(factorResult);
    // Retained for the Bourdon augmentation, which needs the arc the chords
    // stand for -- its centre, radius, swept angle and the tangent it enters
    // on. Collected here because this is where all of it is already in hand.
    bendGeometry.set(componentId, Object.freeze({
      points: Object.freeze(chordChainPoints(
        chordBindingsBySource.get(sourceSegmentId) ?? [],
        structuralPreparation.conditionedTopology.geometry,
        sourceSegmentId,
      )),
      centre: Object.freeze(vector(sourceSegment.meta.bendArcCentre)),
      bendRadius: positive(sourceSegment.meta.bendComputedRadius, 'bendComputedRadius', sourceSegmentId),
      totalBendAngle: bendRecord.arcLength / sourceSegment.meta.bendComputedRadius,
      incomingDirection: Object.freeze([...bendRecord.incomingDirection]),
      innerDiameter: positive(
        physicalSection.dimensions?.innerDiameter, 'innerDiameter', sourceSegmentId,
      ),
      poissonRatio: sourceSegment.meta?.analysis?.poissonRatio ?? null,
    }));
  }
  return Object.freeze({
    pipingComponents: Object.freeze(components),
    bendGeometryByComponent: bendGeometry,
    factorResults: Object.freeze(factorResults),
    sourceQualifiedBendCount: components.length,
    factorAuthority,
  });
}

/** Ordered chord-chain node positions: N0 = first chord's I end, then each J end. */
function chordChainPoints(bindings, geometry, sourceSegmentId) {
  const nodeById = new Map(geometry.nodes.map((row) => [String(row.id), row]));
  const segmentById = new Map(geometry.segments.map((row) => [String(row.id), row]));
  const ordered = bindings
    .map((binding) => segmentById.get(String(binding.segmentId)) ?? null)
    .filter((segment) => segment !== null)
    .sort((left, right) => Number(left.meta?.bendChordIndex) - Number(right.meta?.bendChordIndex));
  if (ordered.length === 0) fail(
    'BOURDON_BEND_CHORD_CHAIN_MISSING',
    `Bend ${sourceSegmentId} has no retained chords to build an arc point chain from.`,
  );
  const point = (nodeId) => {
    const node = nodeById.get(String(nodeId));
    if (!node || ![node.x, node.y, node.z].every(Number.isFinite)) fail(
      'BOURDON_BEND_CHORD_CHAIN_MISSING',
      `Bend ${sourceSegmentId} chord references node ${nodeId} with no finite coordinate.`,
    );
    return [node.x, node.y, node.z];
  };
  return [point(ordered[0].startNodeId), ...ordered.map((segment) => point(segment.endNodeId))];
}

function factorRequest(input) {
  const section = input.physicalSection;
  return {
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `${input.componentId}.B31.FACTOR`,
    componentId: input.componentId,
    editionProfileId: input.factorAuthority.editionProfileId,
    componentType: 'BEND',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'BEND',
      lengthUnit: 'm',
      outerDiameter: positive(section.dimensions?.outerDiameter, 'outerDiameter', input.sourceSegment.id),
      wallThickness: positive(section.dimensions?.wallThickness, 'wallThickness', input.sourceSegment.id),
      bendRadius: positive(input.sourceSegment.meta?.bendDeclaredRadius, 'bendRadius', input.sourceSegment.id),
      // Zero unless the capability profile authorizes stiffening, so a pressure
      // retained for code stress alone cannot quietly change the stiffness.
      pressure: input.stiffeningPressure,
      elasticModulus: positive(input.material.materialState?.elasticModulus, 'elasticModulus', input.sourceSegment.id),
      bendAngleDegrees: input.bendRecord.arcLength / input.sourceSegment.meta.bendComputedRadius * 180 / Math.PI,
      smooth90FlexibilityCorrection: input.factorAuthority.smooth90FlexibilityCorrection,
      sourceEvidence: {
        sourceId: String(input.sourceSegment.sourceComponentUid ?? input.sourceSegment.id),
        sourceRevision: String(input.sourcePreparation.sourceBundleSemanticHash),
      },
    },
    momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
    semanticHash: '',
  };
}

/**
 * The pressure a bend's flexibility factor is corrected for.
 *
 * Zero unless the capability profile authorizes stiffening. When it does, this
 * is the element's DECLARED pressure -- a model property, the same value for
 * every load case -- so the effective stiffness stays case-independent and the
 * sealed stiffness custody check is unaffected.
 */
function bendStiffeningPressure(capability, sourceSegment, sourceSegmentId) {
  if (capability.pressureStiffening !== true) return 0;
  const declared = sourceSegment?.meta?.analysis?.pressure;
  if (declared === null || declared === undefined) return 0;
  if (!Number.isFinite(declared) || declared < 0) fail(
    'BEND_STIFFENING_PRESSURE_INVALID',
    `Bend ${sourceSegmentId} declares a pressure that cannot stiffen its flexibility factor.`,
    { declared },
  );
  return declared;
}

function requireQualifiedFactorResult(result, authority, sourceSegmentId, stiffeningPressure) {
  if (result.status !== 'QUALIFIED' || result.componentFactorSet === null) fail(
    'BEND_FACTOR_SET_NOT_QUALIFIED',
    `Bend ${sourceSegmentId} produced no qualified ${authority.editionProfileId} factor set.`,
    { sourceSegmentId, diagnostics: result.diagnostics },
  );
  if (result.componentFactorSet.flexibilityGeometryBasis !== 'ARC_GEOMETRY_EXCLUDED_V1') fail(
    'BEND_FACTOR_GEOMETRY_BASIS_INVALID',
    `Bend ${sourceSegmentId} factor basis must exclude centreline arc geometry.`,
    { geometryBasis: result.componentFactorSet.flexibilityGeometryBasis },
  );
  // The correction must be applied when, and only when, a stiffening pressure
  // was supplied. Both directions are checked: a silent correction on an
  // unauthorized bend and a silently-dropped one on an authorized bend are
  // equally wrong.
  const expectPressureCorrection = stiffeningPressure > 0;
  if (result.componentFactorSet.pressureCorrectionApplied !== expectPressureCorrection) fail(
    'BEND_FACTOR_PRESSURE_STAGE_VIOLATION',
    `Bend ${sourceSegmentId} pressure stiffening was ${expectPressureCorrection ? 'authorized but not applied' : 'applied without authorization'}.`,
    { expectPressureCorrection, applied: result.componentFactorSet.pressureCorrectionApplied },
  );
}

function requireAcceptedComponent(component, sourceSegmentId) {
  if (component.acceptanceState !== 'ACCEPTED' || component.convergence?.accepted !== true) fail(
    'BEND_COMPONENT_CONVERGENCE_NOT_QUALIFIED',
    `Bend ${sourceSegmentId} does not satisfy the declared S3 convergence profile.`,
    { acceptanceState: component.acceptanceState, convergence: component.convergence },
  );
  const guard = component.flexibility?.doubleCountGuard;
  if (guard?.accepted !== true
    || guard.geometryBasis !== 'ARC_GEOMETRY_EXCLUDED_V1'
    || component.flexibilityOwnership?.ownerPackageId !== 'LFEA-B3.2'
    || component.flexibilityOwnership?.applied !== true) fail(
    'BEND_FLEXIBILITY_OWNERSHIP_INVALID',
    `Bend ${sourceSegmentId} has invalid single-application flexibility evidence.`,
  );
}

function vector(value) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) fail(
    'BEND_FACTOR_SOURCE_GEOMETRY_INVALID', 'Bend tangent point is missing or non-finite.',
  );
  return [value.x, value.y, value.z];
}

function positive(value, field, sourceSegmentId) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) fail(
    'BEND_FACTOR_SOURCE_GEOMETRY_INVALID',
    `Bend ${sourceSegmentId} ${field} must be positive and finite.`,
  );
  return value;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(
    'BEND_FACTOR_AUTHORITY_RECORD_INVALID', `${field} must be a record.`,
  );
  return value;
}

function fail(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  error.analysisStage = 'INPUTXML_PRODUCTION_BEND_COMPONENT';
  throw error;
}
