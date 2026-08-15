import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  adaptBranchProcessResolverOutput,
  isExactPipingClassResolution,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-branch-process-resolution-adapter.js';

const h = (value) => semanticHash({ value });
const runId = 'RUN:BRANCH-PROCESS-ADAPTER';

function exactResolution() {
  return {
    requestedPipingClass: '31441C4',
    resolvedPipingClass: '31441C4',
    pipingClassSource: 'line-list',
    pipingClassMatchedRow: { rowId: 'MASTER:31441C4:DN150' },
    pipingClassMatchMethod: 'exact',
    pipingClassRowMethod: 'best-score',
    pipingClassNeedsReview: false,
    materialCode: 'A106B',
    materialSource: 'piping-class-material-code',
    materialCodeMatchMethod: null,
    wallThicknessMm: 7.11,
    wallThicknessSource: 'piping-class-master',
    wallThicknessKey: 'PC:31441C4|DN:150',
    corrosionAllowanceMm: 3,
    corrosionSource: 'piping-class-master',
    corrosionKey: 'PC:31441C4',
  };
}

const exactRow = exactResolution();
assert.equal(isExactPipingClassResolution(exactRow), true);
const exact = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: exactRow,
  masterSemanticHash: h('approved-master'),
  sourceSemanticHash: h('line-source'),
});
assert.equal(exact.classResolution.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.pipingClassBasis.requestedPipingClass, '31441C4');
assert.equal(exact.pipingClassBasis.resolvedPipingClass, '31441C4');
assert.equal(exact.pipingClassBasis.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.branchCommonAuthorityRefs.find((row) => row.kind === 'PIPING_CLASS').semanticHash, exact.pipingClassBasis.semanticHash);
assert.equal(exact.materialResolution.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.wallQuantity.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.corrosionQuantity.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.risks.length, 0);

const fuzzyRow = {
  ...exactRow,
  requestedPipingClass: '31441C4-X',
  pipingClassMatchMethod: 'fuzzy-ratio',
  pipingClassNeedsReview: true,
  materialSource: 'piping-class-material-map',
};
assert.equal(isExactPipingClassResolution(fuzzyRow), false);
const fuzzy = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: fuzzyRow,
  masterSemanticHash: h('approved-master'),
});
assert.equal(fuzzy.classResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(fuzzy.pipingClassBasis.requestedPipingClass, '31441C4-X');
assert.equal(fuzzy.pipingClassBasis.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.notEqual(fuzzy.pipingClassBasis.semanticHash, exact.pipingClassBasis.semanticHash);
assert.equal(fuzzy.wallQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(fuzzy.materialResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.ok(fuzzy.risks.every((risk) => risk.riskClass === 'HIGH_CONFIRM'));

const overrideRow = {
  ...exactRow,
  pipingClassMatchMethod: 'override',
  pipingClassNeedsReview: false,
  wallThicknessSource: 'override',
};
const override = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: overrideRow,
  masterSemanticHash: h('approved-master'),
});
assert.equal(override.classResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(override.wallQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');

const missingWallRow = {
  ...exactRow,
  wallThicknessMm: 0,
  wallThicknessSource: 'default-zero',
};
const missingWall = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: missingWallRow,
  masterSemanticHash: h('approved-master'),
});
assert.equal(missingWall.wallQuantity.authorityClass, 'UNRESOLVED');
assert.equal(missingWall.wallQuantity.value, null);
assert.ok(missingWall.risks.some((risk) => risk.riskClass === 'HIGH_BLOCK'));

console.log('PASS empirical-v3-branch-process-resolution-adapter-check');
