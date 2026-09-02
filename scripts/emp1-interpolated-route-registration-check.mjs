/**
 * Interpolated route registration check.
 *
 * The interpolated gamma route is registered so the capability is described and
 * governed rather than sitting outside the registry. It must not thereby acquire
 * engineering-use authority: WRC 537 does not state an interpolation rule, and
 * docs/emp1/WRC537_2013_Gamma_Interpolation_Authority.md records the source
 * position as BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED.
 *
 * Flipping engineeringUseAuthorized is an owner decision backed by the evidence
 * that record lists. This check is what makes that flip deliberate rather than
 * accidental.
 */
import assert from 'node:assert/strict';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE_ID,
  EMP1_C_WRC537_INTERPOLATED_GAMMA_SUSPENSION_REASON,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const gamma5 = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
const interpolated = emp1CBoundedRoute(EMP1_C_WRC537_INTERPOLATED_GAMMA_ROUTE_ID);
assert.ok(gamma5 && interpolated, 'both routes resolve by id');

// --- the qualified route keeps its standing and its position ---------------------
assert.equal(gamma5.registered, true);
assert.equal(gamma5.engineeringUseAuthorized, true);
assert.deepEqual([...gamma5.suspensionReasons], []);
assert.equal(gamma5.scope.gamma, 5);
assert.equal(gamma5.scope.interpolationAllowed, false);
assert.equal(
  EMP1_C_BOUNDED_PRODUCTION_ROUTES[0].routeId,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  'consumers that read routes[0] must still get the source-qualified route',
);

// --- the interpolated route is described but not authorized ----------------------
assert.equal(interpolated.registered, true, 'registered, so the UI can describe it');
assert.equal(
  interpolated.engineeringUseAuthorized, false,
  'WRC 537 states no interpolation rule, so this route carries no engineering-use '
  + 'authority. Flipping this requires the evidence listed in '
  + 'docs/emp1/WRC537_2013_Gamma_Interpolation_Authority.md, not a code change alone.',
);
assert.ok(
  interpolated.suspensionReasons.includes(EMP1_C_WRC537_INTERPOLATED_GAMMA_SUSPENSION_REASON),
  'the reason it is not authorized must be stated on the route',
);
assert.equal(interpolated.globalEmp1CRouteAuthority, false);
assert.equal(interpolated.releaseQualified, false);
assert.equal(interpolated.scope.sourceQualifiedGammaSelection, false);
assert.equal(interpolated.scope.wrcMethodFidelityClaim, false);
assert.equal(interpolated.scope.extrapolationAllowed, false);
assert.equal(interpolated.scope.betaDomainBasis, 'OWNER_DECLARED_REQUIRED_ABOVE_GAMMA_5');
assert.equal(interpolated.method.routeRequalificationRequired, true);

// it is validated for comparison, which is a different claim from engineering use
assert.equal(interpolated.comparisonQualificationAvailable, true);

// --- registering it must not make the product think a new route became usable ----
const authorized = EMP1_C_BOUNDED_PRODUCTION_ROUTES
  .filter((route) => route.registered && route.engineeringUseAuthorized);
assert.equal(authorized.length, 1, 'exactly one route is authorized for engineering use');
assert.equal(authorized[0].routeId, EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);

// --- the shared method authority is inherited, not restated ----------------------
for (const key of [
  'cylindricalLoadAxisAuthority', 'attachmentRadiusBasis', 'stressOutputDomain',
  'evaluatedStressLocations', 'externalMomentEndDistanceRule', 'Kn', 'Kb',
]) {
  assert.deepEqual(
    interpolated.scope[key], gamma5.scope[key],
    `${key} is the same method on both routes and must not drift`,
  );
}
assert.equal(interpolated.scope.attachmentStressCalculated, false);
assert.equal(interpolated.scope.nozzleStressCalculated, false);

console.log(`  ${EMP1_C_BOUNDED_PRODUCTION_ROUTES.length} routes registered,`
  + ` ${authorized.length} authorized for engineering use`);
console.log('EMP1_INTERPOLATED_ROUTE_REGISTRATION_CHECK_PASS');
