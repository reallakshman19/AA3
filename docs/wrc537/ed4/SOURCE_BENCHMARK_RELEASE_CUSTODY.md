# WRC537 Edition 4 source-benchmark release custody

## Purpose

This contract closes the boundary between **numerical qualification evidence** and a **numerical release candidate**.

A qualification case may be useful for diagnostics, hand-calculation development, sign checks, isolated equation checks, or supplemental numerical coverage. A self-consistent qualification PASS by itself is therefore not sufficient evidence that the implementation reproduces an authoritative WRC537 Edition 4 source benchmark.

Before a numerical release candidate can exist, the software must prove that every benchmark retained in the source-qualified Edition 4 dataset has been reproduced by a specific qualification case with exact input and result custody.

This contract does not supply WRC537 technical data and does not grant engineering authority.

## Authority boundary

The sequence is:

```text
source-qualified benchmark retained in dataset
        ↓
term-complete qualification case
        ↓
qualification PASS
        ↓
source-benchmark binding verification
        ↓
numeric literal/coefficient custody
        ↓
numerical release candidate
        ↓
STOP — independent approval/trust still required
```

The numerical release candidate retains:

```text
engineeringUseAuthorized = false
```

## Why qualification PASS alone is insufficient

Without a separate benchmark-custody gate, a caller could construct inputs and expected values that are internally consistent with the executable graph, attach them to a valid Edition 4 datum row, and obtain numerical PASS without proving that any benchmark retained from the authorized source was actually reproduced.

The release gate therefore distinguishes:

```text
supplemental qualification evidence
```

from:

```text
source-benchmark reproduction required for numerical release
```

## Retained source benchmark

The source package retains benchmark evidence in the form:

```text
caseId
sourceRef
targetEditionPrimarySourceVerified
independentlyReproduced
independentCalculationReference
input
expectedResults[]
```

Each expected result retains:

```text
quantity
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

The benchmark source reference and every expected-result source reference must already satisfy Edition 4 datum-level source custody before the source package may become READY.

## Release benchmark binding

`WRC537_ED4_BENCHMARK_BINDINGS.json` contains:

```json
{
  "benchmarkBindings": [
    {
      "sourceBenchmarkCaseId": "SOURCE-CASE-ID",
      "qualificationCaseId": "QUALIFICATION-CASE-ID",
      "inputBindings": [
        {
          "variableId": "PLAN_INPUT_VARIABLE",
          "benchmarkPath": ["geometry", "R"]
        }
      ],
      "recoveryBindings": [
        {
          "targetId": "RECOVERY-TARGET",
          "variableId": "RESULT-VARIABLE",
          "benchmarkQuantity": "SOURCE-RESULT-QUANTITY"
        }
      ]
    }
  ]
}
```

`benchmarkPath` is an ordered path of object keys and/or zero-based array indexes into the retained benchmark `input` object. It is evidence mapping, not an executable expression.

## Mandatory benchmark coverage

Every benchmark retained in `dataset.sourcePackage.benchmarks` must appear exactly once in the release binding set.

A release candidate is rejected when:

- a retained benchmark is omitted;
- a benchmark is bound more than once;
- a referenced qualification case does not exist;
- one qualification case is reused as the reproduction evidence for multiple retained source benchmarks.

This makes the dataset's source benchmark inventory authoritative for release coverage.

## Qualification-case custody

The qualification case bound to a source benchmark must retain the same:

```text
sourceRef
sourceLocator
independentCalculationReference
```

and must retain:

```text
independentReproduction = true
```

The release gate does not accept a different hand-calculation reference merely because the numerical values agree.

## Exact benchmark-input custody

Every qualification request input variable must be explicitly mapped to a numeric value in the retained benchmark input object.

For each mapping:

```text
qualification request value
==
retained source benchmark numeric value at benchmarkPath
```

There is no tolerance at this identity boundary. If unit conversion is required, the canonical calculation plan and benchmark extraction must define that transformation explicitly rather than silently modifying the retained benchmark.

### Complete numeric-leaf coverage

The gate recursively inventories every finite numeric leaf in the retained source benchmark input object.

Every numeric leaf must be mapped exactly once.

For example, if a benchmark retains:

```json
{
  "geometry": { "R": 100, "t": 10 },
  "loads": { "P": 1000 }
}
```

then a release binding that maps only `P` is rejected even if the final calculated result happens to agree with the benchmark.

This prevents omitted geometry/load inputs from becoming hidden dependencies.

## Exact recovery-result custody

Every source benchmark expected result must map exactly once to a qualification expected recovery result.

The release gate requires exact equality of:

```text
value
units
absoluteTolerance
toleranceBasis
sourceRef
sourceLocator
```

Every qualification expected recovery result must also be represented in the source benchmark binding. The release boundary therefore cannot silently use a different expected value, a wider tolerance, or a different source locator than the retained benchmark.

## Intermediate values

The source benchmark release binding is intentionally centered on source benchmark **inputs and retained source outputs**.

Term-complete qualification remains separately mandatory for every executable equation/interpolation step. Intermediate expected values may be derived from independently reproduced hand calculations when the source publication does not print them, but they do not substitute for exact source benchmark recovery binding.

## Numeric literal/coefficient custody remains separate

After source-benchmark custody is satisfied, every executable numeric literal must still bind as exactly one of:

```text
DATASET_COEFFICIENT
SOURCE_LITERAL
```

Source-benchmark reproduction does not authorize unbound magic numbers.

## Pipeline state

The one-command pipeline now includes:

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

The benchmark binding artifact is required at:

```text
docs/wrc537/ed4/WRC537_ED4_BENCHMARK_BINDINGS.json
```

It must remain absent while the real Edition 4 source package is BLOCKED.

## Fail-closed diagnostics

The release gate distinguishes failures including:

```text
WRC537_ED4_NUMERICAL_RELEASE_SOURCE_BENCHMARKS_REQUIRED
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_COVERAGE_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_QUALIFICATION_CASE_REUSED
WRC537_ED4_NUMERICAL_RELEASE_QUALIFICATION_CASE_UNKNOWN
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_CASE_CUSTODY_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_INPUT_VALUE_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_INPUT_BINDING_SET_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_INPUT_PATH_COVERAGE_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_RECOVERY_VALUE_MISMATCH
WRC537_ED4_NUMERICAL_RELEASE_BENCHMARK_RECOVERY_BINDING_SET_MISMATCH
```

## Current real state

No authorized/licensed WRC Bulletin 537 Edition 4 technical source has been populated in the repository source package.

Therefore:

```text
source package = BLOCKED
source benchmark bindings = ABSENT
numerical release candidate = ABSENT
engineering activation = BLOCKED
```

Synthetic fixtures used by regression scripts exercise only the software contract. They are not WRC537 engineering data or validation evidence.