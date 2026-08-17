# PR 1211 work report — consolidated WRC537 Edition 4 source-to-evaluator batch

## 1. Current PR role

PR #1211 is the single canonical WRC537 Edition 4 source-to-evaluator batch.

Base:

```text
main
```

The earlier draft PRs #1206, #1207, #1208 and #1210 remain unmerged as historical implementation slices. Their cumulative engineering content is included in this branch; their individual work reports are intentionally omitted from the consolidated diff.

This PR must not be merged without explicit user authorization.

## 2. Engineering objective

Provide one fail-closed software chain from an authorized WRC Bulletin 537 Edition 4 technical source to a numerically qualified release candidate:

```text
AUTHORIZED EDITION 4 SOURCE
        ↓
source identity / SHA-256 custody
        ↓
source readiness
        ↓
Edition 4 source package
        ↓
immutable engineering dataset candidate
        ↓
source-bound calculation plan
        ↓
reviewed executable plan
        ↓
deterministic equation/interpolation execution
        ↓
term-complete execution trace
        ↓
source + independent hand-calculation qualification
        ↓
numeric literal / coefficient custody
        ↓
numerical release candidate
        ↓
STOP — independent approval / trusted registry
```

No step in this PR creates engineering authorization.

## 3. Current real engineering state

Current repository authority is intentionally incomplete.

Available:

```text
WRC Bulletin 537 public catalog identity
Edition 4
publication 2026-02
```

Not available in engineering source custody:

```text
authorized Edition 4 technical source copy/digest
complete source equations
complete coefficient inventory and values
complete applicability limits
load/moment positive directions and reference points
stress recovery definitions
source interpolation/extrapolation rules
published numerical example values
real LAFEA canonical mapping
```

Therefore the real method remains:

```text
BLOCKED
```

No technical value is promoted from PR #1203, an older bulletin edition, secondary software, OCR inference or the synthetic fixtures.

## 4. Authority model

The source ledger distinguishes:

```text
DOCUMENT_IDENTITY
DOCUMENT
DATUM
```

### DOCUMENT_IDENTITY

May establish public method/edition identity only.

It cannot authorize equations, coefficients, load signs, stress recovery or any numerical method behavior.

### DOCUMENT

A primary licensed/authorized Edition 4 technical document row establishes custody of the exact source artifact and its SHA-256.

### DATUM

Every consumed technical statement must resolve to an Edition 4 primary-verified datum row that carries:

```text
record_id
record_scope = DATUM
engineering_subject
authority_class = PRIMARY_LICENSED | PRIMARY_AUTHORIZED
publisher
bulletin_number
edition
publication_date
document_digest
locator
verification_status = PRIMARY_SOURCE_VERIFIED
```

The datum digest must equal the exact technical source document digest.

## 5. Source readiness and package gate

The batch requires all of the following before `READY_FOR_TECHNICAL_IMPLEMENTATION`:

```text
package schema
unique ledger identity
Edition 4 identity
catalog identity source
primary technical DOCUMENT custody
complete DATUM custody
geometry / physical applicability
U / gamma / rho / lambda / delta
all 12 source load conventions
stress components and recovery
interpolation / extrapolation policy
coefficient inventory declaration
unique and source-bound coefficients
source/independent benchmark evidence
canonical LAFEA mappings
no unresolved implementation field
```

Parameter domains require:

```text
minimum < maximum
```

not merely `minimum <= maximum`.

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

Only a READY source package can be promoted.

The immutable dataset retains:

```text
source package snapshot
source ledger rows
coefficient rows
source document SHA-256
readiness evidence
promotion identity
canonical semantic hashes
```

Authority remains:

```text
engineeringUseAuthorized = false
SOURCE_QUALIFIED_DATASET_NOT_METHOD_QUALIFIED
```

## 7. Source-bound calculation plan

A calculation plan is tied to one exact dataset semantic hash.

It retains source identity for:

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

Every numerical-plan source reference must be a DATUM row with the same exact source-document digest and exact locator.

The plan does not execute source prose.

## 8. Safe executable representation

There is no `eval()` or dynamic `Function()` execution.

The fixed reviewed primitive set is:

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

These are software capabilities only. Their existence is not evidence that WRC537 Edition 4 uses a particular mathematical form.

Every equation/interpolation implementation retains:

```text
source equation/rule identity
source datum and locator
input/output variable binding
explicit units
dimension vector
reviewed dimension audit
execution order
```

## 9. Numerical safety

The evaluator rejects:

```text
missing / extra / duplicate inputs
wrong units
unknown variables
forward/unbound references
unsupported operators
non-finite values
division by zero
negative square-root domain
invalid interpolation span
source-unauthorized interpolation
source-policy extrapolation mismatch
unavailable recovery values
```

No silent unit conversion is performed.

## 10. Interpolation and extrapolation custody

A `LINEAR_INTERPOLATE` primitive cannot define its own authority.

The compiler recursively checks interpolation primitives even when nested in an equation graph.

Required relationship:

```text
executable interpolation authority
==
source-package interpolation authority
```

If source interpolation is not authorized, the primitive is rejected.

If source extrapolation is false, an executable graph cannot set `sourceAllowsExtrapolation=true`.

## 11. Qualification evidence

Qualification is term-complete rather than final-result-only.

Every case requires an expected value for:

```text
every executable equation/interpolation step
+
every declared recovery result
```

Every expected item retains:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

Every case also requires:

```text
independentReproduction = true
independentCalculationReference = non-empty
```

No arbitrary percentage tolerance is inserted.

## 12. Numeric literal and coefficient custody

Every numeric literal embedded in an executable graph is inventoried deterministically.

Allowed classifications:

```text
DATASET_COEFFICIENT
SOURCE_LITERAL
```

A dataset-coefficient literal must exactly equal the retained coefficient value and source locator.

The release gate additionally requires:

```text
graph VAR references
==
source plan declared inputVariableIds
```

so hidden software dependencies cannot reach numerical release.

## 13. Numerical release candidate

Creation requires:

```text
valid dataset
valid source-bound plan
valid executable plan
valid qualification suite
replayed qualification PASS
exact graph input custody
complete literal custody
```

Authority still remains:

```text
engineeringUseAuthorized = false
NUMERICALLY_QUALIFIED_CANDIDATE_AWAITING_INDEPENDENT_APPROVAL_AND_TRUST
```

The release candidate cannot activate engineering execution.

## 14. Product and registry boundary

The consolidated boundary guard allows only the reviewed source-independent WRC537 method modules:

```text
source-readiness.js
ed4-source-package.js
ed4-engineering-dataset.js
ed4-numerical-adapter.js
ed4-execution-engine.js
ed4-qualification-engine.js
ed4-numerical-release-candidate.js
```

It separately proves that WRC537 does not appear in:

```text
central local-attachment index
engineering registry
engineering assessment
workspace/product registry
trusted approval authority list
```

No UI Run action is activated by this PR.

## 15. Stack-level defects found and fixed during consolidation

### Finding A — READY could outrun datum provenance

Previous state:

```text
source package READY gate accepted generic primary-document technical refs
but
numerical calculation plan required DATUM refs
```

Effect:

A package could theoretically become READY and promote a dataset that the numerical plan could not legally consume.

Fix:

Datum-level custody is now required before READY.

### Finding B — datum digest did not have to equal the exact technical source digest

Previous state:

A DATUM row required a valid 64-hex digest, but READY did not prove it was the same digest as `technicalSource.documentDigest`.

Fix:

Every consumed datum must match the exact authorized source document SHA-256.

### Finding C — executable extrapolation could override source policy

Previous state:

`LINEAR_INTERPOLATE.sourceAllowsExtrapolation` was a runtime boolean not machine-bound to source-package authorization.

Fix:

The compiler recursively enforces source interpolation/extrapolation policy for all interpolation primitives.

### Finding D — original source-boundary guard contradicted the consolidated batch

Previous state:

The original source-intake guard permitted only `source-readiness.js`, so it would fail once the reviewed source-independent numerical modules were added.

Fix:

The guard now permits the exact reviewed module set while separately forbidding authority, registry, index, assessment and product activation.

### Additional hardening

Also added during consolidation:

```text
non-degenerate parameter ranges
unique parameter/load identities
coefficient locator == exact ledger locator
benchmark absolute tolerance + exact source locator
independent benchmark reference
mandatory 12-load LAFEA mapping coverage
```

## 16. Current-state pipeline

Primary command:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

Possible states:

```text
SOURCE_PACKAGE_BLOCKED
SOURCE_BOUND_CALCULATION_PLAN_REQUIRED
EXECUTABLE_PLAN_REQUIRED
QUALIFICATION_SUITE_REQUIRED
NUMERICAL_QUALIFICATION_FAILED
NUMERIC_LITERAL_CUSTODY_REQUIRED
NUMERICAL_RELEASE_CANDIDATE_AWAITING_APPROVAL_AND_TRUST
```

`--write` materializes deterministic artifacts only.

`--release` deliberately remains non-zero at the approval/trust boundary.

## 17. Synthetic contract fixtures

Fixtures are software-contract evidence only and are explicitly not WRC537 technical data.

Examples:

```text
1000 N / 100 mm² = 10 MPa
(1000 / 100) × 1.234 = 12.34 MPa
```

The second case exercises exact coefficient/literal custody.

## 18. Validation status

Executable checks are committed but currently:

```text
NOT_RUN
```

No GitHub Actions/workflow result has been inspected or used as a substitute.

Static connector review performed:

```text
full cumulative diff against current main reviewed
WRC paths do not overlap current main changes
PR retargeted directly to main
mergeability refreshed after retarget
product/registry/trust boundaries inspected
legacy boundary contradiction identified and repaired
source/evaluator cross-layer custody reviewed
```

Do not describe any encoded regression as executed PASS until it has actually run in a suitable checkout.

## 19. Review/merge posture

PR #1211 is the canonical review target.

The intermediate draft PRs remain unmerged and are not required as separate merge steps once this consolidated PR is approved.

No merge has been performed.

## 20. Remaining P0 external dependency

The only productive next engineering input is an authorized/licensed WRC Bulletin 537 Edition 4 technical source.

Once supplied, execute one engineering batch:

```text
source SHA-256
→ datum extraction with exact locators
→ READY source package
→ immutable dataset
→ real calculation plan
→ real mathematical graphs
→ source/hand benchmark suite
→ first-divergent-intermediate debugging
→ numerical release candidate
→ independent approval/trust
→ engineering registry/product integration
```

## Appendix A — takeover questions

Before real WRC numerical release, the responsible engineer must answer at least the following:

1. What exact Edition 4 source artifact SHA-256 is authoritative?
2. What licensing/authorization basis permits implementation use?
3. Are all consumed datum rows bound to that exact digest?
4. What are the exact source definitions of Rm, Rc, T, r0, rm, t, C1 and C2 where applicable?
5. What thickness basis is required: nominal, corroded, effective or another definition?
6. What are the exact equations for U, gamma, rho, lambda and delta?
7. What are each parameter's inclusive/exclusive limits?
8. Are parameter domains family-dependent?
9. What are the exact spherical positive directions for P, V1, V2, M1, M2 and Mt?
10. What are the exact cylindrical positive directions for P, Vc, Vl, Mc, Ml and Mt?
11. What is the source load/moment reference point?
12. Is any remote-load translation part of WRC or a separate LAFEA policy?
13. What source coordinate basis defines axial/circumferential directions?
14. What attachment/intersection topologies are supported?
15. What topologies are explicitly excluded?
16. What recovery locations exist and how are they oriented?
17. What surfaces are reported?
18. How are membrane and bending terms reconstructed at each surface?
19. What shear components are reported?
20. Does the source define any stress-intensity/equivalent-stress post-processing?
21. Has that stress-measure mathematics been independently dimension-checked?
22. What coefficient/equation families exist in Edition 4?
23. Has every coefficient been extracted with displayed precision and exact locator?
24. What interpolation algorithm is actually authorized?
25. Is extrapolation authorized, and under what exact conditions?
26. Are any interpolation rules family-specific?
27. What published/reference numerical examples exist in Edition 4?
28. Can every benchmark intermediate be independently reproduced?
29. What tolerance follows from displayed source precision for each expected value?
30. Does the real LAFEA mapping preserve all signs, axes, locations and surfaces without hidden transformation?
31. Are pressure stresses separate from the WRC external-load result?
32. Are principal/Tresca/von-Mises results WRC source outputs or LAFEA post-processing?
33. Does every executable graph reference exactly the variables declared by the source plan?
34. Is every executable numeric literal source-bound or dataset-coefficient-bound?
35. Has every interpolation primitive been checked against source interpolation/extrapolation authority?
36. Has every release benchmark been reproduced independently rather than copied from software output?
37. Is the first divergent intermediate retained when a case fails?
38. Has numerical qualification passed before any approval/trust request?
39. Is the approval authority explicitly trusted by code rather than caller-supplied?
40. Does product/UI activation remain impossible until all prior gates pass?
