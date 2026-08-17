# PR1230 Work Report — LoadCalc Case-Independent Mass Preprocessing

## Identity

- PR: #1230
- Branch: `agent/loadcalc-performance-base-mass-main0b3d`
- Exact creation base: `0b3d73393fcec4b6052e0ea18c3733b8e192e90d`
- Base state: current `main` immediately after owner-authorized PR #1229 merge
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Remove repeated EMPTY/OPE/HYD evaluation of support-load mass terms that are mathematically case-independent while preserving the existing engineering result contract byte-semantically as far as the calculation allows.

This is a within-execution optimization only. It does not create a persistent or cross-execution engineering cache.

## Authority rule

```text
engineering source/profile remains authority
-> existing execution-validity gates remain authority
-> case-independent mass terms are resolved once inside that execution
-> case-dependent fluid term is resolved for each load case
-> existing force/allocation/equilibrium path remains unchanged
```

The optimization artifact is not serialized, persisted, hashed, exported, or reused across executions.

## Baseline finding

Before this PR, each active load case called the complete mass path for every valid physical route entity:

```text
PIPE:
  section lookup
  material-density lookup
  OD/wall validation
  inside diameter
  length
  metal area/mass
  insulation density + mass
  fluid density + mass

COMPONENT:
  catalog/source key
  component-weight lookup
```

For the normal `EMPTY`, `OPE`, and `HYD` case set, section/material/geometry/metal/insulation/component mass work was repeated three times although those values do not depend on load case.

## Implementation

`buildExecutionIndex()` now creates an execution-local:

```text
baseMassByEntityId
```

The artifact is populated only when:

```text
globalBlockers.length === 0
&& hasActiveCases
&& route.status === 'READY'
&& entity exists
&& edge exists
&& chainage exists
&& chainage.pointMm is finite
```

That matches the old route/mass evaluation boundary. A missing entity/edge/chainage is still handled by the existing `MISSING_ROUTE_CHAINAGE` path before mass composition.

### Pipe base mass

`resolveBaseMass()` retains the old calculations for:

- section selection;
- material density;
- outside diameter;
- wall thickness;
- inside diameter;
- edge length;
- metal mass;
- insulation mass and its exact/default source evidence.

It stores:

```text
baseMassKg = metalKg + insulationKg
```

plus the already-resolved section, inside diameter, length and formula evidence needed by per-case composition.

### Component base mass

Non-pipe physical entities execute the existing `componentMass()` path once and retain that result unchanged for all active cases.

### Per-case composition

`resolveCaseMass()` now performs only the load-case fluid term for a qualified pipe and returns:

```text
massKg = baseMassKg + fluidKg
```

The old JavaScript expression:

```text
metalKg + insulationKg + fluidKg
```

is left-associated, so the new form deliberately preserves the same arithmetic association:

```text
(metalKg + insulationKg) + fluidKg
```

## Protected invariants

The PR does not change:

- `support-load-distribution/v3` schema;
- `support-load-distribution/v4` CoG schema;
- `CHAINAGE_TRIBUTARY_SPAN_V2`;
- `CHAINAGE_TRIBUTARY_SPAN_V3_COG`;
- material-density authority;
- pipe-section authority;
- insulation-density exact/default resolution;
- operating/hydro fluid-density resolution;
- component-weight authority;
- component CoG/application-point authority;
- support capability or topology tolerance;
- support projection;
- uniform/point distribution;
- gravity or load factor;
- equilibrium equations/tolerances;
- blocker/exclusion semantics;
- configured-default reporting;
- contribution/result schema;
- semantic-hash inputs.

## Operation-count model

Let:

```text
M = unique executable physical entities
P = executable pipes
C = active load cases
```

Baseline:

```text
full/invariant mass resolution ~= C * M
fluid composition              = C * P
```

After:

```text
base mass resolution           = M
case composition               = C * M
fluid composition              = C * P
```

For the normal three cases:

```text
3*M -> M
```

which is a 66.7% reduction in invariant mass evaluations by operation count. This is not a wall-clock claim.

## Performance metrics added

Module-local, observational only:

```text
baseMassArtifactBuilds
baseMassComputations
caseMassCompositions
fluidMassComputations
```

They are returned only through the existing performance-metrics accessor and are not part of engineering output.

## Production fixture acceptance counts

The existing empirical production fixture has exactly one pipe, one component, one READY route and three active cases. It now asserts per execution:

```text
baseMassArtifactBuilds = 1
baseMassComputations   = 2
caseMassCompositions   = 6
fluidMassComputations  = 3
caseEvaluations        = 3
routeCaseEvaluations   = 3
supportProjectionBuilds= 1
```

The fixture runs the calculation twice and asserts the second run rebuilds the execution-local artifact rather than sharing a hidden cache:

```text
baseMassArtifactBuilds = 2 cumulative
baseMassComputations   = 4 cumulative
caseMassCompositions   = 12 cumulative
fluidMassComputations  = 6 cumulative
```

It also retains its existing reaction/equilibrium oracle and repeated-output equality assertion.

## Independent hand calculation

Fixture:

```text
OD                    = 168.3 mm
wall                  = 7.11 mm
ID                    = 154.08 mm
material density      = 7850 kg/m3
length                = 4.75 m
insulation thickness  = 50 mm
insulation density    = 120 kg/m3
OPE fluid density     = 850 kg/m3
HYD fluid density     = 998.2 kg/m3
```

Calculated:

```text
metal       = 134.252021893143 kg
insulation  =  19.545575773942 kg
EMPTY       = 153.797597667084 kg
OPE         = 229.080257741813 kg
HYD         = 242.206010945431 kg
```

The standalone Node hand check compares the old left-associated calculation and the new preprocessed calculation using `Object.is()` for EMPTY/OPE/HYD. All three comparisons passed in the available execution environment.

This is a focused arithmetic hand-check PASS, not full exact-head application qualification.

## Structural guard

`scripts/support-load-performance-index-check.mjs` now additionally proves source structure for:

- one distribution-scope base-mass map;
- no base-mass resolution in the per-case route loop;
- no fluid resolution in `resolveBaseMass()`;
- no metal/insulation/component resolution in `resolveCaseMass()`;
- preserved arithmetic association;
- preserved method/distribution/equilibrium seams;
- observational performance counters.

## Coordination

PR #1150 was rechecked through GitHub before this PR was opened. Its current changed-file list contains only:

```text
agents/PR1150_workreport.md
```

Therefore no production-file overlap with PR #1230 was identified at that inspection.

## Changed-file ledger

- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `scripts/support-load-performance-index-check.mjs`
- `scripts/support-load-base-mass-handcheck.mjs`
- `scripts/empirical-formula-register-check.mjs`
- `agents/PR1230_workreport.md`

No `.github/workflows/*` path is changed.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Exact current-main grounding | PASS | GitHub main = exact branch base at implementation/opening |
| Production diff containment | PASS | connector compare/source inspection |
| PR mergeability before work-report commit | PASS | GitHub reported mergeable=true |
| Standalone EMPTY/OPE/HYD hand arithmetic | PASS | local Node execution, fixed closed-form fixture |
| IEEE-754 old/new mass equality on hand fixture | PASS | `Object.is` for EMPTY/OPE/HYD |
| Structural performance guard | AUTHORED / NOT_RUN | exact branch checkout unavailable |
| Existing empirical production fixture + new counts | AUTHORED / NOT_RUN | exact branch checkout unavailable |
| Full empirical numerical/output equivalence | NOT_RUN | no executable repository checkout |
| Full repository/browser gates | NOT_RUN | no executable repository checkout / CI evidence yet |
| Local GitHub checkout | INFRASTRUCTURE_BLOCKED / NOT_RUN | `gh` unavailable; direct GitHub DNS unavailable |

No `NOT_RUN` result is represented as PASS.

## Falsifier

Quarantine or revert this optimization if exact-head execution changes any of:

- contribution mass;
- formula field/value/evidence ordering;
- contribution force;
- application chainage;
- allocation ordering/value;
- support reaction;
- blocker/exclusion content/order;
- equilibrium force or moment;
- configured-default ledger;
- semantic identity of the distribution for identical authoritative input.

## Current highest risk

Exact-head repository execution of the existing empirical qualification suite remains `NOT_RUN`.

## EXACT_NEXT_ACTION

```text
Run the structural guard, standalone hand check, empirical formula-register production fixture, existing empirical numerical/output qualification, and relevant repository gates on the exact final PR head. Compare output/evidence identity against the exact base. Do not merge solely on source-level inspection.
```
