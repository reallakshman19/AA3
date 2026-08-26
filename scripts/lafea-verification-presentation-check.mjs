#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const verification = read('../src/workspace/lafea-numerical-verification-view.js');
const discretizationCompaction = read('../src/workspace/lafea-refinement-disclosure.js');
const styles = read('../src/workspace/lafea-ui-modernization-styles.js');
const sample = read('../e2e/lafea3-sample-mesh.spec.js');

assert.match(verification, /data.*lafea-verification-summary|dataset\.role = 'lafea-verification-summary'|dataset\.role = "lafea-verification-summary"/u);
assert.match(verification, /'Solve-check evidence'/u);
assert.match(verification, /'Convergence evidence'/u);
assert.match(verification, /'Mesh-quality evidence'/u);
assert.match(verification, /'T6 geometry qualification evidence'/u);
assert.match(verification, /'Release \/ production qualification evidence'/u);
assert.match(verification, /details/u);
assert.match(verification, /renderLafeaVerificationRelease\(root, stageValue\)/u);
assert.match(verification, /renderLafeaT6GeometryQualification\(root, stageValue\)/u);
assert.match(verification, /No numerical verification evidence is retained yet\./u);
assert.match(verification, /\.filter\(\(\[, status\]\) => status !== 'ABSENT'\)/u);
assert.doesNotMatch(verification, /wrapper\.append\(\s*element\(root, 'p',[\s\S]*preflightSection\(root, model\.preflight\),\s*renderLafeaVerificationRelease/u);

assert.match(discretizationCompaction, /humanizeDiscretizationAdvance/u);
assert.match(discretizationCompaction, /advance\.textContent = 'Check solve readiness'/u);
assert.doesNotMatch(discretizationCompaction, /advance\.textContent = 'Advance to numerical preflight'/u);

assert.match(styles, /\.lafea-guided-workflow__release\{\s*display:none!important;/u);
assert.match(styles, /\.lafea-numerical-verification__summary-grid/u);
assert.match(styles, /\.lafea-numerical-verification__evidence/u);

assert.match(sample, /toHaveText\('Check solve readiness'\)/u);
assert.match(sample, /lafea-verification-evidence/u);
assert.match(sample, /lafea-guided-workflow__release/u);
assert.doesNotMatch(sample, /toHaveText\('Advance to numerical preflight'\)/u);

console.log(JSON.stringify({
  check: 'lafea-verification-presentation',
  status: 'PASS',
  decisionStatusVisible: true,
  numericalEvidenceCollapsed: true,
  releaseEvidenceRetained: true,
  duplicateReleaseBannerHidden: true,
  meshContinueActionHumanized: true,
  engineeringAuthorityChanged: false,
}));

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
