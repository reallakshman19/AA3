# PR1291 work report — EMP.1.C exact source-tabulated gamma bounded production route

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1291`
- `BRANCH: agent/emp1-c-exact-gamma-qualified-route-issue1261`
- `BASE_AFTER_PR1287_MERGE: fa21da0f948133c471b4679e7e8a634491db9e0b`
- `VALIDATED_CODE_HEAD: 72481dd84992d71df8d0d4388d15de2c0f565d28`
- `EXACT_GAMMA_WORKFLOW: 32355845796 (#95) PASS`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `BOUNDED_EMP1_C_ROUTE_REGISTERED: true`
- `EMP1_C_GLOBAL_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: BOUNDED_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED_GLOBAL_ROUTE_BLOCKED`

## Executive state

PR #1291 has completed a real but deliberately narrow EMP.1.C production route. It is no longer only a selector/adapter experiment.

Authorized route:

```text
method              WRC537 2013 cylindrical Table 5
shell                CYLINDRICAL
attachment           ROUND
curve family         ORIGINAL
gamma                exactly 5 (machine-roundoff identity only)
beta                 0.05 <= beta <= 0.5
differential pressure exactly 0
Kn                    1
Kb                    1
interpolation         prohibited
cross-variant fallback prohibited
load reference        WRC_ATTACHMENT_REFERENCE_POINT
upstream producer     qualified EMP.1.A zero-dp load producer
```

The following remain explicitly **not authorized**:

```text
non-tabulated gamma interpolation
exact gamma values other than 5 for the full Table-5 route
beta outside 0.05..0.5
nonzero differential pressure / pressure-thrust addition
non-unity Kn or Kb
Extrapolated curve family
non-round attachments
global/full-domain EMP.1.C route
code-compliance PASS
release qualification
```

## Source and dataset custody

Frozen WRC source:

```text
document      docs/emp1/WRC537_2013.pdf
Git blob       ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
curve model    rational 5-over-6
cylindrical X  beta = 0.875*r0/Rm
gamma          Rm/T
```

Production package:

```text
selectable cylindrical curves   321
qualified scalar coefficients   3210
primary-PDF crosscheck           3210 / 3210 PASS
unresolved curves                1
unresolved scalars               10
dataset semantic hash            fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c
```

The sole unresolved row is `WRC537-FIG1B-ORIGINAL-GAMMA-BLANK`. Its coefficients exist but its gamma identity is blank in the source. The software retains it as unselectable; inferring gamma by row order is prohibited.

## Independent numerical authority

### Exact-gamma single-curve oracle

Primary PDF page 95, Figure 1A Original, gamma=5, beta=0.155:

```text
Y = (a + c*beta + e*beta^2 + g*beta^3 + i*beta^4)
    / (1 + b*beta + d*beta^2 + f*beta^3 + h*beta^4 + j*beta^5)

numerator   = 0.0390883341086
denominator = 0.37137334479929657
Y           = 0.10525347243142809
semantic hash = 809178dc3ef3ed4f81443777918d91048d0008fa6eeca074c93fc315691bc41e
```

The oracle imports no production modules and does not use a production result to set expected values.

### Full Table-5 gamma=5 oracle

Frozen full-oracle semantic hash:

```text
5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa
```

The independent oracle covers:

```text
14 unique source figures
16 curve-ordinate uses
8 circumferential stresses
8 longitudinal stresses
8 shear stresses
8 Tresca stress intensities
32 stress outputs total
```

Frozen six-component WRC load case:

```text
P  = -1000 N
Vc =   250 N
Vl =  -400 N
Mc =  500000 N.mm
Ml = -600000 N.mm
Mt =  700000 N.mm
```

## Table-5 production mechanics

`src/core/emp1/emp1-wrc537-cylindrical-table5.js` reconstructs the qualified Table-5 stress quantities using consistent force/length units:

```text
P membrane      = |P|*Kn/(Rm*T)
P bending       = 6|P|*Kb/T^2
Mc membrane     = |Mc|*Kn/(Rm^2*beta*T)
Mc bending      = 6|Mc|*Kb/(Rm*beta*T^2)
Ml membrane     = |Ml|*Kn/(Rm^2*beta*T)
Ml bending      = 6|Ml|*Kb/(Rm*beta*T^2)
Vc/Vl shear     = |V|/(pi*r0*T)
Mt torsion      = |Mt|/(2*pi*r0^2*T)
```

The kernel applies the qualified cylindrical Table-5 sign matrix at `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`, algebraically superposes load components, and computes plane-stress Tresca stress intensity.

CAUx benchmark comparison remains 32/32 PASS within tolerances fixed from source resolution before production observation. Reversing all six external loads reverses linear stress signs and preserves stress intensity.

## Qualified WRC frame and geometry adapter

The bounded adapter derives, rather than trusts caller-declared values:

```text
gamma = Rm/T
beta  = 0.875*r0/Rm
```

It validates the qualified frame, transforms global loads to the WRC Table-5 axes, obtains all required ordinates from the frozen production coefficient package, and invokes the qualified Table-5 kernel.

The gamma=5 adapter comparison passes all 32 frozen stresses and exercises 20 fail-closed falsifiers covering source substitution, geometry/domain violations, variant substitution, frame defects, load-custody defects, and pressure-thrust custody violations.

## Zero-differential-pressure upstream load producer

The first production load producer was intentionally limited to differential pressure exactly zero so no pressure-thrust sign was invented.

Qualification SHA-256:

```text
47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b
```

Independent producer proof includes:

```text
F_target = [1000, 0, 0] N
M_target = [0, 1000000, 0] N.mm
Delta p  = 0
pressure thrust = 0
```

Moment transfer uses the retained relation:

```text
M_target = M_source + (r_source - r_target) x F
```

The producer rejects nonzero pressure, WRC-reference mismatch, rejected upstream state, semantic-hash drift, load/accounting residual corruption, missing pressure evidence, production-contaminated authority, and producer-qualification substitution.

## Authorized bounded route

Qualification record:

```text
validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v1.json
qualification SHA-256 = 3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e
status = PASS_REOBSERVED_AUTHORIZED_BOUNDED_ZERO_DP_ROUTE
productionRouteAuthority = true
globalEmp1CRouteAuthority = false
```

The production route implementation sets:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true
```

but every call still passes the method scope gate, upstream producer-hash custody, zero-dp guard, unity `Kn/Kb`, geometry derivation, frame mapping and frozen dataset checks before WRC numerics execute.

## Strict end-to-end route re-observation

A CI integrity defect was found during qualification: an evidence command used `node ... | tee ...` without `pipefail`, which allowed `tee` to return zero even when the Node process failed. That false-green run was explicitly rejected as invalid evidence.

The workflow was hardened with `set -euo pipefail`, the incorrect assertion was repaired without weakening the engineering gate, and the route was re-observed successfully.

Strict re-observation retained in the route record:

```text
workflow run             32348667313 (#78)
head                     c80e4952adeae5e9fbca407cdb18fc4316393889
artifact                 9399007941
artifact digest SHA-256  b3ecbc2091f6c2758e2da9b0da9943d7950a48e3f8c7e34b12b2b30264e75890
route evidence bytes     1592
stress comparisons       32 / 32 PASS
route falsifiers         8 / 8 PASS
```

Transferred global load for the route oracle:

```text
F = [-400, -250, -1000] N
M = [-500000, 600000, -700000] N.mm
```

Qualified WRC mapping reproduces exactly:

```text
P=-1000, Vc=250, Vl=-400, Mc=500000, Ml=-600000, Mt=700000
```

## Real `runEmp1()` orchestration qualification

The bounded route is not a side-door helper. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` composes the retained EMP.1.A result with the authorized bounded WRC route through the real EMP.1 orchestration surface.

Frozen orchestration re-observation:

```text
workflow run                  32355132909 (#88)
head                          7f0a2c3b516a2a00b80cbd2d6075335caab88cce
local-correlation invocations 1
stress outputs                 32 / 32 PASS
pre-WRC falsifiers             8 / 8 PASS
caller authority injection     ignored; authority rebuilt from pinned route + actual A result
legacy unscoped compatibility  PASS
assessment decision            ESCALATE
```

`ESCALATE` is intentional: the WRC local-stress result does not invent a code-compliance PASS.

## Public product boundary

The public projection now distinguishes two concepts:

```text
GLOBAL EMP.1.C route      registered = false
BOUNDED production routes count = 1
```

The one bounded route is registered and engineering-authorized but has:

```text
globalEmp1CRouteAuthority = false
releaseQualified = false
runtimeEligibilityRequired = true
```

This prevents the UI/product contract from turning one qualified special case into a claim that all EMP.1.C cases are executable.

## Current-head validation

Validated code head before this handover-only refresh:

```text
72481dd84992d71df8d0d4388d15de2c0f565d28
```

All seven PR-triggered qualification workflows on that head are PASS:

```text
EMP.1.C exact-gamma qualification                 #95  PASS
EMP.1.C primary qualification state               #101 PASS
EMP.1.C runtime qualification                     #113 PASS
EMP.1 CAUx curve-selection probe                  #125 PASS
EMP.1.C production dataset qualification          #67  PASS
EMP.1.C gamma5 full Table5 oracle materialization #53  PASS
EMP.1 primary-source qualification evidence       #181 PASS
```

The exact-gamma workflow includes both:

```text
Qualify bounded route through real EMP.1 orchestration  PASS
Preserve bounded versus global public route distinction PASS
```

## Remaining engineering blockers

### 1. Non-tabulated gamma

Still blocked. No source-qualified programmable interpolation algorithm has been established. `1e-12` is only a floating-point identity tolerance.

### 2. Higher exact tabulated gamma values

Still blocked for the **full Table-5 route**. WRC section 4.4 states Original curves must not be used beyond indicated limits, and the radial-load charts contain source-deleted outer segments for higher gamma curves. The current gamma=5 beta band must not be copied to gamma=7.5/10/15/... by assumption. Each required curve/gamma beta outer limit must be source-qualified first.

### 3. Nonzero differential pressure

Still blocked. The generic pressure-thrust arithmetic helper exists, but the production route has not qualified the nonzero pressure-thrust inclusion/exclusion policy, direction/sign authority and double-count protection. The zero-dp route does not imply a nonzero-dp sign rule.

### 4. Non-unity `Kn`, `Kb`

Still blocked. The Table-5 equations accept stress-concentration factors, but a general source-qualified production producer for non-unity factors has not been frozen. The authorized route therefore enforces `Kn=Kb=1`.

## Scope decision for the next increment

Do **not** keep expanding PR #1291. Its bounded route is now an auditable production capability with all intended fail-closed guards.

The successor increment should be source qualification, not speculative route widening. Preferred order:

1. build a machine-readable per-figure/per-gamma Original-curve beta-limit ledger from the SHA-bound WRC source;
2. distinguish explicit source limits from visual/digitized estimates; unresolved limits must remain blocked;
3. determine the intersection beta domain across all 14 Table-5 figures for each exact tabulated gamma;
4. only for gamma values with a complete nonempty source-qualified intersection, build an independent full Table-5 oracle and add a new bounded route;
5. keep non-tabulated interpolation, nonzero pressure and non-unity `Kn/Kb` separate authority increments.

If the WRC source does not state a sufficiently exact higher-gamma curve endpoint, do not digitize or approximate it into production authority; leave that gamma blocked and move to another separately qualifiable boundary.

## Changed-file ledger

PR #1291 currently changes 49 files. Major groups:

```text
workflows
  .github/workflows/emp1-c-exact-gamma.yml
  .github/workflows/emp1-c-gamma5-oracle-materialize.yml
  .github/workflows/emp1-c-production-dataset.yml

production core
  src/core/emp1/emp1-wrc537-cylindrical-data.generated.js
  src/core/emp1/emp1-wrc537-cylindrical-index.js
  src/core/emp1/emp1-wrc537-exact-gamma.js
  src/core/emp1/emp1-wrc537-cylindrical-table5.js
  src/core/emp1/emp1-wrc537-cylindrical-frame.js
  src/core/emp1/emp1-wrc537-load-custody.js
  src/core/emp1/emp1-wrc537-cylindrical-bounded-domain.js
  src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js
  src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js
  src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js
  src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js
  src/core/emp1/emp1-c-bounded-route-registry.js
  src/core/emp1/emp1-local-method-scope.js
  src/core/emp1/emp1-local-correlation-gate.js
  src/core/emp1/emp1-orchestrator.js
  src/core/emp1/emp1-public-product-contract.js
  src/workspace/emp1-product-projection.js

qualification / evidence
  scripts/emp1-wrc-*.mjs
  scripts/emp1-a-zero-dp-wrc-load-producer-qualification.mjs
  scripts/emp1-local-correlation-bounded-scope-self-test.mjs
  validation/emp1/wrc537-2013/*.json

handover
  agents/status/PR1291.yaml
  agents/claims/PR1291.yaml
  agents/PR1291_workreport.md
```

No merge is authorized by this report.

## Appendix A — next-agent expert questions

1. Does the WRC PDF still hash to `698fcdc3...c27b2` and the generated cylindrical dataset to `fb440a29...b73c`?
2. Does the package still contain exactly 321 selectable curves / 3210 qualified scalars and one unselectable blank-gamma Figure 1B Original row?
3. Does the full gamma=5 oracle still re-observe `5daeb3a8...80aa` with zero production imports?
4. Does the authorized route still require gamma=5 and `0.05<=beta<=0.5` derived from geometry rather than trusting caller declarations?
5. Does the route still enforce round/Cylindrical/Original, interpolation=false and cross-variant fallback=false?
6. Does the zero-dp producer still reject every nonzero differential-pressure case?
7. Are `Kn=Kb=1` still hard requirements at the route boundary?
8. Does load-custody qualification bind producer SHA `47a9157b...622b` and reject semantic-hash drift/reference mismatch?
9. Does route qualification hash remain `3b437540...e1a8e`?
10. Does real `runEmp1()` invoke local correlation exactly once for the authorized case and zero times for all pre-WRC falsifiers?
11. Does the route reproduce all 32 frozen stress outputs and the exact six WRC load components?
12. Is the CI evidence pipeline still `pipefail`-protected so `tee` cannot mask a Node failure?
13. Does public product projection expose one bounded route while the global EMP.1.C route remains unregistered?
14. Is `releaseQualified` still false and is product decision still prevented from masquerading as code compliance?
15. Before adding gamma>5, can every required Figure/gamma Original beta endpoint be traced to an exact source locator and a non-inferred numerical limit? If not, that gamma stays blocked.
16. Before adding nonzero pressure, what exact qualified source establishes pressure-thrust inclusion/exclusion, direction/sign and double-count handling at the WRC reference point?
17. Before adding non-unity `Kn/Kb`, what exact WRC source path and calculation contract produces those factors for the runtime geometry?
