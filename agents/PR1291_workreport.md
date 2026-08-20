# PR1291 work report — EMP.1.C exact source-tabulated gamma boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1291`
- `BRANCH: agent/emp1-c-exact-gamma-qualified-route-issue1261`
- `BASE_AFTER_PR1287_MERGE: fa21da0f948133c471b4679e7e8a634491db9e0b`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_GLOBAL_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: BOUNDED_CORE_KERNELS_PASS_PRODUCTION_DATASET_PACKAGING_PENDING`
- `VALIDATED_HEAD_BEFORE_THIS_REPORT_REFRESH: 96ad6cef87f23e4d67cb2c48f4a99b05e8c5ee0e`
- `EXACT_GAMMA_WORKFLOW: 32337146311 (#23) PASS`

## Owner instruction consumed

The owner authorized merge of PR #1287 and instructed proceeding. PR #1287 was squash-merged as `fa21da0f948133c471b4679e7e8a634491db9e0b`. PR #1291 is the successor and remains draft/unmerged.

## Engineering boundary established

The full WRC537 cylindrical method is still blocked for non-tabulated shell parameter gamma because no source-qualified programmable interpolation algorithm has been found. PR #1291 therefore establishes a narrower source-faithful capability:

```text
EXACT SOURCE-TABULATED GAMMA -> qualified bounded selection/evaluation path
NON-TABULATED GAMMA          -> deterministic BLOCK
ORIGINAL / EXTRAPOLATED      -> explicit variant only
ORIGINAL -> EXTRAPOLATED     -> no fallback
BLANK-GAMMA SOURCE ROW       -> unselectable
GLOBAL EMP.1.C ROUTE         -> still unregistered
```

The `1e-12` relative gamma tolerance is floating-point identity only. It is not an engineering interpolation tolerance.

## Source authority and inventory

Frozen WRC source:

```text
document   = docs/emp1/WRC537_2013.pdf
raw SHA256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
curve fit  = RATIONAL_5_OVER_6
X          = beta for cylindrical curves
```

Curve equation:

```text
Y = (a + c*beta + e*beta^2 + g*beta^3 + i*beta^4)
    / (1 + b*beta + d*beta^2 + f*beta^3 + h*beta^4 + j*beta^5)
```

Source-derived cylindrical inventory:

```text
coefficient tables            = 28
qualified curves              = 321
unresolved curves             = 1
source-qualified scalars      = 3,210
source-unresolved scalars     = 10
Original qualified curves     = 177
Original unresolved curves    = 1
Extrapolated qualified curves = 144
Extrapolated unresolved       = 0
```

The sole unresolved row is `WRC537-FIG1B-ORIGINAL-GAMMA-BLANK`. Its ten coefficients exist, but gamma identity is blank in the primary PDF. It remains `gamma=null`, `productionSelectable=false`; inferring gamma=10 is prohibited.

## Exact-gamma selector

`scripts/emp1-wrc-cylindrical-exact-gamma-lib.mjs` parses both cylindrical table orientations, keeps Original/Extrapolated custody distinct, selects only exact source gamma, and evaluates the rational beta fit.

`scripts/emp1-wrc-cylindrical-exact-gamma-self-test.mjs` proves:

- 28/321/1 cardinality;
- exact gamma pass;
- tiny floating roundoff pass;
- midpoint non-tabulated gamma blocked;
- no cross-variant fallback;
- unresolved blank-gamma row blocked;
- rational arithmetic duplicate check.

## Independent primary-PDF oracle

The first numerical oracle was not copied from the selector or production code. CI used Poppler directly on frozen WRC PDF page 95 and independently parsed `Figure 1A - Original` at gamma=5.

Primary coefficients:

```text
a = 0.11311378
b = -5.2677559
c = -0.70077182
d = 32.197618
e = 5.0076344
f = -239.96888
g = -37.157352
h = 434.74384
i = 91.22496
j = 637.19594
```

For beta=0.155:

```text
numerator   = 0.0390883341086
denominator = 0.37137334479929657
Y           = 0.10525347243142809
```

Frozen semantic hash:

```text
809178dc3ef3ed4f81443777918d91048d0008fa6eeca074c93fc315691bc41e
```

`validation/emp1/wrc537-2013/exact-gamma-oracle-1a-g5-v1.json` is now `PASS_REOBSERVED_INDEPENDENT_EXACT_GAMMA_ORACLE`. The re-observation imported no production modules and used no production result.

## Production exact-gamma curve evaluator

`src/core/emp1/emp1-wrc537-exact-gamma.js` is deliberately independent of the qualification parser. It accepts a source-bound coefficient row and rechecks:

- WRC SHA-256;
- rational curve model;
- exact-gamma policy;
- explicit Original/Extrapolated variant;
- resolved source parameter identity;
- interpolation=false;
- fallback=false;
- gamma/sourceGamma identity within roundoff only;
- finite a..j coefficients and nonzero rational denominator.

`scripts/emp1-wrc-exact-gamma-production-comparison.mjs` compares this production module to the frozen PDF oracle. Run #23 passed exactly at Y=0.10525347243142809. Negative proofs block non-tabulated gamma, interpolation, variant fallback, unresolved source identity, source-SHA substitution, the legacy ninth-order polynomial model, and interpolation-policy substitution.

## Production WRC Table 5 cylindrical stress kernel

`src/core/emp1/emp1-wrc537-cylindrical-table5.js` implements the source-qualified WRC Table 5 dimensional reconstruction and signs independently of gamma selection.

For consistent force/length units it uses:

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

It applies the qualified Table 5 sign matrices at `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`, reverses the applicable sign column when a source load reverses, algebraically superposes components, and computes plane-stress Tresca intensity.

### Independent CAUx comparison

`scripts/emp1-wrc-table5-production-comparison.mjs` uses the already-frozen CAUx benchmark and hand-calculation hashes:

```text
benchmark = 8d97539f03f077321eef1e496e315a6a7700a9d83a6c8cd4ff1b83382ebe45fe
handcalc  = 679199df770a2018b2ff26b7d942bc6c42dc44c89668745b5f852eeccc314b4c
```

The production kernel passed all 32 sustained output comparisons using source-resolution tolerances fixed before production observation:

```text
8 circumferential stresses PASS
8 longitudinal stresses    PASS
8 shear stresses           PASS
8 stress intensities       PASS
```

Representative actual kPa:

```text
Circ = [-0.1095,-5.4684,381.5922,-105.4145,-974.0831,881.8885,1496.2714,-1205.2847]
Long = [69.2034,-20.0611,469.0403,-319.3905,-545.8885,352.6624,922.0194,-458.1936]
Shear = [-252.8459,-252.8459,-241.8840,-241.8840,-29.2638,-29.2638,-465.4662,-465.4662]
S = [510.4200,505.9024,671.1204,528.9775,976.0738,883.5017,1756.0459,1428.5599]
```

Metamorphic proof: reversing all six WRC loads reverses circumferential/longitudinal/shear signs while stress intensity remains invariant. Zero beta and negative curve ordinates fail closed.

Important boundary: CAUx validates Table 5 mechanics/sign/superposition from its published ordinates. It does **not** validate WRC537 gamma interpolation.

## Bounded orchestration scope guard

The inherited `evaluateEmp1LocalCorrelationGate()` was too generic: hashes + benchmark PASS could yield `METHOD_QUALIFIED` without proving the runtime case was inside a bounded method domain.

New `src/core/emp1/emp1-local-method-scope.js` and the updated gate now support an optional scope contract:

```text
schema = emp1-local-method-scope/v1
type = CYLINDRICAL_EXACT_SOURCE_TABULATED_GAMMA
gammaSelectionPolicy = EXACT_SOURCE_TABULATED_GAMMA_ONLY
nonTabulatedGamma = BLOCKED
interpolationAllowed = false
crossVariantFallbackAllowed = false
machineRoundOffRelativeTolerance <= 1e-12
sourceDocumentSha256 = qualified WRC SHA
```

For a scoped method the runtime `source.localMethod` must independently satisfy the same source SHA, cylindrical shell family, exact gamma/sourceGamma identity, resolved source parameter, explicit variant, interpolation=false and fallback=false.

`scripts/emp1-local-correlation-bounded-scope-self-test.mjs` passes and proves all corresponding negative cases are blocked. Existing unscoped gate behavior remains unchanged for unrelated methods. `scripts/emp1-core-scaffold-check.mjs` also remains PASS.

## Current-head validation

Validated code head before status-only refresh: `96ad6cef87f23e4d67cb2c48f4a99b05e8c5ee0e`.

Relevant workflows on that head:

```text
EMP.1.C exact-gamma qualification #23 / 32337146311       PASS
EMP.1.C primary qualification state #29                    PASS
EMP.1.C runtime qualification #41                          PASS
EMP.1 CAUx curve-selection probe #53                       PASS (negative-authority probe retained)
EMP.1 primary-source qualification #109                    PASS
```

The inherited full-domain primary state intentionally remains BLOCKED with exactly `WRC537_NON_TABULATED_GAMMA_SELECTION_UNQUALIFIED`. That is not a regression and must not be converted to PASS by this bounded implementation.

## Why the route is still not registered

The production curve evaluator currently accepts a source-bound coefficient row supplied by its caller. The qualification parser owns 321 qualified curves, but there is not yet a deterministic **production coefficient package/index with a frozen dataset hash**. Registering the route now would permit arbitrary coefficient injection to sit between source qualification and production mechanics.

Therefore:

```text
bounded selector/evaluator engineering qualification = PASS
Table 5 mechanics qualification                       = PASS
bounded gate enforcement                              = PASS
production coefficient dataset custody                = OPEN
global EMP.1.C route                                  = NOT REGISTERED
release                                               = false
```

## Exact next increment

1. Normalize the 321 qualified cylindrical curves into a deterministic generated production package; preserve the unresolved 1B row only as explicit nonselectable metadata or exclude it with a manifest reference.
2. Compute and freeze a canonical dataset semantic hash from source-qualified fields only.
3. Independently regenerate/re-observe the package against the SHA-bound WRC source/extraction and fail on any curve/coefficient drift.
4. Expose the frozen package to `src/core/emp1` without runtime Markdown/PDF parsing.
5. Build a bounded local-correlation adapter that obtains all required Table 5 ordinates from this package, applies the qualified frame and pressure-thrust policies, and calls the Table 5 kernel.
6. Create a bounded method qualification record containing dataset hash + scope contract hash + WRC SHA + benchmark hashes.
7. Exercise the real `runEmp1()` orchestration path and prove out-of-domain runtime cases fail before local-correlation execution.
8. Only then consider registering a **bounded** route. Full-domain non-tabulated-gamma support remains independently blocked.

## Changed-file ledger

- `scripts/emp1-wrc-cylindrical-exact-gamma-lib.mjs`
- `scripts/emp1-wrc-cylindrical-exact-gamma-self-test.mjs`
- `scripts/emp1-wrc-exact-gamma-independent-oracle-check.mjs`
- `scripts/emp1-wrc-exact-gamma-production-comparison.mjs`
- `scripts/emp1-wrc-table5-production-comparison.mjs`
- `scripts/emp1-local-correlation-bounded-scope-self-test.mjs`
- `src/core/emp1/emp1-wrc537-exact-gamma.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-local-method-scope.js`
- `src/core/emp1/emp1-local-correlation-gate.js`
- `validation/emp1/wrc537-2013/exact-gamma-capability-v1.json`
- `validation/emp1/wrc537-2013/exact-gamma-oracle-1a-g5-v1.json`
- `.github/workflows/emp1-c-exact-gamma.yml`
- `agents/status/PR1291.yaml`
- `agents/claims/PR1291.yaml`
- `agents/PR1291_workreport.md`

## Appendix A — next-agent expert questions

1. Does the WRC source still reproduce SHA-256 `698fcdc3...c27b2`?
2. Does the cylindrical source parser still give exactly 28 tables, 321 qualified curves, one unresolved curve and 3,210 qualified scalars?
3. Is the blank-gamma `1B Original` row still unselectable without inferred gamma=10?
4. Can a non-tabulated runtime gamma ever pass the selector, core evaluator, or orchestration scope guard? It must not.
5. Can Original ever silently consume Extrapolated data? It must not.
6. Is `1e-12` used only for numerical identity, never interpolation?
7. Does the production curve evaluator remain independent of qualification scripts and runtime Markdown/PDF parsing?
8. Does the independent page-95 oracle re-observe hash `809178dc...41e` with zero production imports?
9. Do all 32 Table 5 CAUx comparisons remain within the predeclared source-resolution tolerance?
10. Does six-load reversal still reverse linear stresses while preserving Tresca intensity?
11. Is every production coefficient consumed from a frozen source-qualified package rather than caller-authored arbitrary numbers?
12. Does the bounded method qualification bind source SHA, dataset hash, scope hash, benchmark hash and production-comparison evidence?
13. Does real `runEmp1()` dispatch block out-of-domain cases before invoking local correlation?
14. Is the global/full-domain route still false while non-tabulated-gamma authority remains unresolved?
