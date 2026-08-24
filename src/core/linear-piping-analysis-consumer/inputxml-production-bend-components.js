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
 * S3 intentionally supplies pressure=0 so pressure-stiffened k remains S5.
 */
export function compileInputXmlProductionBendComponents(input) {
  const sourcePreparation = requireRecord(input?.sourcePreparation, 'sourcePreparation');
  const structuralPreparation = requireRecord(input?.structuralPreparation, 'structuralPreparation');
  const frameElementProfile = requireRecord(input?.frameElementProfile, 'frameElementProfile');
  const factorAuthority = requireInputXmlProductionBendFactorAuthority(input?.factorAuthority);
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
    const factorResult = calculateB31Factors(factorRequest({
      componentId, sourceSegment, bendRecord, material, physicalSection,
      factorAuthority, sourcePreparation,
    }));
    requireQualifiedFactorResult(factorResult, factorAuthority, sourceSegmentId);
    const component = compilePipingComponent({
      componentId,
      componentType: 'BEND',
      profile: productionBendComponentProfile(),
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
    });
    components.push(component);
    factorResults.push(factorResult);
  }
  return Object.freeze({
    pipingComponents: Object.freeze(components),
    factorResults: Object.freeze(factorResults),
    sourceQualifiedBendCount: components.length,
    factorAuthority,
  });
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
      pressure: 0,
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

function requireQualifiedFactorResult(result, authority, sourceSegmentId) {
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
  if (result.componentFactorSet.pressureCorrectionApplied !== false) fail(
    'BEND_FACTOR_PRESSURE_STAGE_VIOLATION',
    `Bend ${sourceSegmentId} S3 factor unexpectedly applies pressure stiffening.`,
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
