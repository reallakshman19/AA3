import { stringValue } from '../../../core/shared-piping-model/index.js';
import {
  topologyEditSpecificationCatalogueBinding,
} from '../professional/topology-edit-spec-catalog-binding.js';
import {
  assertTopologyEditSpecificationCatalogue,
} from '../professional/topology-edit-spec-catalog.js';

const EPSILON = 1e-9;

export function topologyEditTableValveCatalogueCandidates({ catalogue, row } = {}) {
  if (!catalogue || !isValveRow(row)) return [];
  const exactCatalogue = assertTopologyEditSpecificationCatalogue(catalogue);
  return exactCatalogue.records.filter((record) => (
    record.componentType === 'VALVE'
    && record.valveType === 'BALL'
    && compatibleNumber(row.fields?.dnInMm, record.nominalSizeMm)
    && compatibleText(row.fields?.pipingClass, record.pipingClass)
    && compatibleText(row.fields?.pressureClass, record.pressureClass)
    && compatibleText(row.fields?.endConnectionFrom, record.endConnectionFrom)
    && compatibleText(row.fields?.endConnectionTo, record.endConnectionTo)
  ));
}

export function resolveTopologyEditTableValveCatalogueSelection({
  catalogue,
  row,
  recordId: recordIdInput,
} = {}) {
  if (!catalogue) {
    throw new TypeError('TopologyEditTableValveCatalogue: certified specification catalogue is required.');
  }
  if (!isValveRow(row)) {
    throw new RangeError('TopologyEditTableValveCatalogue: exact canonical VALVE edge row is required.');
  }
  const recordId = stringValue(recordIdInput);
  if (!recordId) {
    throw new TypeError('TopologyEditTableValveCatalogue: exact BALL catalogue record selection is required.');
  }
  const exactCatalogue = assertTopologyEditSpecificationCatalogue(catalogue);
  const matches = topologyEditTableValveCatalogueCandidates({ catalogue: exactCatalogue, row })
    .filter((record) => record.recordId === recordId);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditTableValveCatalogue: record ${recordId} resolved ${matches.length} compatible BALL records.`,
    );
  }
  const record = matches[0];
  return Object.freeze({
    catalogueHash: exactCatalogue.catalogueHash,
    sourceHash: exactCatalogue.authority.sourceHash,
    record,
    catalogueBinding: topologyEditSpecificationCatalogueBinding(exactCatalogue, record),
  });
}

export function topologyEditTableValveCatalogueLabel(record) {
  if (!record) return '';
  return [
    record.recordId,
    `DN ${record.nominalSizeMm}`,
    record.pipingClass,
    record.pressureClass ? `Class ${record.pressureClass}` : null,
    `${record.valveFaceToFaceMm} mm F2F`,
  ].filter(Boolean).join(' · ');
}

function isValveRow(row) {
  return row?.elementType === 'VALVE' && row.identity?.canonicalKind === 'EDGE';
}
function compatibleNumber(observed, candidate) {
  const value = Number(observed);
  return !Number.isFinite(value) || value <= 0 || Math.abs(value - Number(candidate)) <= EPSILON;
}
function compatibleText(observed, candidate) {
  const expected = stringValue(observed).toUpperCase();
  return !expected || expected === stringValue(candidate).toUpperCase();
}
