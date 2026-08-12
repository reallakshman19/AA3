import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FRICTION_EXECUTION_READINESS_STATUS,
  assessFrictionExecutionReadiness,
} from '../src/core/nonlinear-restraint-friction/friction-execution-readiness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.resolve(here, `../benchmarks/LFEA/CAESAR_ACCDB/${name}`);

const cfg = fs.readFileSync(fixture('m047-bm4l-caesar14-user-supplied.cfg.txt'), 'utf8');
const authority = JSON.parse(fs.readFileSync(fixture('m047-bm4l-caesar14-config-authority.json'), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(fixture('m047-bm4l-friction-readiness-snapshot.json'), 'utf8'));
const sourceMap = JSON.parse(fs.readFileSync(fixture('m047-bm4l-friction-source-map-snapshot.json'), 'utf8'));

assert.match(cfg, /^Ver\. 14\.000/m);
assert.match(cfg, /^FRICT_STIF =\s+0\.1000000E\+07\s+45$/m);
assert.match(cfg, /^FRICT_NORM_FORCE_VAR =\s+0\.1500000E\+00\s+47$/m);
assert.match(cfg, /^FRICT_ANGLE_VAR =\s+0\.1500000E\+02\s+48$/m);
assert.match(cfg, /^FRICT_SLIDE_MULT =\s+0\.1000000E\+01\s+46$/m);
assert.match(cfg, /^BEND_AXIAL_SHAPE =\s+YES\s+51\s+1\.$/m);
assert.match(cfg, /^DEFAULT_TRANS_RESTRAINT_STIFF=\s+0\.1000000E\+13\s+98$/m);
assert.match(cfg, /^DEFAULT_ROT_RESTRAINT_STIFF=\s+0\.1000000E\+13\s+99$/m);

assert.equal(authority.schema, 'm047-bm4l-caesar14-config-authority/v1');
assert.equal(authority.resolvedGlobalFrictionControls.frictionSlideMultiplier.value, 1);
assert.equal(authority.resolvedGlobalFrictionControls.frictionNormalForceVariation.value, 0.15);
assert.equal(authority.resolvedGlobalFrictionControls.frictionAngleVariationDeg.value, 15);
assert.equal(authority.resolvedGlobalFrictionControls.frictionStiffnessRawCfg.value, 1_000_000);
assert.equal(authority.resolvedGlobalFrictionControls.frictionStiffnessRawCfg.siAuthority.valueNPerM, 175126835.24647635);

const excluded = new Set(authority.precedencePolicy.excludedCfgSettings.map((row) => row.setting));
for (const setting of [
  'DEFAULT_AMBIENT_TEMPERATURE',
  'BOURDON_PRESSURE',
  'COEFFICIENT_OF_FRICTION_(MU)',
  'FLEXIBILITY_ELASTIC_MODULUS',
]) assert.ok(excluded.has(setting), `missing cfg override exclusion ${setting}`);

assert.equal(snapshot.schema, 'm047-bm4l-friction-readiness-snapshot/v2');
assert.equal(snapshot.resolvedAuthority.frictionSlideMultiplier.value, 1);
assert.deepEqual(snapshot.cases.find((row) => row.caseId === 'L13').blockers, [
  'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
]);

const unresolvedAuthority = {
  ...snapshot.resolvedAuthority,
  frictionStateHistorySemantics: null,
  gapContactStateSemantics: null,
};
const l13 = assessFrictionExecutionReadiness({
  caseId: 'L13',
  frictionMultiplier: 1,
  sourceMap,
  authority: unresolvedAuthority,
});
assert.equal(l13.status, FRICTION_EXECUTION_READINESS_STATUS.BLOCKED_AUTHORITY);
assert.deepEqual(l13.blockerCodes, [
  'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
]);
assert.ok(!l13.blockerCodes.includes('FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED'));

const linear = assessFrictionExecutionReadiness({
  caseId: 'L6',
  frictionMultiplier: 0,
  sourceMap: null,
  authority: null,
});
assert.equal(linear.status, FRICTION_EXECUTION_READINESS_STATUS.READY_LINEAR_BYPASS);

assert.equal(authority.f2DiagnosticInterpretation.currentConvergedL13DiagnosticPassed, 1719);
assert.equal(authority.f2DiagnosticInterpretation.currentConvergedL13DiagnosticTotal, 1914);
assert.equal(authority.f2DiagnosticInterpretation.numericalValueChangesFromSlideMultiplierAuthority, false);

console.log(JSON.stringify({
  check: 'm047-bm4l-caesar14-config-authority',
  status: 'PASS',
  resolvedSlideMultiplier: 1,
  resolvedNormalForceVariation: 0.15,
  resolvedAngleVariationDeg: 15,
  remainingL13Blockers: l13.blockerCodes,
  l13DiagnosticPassRate: snapshot.diagnosticState.l13GovernedPassRate,
  productionFrictionAuthorized: false,
}, null, 2));
