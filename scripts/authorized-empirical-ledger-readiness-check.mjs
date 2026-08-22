#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
  replaceProjectDataValue,
  validateProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';

const approved = (value, source) => createEvidenceValue(value, { source }, true);
let profile = createEmptyProjectDataProfile();
profile = replaceProjectDataValue(profile, 'loadCalculation.pipeSectionProperties', {
  L1: {
    outsideDiameterMm: 100,
    wallThicknessMm: 5,
    materialCode: 'MAT',
    insulationCode: 'NONE',
    insulationThicknessMm: 0,
  },
}, { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' }, true);
profile = replaceProjectDataValue(
  profile,
  'loadCalculation.materialDensitiesKgPerM3',
  { MAT: 7850 },
  { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' },
  true,
);
profile = replaceProjectDataValue(
  profile,
  'loadCalculation.operatingFluidDensitiesKgPerM3',
  { L1: 800 },
  { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' },
  true,
);
profile = replaceProjectDataValue(
  profile,
  'loadCalculation.hydroFluidDensitiesKgPerM3',
  { L1: 1000 },
  { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' },
  true,
);
profile = replaceProjectDataValue(
  profile,
  'loadCalculation.insulationDensitiesKgPerM3',
  { NONE: 0 },
  { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' },
  true,
);
profile = replaceProjectDataValue(
  profile,
  'loadCalculation.componentWeightsKg',
  { V1: 10 },
  { source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER' },
  true,
);

// Preserve a minimal dataset-source identity only; the line-list, piping-class
// and component-weight master source sheets are intentionally absent.
profile = replaceProjectDataValue(
  profile,
  'sourcesAndUnits.datasetSource',
  { sha256: '1'.repeat(64) },
  { source: 'FIXTURE_DATASET', sourceKey: 'dataset', sourceHash: '1'.repeat(64) },
  true,
);

const effective = createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
const activeHashes = {
  dataset: '1'.repeat(64),
  lineList: '',
  pipingClass: '',
  componentWeight: '',
};

const ledgerAudit = validateProjectDataProfile(effective, 'authorizedGravityLoads', activeHashes);
assert.deepEqual(
  ledgerAudit.errors,
  [],
  'ledger-authorized gravity must not re-demand missing master-source sheets',
);

const legacyAudit = validateProjectDataProfile(effective, 'loads', activeHashes);
assert.ok(legacyAudit.errors.length >= 3, 'legacy loads workflow must remain stricter');
for (const path of [
  'sourcesAndUnits.lineListSource',
  'sourcesAndUnits.pipingClassSource',
  'sourcesAndUnits.componentWeightSource',
]) {
  assert.ok(
    legacyAudit.errors.some((row) => row.path === path),
    `legacy workflow must still require ${path}`,
  );
}

const storeSource = readFileSync(
  new URL('../src/workspace/engineering-model-store.js', import.meta.url),
  'utf8',
);
assert.match(
  storeSource,
  /runtimePackage\.authorizedInput\?\.effectiveValueLedger\s*\? 'authorizedGravityLoads'\s*:\s*'loads'/u,
  'production readiness must select the ledger-aware workflow only for ledger-bearing input',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_LEDGER_AWARE_PRE_EXECUTION_READINESS',
  authorizedGravityLoadErrors: ledgerAudit.errors.length,
  legacyLoadErrors: legacyAudit.errors.length,
  absentMasterSources: [
    'lineListSource',
    'pipingClassSource',
    'componentWeightSource',
  ],
}, null, 2));
