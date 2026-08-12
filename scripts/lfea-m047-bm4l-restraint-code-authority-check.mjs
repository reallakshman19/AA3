import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { decodeCaesarRestraintCode } from '../src/core/nonlinear-restraint-friction/caesar-restraint-code-authority.js';
import { buildInputXmlRestraintAuthorityMap } from '../src/core/nonlinear-restraint-friction/inputxml-restraint-authority-map.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.resolve(here, '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-restraint-code-authority-snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const args = parseArgs(process.argv.slice(2));

assert.equal(decodeCaesarRestraintCode(1).abbreviation, 'ANC');
assert.deepEqual(decodeCaesarRestraintCode(1).dofs, ['UX','UY','UZ','RX','RY','RZ']);
assert.equal(decodeCaesarRestraintCode(7).abbreviation, 'RZ');
assert.deepEqual(decodeCaesarRestraintCode(7).dofs, ['RZ']);
assert.equal(decodeCaesarRestraintCode(7).gapUnitClass, 'ANGLE_DEG');
assert.equal(decodeCaesarRestraintCode(10).abbreviation, 'XSNB');
assert.equal(decodeCaesarRestraintCode(10).snubber, true);
assert.equal(decodeCaesarRestraintCode(10).activationAuthority, 'LOAD_CASE_SNUBBERS_ACTIVE');
assert.equal(decodeCaesarRestraintCode(17).abbreviation, '-Y');
assert.equal(decodeCaesarRestraintCode(17).freeDirection, '-Y');
assert.equal(decodeCaesarRestraintCode(17).restrainedDirection, '+Y');
assert.deepEqual(decodeCaesarRestraintCode(17).dofs, ['UY']);

const synthetic = buildInputXmlRestraintAuthorityMap(`
<PIPINGMODEL>
  <RESTRAINT NUM="1" NODE="100.000000" TYPE="17.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="0.300000" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="1.000000" ZCOSINE="0.000000" TAG="HOLD" GUID=""/>
  <RESTRAINT NUM="2" NODE="100.000000" TYPE="7.000000" STIFFNESS="-1.010100" GAP="25.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="-1.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="3" NODE="100.000000" TYPE="10.000000" STIFFNESS="-1.010100" GAP="5.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="-1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="1" NODE="200.000000" TYPE="1.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="ANC" GUID=""/>
</PIPINGMODEL>`);

assert.equal(synthetic.activeRestraintRowCount, 4);
assert.equal(synthetic.activeRestraintNodeCount, 2);
assert.equal(synthetic.frictionSourceCount, 1);
assert.equal(synthetic.frictionSources[0].abbreviation, '-Y');
assert.equal(synthetic.frictionSources[0].frictionCoefficient, 0.3);
assert.equal(synthetic.rotationalRestraints[0].abbreviation, 'RZ');
assert.equal(synthetic.rotationalRestraints[0].gap, 25);
assert.equal(synthetic.rotationalRestraints[0].gapUnitClass, 'ANGLE_DEG');
assert.equal(synthetic.staticSnubbers[0].abbreviation, 'XSNB');
assert.equal(synthetic.staticSnubbers[0].activationAuthority, 'LOAD_CASE_SNUBBERS_ACTIVE');
assert.equal(synthetic.anchors[0].abbreviation, 'ANC');

assert.equal(snapshot.schema, 'm047-bm4l-restraint-code-authority-snapshot/v1');
assert.equal(snapshot.benchmarkId, 'BM4_L');
assert.equal(snapshot.source.inputXmlGitBlobSha, '3423d220374a17f67addd3c8c0c44300ffa46251');
assert.equal(snapshot.sourceInventory.activeRestraintRowCount, 46);
assert.equal(snapshot.sourceInventory.activeRestraintNodeCount, 30);
assert.deepEqual(Object.fromEntries(snapshot.sourceInventory.byType.map((row) => [String(row.typeCode), row.rowCount])), {
  '1': 1,
  '7': 3,
  '10': 13,
  '17': 29,
});
assert.equal(snapshot.sourceInventory.byType.reduce((sum, row) => sum + row.rowCount, 0), 46);
assert.equal(snapshot.frictionSources.count, 26);
assert.equal(snapshot.frictionSources.typeCode, 17);
assert.equal(snapshot.frictionSources.nodeIds.length, 26);
assert.deepEqual(snapshot.frictionSources.nonFrictionDirectionalNodeIds, ['20300','20640','21640']);
assert.equal(snapshot.rotationalRzRows.length, 3);
assert.deepEqual(snapshot.rotationalRzRows.filter((row) => row.gapSourceValue !== null).map((row) => row.gapSourceValue), [25, 25]);
assert.equal(snapshot.staticXSnubberRows.length, 13);
assert.equal(snapshot.l13CaseAuthority.caseType, 'SUS');
assert.equal(snapshot.l13CaseAuthority.productionSnubberStateAuthorized, false);
assert.equal(snapshot.currentSolverAudit.productionSolverChangeAuthorizedByThisSnapshot, false);
assert.equal(snapshot.policy.responseFittingUsed, false);
assert.equal(snapshot.policy.productionMechanicsAuthorized, false);

let exactSourceReplay = null;
if (args.inputxml) {
  const actual = buildInputXmlRestraintAuthorityMap(fs.readFileSync(path.resolve(args.inputxml), 'utf8'));
  const actualByType = Object.fromEntries(actual.typeInventory.map((row) => [String(row.typeCode), {
    rowCount: row.rowCount,
    nodeIds: row.nodeIds,
  }]));
  const expectedByType = Object.fromEntries(snapshot.sourceInventory.byType.map((row) => [String(row.typeCode), {
    rowCount: row.rowCount,
    nodeIds: row.nodeIds,
  }]));
  assert.equal(actual.activeRestraintRowCount, snapshot.sourceInventory.activeRestraintRowCount);
  assert.equal(actual.activeRestraintNodeCount, snapshot.sourceInventory.activeRestraintNodeCount);
  assert.deepEqual(actualByType, expectedByType);
  assert.equal(actual.frictionSourceCount, snapshot.frictionSources.count);
  assert.deepEqual(actual.frictionSources.map((row) => row.nodeId), snapshot.frictionSources.nodeIds);
  exactSourceReplay = { status: 'PASS', inputXmlPath: path.resolve(args.inputxml) };
}

console.log(JSON.stringify({
  check: 'm047-bm4l-restraint-code-authority',
  status: 'PASS',
  activeRestraintRows: snapshot.sourceInventory.activeRestraintRowCount,
  typeCounts: Object.fromEntries(snapshot.sourceInventory.byType.map((row) => [row.abbreviation, row.rowCount])),
  frictionSources: snapshot.frictionSources.count,
  historicalPositiveGapProxySuperseded: true,
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
