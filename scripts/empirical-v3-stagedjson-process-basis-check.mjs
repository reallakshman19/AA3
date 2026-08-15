import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  STAGEDJSON_PROCESS_AUTHORITY_SCHEMA,
  sealStagedJsonProcessAuthority,
} from '../src/workspace/analysis-authority-overlay/stagedjson-process-authority.js';
import { STAGEDJSON_PROCESS_INHERITANCE_POLICY } from '../src/workspace/analysis-authority-overlay/stagedjson-resolution-common.js';
import { adaptCurrentStagedJsonProcessBasis } from '../src/workspace/engineering-loads/adapters/empirical-v3-stagedjson-process-basis-adapter.js';

const h = (value) => semanticHash({ value });
const dataset = {
  schema: 'analysis-workspace-dataset/v1',
  datasetId: 'DATASET-1',
  sourceName: 'fixture.json',
  sourceSha256: 'a'.repeat(64),
  sourceSnapshot: { sourceSemanticHash: h('snapshot') },
  entities: [
    { entityId: 'P1', branchId: 'SOURCE-BRANCH-A' },
    { entityId: 'P2', branchId: 'SOURCE-BRANCH-B' },
    { entityId: 'P3', branchId: 'SOURCE-BRANCH-A' },
  ],
};

function declared(value, unit, entityId, fieldName) {
  return {
    status: 'DECLARED',
    value,
    unit,
    sourceEntityId: entityId,
    sourceField: fieldName,
    fromEntityId: null,
    diagnosticCodes: [],
    evidence: [{
      source: 'fixture.json',
      locator: `/${entityId}/${fieldName}`,
      sourceSemanticHash: h(`${entityId}:${fieldName}`),
    }],
  };
}
function missing(unit, code = 'FIELD_MISSING') {
  return {
    status: 'MISSING',
    value: null,
    unit,
    sourceEntityId: null,
    sourceField: null,
    fromEntityId: null,
    diagnosticCodes: [code],
    evidence: [],
  };
}
function fields(entityId, operatingTemperature = 393.15) {
  return {
    designPressure: declared(10, 'MPa', entityId, 'designPressure'),
    operatingAnalysisPressure: declared(8, 'MPa', entityId, 'operatingAnalysisPressure'),
    hydrotestPressure: declared(12, 'MPa', entityId, 'hydrotestPressure'),
    referenceTemperature: declared(293.15, 'K', entityId, 'referenceTemperature'),
    operatingTemperature: declared(operatingTemperature, 'K', entityId, 'operatingTemperature'),
    designTemperature: declared(423.15, 'K', entityId, 'designTemperature'),
    operatingFluidDensity: declared(850, 'kg/m3', entityId, 'operatingFluidDensity'),
    hydrotestFluidDensity: declared(1000, 'kg/m3', entityId, 'hydrotestFluidDensity'),
    insulationThickness: declared(50, 'mm', entityId, 'insulationThickness'),
    insulationDensity: declared(120, 'kg/m3', entityId, 'insulationDensity'),
    materialDensity: declared(7850, 'kg/m3', entityId, 'materialDensity'),
    corrosionAllowance: declared(3, 'mm', entityId, 'corrosionAllowance'),
    fluidPhase: declared('L', 'NONE', entityId, 'fluidPhase'),
    fluidService: declared('HC', 'NONE', entityId, 'fluidService'),
  };
}
function authority(entityId, branchId, operatingTemperature = 393.15, overrideFields = null) {
  return sealStagedJsonProcessAuthority({
    schema: STAGEDJSON_PROCESS_AUTHORITY_SCHEMA,
    processAuthorityId: `process:${entityId}`,
    datasetRef: {
      datasetId: dataset.datasetId,
      sourceId: dataset.sourceName,
      sourceSha256: dataset.sourceSha256,
      sourceSnapshotSemanticHash: dataset.sourceSnapshot.sourceSemanticHash,
    },
    scope: { branchId, entityId },
    inheritancePolicy: STAGEDJSON_PROCESS_INHERITANCE_POLICY,
    temperatureRoles: {
      REFERENCE: 'referenceTemperature',
      OPERATING: 'operatingTemperature',
      DESIGN: 'designTemperature',
    },
    fields: overrideFields ?? fields(entityId, operatingTemperature),
    diagnostics: [],
  }, { dataset });
}

const p1 = adaptCurrentStagedJsonProcessBasis({
  runId: 'RUN:PROCESS',
  dataset,
  processAuthority: authority('P1', 'SOURCE-BRANCH-A'),
});
const p2 = adaptCurrentStagedJsonProcessBasis({
  runId: 'RUN:PROCESS',
  dataset,
  processAuthority: authority('P2', 'SOURCE-BRANCH-B'),
});
assert.equal(p1.processBasis.semanticHash, p2.processBasis.semanticHash);
assert.equal(p1.insulationBasis.semanticHash, p2.insulationBasis.semanticHash);
assert.notEqual(p1.observedSourceBranchId, p2.observedSourceBranchId);
assert.equal(p1.risks.length, 0);
assert.ok(p1.quantityAuthorities.every((row) => row.authorityClass === 'SOURCE_EXACT'));

const p3Hot = adaptCurrentStagedJsonProcessBasis({
  runId: 'RUN:PROCESS',
  dataset,
  processAuthority: authority('P3', 'SOURCE-BRANCH-A', 423.15),
});
assert.notEqual(p1.processBasis.semanticHash, p3Hot.processBasis.semanticHash);

const missingTemperatureFields = fields('P3');
missingTemperatureFields.operatingTemperature = missing('K', 'OPERATING_TEMPERATURE_MISSING');
const p3Missing = adaptCurrentStagedJsonProcessBasis({
  runId: 'RUN:PROCESS',
  dataset,
  processAuthority: authority('P3', 'SOURCE-BRANCH-A', 393.15, missingTemperatureFields),
});
assert.equal(p3Missing.risks.length, 1);
assert.equal(p3Missing.risks[0].riskClass, 'HIGH_BLOCK');
assert.match(p3Missing.risks[0].riskCode, /REQUIRED_QUANTITY_UNRESOLVED/);

console.log('PASS empirical-v3-stagedjson-process-basis-check');
