# PR1291 work report — EMP.1.C exact-tabulated-gamma bounded qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1291`
- `BRANCH: agent/emp1-c-exact-gamma-qualified-route-issue1261`
- `BASE_AFTER_PR1287_MERGE: fa21da0f948133c471b4679e7e8a634491db9e0b`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `PR_STATE: DRAFT_UNMERGED`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `VALIDATED_CODE_HEAD_BEFORE_HANDOVER_REFRESH: e2c3beb7bf905c8636f35480284a02daa4006929`
- `CURRENT_STAGE: GAMMA5_ROUTE_AUTHORIZED_GAMMA15_SOURCE_ORACLE_AND_PRODUCTION_NUMERICS_QUALIFIED`

## Executive engineering state

PR #1291 now contains two deliberately different authority levels:

1. **Gamma=5 production route — registered and executable in a bounded domain.**
2. **Gamma=15 — source domain, independent oracle and production numerics qualified; route registration intentionally NOT performed in this PR.**

The full WRC537 cylindrical method remains blocked for non-tabulated gamma because no source-qualified programmable gamma interpolation algorithm has been established.

```text
GLOBAL / FULL-DOMAIN EMP.1.C             BLOCKED
EXACT gamma=5 bounded route              AUTHORIZED + REGISTERED
EXACT gamma=15 source/numerical slice    QUALIFIED, ROUTE NOT REGISTERED
NON-TABULATED gamma                      BLOCKED
NONZERO differential pressure            BLOCKED
NON-UNITY Kn/Kb                          BLOCKED
```

## Source and dataset custody

Frozen WRC source:

```text
document   = docs/emp1/WRC537_2013.pdf
raw SHA256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
curve fit  = RATIONAL_5_OVER_6
X          = beta for cylindrical curves
```

Qualified production cylindrical package:

```text
coefficient tables        = 28
selectable curves          = 321
qualified scalar a..j      = 3,210
primary-PDF scalar check   = 3,210 / 3,210 PASS
dataset hash               = fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c
```

The sole unresolved cylindrical row remains `WRC537-FIG1B-ORIGINAL-GAMMA-BLANK`; its numerical coefficients are retained but its gamma identity is not inferred and the row remains unselectable.

The source-qualified curve equation is:

```text
Y = (a + c*beta + e*beta^2 + g*beta^3 + i*beta^4)
    / (1 + b*beta + d*beta^2 + f*beta^3 + h*beta^4 + j*beta^5)
```

The superseded ninth-order-polynomial interpretation must not be restored.

## Gamma=5 authorized bounded route

Registered method identity:

`WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP`

Exact scope:

```text
shell family          CYLINDRICAL
attachment shape      ROUND
curve variant         ORIGINAL
gamma = Rm/T          5 exactly, roundoff identity only
beta                  0.05 <= beta <= 0.50
differential pressure 0
Kn                     1
Kb                     1
interpolation          prohibited
cross-variant fallback prohibited
load reference         WRC_ATTACHMENT_REFERENCE_POINT
```

Qualification identities:

```text
single-curve PDF oracle     809178dc3ef3ed4f81443777918d91048d0008fa6eeca074c93fc315691bc41e
full Table-5 gamma5 oracle  5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa
zero-dp producer record     47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b
bounded route record        3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e
```

The authorized route executes through the real `runEmp1()` orchestration path. The qualified case invokes local correlation exactly once and reproduces all 32 frozen stress results. Eight invalid route cases are blocked before WRC execution.

The public product projection explicitly exposes this as a **bounded production route** while retaining the global/full-domain EMP.1.C route as unregistered.

## CI integrity correction retained

A prior evidence command used `node ... | tee ...` without `pipefail`, allowing `tee` to return success when the Node assertion had failed. That run was rejected as invalid engineering evidence.

The current qualification workflow is fail-closed (`set -euo pipefail` or direct Node invocation), and the strict rerun passed before gamma=5 route authorization. Do not revert to pipeline semantics that can mask the producer process exit code.

## Gamma=15 source-domain qualification

### Why gamma=15 was handled separately

WRC §4.4 states that Original cylindrical curves must not be used beyond the indicated outer limits because deleted portions were reported appreciably unconservative. The higher-gamma curves therefore cannot inherit the gamma=5 beta range.

A new observation-only workflow verifies the WRC PDF SHA-256 and renders the 14 required Original Table-5 chart pages at 300 dpi. The evidence remains source observation, not authority by itself.

Reviewed PDF pages:

```text
94, 96, 100, 104, 110, 118, 122,
124, 128, 132, 136, 140, 144, 146
```

All 14 required Table-5 figure families contain an exact gamma=15 Original source row.

The governing visible outer endpoints occur on:

```text
Figure 1C — PDF page 128
Figure 2C — PDF page 136
```

For gamma=15, both source curves visibly terminate **above beta=0.30 and below beta=0.35**. PR1291 therefore qualifies the deliberately conservative product domain:

```text
gamma = 15 exactly
0.05 <= beta <= 0.30
Original only
no interpolation
no Extrapolated fallback
```

Important classification: beta=0.30 is a product boundary strictly inside the source-observed endpoints. It is **not claimed to be the exact WRC outer-limit coordinate**.

The source-domain self-test also proves:

- all 14 required Original gamma=15 rows exist;
- gamma=14 is non-tabulated and blocked;
- an Extrapolated query cannot consume/reuse an Original row;
- source SHA and domain record remain bound.

## Gamma=15 independent full Table-5 oracle

Independent calculation:

`scripts/emp1-wrc-gamma15-full-table5-independent-handcalc.mjs`

The oracle imports only Node built-ins. It imports no `src/core` modules, no production cylindrical dataset and no production selector.

Qualification case:

```text
gamma = 15
beta  = 0.155
Rm    = 300
T     = 20
r0    = beta*Rm/0.875
Kn    = 1
Kb    = 1
P     = -1000
Vc    = 250
Vl    = -400
Mc    = 500000
Ml    = -600000
Mt    = 700000
```

The first repository-side materialization froze a candidate only. A second independent PR-triggered run recomputed the same source rows, curve ordinates and 32 stress results and promoted the oracle.

Final oracle state:

```text
status                  PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE
engineeringAuthority    true
productionAuthority     false
productionImports       0
productionObservation   false
semantic hash           d34827bfdfebad9f175e5fbcdfeab5fdc799d28de5c298ed2ae578886f72ae98
```

## Gamma=15 production numerical comparison

A separate gamma=15 comparison-only domain guard was added in:

`src/core/emp1/emp1-wrc537-cylindrical-gamma15-domain.js`

The existing bounded production adapter was factored only enough to expose a **comparison-only gamma=15 profile**. The existing gamma=5 production-qualified numerical path still uses its original gamma=5 domain guard.

The gamma=15 comparison profile:

- accepts comparison-only load custody;
- has no production route authority;
- requires exact gamma=15;
- requires beta within 0.05–0.30;
- requires Original curves;
- consumes the frozen production coefficient package;
- maps global loads through the qualified WRC frame;
- selects all 14 source figures;
- executes the qualified Table-5 stress kernel.

`scripts/emp1-wrc-gamma15-bounded-adapter-comparison.mjs` passed in exact-gamma workflow #112 / run `32361117686`:

```text
16 required curve ordinate uses   PASS
14 unique source figures          PASS
32 stress outputs                 PASS
production route authority        false
global route authority            false
```

Falsifiers cover gamma=5 in the gamma15 profile, gamma=14, beta below/above the qualified band, Extrapolated variant, source/dataset substitution, declared geometry drift, missing custody and a non-orthogonal frame.

## Validated current engineering head

Validated code head before handover-only status/claims/workreport refresh:

`e2c3beb7bf905c8636f35480284a02daa4006929`

All nine PR-triggered qualification workflows on that head passed:

```text
EMP.1.C exact-gamma qualification                 #112 PASS
EMP.1.C primary qualification state               #118 PASS
EMP.1.C runtime qualification                     #130 PASS
EMP.1.C production dataset qualification           #84 PASS
EMP.1.C gamma5 full Table5 oracle                  #70 PASS
EMP.1.C gamma15 full Table5 oracle                  #9 PASS
EMP.1.C beta-domain source evidence                #14 PASS
EMP.1 CAUx curve-selection probe                  #142 PASS
EMP.1 primary-source qualification evidence       #198 PASS
```

The exact-gamma workflow proves gamma=15 production numerics while simultaneously re-running the already-authorized gamma=5 route, real `runEmp1()` orchestration, public projection guard and all inherited exact-gamma evidence.

## Authority that remains explicitly blocked

1. **Non-tabulated gamma interpolation** — no uniquely source-qualified programmable rule.
2. **Exact gammas other than 5 and 15** — per-curve common beta domains not yet qualified.
3. **Gamma=15 route registration** — intentionally deferred to a successor PR even though source/oracle/numerics now pass.
4. **Nonzero differential pressure** — production pressure-thrust sign/inclusion/double-count authority remains unresolved.
5. **Non-unity Kn/Kb** — no qualified general stress-concentration producer.
6. **Global/full-domain EMP.1.C route** — unregistered.
7. **Release/code-compliance PASS** — false; not invented.

Observation only, not yet an authority claim: visual chart evidence suggests very high gamma values may have no common Original Table-5 beta interval because some curve families begin at beta values above the deleted outer endpoint of other families. This must be formalized per gamma before any further route expansion.

## Scope stop / successor action

PR #1291 should stop here. The next implementation increment belongs in a stacked successor:

**Gamma=15 zero-dp unity-K bounded route qualification.**

Required sequence:

1. create a gamma=15 method-scope record bound to WRC SHA, dataset hash and oracle hash;
2. reuse the already qualified zero-dp WRC-reference load producer only if its reference/load semantics remain valid for the gamma=15 geometry;
3. keep `Kn=Kb=1`;
4. create a route candidate with route-authority flag false;
5. compare end-to-end source load -> moment transfer -> WRC frame -> 14 curves -> Table 5 -> 32 stresses against oracle `d34827bf...ae98`;
6. add negative tests for beta >0.30, beta <0.05, gamma !=15, nonzero dp, nonunity K, frame/reference/hash drift;
7. reobserve through real `runEmp1()` orchestration with local-correlation invocation counting;
8. only after strict reobservation promote/register a **second bounded route**;
9. preserve the gamma=5 route and global/full-domain route states independently.

## Changed-file ledger — principal PR1291 files

Qualification and source:

- `.github/workflows/emp1-c-exact-gamma.yml`
- `.github/workflows/emp1-c-production-dataset.yml`
- `.github/workflows/emp1-c-gamma5-oracle-materialize.yml`
- `.github/workflows/emp1-c-beta-domain-evidence.yml`
- `.github/workflows/emp1-c-gamma15-oracle-materialize.yml`
- `scripts/emp1-wrc-cylindrical-exact-gamma-lib.mjs`
- `scripts/emp1-wrc-cylindrical-exact-gamma-self-test.mjs`
- `scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs`
- `scripts/emp1-wrc-gamma15-domain-self-test.mjs`
- `scripts/emp1-wrc-gamma15-full-table5-independent-handcalc.mjs`
- `scripts/emp1-wrc-gamma15-full-table5-oracle-materialize.mjs`
- `scripts/emp1-wrc-gamma15-bounded-adapter-comparison.mjs`

Production core:

- `src/core/emp1/emp1-wrc537-cylindrical-data.generated.js`
- `src/core/emp1/emp1-wrc537-exact-gamma.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-cylindrical-frame.js`
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-domain.js`
- `src/core/emp1/emp1-wrc537-cylindrical-gamma15-domain.js`
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js`
- `src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`

Evidence records:

- `validation/emp1/wrc537-2013/exact-gamma-capability-v1.json`
- `validation/emp1/wrc537-2013/exact-gamma-oracle-1a-g5-v1.json`
- `validation/emp1/wrc537-2013/cylindrical-original-bounded-domain-v1.json`
- `validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json`
- `validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v1.json`
- `validation/emp1/wrc537-2013/cylindrical-original-gamma15-bounded-domain-v1.json`
- `validation/emp1/wrc537-2013/gamma15-full-table5-oracle-v1.json`

Governance:

- `agents/status/PR1291.yaml`
- `agents/claims/PR1291.yaml`
- `agents/PR1291_workreport.md`

## Appendix A — expert takeover questions

1. Does WRC PDF SHA-256 still equal `698fcdc3...c27b2`?
2. Does the production dataset still reproduce 321 curves / 3,210 scalar coefficients / 3,210-of-3,210 primary-source crosscheck?
3. Is the blank-gamma Figure 1B Original row still unselectable?
4. Is the rational 5-over-6 curve equation still the only authorized cylindrical evaluator?
5. Can any non-tabulated gamma pass either selection path? It must not.
6. Is gamma=5 still restricted to 0.05<=beta<=0.50, zero dp and Kn=Kb=1?
7. Does real `runEmp1()` still execute gamma=5 once and reject invalid cases before WRC invocation?
8. Is gamma=15 source domain explicitly 0.05<=beta<=0.30 and classified conservative rather than exact-source endpoint?
9. Do all 14 required Original gamma=15 rows exist?
10. Does gamma=15 oracle hash remain `d34827bfdfebad9f175e5fbcdfeab5fdc799d28de5c298ed2ae578886f72ae98` with zero production imports?
11. Does gamma=15 production comparison still pass 16 ordinate uses and 32 stresses?
12. Is the gamma=15 comparison profile still comparison-only, with no production route authority?
13. Is the gamma=15 route still unregistered in PR1291?
14. Are nonzero differential pressure and nonunity Kn/Kb still blocked?
15. Is the global/full-domain EMP.1.C route still false?
16. Are all evidence-producing shell pipelines fail-closed against Node-process failure masking?
