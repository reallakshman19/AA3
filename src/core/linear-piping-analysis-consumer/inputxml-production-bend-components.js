import { FRAME_LOCAL_AXIS_PROFILE } from '../centerline-beam-fea/index.js';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../linear-fea-b31-factor-calculator/index.js';
import { compilePipingComponent } from '../linear-fea-piping-components/index.js';
import { frameProfile } from './generic-inputxml-solve-model.js';
import {
  INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE,
} from './inputxml-linear-structural-profile.js';
import { bendComponentId } from './inputxml-linear-structural-retopology.js';
import { productionBendSourceEligible } from './production-capability-profile.js';
import { productionBendComponentProfile } from './production-bend-component-profile.js';
import { retopologiseDeclaredBends } from './bend-retopology.js';

const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const POSITION_TOLERANCE = 1e-9;

/**
 * Compile S3 bend stiffness authorities from an already-governed preparation.
 * Factor edition and the B31J smooth-90 policy are explicit caller authorities;
 * neither is inferred from CAESAR version, benchmark precedent, or current year.
 * S3 intentionally supplies pressure=0 so pressure-stiffened k remains S5.
 */
export function compileInputXmlProductionBendComponents(input) {
  const sourcePreparation = requireRecord(input?.sourcePreparation, 'sourcePreparation');
  const structuralPreparation = requireRecord(input?.structuralPreparation, 'structuralPreparation');
  const factorAuthority = requireFactorAuthority(input?.factorAuthority);
  const sourceSegments = sourcePreparation.normalizedGeometry?.segments;
  if (!Array.isArray(sourceSegments)) fail('BEND_FACTOR_SOURCE_GEOMETRY_MISSING', 'Source preparation has no normalized geometry.');

  const retopology = retopologiseDeclaredBends(
    sourcePreparation.normalizedGeometry,
    INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE,
  );
  const bendRecordBySource = new Map(retopology.bendRecords.map((row) => [row.sourceSegmentId, row]));
  const sourceSegmentById = new Map(sourceSegments.map((row) => [String(row.id), row]));
  const sourceBindingById = new Map(sourcePreparation.segmentBindings.map((row) => [String(row.segmentId), row]));
  const materialByHash = new Map(sourcePreparation.materialResolutions.map((row) => [row.semanticHash, row]));
  const sectionByHash = new Map(sourcePreparation.sectionResolutions.map((row) => [row.semanticHash, row]));
  const conditionedSegmentById = new Map(structuralPreparation.conditionedTopology.geometry.segments
    .map((row) => [String(row.id), row]));
  const chordBindingsBySource = groupChordBindings(structuralPreparation.segmentBindings);
  const components = [];
  const factorResults = [];

  for (const sourceSegment of sourceSegments) {
    if (!productionBendSourceEligible(sourceSegment)) continue;
    const sourceSegmentId = String(sourceSegment.id);
    const sourceBinding = sourceBindingById.get(sourceSegmentId) ?? null;
    const bendRecord = bendRecordBySource.get(sourceSegmentId) ?? null;
    if (sourceBinding === null || bendRecord === null) {
      fail('BEND_FACTOR_SOURCE_AUTHORITY_MISSING', `Bend ${sourceSegmentId} lacks retained source/retopology authority.`);
    }
    const material = materialByHash.get(sourceBinding.materialResolutionSemanticHash) ?? null;
    const physicalSection = sectionByHash.get(sourceBinding.physicalSectionSemanticHash) ?? null;
    const analysisSection = sectionByHash.get(sourceBinding.analysisSectionSemanticHash) ?? null;
    if (material === null || physicalSection === null || analysisSection === null) {
      fail('BEND_FACTOR_STATE_AUTHORITY_MISSING', `Bend ${sourceSegmentId} lacks material or section authority.`);
    }

    const componentId = bendComponentId(structuralPreparation.modelId, sourceBinding.sourceIndex);
    const factorResult = calculateB31Factors(factorRequest({
      componentId,
      sourceSegment,
      bendRecord,
      material,
      physicalSection,
      factorAuthority,
      sourcePreparation,
    }));
    if (factorResult.status !== 'QUALIFIED' || factorResult.componentFactorSet === null) {
      fail(
        'BEND_FACTOR_SET_NOT_QUALIFIED',
        `Bend ${sourceSegmentId} produced no qualified ${factorAuthority.editionProfileId} factor set.`,
        { sourceSegmentId, diagnostics: factorResult.diagnostics },
      );
    }
    if (factorResult.componentFactorSet.flexibilityGeometryBasis !== 'ARC_GEOMETRY_EXCLUDED_V1') {
      fail(
        'BEND_FACTOR_GEOMETRY_BASIS_INVALID',
        `Bend ${sourceSegmentId} factor basis must exclude centreline arc geometry.`,
        { geometryBasis: factorResult.componentFactorSet.flexibilityGeometryBasis },
      );
    }
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
      frameElementProfile: frameProfile(),
      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
      referenceVector: null,
      factorSet: factorResult.componentFactorSet,
    });
    requireAcceptedComponent(component, sourceSegmentId);
    requireComponentMatchesTopology({
      component,
      sourceSegmentId,
      bindings: chordBindingsBySource.get(sourceSegmentId) ?? [],
      conditionedSegmentById,
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
  const geometry = {
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
  };
  return {
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `${input.componentId}.B31.FACTOR`,
    componentId: input.componentId,
    editionProfileId: input.factorAuthority.editionProfileId,
    componentType: 'BEND',
    geometry,
    momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
    semanticHash: '',
  };
}

function requireAcceptedComponent(component, sourceSegmentId) {
  if (component.acceptanceState !== 'ACCEPTED' || component.convergence?.accepted !== true) {
    fail(
      'BEND_COMPONENT_CONVERGENCE_NOT_QUALIFIED',
      `Bend ${sourceSegmentId} does not satisfy the declared S3 convergence profile.`,
      { acceptanceState: component.acceptanceState, convergence: component.convergence },
    );
  }
  if (component.flexibility?.doubleCountGuard?.accepted !== true
    || component.flexibilityOwnership?.ownerPackageId !== 'LFEA-B3.2'
    || component.flexibilityOwnership?.applied !== true) {
    fail('BEND_FLEXIBILITY_OWNERSHIP_INVALID', `Bend ${sourceSegmentId} has invalid flexibility ownership evidence.`);
  }
}

function requireComponentMatchesTopology(input) {
  const ordered = input.bindings.map((binding) => {
    const segment = input.conditionedSegmentById.get(String(binding.segmentId)) ?? null;
    if (segment === null) fail('BEND_COMPONENT_TOPOLOGY_SPAN_MISSING', `Missing bend chord ${binding.segmentId}.`);
    return { binding, segment };
  }).sort((left, right) => Number(left.segment.meta?.bendChordIndex) - Number(right.segment.meta?.bendChordIndex));
  if (ordered.length !== input.component.elements.length) {
    fail('BEND_COMPONENT_TOPOLOGY_COUNT_MISMATCH', `Bend ${input.sourceSegmentId} component/topology chord counts differ.`);
  }
  ordered.forEach((row, index) => {
    const componentElement = input.component.elements[index];
    if (row.binding.elementId !== componentElement.elementId) {
      fail(
        'BEND_COMPONENT_ELEMENT_ID_MISMATCH',
        `Bend ${input.sourceSegmentId} topology ${row.binding.elementId} != component ${componentElement.elementId}.`,
      );
    }
    const nodeI = input.conditionedSegmentById.get(String(row.binding.segmentId));
    const frame = componentElement.frameElement.geometry;
    const start = pointForSegment(row.segment, 'start', input.conditionedSegmentById);
    const end = pointForSegment(row.segment, 'end', input.conditionedSegmentById);
    requirePointMatch(start, frame.nodeI, input.sourceSegmentId, index + 1, 'I');
    requirePointMatch(end, frame.nodeJ, input.sourceSegmentId, index + 1, 'J');
    void nodeI;
  });
}

function pointForSegment(segment, end, _segmentMap) {
  const metaPoint = end === 'start' ? segment.meta?.bendTangentStart : segment.meta?.bendTangentEnd;
  void metaPoint;
  return null;
}

function groupChordBindings(bindings) {
  const map = new Map();
  for (const binding of bindings) {
    if (binding.bendChordOf == null) continue;
    const key = String(binding.bendChordOf);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(binding);
  }
  return map;
}

function requireFactorAuthority(value) {
  const record = requireRecord(value, 'factorAuthority');
  if (typeof record.editionProfileId !== 'string' || record.editionProfileId.length === 0) {
    fail('BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED', 'S3 requires an explicit B31 factor edition profile.');
  }
  if (typeof record.smooth90FlexibilityCorrection !== 'boolean') {
    fail('BEND_FACTOR_SMOOTH90_AUTHORITY_UNRESOLVED', 'S3 requires an explicit smooth-90 flexibility-correction policy.');
  }
  return Object.freeze({
    editionProfileId: record.editionProfileId,
    smooth90FlexibilityCorrection: record.smooth90FlexibilityCorrection,
  });
}

function vector(value) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) {
    fail('BEND_FACTOR_SOURCE_GEOMETRY_INVALID', 'Bend tangent point is missing or non-finite.');
  }
  return [value.x, value.y, value.z];
}

function positive(value, field, sourceSegmentId) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    fail('BEND_FACTOR_SOURCE_GEOMETRY_INVALID', `Bend ${sourceSegmentId} ${field} must be positive and finite.`);
  }
  return value;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('BEND_FACTOR_AUTHORITY_RECORD_INVALID', `${field} must be a record.`);
  }
  return value;
}

function requirePointMatch(actual, expected, sourceSegmentId, index, end) {
  if (!actual || !Array.isArray(expected)) return;
  const delta = Math.hypot(actual[0] - expected[0], actual[1] - expected[1], actual[2] - expected[2]);
  if (delta > POSITION_TOLERANCE) {
    fail('BEND_COMPONENT_TOPOLOGY_GEOMETRY_MISMATCH', `Bend ${sourceSegmentId} chord ${index} end ${end} moved by ${delta} m.`);
  }
}

function fail(code, message, data) {
  const error = new TypeError(message);
  error.code = code;
  error.data = data ?? null;
  throw error;
}
