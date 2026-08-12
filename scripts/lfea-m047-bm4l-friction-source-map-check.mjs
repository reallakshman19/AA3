import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildInputXmlFrictionSiteMap } from '../src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js';

const args = parseArgs(process.argv.slice(2));
const snapshotPath = path.resolve(args.snapshot ?? 'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-source-map-snapshot.json');
const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

const synthetic = buildInputXmlFrictionSiteMap(`
<PIPINGMODEL>
  <RESTRAINT NUM="1" NODE="100.000000" TYPE="17.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="0.300000" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="1.000000" ZCOSINE="0.000000" TAG="HOLD" GUID=""/>
  <RESTRAINT NUM="2" NODE="100.000000" TYPE="10.000000" STIFFNESS="-1.010100" GAP="5.000000" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="" GUID=""/>
  <RESTRAINT NUM="1" NODE="200.000000" TYPE="17.000000" STIFFNESS="-1.010100" GAP="-1.010100" FRIC_COEF="-1.010100" CNODE="-1.010100" XCOSINE="0.000000" YCOSINE="1.000000" ZCOSINE="0.000000" TAG="" GUID=""/>
</PIPINGMODEL>`);
assert(synthetic.frictionSiteCount === 1, 'synthetic friction site count');
assert(synthetic.frictionNodeIds[0] === '100', 'synthetic friction node');
assert(synthetic.sites[0].sourceTypeCode === '17', 'synthetic source type');
assert(synthetic.sites[0].coefficientOfFriction === 0.3, 'synthetic mu');
assert(JSON.stringify(synthetic.sites[0].normalUnit) === JSON.stringify([0, 1, 0]), 'synthetic normal');
assert(synthetic.positiveGapCompanionCount === 1, 'synthetic gap companion count');
assert(synthetic.sites[0].positiveGapCompanions[0].gap === 5, 'synthetic gap');

validatePinnedSnapshot(expected);
let exactSourceReplay = null;
if (args.inputxml) {
  const actual = buildInputXmlFrictionSiteMap(fs.readFileSync(path.resolve(args.inputxml), 'utf8'));
  const compact = compactSnapshot(actual, expected.source);
  assert(JSON.stringify(compact) === JSON.stringify(expected), 'exact InputXML source-map snapshot mismatch');
  exactSourceReplay = { status: 'PASS', inputXmlPath: path.resolve(args.inputxml) };
}

console.log(JSON.stringify({
  check: 'm047-bm4l-friction-source-map',
  status: 'PASS',
  syntheticMapperFixture: 'PASS',
  pinnedSnapshot: 'PASS',
  exactSourceReplay,
  frictionSiteCount: expected.frictionSiteCount,
  positiveGapFrictionSiteCount: expected.positiveGapFrictionSiteCount,
  positiveGapCompanionCount: expected.positiveGapCompanionCount,
  slideMultiplierAssignedByMapper: false,
  newMechanicsAuthorized: false,
}, null, 2));

function compactSnapshot(actual, source) {
  return {
    schema: 'm047-bm4l-friction-source-map-snapshot/v1',
    source,
    activeRestraintNodeCount: actual.activeRestraintNodeCount,
    frictionSiteCount: actual.frictionSiteCount,
    frictionNodeCount: actual.frictionNodeCount,
    positiveFrictionCoefficients: actual.positiveFrictionCoefficients,
    frictionNodeIds: actual.frictionNodeIds,
    positiveGapFrictionSiteCount: actual.positiveGapFrictionSiteCount,
    positiveGapCompanionCount: actual.positiveGapCompanionCount,
    positiveGapSites: actual.sites.filter((row) => row.positiveGapCompanions.length > 0).map((row) => ({
      nodeId: row.nodeId,
      gaps: row.positiveGapCompanions.map((candidate) => ({
        restraintNumber: candidate.restraintNumber,
        typeCode: candidate.typeCode,
        gap: candidate.gap,
        direction: candidate.direction,
      })),
    })),
    invariants: {
      allFrictionSourcesType17: actual.sites.every((row) => row.sourceTypeCode === '17'),
      allFrictionNormalsPositiveY: actual.sites.every((row) => JSON.stringify(row.normalUnit) === JSON.stringify([0, 1, 0])),
      allFrictionCoefficientsPointThree: actual.sites.every((row) => row.coefficientOfFriction === 0.3),
      mapperAssignsSlideMultiplier: false,
      newMechanicsAuthorized: false,
    },
  };
}

function validatePinnedSnapshot(value) {
  assert(value.schema === 'm047-bm4l-friction-source-map-snapshot/v1', 'snapshot schema');
  assert(value.activeRestraintNodeCount === 30, 'BM4_L active restraint node count');
  assert(value.frictionSiteCount === 26 && value.frictionNodeCount === 26, 'BM4_L friction site count');
  assert(JSON.stringify(value.positiveFrictionCoefficients) === JSON.stringify([0.3]), 'BM4_L coefficient set');
  assert(value.frictionNodeIds.length === 26, 'BM4_L friction node list length');
  assert(value.positiveGapFrictionSiteCount === 4, 'BM4_L friction sites with gaps');
  assert(value.positiveGapCompanionCount === 5, 'BM4_L positive gap companion count');
  assert(value.invariants?.allFrictionSourcesType17 === true, 'BM4_L friction source type invariant');
  assert(value.invariants?.allFrictionNormalsPositiveY === true, 'BM4_L friction normal invariant');
  assert(value.invariants?.allFrictionCoefficientsPointThree === true, 'BM4_L friction coefficient invariant');
  assert(value.invariants?.mapperAssignsSlideMultiplier === false, 'mapper must not assign slide multiplier');
  assert(value.invariants?.newMechanicsAuthorized === false, 'source map must not authorize mechanics');
}

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
