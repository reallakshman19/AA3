import { stringValue } from '../../../core/shared-piping-model/index.js';
import {
  createPipeSegmentCatalogueBinding,
} from '../topology-edit-pipe-segment-contract.js';
import {
  assertTopologyEditPipeSpecificationRebindTarget,
} from '../topology-edit-pipe-specification-rebind.js';
import {
  assertTopologyEditSpecificationCatalogue,
} from '../professional/topology-edit-spec-catalog.js';

export function topologyEditTablePipeSpecificationCandidates({
  catalogue,
  row,
  canonicalTopology = null,
} = {}) {
  if (!catalogue || !isPipeRow(row)) return [];
  const exactCatalogue = assertTopologyEditSpecificationCatalogue(catalogue);
  return exactCatalogue.records.filter((record) => {
    if (record.componentType !== 'PIPE') return false;
    if (!compatibleText(row.fields?.endConnectionFrom, record.endConnectionFrom)
      || !compatibleText(row.fields?.endConnectionTo, record.endConnectionTo)) return false;
    if (row.custody?.catalogue?.recordHash === record.recordHash) return false;
    if (!canonicalTopology) return true;
    try {
      assertTopologyEditPipeSpecificationRebindTarget(canonicalTopology, {
        edgeId: row.identity.canonicalId,
        catalogueBinding: createPipeSegmentCatalogueBinding({
          catalogue: exactCatalogue,
          recordId: record.recordId,
        }),
      });
      return true;
    } catch {
      return false;
    }
  });
}

export function resolveTopologyEditTablePipeSpecificationSelection({
  catalogue,
  row,
  canonicalTopology,
  recordId: recordIdInput,
} = {}) {
  if (!catalogue) {
    throw new TypeError(
      'TopologyEditTablePipeCatalogue: certified specification catalogue is required.',
    );
  }
  if (!isPipeRow(row)) {
    throw new RangeError(
      'TopologyEditTablePipeCatalogue: exact canonical PIPE edge row is required.',
    );
  }
  const recordId = stringValue(recordIdInput);
  if (!recordId) {
    throw new TypeError(
      'TopologyEditTablePipeCatalogue: exact PIPE catalogue record selection is required.',
    );
  }
  const exactCatalogue = assertTopologyEditSpecificationCatalogue(catalogue);
  const matches = topologyEditTablePipeSpecificationCandidates({
    catalogue: exactCatalogue,
    row,
    canonicalTopology,
  }).filter((record) => record.recordId === recordId);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditTablePipeCatalogue: record ${recordId} resolved ${matches.length} compatible PIPE records.`,
    );
  }
  const record = matches[0];
  const catalogueBinding = createPipeSegmentCatalogueBinding({
    catalogue: exactCatalogue,
    recordId: record.recordId,
  });
  assertTopologyEditPipeSpecificationRebindTarget(canonicalTopology, {
    edgeId: row.identity.canonicalId,
    catalogueBinding,
  });
  return Object.freeze({
    catalogueHash: exactCatalogue.catalogueHash,
    sourceHash: exactCatalogue.authority.sourceHash,
    record,
    catalogueBinding,
  });
}

export function topologyEditTablePipeSpecificationCatalogueLabel(record) {
  if (!record) return '';
  return [
    record.recordId,
    `DN ${record.nominalSizeMm}`,
    record.schedule,
    record.materialSpecification,
    record.pipingClass,
    record.pressureClass ? `Class ${record.pressureClass}` : null,
  ].filter(Boolean).join(' · ');
}

function isPipeRow(row) {
  return row?.elementType === 'PIPE' && row.identity?.canonicalKind === 'EDGE';
}
function compatibleText(observed, candidate) {
  const expected = stringValue(observed).toUpperCase();
  return !expected || expected === stringValue(candidate).toUpperCase();
}
