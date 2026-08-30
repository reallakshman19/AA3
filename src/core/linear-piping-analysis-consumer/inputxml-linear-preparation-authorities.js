import { resolveInputXmlThermalInputAuthority } from './inputxml-thermal-authority.js';
import { InputXmlLinearSolvePreparationError } from './inputxml-linear-preparation-profile.js';
import { finiteAuthorityValue } from './inputxml-linear-preparation-authority-support.js';
import {
  materialFor,
  rigidFor,
  rigidSectionFor,
  sectionFor,
} from './inputxml-linear-preparation-material-section-authorities.js';
import { loadBindingFor } from './inputxml-linear-preparation-load-authorities.js';

export function prepareInputXmlElementAuthorities({
  sourceBundle,
  sourceBundleSemanticHash,
  geometry,
  inventory,
  modelId,
  analysisProfileId,
  thermalIntervalAuthority,
}) {
  const elementBySegment = new Map(
    sourceBundle.elementRecords
      .filter((row) => row.canonicalSegmentId !== null)
      .map((row) => [String(row.canonicalSegmentId), row]),
  );
  const inventoryBySegment = new Map(
    inventory
      .filter((row) => row.sourceKind === 'ELEMENT_COMPONENT')
      .flatMap((row) => row.targetIds.segmentIds.map((segmentId) => [String(segmentId), row])),
  );
  const materialBySignature = new Map();
  const sectionBySignature = new Map();
  const materialResolutions = [];
  const sectionResolutions = [];
  const rigidAuthorities = [];
  const segmentBindings = [];
  const loadBindings = [];

  for (const segment of geometry.segments) {
    const segmentId = String(segment.id);
    const element = elementBySegment.get(segmentId) ?? null;
    const inventoryItem = inventoryBySegment.get(segmentId) ?? null;
    if (element === null || inventoryItem === null) {
      fail(
        'INPUTXML_PREPARATION_ELEMENT_SOURCE_MISSING',
        `Segment ${segmentId} lacks retained source or representability custody.`,
        { segmentId },
      );
    }
    const disposition = inventoryItem.dispositionByProfile[analysisProfileId] ?? null;
    if (!['IMPLEMENTED_EXACTLY', 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION']
      .includes(disposition?.disposition)) {
      fail(
        'INPUTXML_PREPARATION_COMPONENT_NOT_REPRESENTABLE',
        `Segment ${segmentId} is not representable under ${analysisProfileId}.`,
        { segmentId, disposition },
      );
    }
    const analysis = segment.meta?.analysis ?? {};
    const operatingTemperature = finiteAuthorityValue(analysis.operatingTemperature);
    const thermalInput = resolveInputXmlThermalInputAuthority({
      intervalAuthority: thermalIntervalAuthority,
      modelId,
      sourceBundleSemanticHash,
      materialNumber: segment.meta?.materialNumber,
      operatingTemperature,
    });
    const thermalAuthority = thermalInput.thermalAuthority;
    const installationTemperature = thermalInput.installationTemperature;
    const evaluationTemperature = operatingTemperature ?? installationTemperature;
    const materialResolution = materialFor({
      segment,
      element,
      analysis,
      evaluationTemperature,
      thermalAuthority,
      sourceBundleSemanticHash,
      modelId,
      materialBySignature,
      materialResolutions,
    });
    const physicalSection = sectionFor({
      segment,
      element,
      sourceBundleSemanticHash,
      modelId,
      sectionBySignature,
      sectionResolutions,
    });
    const rigidFeature = (element.childFeatures ?? [])
      .find((row) => String(row.kind).toUpperCase() === 'RIGID') ?? null;
    const rigidAuthority = rigidFeature === null ? null : rigidFor({
      segment,
      element,
      rigidFeature,
      analysis,
      physicalSection,
      materialResolution,
      thermalAuthority,
      installationTemperature,
      sourceBundleSemanticHash,
      modelId,
    });
    if (rigidAuthority !== null) rigidAuthorities.push(rigidAuthority);
    const analysisSection = rigidAuthority === null
      ? physicalSection
      : rigidSectionFor({
        segment,
        rigidAuthority,
        sourceBundleSemanticHash,
        modelId,
        sectionBySignature,
        sectionResolutions,
      });

    segmentBindings.push(Object.freeze({
      bindingId: `${modelId}:SEGMENT:${segmentId}`,
      segmentId,
      sourceFeatureId: element.sourceFeatureId,
      sourceIndex: element.sourceIndex,
      componentKind: inventoryItem.classification.componentKind,
      representabilityDisposition: disposition.disposition,
      limitationCode: disposition.limitationCode,
      materialResolutionSemanticHash: materialResolution.semanticHash,
      materialResolutionEvidenceHash: materialResolution.evidenceHash,
      physicalSectionSemanticHash: physicalSection.semanticHash,
      analysisSectionSemanticHash: analysisSection.semanticHash,
      rigidAuthoritySemanticHash: rigidAuthority?.semanticHash ?? null,
      thermalAuthoritySemanticHash: thermalAuthority.semanticHash,
      thermalAuthorityStatus: thermalAuthority.status,
    }));
    loadBindings.push(loadBindingFor({
      segment,
      element,
      analysis,
      materialResolution,
      physicalSection,
      rigidAuthority,
      thermalAuthority,
      installationTemperature,
      modelId,
      sourceBundleSemanticHash,
    }));
  }

  return Object.freeze({
    materialResolutions: Object.freeze(materialResolutions),
    sectionResolutions: Object.freeze(sectionResolutions),
    rigidAuthorities: Object.freeze(rigidAuthorities),
    segmentBindings: Object.freeze(segmentBindings),
    loadBindings: Object.freeze(loadBindings),
  });
}

function fail(code, message, data) {
  throw new InputXmlLinearSolvePreparationError(message, code, data);
}
