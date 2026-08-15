# PR1151 — Empirical Calc V3 Safety & Evidence Work Report

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1149_OWNER_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: issue #1149
PR: #1151
BRANCH: agent/empirical-v3-safety-evidence-fresh-20260815
PR_HEAD_OBSERVED: ba0bdd36ffac918284502007037bdc0b68dae462
REPORT_BASIS_HEAD: ba0bdd36ffac918284502007037bdc0b68dae462
MAIN_HEAD_LAST_CHECKED: 04328852dced9f5c4827da8afe8a82aeb8b1a1d3
MERGE_BASE: edafbbccbc7572f65192a048550406d2257d3def
GROUNDING_EPOCH: GE-1149-009
CURRENT_STAGE: RECONCILE
LAST_COMPLETED_STAGE: TARGETED_EXECUTABLE_QUALIFICATION_AND_FAIL_CLOSED_MIXED_EXECUTION_BRIDGE
CURRENT_BLOCKER: full exact-head repository checkout/browser execution remains unavailable; targeted dependency closures are executable via connector reconstruction
HIGHEST_RISK: mixed bridge is qualified at targeted source/benchmark level but remains deliberately absent from main/browser runtime until full source-guard/browser qualification
LAST_DURABLE_CHECKPOINT: core authority/workflow/evidence/post-run checks executed; three defects fixed; strict mixed producer + authorization bridge benchmark-qualified; browser mixed wiring still off
EXACT_NEXT_ACTION: execute full source/UI guards and the committed mixed execution script from a complete exact-head checkout/browser; only then consider wiring mixed preparation/execution into main/workbench
```

## Handover summary

PR #1151 remains the active issue #1149 implementation and is stacked directly on unchanged #1148 exact head `edafbbccbc7572f65192a048550406d2257d3def`. No merge is authorized. #1150 remains outside this continuation.

The owner-locked P0 chain is implemented at source level:

```text
source/master/current model
→ quantity / branch / component authority
→ immutable risk set + singular HIGH_CONFIRM receipt
→ sealed calculation authorization
→ exact execution-request custody
→ unchanged qualified ROM
→ sealed coupled evidence
→ RESULT_REVIEW_REQUIRED
→ result review
→ RESULT_REVIEWED
→ audit readiness
→ AUDIT_EXPORT_READY
→ governed JSON export
```

A strict mixed `straight → elbow → straight` source-bound path now exists through a **separate fail-closed execution bridge**, but it is intentionally not wired into `src/main.js` or the Run button.

## Validation method and truth

The environment still cannot clone the private repository directly: local GitHub DNS/network access is unavailable and no cached checkout exists. The GitHub connector, however, can fetch exact repository objects/files. During this stage, targeted dependency closures were reconstructed from connector-fetched exact-head sources and executed under local Node.

This means:

- the listed targeted checks below are **real LOCAL_EXECUTION PASS** observations;
- they are not CI runs and not a full repository import-graph/browser run;
- source/UI guard scripts are not represented as runtime PASS unless actually executed;
- the new mixed execution positive benchmark was executed through a reconstructed exercised #1148 mechanics closure and independent frozen oracle; the committed mixed check file itself still requires a complete checkout run.

## Defects discovered by execution and fixed

### DEF-001 — safety presentation fixture omitted required current semantic hashes

Observed failure:

```text
TypeError: source.semanticHash is required for a current sealed record.
```

Diagnosis: production `workflow-state.js` correctly requires immutable semantic hashes for current facts; the check fixture was stale.

Fix: `scripts/empirical-v3-safety-presentation-package-check.mjs` now supplies current source/authority/branch/risk-set hashes. Production gates were not weakened.

Result: targeted rerun PASS.

### DEF-002 — mixed producer sealed an undefined restraint binding identifier

Observed failure:

```text
ReferenceError: restraintBinding is not defined
```

Diagnosis: `buildEmpiricalV3SourceBoundMixedComponentRomInput()` validated `binding` but attempted to place `restraintBinding` into the sealed material.

Fix: seal `restraintBinding: binding` and retain its immutable `bindingRef`.

Result: mixed restraint/component producer qualification rerun PASS.

### DEF-003 — exact master wall/corrosion promotion lacked immutable evidence custody

Observed failure:

```text
APPROVED_MASTER_EXACT requires immutable source evidence reference and hash.
```

Diagnosis: `empirical-v3-branch-process-resolution-adapter.js` attempted to promote exact piping-class master wall/corrosion values without the evidence reference/hash required by the V3 quantity contract.

Fix:

- exact master classification now requires a sealed `masterSemanticHash`;
- exact wall/corrosion quantities bind deterministic master locators as `evidenceRef` and the sealed master hash as `evidenceHash`;
- if master evidence is absent, class/material/wall/corrosion downgrade to `INFERRED_REVIEW_REQUIRED` with HIGH_CONFIRM risk;
- check now covers the missing-master-evidence negative.

Result: targeted rerun PASS.

## Targeted executable validation ledger

All rows below used `Status: PASS`, `Observation: LOCAL_EXECUTION`. Unless otherwise noted, the oracle is the committed contract/assertion set reconstructed from connector-fetched exact sources.

| ID | Executed contract | Result / important coverage |
|---|---|---|
| VAL-EXE-001 | `empirical-v3-workflow-state-check.mjs` | PASS — progression, stale rollback precedence, run gating, HIGH_BLOCK/HIGH_CONFIRM, presentation-noise determinism |
| VAL-EXE-002 | `empirical-v3-quantity-authority-check.mjs` | PASS — fallback 7.11 not exact, default-zero rejection, derived exact propagation, unresolved weight, tamper rejection |
| VAL-EXE-003 | `empirical-v3-risk-confirmation-authorization-check.mjs` | PASS — no HIGH_BLOCK confirm, singular/current HIGH_CONFIRM, duplicate/stale rejection, policy/dependency invalidation |
| VAL-EXE-004 | `empirical-v3-engineering-event-check.mjs` | PASS — deterministic semantic identity, audit metadata separation, severity mapping, result/audit event distinction |
| VAL-EXE-005 | `empirical-v3-branch-component-authority-check.mjs` | PASS — exact topology, branch-common/component-local separation, 30-node branch sharing, section invalidation |
| VAL-EXE-006 | `empirical-v3-coupled-evidence-check.mjs` | PASS — ROM F/R preserved, nodewise pair/component evidence, deterministic order, tamper/row-order rejection |
| VAL-EXE-007 | `empirical-v3-live-orchestration-check.mjs` | PASS — result review → audit readiness → export and governing-dependency rollback with stale history retained |
| VAL-EXE-008 | `empirical-v3-safety-presentation-package-check.mjs` after DEF-001 | PASS — workflow authenticity and package ordering identity |
| VAL-EXE-009 | `empirical-v3-source-bound-mixed-component-producer-check.mjs` after DEF-002 | PASS — strict binding, exact quantities, stale route, non-benchmark B31J, no tuning/solver/chainage |
| VAL-EXE-010 | `empirical-v3-source-authority-adapter-check.mjs` | PASS — fallback/default/missing exactness boundaries, fuzzy review, missing blocker |
| VAL-EXE-011 | `empirical-v3-authorized-execution-check.mjs` | PASS — wrong request and stale policy rejected before frozen straight-ROM call; tripwire solver was not reached |
| VAL-EXE-012 | `empirical-v3-branch-process-resolution-adapter-check.mjs` after DEF-003 | PASS — exact class/master custody and missing-master downgrade to HIGH_CONFIRM |
| VAL-EXE-013 | `empirical-v3-branch-component-adapter-check.mjs` | PASS — source BRANCH label evidence-only, process split, DN/WT local, chainage/TopoFix rejection |
| VAL-EXE-014 | `empirical-v3-stagedjson-process-basis-check.mjs` | PASS — same governed values group despite source labels, temperature change invalidates, missing operating temperature blocks |

### Mixed bridge positive benchmark

`VAL-MIX-EXEC-001`

- Status: PASS
- Observation: LOCAL_EXECUTION
- Oracle: INDEPENDENT_REPRODUCTION / frozen #1148 benchmark
- Production bridge under source inspection: `src/workspace/engineering-loads/adapters/empirical-v3-authorized-mixed-component-execution.js`
- Mechanics basis: connector-reconstructed exercised closure of unchanged #1148 analytical component ROM.
- Actual flexibility matrix:

```text
[
  [ 3.0214810087147532e-5, -1.0064363521234054e-5 ],
  [ -1.0064363521234054e-5, 5.976702305296452e-6 ]
]
```

- Frozen independent #1148 oracle:

```text
[
  [ 3.0214810087147528e-5, -1.0064363521234052e-5 ],
  [ -1.0064363521234052e-5, 5.9767023052964523e-6 ]
]
```

- Actual reactions:
  - `TIP-X = -606.8995590818411 N`
  - `TIP-Y = -1523.926961429032 N`
- Frozen oracle:
  - `TIP-X = -606.8995590818411 N`
  - `TIP-Y = -1523.9269614290317 N`
- Evidence retained elbow component contribution `E1`.
- Evidence policy reports mechanics/reaction/flexibility recomputation false.

This proves the bridge/producer contract can drive the unchanged analytical straight/elbow ROM to the frozen independent benchmark without UI/report solving. It does **not** replace a complete exact-file/check/browser run.

## Mixed execution bridge boundary

New module:

`src/workspace/engineering-loads/adapters/empirical-v3-authorized-mixed-component-execution.js`

It is under the owner 300-line ceiling and is the sole sanctioned crossing from sealed mixed producer custody to the frozen component ROM.

It enforces, in order:

1. sealed calculation authorization belongs to the run;
2. current policy/risk/dependency/confirmation basis via `assessEmpiricalV3CalculationAuthorizationCurrent`;
3. producer is a valid `empirical-v3-source-bound-mixed-component-rom-input/v1` record;
4. producer policy remains strict, including `executionEnabled:false`, no support splitting/chainage/tolerance topology/benchmark elbow/tuning;
5. exact `ROM_EXECUTION_REQUEST` over producer, route, restraint binding and authority refs exists in calculation authorization;
6. only then call unchanged #1148 public `rooted-tree-component-flexibility-gate.js` entrypoint;
7. seal returned mechanics into the same `empirical-v3-coupled-calculation-evidence/v1` consumed by Explain/result-review/audit.

It does not import the unchecked component solver, restraint compatibility, FE assembly, prismatic/elbow formula functions, chainage, topology-edit or fallback paths.

## Anti-drift status

Updated source guards now explicitly:

- keep mixed producer/binding solver-free;
- require the producer bug fix `restraintBinding: binding`;
- require master evidence custody in branch-process adaptation;
- permit the mixed bridge only to import the public `rooted-tree-component-flexibility-gate.js`;
- require authorization-currentness and exact request gates to precede the mixed solver call;
- prohibit direct unchecked component solver, restraint compatibility, FE assembly, formula calculators, chainage and topology-edit imports from the bridge;
- prohibit `src/main.js` from importing the mixed producer, restraint binding **or authorized mixed execution bridge**.

Source inspection on report basis confirms `src/main.js` still contains only the existing straight source-bound execution path. Mixed runtime/UI enablement remains off.

## Validation still NOT_RUN / NOT_OBSERVED

The following remain explicitly NOT_RUN as complete exact-file/full-repository checks:

- `node scripts/empirical-v3-authorized-mixed-execution-check.mjs` as the committed file from a complete checkout;
- `node scripts/empirical-v3-source-guard-check.mjs` against the complete exact tree;
- `node scripts/empirical-v3-safety-ui-source-guard.mjs` against the complete exact tree;
- full package/import-graph build/lint/test suite;
- real browser route through Run → result review → audit → remount;
- browser governing-mutation rollback;
- GitHub Actions/CI for the current head (no run has been observed yet).

Do not promote these to PASS until actually observed.

## Frozen mechanics / scope reconciliation

- #1148 remains unchanged at `edafbbccbc7572f65192a048550406d2257d3def`.
- #1145/#1147/#1148 mechanics files were not modified by this PR.
- No `.github/workflows/*` file was added or changed.
- No V1/V2 behavior change was made.
- No tolerance/quadrature/formula tuning or response multiplier was introduced.
- Mixed source-bound producer remains inert (`executionEnabled:false`).
- Mixed execution bridge is not imported by `src/main.js`.
- No merge performed; merge authority remains OWNER_ONLY.

## Active engineering items

| ID | Severity | Status | Summary |
|---|---:|---|---|
| RISK-001 | HIGH | MITIGATED | fallback/default/fuzzy laundering blocked |
| RISK-002 | HIGH | MITIGATED | HIGH_BLOCK/HIGH_CONFIRM and sealed authorization gates executed successfully |
| RISK-003 | HIGH | MITIGATED | Explain/audit sealed-evidence purity executed successfully |
| RISK-004 | HIGH | MITIGATED | post-run review/audit/stale rollback targeted execution PASS |
| RISK-005 | HIGH | MITIGATED | mixed source/restraint/quantity/B31J custody targeted execution PASS |
| RISK-006 | HIGH | MITIGATED_TARGETED | separate mixed request/auth bridge benchmark-qualified against frozen #1148 oracle |
| RISK-007 | HIGH | OPEN_VALIDATION | complete checkout/import-graph/browser/source-guard execution still unavailable |
| DEC-001 | HIGH | ACTIVE | #1145/#1147/#1148 numerics frozen |
| DEC-002 | HIGH | ACTIVE | mixed producer remains execution-disabled; bridge owns execution crossing |
| DEC-003 | HIGH | ACTIVE | mixed bridge remains outside main/browser runtime until full qualification |
| DEC-004 | HIGH | ACTIVE | no workflow YAML or merge without owner authority |

## Exact continuation

1. Run `empirical-v3-authorized-mixed-execution-check.mjs`, `empirical-v3-source-guard-check.mjs`, and `empirical-v3-safety-ui-source-guard.mjs` from a complete exact-head checkout.
2. Run the real browser representative route through `CALCULATION_AUTHORIZED → RESULT_REVIEW_REQUIRED → RESULT_REVIEWED → AUDIT_EXPORT_READY`, export JSON and remount from sealed package.
3. Mutate a governing source/component/restraint/method dependency and prove the browser/workflow moves backward while old evidence remains non-current history.
4. If 1–3 are green, wire a tagged prepared mixed execution into the workspace/main Run path without allowing UI construction of producer inputs or calculation authorization.
5. Re-run full guards and browser stale-remount tests after that wiring.
6. Do not change frozen mechanics, workflows, V1/V2, or merge without explicit owner instruction.
