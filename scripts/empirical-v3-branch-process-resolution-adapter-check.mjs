import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  adaptBranchProcessResolverOutput,
  isExactPipingClassIdentity,
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
    pipingClassRowReasons: ['class-exact', 'bore-exact', 'component-exact', 'schedule-exact'],
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
assert.equal(isExactPipingClassIdentity(exactRow), true);
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
assert.equal(exact.pipingClassBasis.needsReview, false);
assert.equal(exact.branchCommonAuthorityRefs.find((row) => row.kind === 'PIPING_CLASS').semanticHash, exact.pipingClassBasis.semanticHash);
assert.equal(exact.materialResolution.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.wallQuantity.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(exact.wallQuantity.sourceBinding.evidenceHash, h('approved-master'));
assert.match(exact.wallQuantity.sourceBinding.evidenceRef, /wall-thickness$/);
// Legacy corrosion uses a second rating-aware row lookup but does not preserve
// its row-match evidence; V3 therefore refuses exact promotion at this seam.
assert.equal(exact.corrosionQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(exact.corrosionQuantity.sourceBinding.evidenceRef, null);
assert.ok(exact.risks.some((risk) => risk.riskClass === 'HIGH_CONFIRM'));

const missingMasterEvidence = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: exactRow,
  sourceSemanticHash: h('line-source'),
});
assert.equal(missingMasterEvidence.classResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(missingMasterEvidence.pipingClassBasis.needsReview, true);
assert.equal(missingMasterEvidence.materialResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(missingMasterEvidence.wallQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(missingMasterEvidence.corrosionQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.ok(missingMasterEvidence.risks.every((risk) => risk.riskClass === 'HIGH_CONFIRM'));

const componentMismatchRow = {
  ...exactRow,
  pipingClassRowReasons: ['class-exact', 'bore-exact', 'schedule-exact'],
  pipingClassNeedsReview: false,
};
assert.equal(isExactPipingClassIdentity(componentMismatchRow), true);
assert.equal(isExactPipingClassResolution(componentMismatchRow), false);
const componentMismatch = adaptBranchProcessResolverOutput({
  runId,
  componentId: 'P101',
  resolution: componentMismatchRow,
  masterSemanticHash: h('approved-master'),
  sourceSemanticHash: h('line-source'),
});
// Branch-level class identity remains exact; component-row-derived values do not.
assert.equal(componentMismatch.classResolution.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(componentMismatch.pipingClassBasis.authorityClass, 'APPROVED_MASTER_EXACT');
assert.equal(componentMismatch.materialResolution.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(componentMismatch.wallQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.equal(componentMismatch.corrosionQuantity.authorityClass, 'INFERRED_REVIEW_REQUIRED');
assert.ok(componentMismatch.risks.every((risk) => risk.riskClass === 'HIGH_CONFIRM'));

const boreNearRow = {
  ...exactRow,
  pipingClassRowReasons: ['class-exact', 'bore-near:0.500mm', 'component-exact', 'schedule-exact'],
  pipingClassNeedsReview: false,
};
assert.equal(isExactPipingClassIdentity(boreNearRow), true);
assert.equal(isExactPipingClassResolution(boreNearRow), false);

const scheduleUnprovenRow = {
  ...exactRow,
  pipingClassRowReasons: ['class-exact', 'bore-exact', 'component-exact'],
  pipingClassNeedsReview: false,
};
assert.equal(isExactPipingClassIdentity(scheduleUnprovenRow), true);
assert.equal(isExactPipingClassResolution(scheduleUnprovenRow), false);

const fuzzyRow = {
  ...exactRow,
  requestedPipingClass: '31441C4-X',
  pipingClassMatchMethod: 'fuzzy-ratio',
  pipingClassNeedsReview: true,
  materialSource: 'piping-class-material-map',
};
assert.equal(isExactPipingClassIdentity(fuzzyRow), false);
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
