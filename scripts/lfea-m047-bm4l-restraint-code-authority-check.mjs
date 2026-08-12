import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  decodeCorrectedInputXmlRestraintType,
  retainAccdbRestraintTypeId,
} from '../src/core/nonlinear-restraint-friction/caesar-restraint-code-authority.js';
import { buildInputXmlRestraintAuthorityMap } from '../src/core/nonlinear-restraint-friction/inputxml-restraint-authority-map.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.resolve(here, '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-restraint-code-authority-snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const args = parseArgs(process.argv.slice(2));
const inputXmlMutation = snapshot.sourceDomainPolicy.INPUTXML.config;

assert.equal(retainAccdbRestraintTypeId(17).effectiveTypeId, 17);
assert.equal(retainAccdbRestraintTypeId(17).mutationApplied, false);
assert.equal(retainAccdbRestraintTypeId(7).effectiveTypeId, 7);
assert.equal(snapshot.sourceDomainPolicy.ACCDB.mutationRequired, false);
assert.equal(snapshot.sourceDomainPolicy.INPUTXML.mutationRequired, true);

assert.equal(decodeCorrectedInputXmlRestraintType(0).abbreviation, 'ANC');
assert.equal(decodeCorrectedInputXmlRestraintType(8).abbreviation, 'LIM');
assert.equal(decodeCorrectedInputXmlRestraintType(9).abbreviation, 'GUI');
assert.equal(decodeCorrectedInputXmlRestraintType(14).abbreviation, '+Y');

assert.throws(
  () => buildInputXmlRestraintAuthorityMap('<PIPINGMODEL/>'),
  (error) => error?.code === 'INPUTXML_RESTRAINT_TYPE_MUTATION_CONFIG_REQUIRED',
  'InputXML must not be classified without an explicit mutation config',
);

const synthetic = buildInputXmlRestraintAuthorityMap(`
<PIPINGMODEL>
  <RESTRAINT NUM="1" NODE="100.000000" TYPE="17.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="0.300000" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="1.000000" ZCOSINE="0.000000" TAG="HOLD" GUID=""/>
  <RESTRAINT NUM="2" NODE="100.000000" TYPE="7.000000" STIFFNESS="-1.010100" GAP="25.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="-1.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="3" NODE="100.000000" TYPE="10.000000" STIFFNESS="-1.010100" GAP="5.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="-1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="1" NODE="200.000000" TYPE="0.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="ANC" GUID=""/>
</PIPINGMODEL>`, { restraintTypeMutationConfig: inputXmlMutation });

assert.equal(synthetic.activeRestraintRowCount, 4);
assert.equal(synthetic.activeRestraintNodeCount, 2);
assert.deepEqual(
  Object.fromEntries(synthetic.rawTypeInventory.map((row) => [String(row.sourceTypeCode), row.rowCount])),
  {'0':1,'7':1,'10':1,'17':1},
);
assert.deepEqual(
  Object.fromEntries(synthetic.correctedTypeInventory.map((row) => [String(row.correctedTypeCode), row.rowCount])),
  {'0':1,'8':1,'9':1,'14':1},
);
assert.equal(synthetic.frictionSourceCount, 1);
assert.equal(synthetic.frictionSources[0].sourceTypeCode, 17);
assert.equal(synthetic.frictionSources[0].correctedTypeCode, 14);
assert.equal(synthetic.frictionSources[0].abbreviation, '+Y');
assert.equal(synthetic.limitRows[0].correctedTypeCode, 8);
assert.equal(synthetic.limitRows[0].gap, 25);
assert.equal(synthetic.guideRows[0].correctedTypeCode, 9);
assert.equal(synthetic.guideRows[0].gap, 5);
assert.equal(synthetic.anchorRows[0].correctedTypeCode, 0);
assert.equal(synthetic.positiveGapRows.length, 2);
assert.equal(synthetic.frictionCoupledPositiveGapRows.length, 2);

assert.equal(snapshot.schema, 'm047-bm4l-restraint-code-authority-snapshot/v2');
assert.equal(snapshot.benchmarkId, 'BM4_L');
assert.equal(snapshot.source.inputXmlGitBlobSha, '3423d220374a17f67addd3c8c0c44300ffa46251');
assert.equal(snapshot.source.accdbTableRowCount, 46);
assert.equal(snapshot.inputXmlInventory.activeRestraintRowCount, 46);
assert.equal(snapshot.inputXmlInventory.activeRestraintNodeCount, 30);
assert.deepEqual(
  Object.fromEntries(snapshot.inputXmlInventory.rawByType.map((row) => [String(row.sourceTypeCode), row.rowCount])),
  {'0':1,'7':6,'10':10,'17':29},
);
assert.deepEqual(
  Object.fromEntries(snapshot.inputXmlInventory.correctedByType.map((row) => [String(row.correctedTypeCode), row.rowCount])),
  {'0':1,'8':6,'9':10,'14':29},
);
assert.equal(snapshot.inputXmlInventory.rawByType.reduce((sum, row) => sum + row.rowCount, 0), 46);
assert.equal(snapshot.inputXmlInventory.correctedByType.reduce((sum, row) => sum + row.rowCount, 0), 46);
assert.equal(snapshot.frictionSources.count, 26);
assert.equal(snapshot.frictionSources.inputXmlCorrectedTypeCode, 14);
assert.equal(snapshot.frictionSources.correctedAbbreviation, '+Y');
assert.equal(snapshot.frictionSources.nodeIds.length, 26);
assert.deepEqual(snapshot.frictionSources.nonFrictionPlusYNodeIds, ['20300','20640','21640']);
assert.equal(snapshot.positiveGapRows.totalCount, 6);
assert.equal(snapshot.positiveGapRows.frictionCoupledCompanionCount, 5);
assert.equal(snapshot.positiveGapRows.frictionCoupledNodeCount, 4);
assert.deepEqual(snapshot.positiveGapRows.frictionCoupledNodeIds, ['20030','20390','21480','22310']);
assert.deepEqual(snapshot.positiveGapRows.nonFrictionPositiveGapNodeIds, ['21640']);
assert.equal(snapshot.policy.inputXmlMutationMayBeAppliedToAccdb, false);
assert.equal(snapshot.policy.productionMechanicsAuthorized, false);

let exactSourceReplay = null;
if (args.inputxml) {
  const actual = buildInputXmlRestraintAuthorityMap(
    fs.readFileSync(path.resolve(args.inputxml), 'utf8'),
    { restraintTypeMutationConfig: inputXmlMutation },
  );
  const actualRaw = Object.fromEntries(actual.rawTypeInventory.map((row) => [String(row.sourceTypeCode), {
    rowCount: row.rowCount,
    nodeIds: row.nodeIds,
  }]));
  const expectedRaw = Object.fromEntries(snapshot.inputXmlInventory.rawByType.map((row) => [String(row.sourceTypeCode), {
    rowCount: row.rowCount,
    nodeIds: row.nodeIds,
  }]));
  assert.equal(actual.activeRestraintRowCount, snapshot.inputXmlInventory.activeRestraintRowCount);
  assert.equal(actual.activeRestraintNodeCount, snapshot.inputXmlInventory.activeRestraintNodeCount);
  assert.deepEqual(actualRaw, expectedRaw);
  assert.equal(actual.frictionSourceCount, snapshot.frictionSources.count);
  assert.deepEqual(actual.frictionSources.map((row) => row.nodeId), snapshot.frictionSources.nodeIds);
  assert.equal(actual.positiveGapRows.length, snapshot.positiveGapRows.totalCount);
  assert.equal(
    actual.frictionCoupledPositiveGapRows.length,
    snapshot.positiveGapRows.frictionCoupledCompanionCount,
  );
  exactSourceReplay = { status: 'PASS', inputXmlPath: path.resolve(args.inputxml) };
}

console.log(JSON.stringify({
  check: 'm047-bm4l-restraint-code-authority',
  status: 'PASS',
  sourceDomainPolicy: {
    accdbMutationRequired: false,
    inputXmlMutationRequired: true,
  },
  inputXmlRawTypeCounts: Object.fromEntries(
    snapshot.inputXmlInventory.rawByType.map((row) => [row.sourceTypeCode, row.rowCount]),
  ),
  inputXmlCorrectedTypeCounts: Object.fromEntries(
    snapshot.inputXmlInventory.correctedByType.map((row) => [row.abbreviation, row.rowCount]),
  ),
  frictionSources: snapshot.frictionSources.count,
  positiveGapRows: snapshot.positiveGapRows.totalCount,
  frictionCoupledPositiveGapCompanions: snapshot.positiveGapRows.frictionCoupledCompanionCount,
  exactSourceReplay,
  productionMechanicsAuthorized: false,
}, null, 2));

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) throw new Error(`unexpected argument ${key}`);
    const value = values[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}
