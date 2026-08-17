# WRC 537 Edition 4 — source-to-evaluator batch

## Purpose

This increment implements the complete software path from a source-qualified WRC Bulletin 537 Edition 4 extraction to numerical qualification evidence without assuming any WRC equation, coefficient, sign convention, interpolation rule, recovery location, or stress-combination rule that is not present in the authorized Edition 4 source.

The intended chain is:

```text
AUTHORIZED EDITION 4 SOURCE
        ↓
source package READY
        ↓
immutable engineering dataset
        ↓
source-bound calculation plan
        ↓
reviewed executable plan
        ↓
deterministic evaluator
        ↓
term-by-term execution trace
        ↓
source/hand-calculation qualification suite
        ↓
replayed numerical qualification evidence
        ↓
NUMERICALLY_QUALIFIED_AWAITING_APPROVAL_AND_TRUST
        ↓
separate approval / trusted registry activation
```

No step in this batch sets `engineeringUseAuthorized=true`.

## 1. What is implemented

### 1.1 Source readiness

Existing Edition 4 intake remains the only source authority gate. The source package must be `READY_FOR_TECHNICAL_IMPLEMENTATION` before an engineering dataset can be produced.

### 1.2 Engineering-dataset materialization

The existing promotion gate retains:

- exact source package;
- source ledger;
- coefficient rows;
- authorized-document SHA-256;
- readiness evidence;
- semantic hashes.

### 1.3 Calculation plan

The source-bound calculation plan from PR #1210 remains the engineering interpretation layer. Every consumed technical statement requires a primary-source `DATUM` ledger row with an exact locator.

The plan must represent every numerical source operation that affects a result as an equation or interpolation rule. If a `combinationRule` or `postProcessing` entry contains numerical behavior that has not been converted into an explicit equation, executable-plan compilation fails closed with:

```text
WRC537_ED4_EXECUTABLE_PLAN_UNCOMPILED_SOURCE_RULES
```

This prevents a descriptive sentence from silently becoming software mathematics.

### 1.4 Safe executable plan

The executable plan is schema:

```text
wrc537-ed4-executable-plan/v1
```

It binds:

```text
datasetSemanticHash
planSemanticHash
variableMetadata
equationImplementations
interpolationImplementations
executionOrder
numericalPolicy
```

It is code-owned as non-authorized:

```json
{
  "engineeringUseAuthorized": false,
  "authorizationBasis": "SOURCE_BOUND_EXECUTABLE_PLAN_NOT_NUMERICALLY_QUALIFIED"
}
```

### 1.5 Operator set

There is no text evaluation and no `eval()`/`Function()` path.

The permitted graph operators are intentionally finite:

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

Adding another operator requires a code change and qualification; source text cannot create arbitrary executable JavaScript.

`POLYNOMIAL` is evaluated by Horner's method using retained numerical coefficients in the reviewed executable graph.

`LINEAR_INTERPOLATE` is explicit. Extrapolation is rejected unless the compiled source rule itself carries `sourceAllowsExtrapolation=true`.

The presence of this operator does **not** assert that WRC 537 Edition 4 uses linear interpolation. It merely supplies a reviewed primitive if the authorized source requires it.

### 1.6 Dimensional audit

Every executable equation/interpolation implementation requires:

```text
dimensionAudit.verified = true
```

and an audit basis.

Each variable has a software dimensional vector, for example:

```text
force:   { F: 1 }
area:    { L: 2 }
stress:  { F: 1, L: -2 }
```

The graph is independently dimension-propagated.

Rules include:

- ADD/SUB/MIN/MAX: dimensions must match;
- MUL: exponent vectors add;
- DIV: exponent vectors subtract;
- SQRT: exponents divide by two;
- POW: exponent must be a constant;
- POLYNOMIAL: independent variable must be dimensionless;
- LINEAR_INTERPOLATE: x/x0/x1 dimensions must match and y0/y1 dimensions must match.

This is a software dimensional consistency check. It does not substitute for verifying the source equation itself against the bulletin.

### 1.7 Units

Runtime inputs must use the exact units declared in `variableMetadata`.

There is no silent unit conversion in this evaluator. A mismatch fails with:

```text
WRC537_ED4_EXECUTION_INPUT_UNITS_MISMATCH
```

The source-specific plan must therefore select and document one canonical unit system before qualification.

### 1.8 Numerical safety

The executable plan declares:

```text
divisionZeroTolerance
finiteOnly = true
allowExtrapolationOnlyWhenSourceRuleAllows = true
```

Runtime rejects:

- missing inputs;
- extra inputs;
- duplicate inputs;
- unit mismatch;
- unbound/forward graph references;
- division by zero according to the declared threshold;
- negative square-root argument;
- interpolation zero span;
- unauthorized extrapolation;
- non-finite results.

### 1.9 Execution trace

Schema:

```text
wrc537-ed4-execution-trace/v1
```

Every executed step retains:

```text
sequence
kind
id
outputVariableId
value
units
sourceRef
sourceLocator
```

Recovery results retain target, variable, value and units.

The trace is deterministic and replay validated.

It is qualification evidence only and is never an engineering result by itself.

## 2. Numerical qualification

### 2.1 Suite schema

```text
wrc537-ed4-numerical-qualification-suite/v1
```

A suite is bound to one exact:

```text
datasetSemanticHash
planSemanticHash
executablePlanSemanticHash
```

### 2.2 Benchmark completeness

Each qualification case must provide expected values for **every execution step** and **every recovery result**.

A final-result-only benchmark is rejected.

For each expected value retain:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

Tolerance must be source/precision justified. The code does not insert a default percentage tolerance.

### 2.3 Independent calculation

Each release case requires:

```text
independentReproduction = true
independentCalculationReference = non-empty
```

For WRC release work this reference should identify the independently checked hand calculation or separately implemented reference calculation.

### 2.4 Evidence

Schema:

```text
wrc537-ed4-numerical-qualification-evidence/v1
```

Evidence is produced by replaying all cases through the executable plan. PASS occurs only when every expected intermediate and recovery result is inside its retained absolute tolerance.

Evidence is still code-owned as:

```json
{
  "engineeringUseAuthorized": false,
  "authorizationBasis": "NUMERICAL_QUALIFICATION_EVIDENCE_REQUIRES_SEPARATE_APPROVAL_AND_TRUST"
}
```

## 3. One-command pipeline

Run:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs
```

The command reports the first real blocking stage.

Possible states are:

```text
SOURCE_PACKAGE_BLOCKED
SOURCE_BOUND_CALCULATION_PLAN_REQUIRED
EXECUTABLE_PLAN_REQUIRED
QUALIFICATION_SUITE_REQUIRED
NUMERICAL_QUALIFICATION_FAILED
NUMERICALLY_QUALIFIED_AWAITING_APPROVAL_AND_TRUST
```

`--write` permits deterministic materialization of artifacts that can be generated without new engineering interpretation:

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs --write
```

When the source package is READY, the dataset may be materialized. Qualification evidence may be materialized after a plan, executable plan and suite exist.

The script **does not auto-generate the source calculation plan** from prose. That would replace engineering interpretation with an unreviewed parser and is intentionally prohibited.

### Release mode

```bash
node scripts/wrc537-ed4-source-to-evaluator-pipeline.mjs --release
```

Release mode remains non-zero through every unresolved stage. Even a numerical PASS exits non-zero at the final state because separate approval/trust/registry activation remains required.

## 4. Required real artifacts

After the licensed Edition 4 extraction is complete, the real chain uses:

```text
docs/wrc537/ed4/WRC537_ED4_SOURCE_PACKAGE.json
docs/wrc537/ed4/WRC537_ED4_SOURCE_LEDGER.csv
docs/wrc537/ed4/WRC537_ED4_COEFFICIENTS.csv

docs/wrc537/ed4/WRC537_ED4_ENGINEERING_DATASET.json
docs/wrc537/ed4/WRC537_ED4_CALCULATION_PLAN.json
docs/wrc537/ed4/WRC537_ED4_EXECUTABLE_PLAN.json
docs/wrc537/ed4/WRC537_ED4_QUALIFICATION_SUITE.json
docs/wrc537/ed4/WRC537_ED4_QUALIFICATION_EVIDENCE.json
```

The last five do not exist in the current real repository state because the technical source package is still blocked.

## 5. Engineering conversion procedure once Edition 4 is supplied

Do this as one controlled extraction/implementation batch:

1. hash the exact authorized Edition 4 PDF/source artifact with SHA-256;
2. reconcile the public identity metadata to the exact technical copy;
3. fill geometry definitions and physical applicability from Edition 4 only;
4. fill U, gamma, rho, lambda and delta equations/domains/inclusivity exactly as applicable;
5. fill all force/moment coordinate definitions, positive signs and reference points;
6. fill stress quantities, membrane/bending/shear definitions, surface recovery and locations;
7. fill source interpolation/extrapolation behavior;
8. inventory every Edition 4 numerical coefficient/equation row;
9. transcribe values with displayed source precision and exact locator;
10. retain target-edition source examples and independently reproduce them;
11. qualify all LAFEA geometry/load/stress mappings;
12. make the source package READY;
13. materialize the immutable dataset;
14. create datum-level ledger rows for every calculation-plan item;
15. construct the calculation plan equation by equation;
16. independently review the calculation plan against the authorized source;
17. compile every equation/interpolation into the safe operator graph;
18. independently dimension-check every compiled graph;
19. create benchmark cases with expected intermediate values;
20. run the numerical qualification suite;
21. investigate any mismatch at the first divergent term, not at final stress only;
22. freeze numerical qualification evidence only after replay PASS;
23. submit the exact dataset/plan/executable/evidence hashes to the separate engineering approval/trust chain;
24. only then expose WRC537 as an executable engineering method/UI option.

## 6. Explicit non-assumptions

This batch does not assert any of the following for WRC537 unless later supplied by the source-qualified plan:

```text
force basis = F/(D t)
moment basis = M/(D^2 t)
bilinear interpolation
no extrapolation
pressure stress inclusion
von Mises combination
Tresca combination
inside/outside sign convention
fixed recovery point names
specific cylindrical/spherical parameter formula
specific coefficient polynomial
```

The evaluator provides mathematical primitives, not WRC method claims.

## 7. Current real status

Current expected state remains:

```text
Edition 4 catalog identity        available
Edition 4 primary technical data unavailable in repository
source package                    BLOCKED
engineering dataset               ABSENT
calculation plan                  ABSENT
executable plan                   ABSENT
qualification suite               ABSENT
qualification evidence            ABSENT
engineering activation            BLOCKED
```

That is the correct fail-closed state until the authorized Edition 4 technical content is supplied and qualified.
