import {
  assertTopologyEditSpecificationCatalogue,
  assertTopologyEditSpecificationRecord,
} from './topology-edit-spec-catalog.js';

export function topologyEditSpecificationCatalogueBinding(catalogueInput, recordInput) {
  const catalogue = assertTopologyEditSpecificationCatalogue(catalogueInput);
  const record = assertTopologyEditSpecificationRecord(recordInput);
  if (!catalogue.records.some((candidate) => (
    candidate.recordId === record.recordId && candidate.recordHash === record.recordHash
  ))) {
    throw new RangeError(
      `TopologyEditSpecificationCatalogueBinding: record ${record.recordId} is not part of ${catalogue.catalogueId}.`,
    );
  }
  return Object.freeze({
    catalogueHash: catalogue.catalogueHash,
    sourceHash: catalogue.authority.sourceHash,
    recordId: record.recordId,
    recordHash: record.recordHash,
    componentType: record.componentType,
    nominalSizeMm: record.nominalSizeMm,
    outsideDiameterMm: record.outsideDiameterMm,
    secondaryNominalSizeMm: record.secondaryNominalSizeMm,
    secondaryOutsideDiameterMm: record.secondaryOutsideDiameterMm,
    pipingClass: record.pipingClass,
    pressureClass: record.pressureClass,
    materialSpecification: record.materialSpecification,
    componentLengthMm: record.componentLengthMm,
    componentMassKg: record.componentMassKg,
    endConnectionFrom: record.endConnectionFrom,
    endConnectionTo: record.endConnectionTo,
    valveType: record.valveType,
    valveFaceToFaceMm: record.valveFaceToFaceMm,
    flangeClass: record.flangeClass,
    flangeFacing: record.flangeFacing,
    flangeType: record.flangeType,
    flangeThicknessMm: record.flangeThicknessMm,
    flangeOutsideDiameterMm: record.flangeOutsideDiameterMm,
    boltCircleDiameterMm: record.boltCircleDiameterMm,
    boltHoleCount: record.boltHoleCount,
    boltHoleDiameterMm: record.boltHoleDiameterMm,
    reducerType: record.reducerType,
    reducerOrientation: record.reducerOrientation,
    sourceReference: record.sourceReference,
  });
}
