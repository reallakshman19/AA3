# PR 1211 work report — consolidated WRC537 Edition 4 source-to-evaluator batch

## 1. Current PR role

PR #1211 is the single canonical WRC537 Edition 4 source-to-evaluator batch.

```text
base = main
state = DRAFT / OPEN
merge authorization = NOT GRANTED
engineering activation = BLOCKED
```

Earlier draft PRs #1206, #1207, #1208 and #1210 remain unmerged historical slices. Their implementation content is cumulatively represented here; they are not separate merge prerequisites for this consolidated PR.

## 2. Engineering objective

Provide one fail-closed chain:

```text
AUTHORIZED WRC537 EDITION 4 SOURCE
        ↓
exact source SHA-256 custody
        ↓
DOCUMENT + DATUM provenance
        ↓
source package READY_FOR_TECHNICAL_IMPLEMENTATION
        ↓
immutable engineering dataset candidate
        ↓
source-bound calculation plan
        ↓
reviewed executable mathematical graph
        ↓
deterministic execution trace
        ↓
term-complete numerical qualification
        ↓
exact retained source-benchmark reproduction custody
        ↓
numeric literal / coefficient custody
        ↓
numerical release candidate
        ↓
STOP — independent approval / trusted registry
```

No step in this PR grants engineering authority.

## 3. Current real engineering state

Available only:

```text
WRC Bulletin 537 public catalog identity
Edition 4
publication 2026-02
```

Still unavailable in authorized technical-source custody:

```text
exact licensed/authorized Edition 4 source artifact
complete geometry/applicability definitions
U / gamma / rho / lambda / delta source equations and limits
all 12 load/moment positive directions and reference points
stress recovery definitions and source stress measure
interpolation/extrapolation rules
Edition 4 coefficient inventory and values
published/reference numerical benchmark values
real WRC-to-LAFEA canonical mapping
```

Therefore the real method remains **BLOCKED**. No missing technical value is promoted from PR #1203, older editions, OCR, secondary software, or synthetic fixtures.

## 4. Source authority model

The source ledger distinguishes:

```text
DOCUMENT_IDENTITY
DOCUMENT
DATUM
```

`DOCUMENT_IDENTITY` establishes catalog identity only.

`DOCUMENT` establishes custody of the exact authorized Edition 4 technical artifact and its SHA-256.

Every consumed `DATUM` must retain:

```text
record_id
record_scope = DATUM
engineering_subject
authority_class = PRIMARY_LICENSED | PRIMARY_AUTHORIZED
publisher = Welding Research Council, Inc.
bulletin_number = 537
edition = 4
publication_date = 2026-02
document_digest = exact technicalSource.documentDigest
locator
verification_status = PRIMARY_SOURCE_VERIFIED
```

## 5. Source-package READY gate

Before `READY_FOR_TECHNICAL_IMPLEMENTATION`, the package requires:

```text
exact Edition 4 identity
primary technical DOCUMENT custody
complete consumed DATUM custody
geometry and physical applicability
five dimensionless parameter definitions/domains
all twelve load conventions
stress components/recovery/surface reconstruction/source stress measure
interpolation/extrapolation authority
complete coefficient/equation inventory
source precision and exact coefficient locators
source benchmark evidence
qualified LAFEA mappings
zero unresolved implementation field
```

Parameter ranges require `minimum < maximum`. Duplicate parameter/load identities are rejected. Coefficient locators must exactly equal their datum ledger locator.

Mandatory load identities are:

```text
spherical:P
spherical:V1
spherical:V2
spherical:M1
spherical:M2
spherical:Mt
cylindrical:P
cylindrical:Vc
cylindrical:Vl
cylindrical:Mc
cylindrical:Ml
cylindrical:Mt
```

## 6. Engineering dataset promotion

Only a READY package may produce `wrc537-ed4-engineering-dataset/v1`.

The dataset retains complete source package, source ledger, coefficients, source-document SHA-256, readiness evidence, promotion metadata, and canonical hashes.

Authority remains:

```text
engineeringUseAuthorized = false
SOURCE_QUALIFIED_DATASET_NOT_METHOD_QUALIFIED
```

## 7. Source-bound calculation plan

The calculation plan is bound to one exact dataset hash and retains source-qualified definitions for:

```text
source family
coordinate system
load reference
variables
equations
interpolation rules
recovery targets
combination rules
post-processing rules
```

Every numerical-plan source item must resolve to a primary Edition 4 `DATUM` row with the exact source digest and locator.

## 8. Executable mathematical representation

There is no `eval()` or dynamic `Function()` path.

Reviewed primitives:

```text
VAR
CONST
ADD
SUB
MUL
DIV
NEG
ABS
SQRT
POW
MIN
MAX
POLYNOMIAL
LINEAR_INTERPOLATE
```

These are software capabilities only, not claims about WRC537 mathematical form.

The executable plan requires exact plan binding, variable metadata, dimensions/units, explicit dimension audit, source equation/rule identity, and deterministic execution order.

## 9. Numerical safety

The evaluator fails closed on:

```text
missing/extra/duplicate inputs
wrong units
unknown variables
forward/unbound references
unsupported operators
non-finite values
division by zero
negative square-root domain
zero interpolation span
source-unauthorized interpolation
source/executable extrapolation-policy mismatch
unavailable recovery values
```

No silent unit conversion is performed.

## 10. Qualification evidence

Qualification remains term-complete.

Every case requires expected values for:

```text
every executable equation/interpolation step
+
every declared recovery result
```

Each expected value retains:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

Each case also requires:

```text
independentReproduction = true
independentCalculationReference = non-empty
```

Qualification PASS is deliberately **not sufficient** to create a numerical release candidate. Supplemental diagnostic/hand-calculation cases may be valid qualification evidence without being source benchmarks.

## 11. Source-benchmark release custody — P0 boundary

A stack audit found that a self-consistent qualification suite could previously PASS without machine proof that it reproduced a benchmark retained in `dataset.sourcePackage.benchmarks`.

That bypass is closed at the numerical release boundary.

A numerical release candidate now requires `benchmarkBindings` covering **every retained source benchmark exactly once**.

Binding row:

```text
sourceBenchmarkCaseId
qualificationCaseId
inputBindings[]
recoveryBindings[]
```

The bound qualification case must match the benchmark's source datum/locator, `independentReproduction=true`, and exact `independentCalculationReference`.

### 11.1 Exact source benchmark input custody

Each qualification request variable maps to a `benchmarkPath`, an ordered list of object keys and/or array indexes into the retained benchmark input object.

Required:

```text
qualification request value
==
retained benchmark value at benchmarkPath
```

The release gate recursively inventories **every finite numeric leaf** in the retained benchmark input object. Every numeric leaf must be mapped exactly once.

Therefore a benchmark containing `{R, t, P}` cannot be released from a qualification request that proves only `P`, even if the final result coincidentally agrees.

### 11.2 Exact source benchmark recovery custody

Every benchmark expected result must map exactly once to a qualification expected recovery value.

The following must match exactly:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

A self-consistent calculation with a changed result or widened tolerance cannot be promoted as reproduction of the retained source benchmark.

Focused design note:

`docs/wrc537/ed4/SOURCE_BENCHMARK_RELEASE_CUSTODY.md`

## 12. Numeric literal and coefficient custody

Every executable numeric literal is inventoried deterministically.

Allowed binding classes:

```text
DATASET_COEFFICIENT
SOURCE_LITERAL
```

A dataset coefficient must exactly match the retained coefficient ID, value, source reference and source locator. Source-benchmark reproduction does not authorize unbound magic numbers.

The release gate also requires:

```text
graph VAR references
==
source plan inputVariableIds
```

for every equation/interpolation implementation.

## 13. Numerical release candidate

Creation now requires:

```text
valid dataset
valid source-bound calculation plan
valid executable plan
replayed qualification PASS
exact graph-input custody
100% retained source-benchmark coverage
exact benchmark request-input mapping
100% numeric benchmark-input leaf coverage
exact benchmark recovery/tolerance/source mapping
exact independent reproduction reference
complete numeric literal/coefficient custody
```

Authority remains:

```text
engineeringUseAuthorized = false
NUMERICALLY_QUALIFIED_CANDIDATE_AWAITING_INDEPENDENT_APPROVAL_AND_TRUST
```

## 14. Pipeline

Primary command:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

States:

```text
SOURCE_PACKAGE_BLOCKED
SOURCE_BOUND_CALCULATION_PLAN_REQUIRED
EXECUTABLE_PLAN_REQUIRED
QUALIFICATION_SUITE_REQUIRED
NUMERICAL_QUALIFICATION_FAILED
SOURCE_BENCHMARK_CUSTODY_REQUIRED
NUMERIC_LITERAL_CUSTODY_REQUIRED
NUMERICAL_RELEASE_CANDIDATE_AWAITING_APPROVAL_AND_TRUST
```

New release artifact:

```text
docs/wrc537/ed4/WRC537_ED4_BENCHMARK_BINDINGS.json
```

It must remain absent while the real source package is BLOCKED.

`--release` deliberately remains non-zero at the approval/trust boundary.

## 15. Product/registry boundary

The reviewed WRC method module set is limited to:

```text
source-readiness.js
ed4-source-package.js
ed4-engineering-dataset.js
ed4-numerical-adapter.js
ed4-execution-engine.js
ed4-qualification-engine.js
ed4-numerical-release-candidate.js
```

The boundary guard separately requires WRC537 to remain absent from central product/index/engineering-registry/engineering-assessment/trusted-authority activation paths.

No UI Run control is activated.

## 16. Stack-level defects found and fixed

### A — READY could outrun datum provenance

Fixed by requiring DATUM-level source custody before READY.

### B — datum digest could differ from exact technical source digest

Fixed by requiring every consumed datum digest to equal `technicalSource.documentDigest`.

### C — executable extrapolation could override source policy

Fixed by recursively binding every `LINEAR_INTERPOLATE` primitive to source-package interpolation/extrapolation authority.

### D — original source-only boundary guard contradicted later reviewed modules

Fixed by permitting the exact reviewed source-independent module set while continuing to block product/registry/trust activation.

### E — qualification PASS could bypass retained source benchmarks

Previous state:

```text
arbitrary self-consistent case
+ valid Edition 4 DATUM
→ qualification PASS
→ potentially numerical release candidate
```

Fixed by requiring one-to-one retained source benchmark bindings at numerical release.

### F — retained benchmark numeric inputs could be partially omitted

Previous state:

A benchmark could retain several numeric geometry/load values while only a subset was mapped into the qualification request.

Fixed by recursive 100% finite numeric-leaf input coverage.

## 17. Synthetic contract fixtures

Synthetic regressions use obvious software-only relations such as:

```text
1000 N / 100 mm² = 10 MPa
(1000 / 100) × 1.234 = 12.34 MPa
```

They are not WRC537 technical data or engineering validation cases.

The release-candidate fixture now encodes rejection of:

```text
missing source benchmark coverage
self-consistent but wrong benchmark input
self-consistent but wrong benchmark recovery value
mismatched independent calculation reference
missing/incorrect coefficient literal binding
forged engineering authority
```

## 18. Validation ledger

| Check | Status | Evidence / limitation |
|---|---|---|
| Connector branch/PR state review | REVIEWED | PR remains draft/open/unmerged |
| Source authority boundary review | REVIEWED | Real source remains BLOCKED |
| Benchmark-custody static review | REVIEWED | Release gate binds benchmark/input/recovery/reference |
| Pipeline state review | REVIEWED | `SOURCE_BENCHMARK_CUSTODY_REQUIRED` added |
| Current-state artifact guard | ENCODED / NOT_RUN | Benchmark binding file required absent while blocked |
| Release-candidate benchmark regression | ENCODED / NOT_RUN | Negative cases encoded |
| Full Node regression suite | NOT_RUN | No executable repository checkout available in this agent context |
| GitHub Actions/workflows | NOT_RUN | Explicitly excluded from this workstream |

Selected constructed JavaScript revisions were syntax-checked before connector upload during this work, but that is **not** represented as execution of the repository regressions.

No unexecuted regression is claimed as PASS.

## 19. Review/merge posture

PR #1211 is the canonical review target and remains a draft.

No merge has been performed. Fresh explicit user authorization is required before merge.

## 20. Remaining P0 external dependency

The next source-dependent batch requires an authorized/licensed WRC Bulletin 537 Edition 4 technical source.

Once supplied:

```text
exact SHA-256
→ DOCUMENT/DATUM extraction
→ READY source package
→ immutable dataset
→ real calculation plan
→ actual source mathematical graph
→ source benchmark + independent hand-calculation suite
→ exact benchmark bindings
→ numerical release candidate
→ independent approval/trust
→ engineering registry/product integration
```

## Appendix A — takeover questions

1. What exact Edition 4 source artifact SHA-256 is authoritative?
2. What licensing/authorization basis permits implementation use?
3. Are all consumed datum rows bound to that exact digest?
4. What are the exact source definitions of Rm, Rc, T, r0, rm, t, C1 and C2 where applicable?
5. What shell and attachment thickness basis is required: nominal, corroded, effective, or another definition?
6. What are the exact source equations for U, gamma, rho, lambda and delta?
7. What are each parameter's inclusive/exclusive numerical limits?
8. Are any parameter domains shell-family or attachment-family dependent?
9. What are the exact spherical positive directions for P, V1, V2, M1, M2 and Mt?
10. What are the exact cylindrical positive directions for P, Vc, Vl, Mc, Ml and Mt?
11. What is the source load/moment reference point?
12. Is remote-load translation part of WRC537 or a separate LAFEA/piping policy?
13. What source coordinate basis defines axial/circumferential/local directions?
14. What host-shell/attachment/intersection topologies are supported?
15. What topologies and proximity conditions are explicitly excluded?
16. What recovery locations exist and how are they geometrically defined?
17. What surfaces are reported at each recovery location?
18. How are membrane and bending terms reconstructed at inner/outer surfaces?
19. What shear components are source outputs and what signs apply?
20. Does Edition 4 define stress intensity/equivalent stress, or is that downstream software post-processing?
21. Has any retained stress-measure expression been independently dimension-checked?
22. What coefficient/equation families exist in Edition 4?
23. Has every coefficient been extracted with displayed precision and exact locator?
24. What interpolation algorithm is source-authorized for each family?
25. Is extrapolation authorized, and under what exact conditions/ranges?
26. Are interpolation/extrapolation rules family-specific?
27. What published/reference numerical examples are retained from Edition 4?
28. Does each retained source benchmark carry every numeric geometry/load input consumed by the method?
29. Can every retained benchmark input numeric leaf be mapped to an explicit calculation-plan input variable?
30. Are source benchmark input units explicit enough to prohibit silent conversion?
31. What exact source output quantities are retained for each benchmark?
32. Does every retained source output map to one calculation-plan recovery target/result variable?
33. What absolute tolerance follows from the publication precision for each retained source output?
34. Is every benchmark's independent calculation reference genuinely independent of the software evaluator?
35. Can every benchmark intermediate be independently reconstructed even when not printed by the source?
36. What is the first divergent intermediate when a source benchmark fails?
37. Does the real LAFEA mapping preserve all source signs, axes, locations and surfaces without hidden transformation?
38. Are pressure stresses separate from the WRC external-load result?
39. Are principal/Tresca/von-Mises results source outputs or separate LAFEA post-processing?
40. Does every executable graph reference exactly the variables declared by its source equation/rule?
41. Is every executable numeric literal source-bound or dataset-coefficient-bound?
42. Has every interpolation primitive been checked against source interpolation/extrapolation authority?
43. Does the numerical release candidate cover 100% of retained source benchmarks exactly once?
44. Can one qualification case accidentally be reused for two source benchmarks?
45. Does every benchmark binding cover 100% of finite numeric benchmark input leaves?
46. Does every benchmark binding cover 100% of retained source expected results?
47. Do benchmark recovery bindings preserve exact source value, units, tolerance basis and locator?
48. Does the bound qualification case retain the exact benchmark independent calculation reference?
49. Has numerical qualification passed before any approval/trust request?
50. Is the approval authority explicitly trusted by code rather than caller-supplied?
51. Does product/UI activation remain impossible until source, numerical, benchmark, approval and trust gates all pass?
52. Has any older-edition/secondary-source datum entered the Edition 4 release dataset?
