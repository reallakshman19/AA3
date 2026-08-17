# PR 1211 work report — WRC537 Edition 4 source-to-evaluator batch

## 1. Scope

PR #1211 is a batch implementation over PR #1210.

Parent stack:

```text
#1206 source readiness validator
  ↓
#1207 Edition 4 source-package intake
  ↓
#1208 immutable engineering-dataset promotion
  ↓
#1210 source-bound numerical adapter boundary
  ↓
#1211 source-to-evaluator batch
```

The user explicitly requested batch delivery rather than micro-coding. This PR therefore implements the remaining source-independent numerical infrastructure in one increment.

## 2. Batch objective

Provide a deterministic, fail-closed path from:

```text
AUTHORIZED WRC537 EDITION 4 SOURCE
```

to:

```text
NUMERICALLY QUALIFIED RELEASE CANDIDATE
```

while preventing that state from becoming engineering-authorized without the separate approval/trust/registry chain.

## 3. Authority boundary

This PR does not set `engineeringUseAuthorized=true` anywhere.

Artifacts remain explicitly non-authorized:

```text
executable plan
execution trace
numerical qualification evidence
numerical release candidate
```

Final batch state is:

```text
NUMERICAL_RELEASE_CANDIDATE_AWAITING_APPROVAL_AND_TRUST
```

not:

```text
ENGINEERING_AUTHORIZED
```

## 4. Real source status

Current real Edition 4 state remains blocked.

Available:

```text
official catalog identity only
WRC Bulletin 537
Edition 4
publication 02/2026
```

Still unavailable in repository authority custody:

```text
authorized Edition 4 technical source bytes/digest
complete geometry definitions
complete applicability limits
complete U/gamma/rho/lambda/delta definitions
all load/moment signs and reference conventions
stress recovery definitions
interpolation/extrapolation authority
Edition 4 coefficient inventory and values
source numerical examples
real LAFEA mapping
```

No unavailable technical value was invented in this PR.

## 5. New execution engine

File:

```text
src/core/local-attachment-correlation/methods/wrc537/ed4-execution-engine.js
```

Schemas:

```text
wrc537-ed4-executable-plan/v1
wrc537-ed4-execution-trace/v1
```

### 5.1 Fixed operator set

Only these reviewed primitives may execute:

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

There is no `eval()` or dynamic `Function()` construction.

### 5.2 Why a typed operator graph

The authorized source expression remains evidence text in the calculation plan.

Executable mathematics is a separate reviewed representation.

This prevents:

```text
OCR/source text → arbitrary JavaScript execution
```

and creates a reviewable mapping:

```text
source equation ID
→ executable graph
→ intermediate result
→ qualification expected value
```

### 5.3 No WRC mathematical assumptions

The engine does not hard-code:

```text
F/(D t)
M/(D² t)
bilinear interpolation
no extrapolation
von Mises
Tresca
pressure combination
specific WRC point names
specific WRC parameter equations
```

The presence of an operator is capability, not a claim that Edition 4 uses that operator.

## 6. Execution ordering

Every equation/interpolation implementation occurs exactly once in `executionOrder`.

The compiler rejects:

- missing steps;
- duplicate steps;
- unknown step kinds;
- unbound references;
- forward references.

Source-plan inputs and prior calculated outputs are the only values available at a given step.

## 7. Combination and post-processing rule custody

The source-bound plan already has descriptive `combinationRules` and `postProcessing` arrays.

PR #1211 refuses to compile an executable plan when either array contains numerical behavior that has not been represented as explicit equations.

Diagnostic:

```text
WRC537_ED4_EXECUTABLE_PLAN_UNCOMPILED_SOURCE_RULES
```

This prevents descriptive source prose from being silently interpreted by software.

## 8. Dimensional audit

Every equation/interpolation implementation requires:

```text
dimensionAudit.verified = true
```

with a retained basis string.

Variables additionally carry software dimension vectors.

Examples used by synthetic fixtures:

```text
force  = { F: 1 }
area   = { L: 2 }
stress = { F: 1, L: -2 }
```

Dimension propagation rules are implemented for all supported graph operators.

The compiler rejects incompatible addition/subtraction/interpolation and output-dimension mismatch.

This software check does not replace source equation review.

## 9. Runtime units

Runtime input values must use the exact units declared by the executable plan.

No silent unit conversion exists in this evaluator.

Mismatch diagnostic:

```text
WRC537_ED4_EXECUTION_INPUT_UNITS_MISMATCH
```

The future real WRC plan must therefore establish a canonical unit policy explicitly.

## 10. Runtime numerical safety

The engine rejects:

```text
missing/extra/duplicate input variables
unknown input variables
non-finite inputs/results
unit mismatch
division by zero within declared tolerance
negative SQRT domain
interpolation zero span
unauthorized extrapolation
missing recovery values
```

Extrapolation is possible only when the compiled source rule explicitly carries:

```text
sourceAllowsExtrapolation = true
```

No global extrapolation default is introduced.

## 11. Polynomial primitive

`POLYNOMIAL` is implemented with Horner evaluation.

The polynomial independent variable must be dimensionless.

This capability is useful if the authorized Edition 4 source contains polynomial coefficient relations, but PR #1211 does not claim the actual WRC relation or coefficients.

## 12. Execution trace

Every qualification execution produces:

```text
sequence
kind
step ID
outputVariableId
value
units
sourceRef
sourceLocator
```

plus the complete declared recovery-result set.

Execution trace replay is deterministic and semantic-hash bound.

## 13. Qualification engine

File:

```text
src/core/local-attachment-correlation/methods/wrc537/ed4-qualification-engine.js
```

Schemas:

```text
wrc537-ed4-numerical-qualification-suite/v1
wrc537-ed4-numerical-qualification-evidence/v1
```

### 13.1 Term-complete qualification

Each case must contain expected values for:

```text
every executable equation/interpolation step
+
every declared recovery result
```

A final-result-only benchmark is rejected.

### 13.2 Expected-value custody

Each expected item retains:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

The referenced source must be a primary-verified Edition 4 `DATUM` row bound to the exact source document digest.

### 13.3 Tolerance policy

No default relative or percentage tolerance is supplied.

Every expected value has an explicit non-negative absolute tolerance and a non-empty tolerance basis.

For real work the basis must derive from source displayed precision, source example rounding, digitization uncertainty where source-authorized, or another separately approved numerical basis.

### 13.4 Independent reproduction

Every qualification case requires:

```text
independentReproduction = true
independentCalculationReference = non-empty
```

For real WRC qualification this must identify the independently reproduced source example or hand calculation.

## 14. Qualification result

Evidence status is:

```text
PASS
```

only if every retained intermediate and recovery comparison is inside its tolerance.

Any single failed term makes the case FAIL and therefore the full evidence FAIL.

## 15. Literal/coefficient custody

File:

```text
src/core/local-attachment-correlation/methods/wrc537/ed4-numerical-release-candidate.js
```

Schema:

```text
wrc537-ed4-numerical-release-candidate/v1
```

### 15.1 Literal inventory

Every numeric literal embedded in every graph is inventoried by deterministic graph path.

Examples:

```text
EQUATION:<id>:graph.args[1].value
INTERPOLATION:<id>:graph.y0.value
EQUATION:<id>:graph.coefficients[4]
```

### 15.2 Mandatory classification

Every literal must bind as exactly one of:

```text
DATASET_COEFFICIENT
SOURCE_LITERAL
```

No unbound numeric literal may reach numerical release.

### 15.3 Dataset coefficient binding

A `DATASET_COEFFICIENT` binding requires:

```text
known coefficient_id
literal numeric value exactly equals retained coefficient_value
sourceRef exactly equals coefficient source_ref
sourceLocator exactly equals coefficient source_locator
```

This prevents a developer from typing an alternative coefficient into the executable graph while retaining the original dataset hash.

### 15.4 Source literal binding

A source literal must bind to the same source datum and locator as the governing executable implementation.

It cannot masquerade as a dataset coefficient.

## 16. Hidden input custody

Before numerical release, every executable graph's variable reference set must equal the source plan input set exactly.

For an equation:

```text
graph VAR references == equation.inputVariableIds
```

For interpolation:

```text
graph VAR references == interpolationRule.inputVariableIds
```

Diagnostics:

```text
WRC537_ED4_NUMERICAL_RELEASE_EQUATION_INPUT_CUSTODY_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_INTERPOLATION_INPUT_CUSTODY_MISMATCH
```

This prevents hidden software dependencies that were not declared by the source plan.

## 17. Numerical release candidate

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

Authority remains:

```json
{
  "engineeringUseAuthorized": false,
  "authorizationBasis": "NUMERICALLY_QUALIFIED_CANDIDATE_AWAITING_INDEPENDENT_APPROVAL_AND_TRUST"
}
```

## 18. One-command pipeline

File:

```text
scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

Normal command:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

Materialization:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs --write
```

Release gate:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs --release
```

### 18.1 Pipeline states

```text
SOURCE_PACKAGE_BLOCKED
SOURCE_BOUND_CALCULATION_PLAN_REQUIRED
EXECUTABLE_PLAN_REQUIRED
QUALIFICATION_SUITE_REQUIRED
NUMERICAL_QUALIFICATION_FAILED
NUMERIC_LITERAL_CUSTODY_REQUIRED
NUMERICAL_RELEASE_CANDIDATE_AWAITING_APPROVAL_AND_TRUST
```

### 18.2 Deterministic writes

`--write` may materialize:

```text
WRC537_ED4_ENGINEERING_DATASET.json
WRC537_ED4_QUALIFICATION_EVIDENCE.json
WRC537_ED4_NUMERICAL_RELEASE_CANDIDATE.json
```

but only after their prerequisites validate.

The pipeline does not generate the source calculation plan from prose.

That remains an explicit engineering interpretation/review step.

## 19. Release mode deliberately stays non-zero

Even after full numerical qualification and literal custody, `--release` exits non-zero at the approval/trust stage.

This prevents an automation script from equating numerical PASS with engineering authorization.

## 20. Synthetic batch fixtures

The fixtures are explicitly not WRC data.

### Fixture A

```text
P = 1000 N
A = 100 mm²
sigma = P/A = 10 MPa
```

Used for:

- exact runtime input set;
- units;
- dimensional propagation;
- division safety;
- execution trace;
- qualification PASS/FAIL;
- anti-eval behavior.

### Fixture B

```text
K = retained synthetic fixture coefficient = 1.234
sigma = (1000/100) × 1.234 = 12.34 MPa
```

Used for:

- numeric literal inventory;
- dataset coefficient binding;
- missing binding rejection;
- altered literal rejection;
- non-authorized release candidate.

These are software-contract checks only.

## 21. Encoded regression commands

```bash
node scripts/wrc537-ed4-source-to-evaluator-batch-self-test.mjs
node scripts/wrc537-ed4-numerical-release-candidate-self-test.mjs
node scripts/wrc537-ed4-source-to-evaluator-batch-check.mjs
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

## 22. Validation status

Current agent environment status:

```text
NOT_RUN
```

Reason:

The connected GitHub branch is not available as a locally executable checkout in the agent container, and previous raw GitHub retrieval attempts were network-gated.

The user has also instructed not to use GitHub workflow/Actions as a substitute.

Therefore:

- regressions are encoded;
- static connector review was performed;
- no executable result is claimed as PASS.

Do not rewrite this status as PASS until the scripts execute successfully in an appropriate checkout.

## 23. Static connector review performed

Checked:

```text
branch is directly based on PR #1210 head
combined diff contains no UI/product activation file
combined diff contains no engineering registry activation
new files retain engineeringUseAuthorized=false
safe operator graph does not call generic local-correlation calculator
source package remains real-state BLOCKED
release candidate still stops before approval/trust
```

## 24. Files added by PR #1211

```text
docs/wrc537/ed4/SOURCE_TO_EVALUATOR_BATCH.md

src/core/local-attachment-correlation/methods/wrc537/ed4-execution-engine.js
src/core/local-attachment-correlation/methods/wrc537/ed4-qualification-engine.js
src/core/local-attachment-correlation/methods/wrc537/ed4-numerical-release-candidate.js

scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
scripts/wrc537-ed4-source-to-evaluator-batch-check.mjs
scripts/wrc537-ed4-source-to-evaluator-batch-self-test.mjs
scripts/wrc537-ed4-numerical-release-candidate-self-test.mjs

agents/PR1211_workreport.md
```

## 25. Files intentionally not changed

This PR does not modify:

```text
src/core/local-attachment-correlation/calculate.js
src/core/local-attachment-correlation/profile.js
src/core/local-attachment-correlation/interpolation.js
src/core/local-attachment-correlation/engineering-assessment.js
src/core/local-attachment-correlation/engineering-registry.js
src/workspace/lafea-correlation-product.js
```

No UI run button or product registration is introduced.

## 26. Current P0 dependency

The authorized WRC Bulletin 537 Edition 4 technical source remains the only blocker to real WRC implementation data.

Without that source, do not create a real calculation plan or claim WRC numerical verification.

## 27. Next real engineering batch after source arrival

Do not create more architecture PRs first.

When the authorized Edition 4 source is supplied, process it as one source/implementation batch:

1. calculate exact SHA-256;
2. fill source ledger at datum level;
3. fill geometry/applicability;
4. fill all parameter equations/ranges/inclusivity;
5. fill complete load/moment directions/signs/reference points;
6. fill stress definitions/recovery locations/surfaces;
7. fill interpolation/extrapolation rules;
8. fill complete Edition 4 coefficient inventory and numeric values;
9. retain source displayed precision;
10. retain source examples;
11. independently hand-calculate/reproduce the examples;
12. qualify LAFEA mappings;
13. make source package READY;
14. materialize dataset;
15. construct real calculation plan;
16. independently review every plan item against source locator;
17. compile real equations to the safe operator graph;
18. bind every coefficient/literal;
19. create term-complete benchmark cases;
20. run numerical qualification;
21. investigate first divergent intermediate term for any mismatch;
22. freeze numerical release candidate;
23. submit exact hashes to independent approval/trust chain;
24. only after approval/trust integrate into registry/product/UI.

# Appendix A — expert takeover questionnaire

The next agent should answer these before changing engineering authority or implementing real Ed4 mathematics.

1. What exact authorized WRC537 Edition 4 artifact is being used, and what is its SHA-256?
2. Is the Edition 4 publication date exactly 2026-02 for the technical artifact in hand?
3. Are any errata or supplements applicable to that exact edition?
4. What are the exact geometry definitions for every source symbol consumed by the method?
5. Which shell families are explicitly supported?
6. Which attachment families are explicitly supported?
7. What intersection/orientation restrictions apply?
8. What thickness definition is authoritative: nominal, corroded, mean, or another source definition?
9. What are the exact equations for U, gamma, rho, lambda and delta where applicable?
10. What are the exact lower and upper limits for each parameter?
11. Are each of those limits inclusive or exclusive?
12. Are limits coupled between parameters rather than independent rectangular ranges?
13. What is the exact load coordinate system for spherical shells?
14. What is the exact load coordinate system for cylindrical shells?
15. What is the positive sign of every force component?
16. What is the positive sign of every moment component, including torsion?
17. At what physical reference point are WRC loads/moments defined?
18. Does a remote-load translation belong to WRC or LAFEA software policy?
19. What stress/resultant quantities does Edition 4 actually produce?
20. What are the exact source definitions of membrane, bending and shear quantities?
21. How are inside/outside surfaces reconstructed?
22. What are all recovery locations and their physical meaning?
23. Is source stress intensity, principal stress, Tresca, von Mises, or another measure defined by WRC537 itself?
24. Have all such equations been independently dimension checked?
25. What is the complete Edition 4 coefficient/equation family inventory?
26. Is each retained coefficient value transcribed directly from the exact Edition 4 source?
27. What displayed precision is retained for every coefficient?
28. Does Edition 4 prescribe interpolation of coefficients, calculated ordinates, stresses, or another quantity?
29. Is interpolation one-dimensional, sequential, bilinear, polynomial, or another source-defined operation?
30. Is extrapolation authorized, and under exactly what conditions?
31. Do source examples expose enough intermediate values for term-complete qualification?
32. If not, what independent hand-calculation reference will establish intermediate expected values?
33. What tolerance follows from source precision for each retained benchmark quantity?
34. Are any benchmark tolerances being introduced merely to make software pass?
35. Does every executable graph input exactly match the source plan input set?
36. Does every numeric graph literal have a source-literal or dataset-coefficient binding?
37. Does every dataset-coefficient binding match the retained coefficient row exactly?
38. Are all dimensional audits independently reviewed rather than self-approved by the implementation author?
39. Are all runtime units canonical and explicitly documented?
40. Are any unit conversions hidden inside numeric literals?
41. Are all extrapolation paths explicitly source-authorized?
42. Does the execution trace retain the first point at which a hand calculation and software could diverge?
43. Does every qualification case cover every execution step and recovery result?
44. Are sign reversal cases included for each signed load component?
45. Are exact lower/upper parameter boundaries included in qualification?
46. Are just-inside and just-outside domain cases included?
47. Are exact source table/curve knots included where relevant?
48. Are interpolation midpoints or representative interior points independently verified?
49. Are multiple simultaneous loads verified only after isolated load components pass?
50. Is any LAFEA pressure-stress or code-stress post-processing being incorrectly attributed to WRC537?
51. Is the numerical release candidate still non-authorized after PASS?
52. What independent approval authority will sign the numerical implementation?
53. Is that approval authority present in the trusted authority policy?
54. Does registry activation require exact dataset, plan, executable, suite and evidence hashes?
55. Can any UI path execute WRC537 before that registry activation?
56. Can a stale or altered source package retain the same dataset identity?
57. Can reordered or modified retained evidence be normalized silently?
58. Can a developer insert a new operator without qualification?
59. Can a developer insert a magic number without literal custody?
60. Can an unexecuted regression be represented as PASS? The answer must be no.
