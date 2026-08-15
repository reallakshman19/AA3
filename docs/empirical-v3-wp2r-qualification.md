# Empirical Calc V3 WP2R — Productization Qualification Baseline

## Purpose

This document re-baselines issue #1152 against the first `main` revision containing the landed Empirical Calc V3 mechanics + safety/workflow/evidence stack.

Baseline:

```text
MAIN_HEAD: 3fe5d6a4131c795ed88e7875b785549f1b8e6f35
SOURCE_ISSUE: #1152
MODE: PRODUCTIZATION_QUALIFICATION
MECHANICS_POLICY: FROZEN_UNLESS_A_GENUINE_DEFECT_IS_PROVEN
```

WP2R does **not** add new piping mechanics. It qualifies and closes the product path:

```text
source
→ governed authority
→ Branch Basis
→ Safety Gate
→ sealed calculation authorization
→ governed analysis execution
→ sealed result evidence
→ result review
→ Explain Calculation
→ audit export
→ deterministic stale rollback
```

The current #1145/#1147/#1148 equations, numerical tolerances, quadrature, B31J flexibility use, V1/V2 production behavior and mixed-route mechanics remain frozen.

## Status vocabulary

Only these qualification statuses are allowed:

- `PASS_OBSERVED` — the required behavior was executed against the stated baseline/head and observed to pass.
- `FAIL` — the required behavior was executed and failed.
- `MISSING` — live source inspection proves the required capability/boundary is absent.
- `NOT_RUN` — code/evidence may exist, but the exact required executable qualification has not been observed on the baseline/head.

Source inspection is never promoted to `PASS_OBSERVED`.

## Live architecture finding and WP2R-A response

At the baseline head, Empirical V3 Run was dispatched from `src/main.js` through `executeEmpiricalV3LiveSourceBoundRun(...)` after V3-specific package/request checks, while `src/workspace/analysis-coordinator.js` separately owned the repository's reviewed-session/capability execution lifecycle.

That made U21 `MISSING` at baseline.

WP2R-A now implements the intended architecture in PR #1157 source:

```text
sealed V3 calculation authorization
+ exact source-bound execution request
+ current workspace authority
        ↓
workspace-scoped reviewed analysis session
        ↓
AnalysisCoordinator
        ↓
registered Empirical V3 analysis capability
        ↓
existing V3 live execution bridge
        ↓
existing authorized source-bound ROM gate
        ↓
unchanged frozen ROM
        ↓
sealed V3 evidence/result-review workflow
```

Key custody rules implemented:

- reserved workspace analysis target; no physical support/node is falsely treated as authority for a coupled route;
- viewport selection changes remain presentation-only for the workspace-scoped run;
- reviewed session still binds dataset ID + workspace version;
- V3 capability readiness requires the prepared package to remain `CALCULATION_AUTHORIZED`;
- exact calculation-authorization and ROM-execution-request semantic hashes remain mandatory;
- `AnalysisCoordinator` retains `ANALYSIS_STARTED / COMPLETED / FAILED`, readiness checking, session matching and result-contract validation;
- `src/main.js` no longer imports/calls `executeEmpiricalV3LiveSourceBoundRun(...)` directly;
- the capability calls only the existing V3 live execution bridge, not mechanics modules;
- mixed browser execution remains disabled;
- analysis ledger remains bounded UX/session history; V3 sealed package/audit remains the engineering audit authority.

Because the exact PR-head executable/browser checks are not yet observed, U21 is now **`NOT_RUN`**, not `PASS_OBSERVED`.

## U01–U23 live qualification matrix

| ID | Requirement | Current status | Current evidence / gap | WP2R action |
|---|---|---|---|---|
| U01 | Workflow transition table | NOT_RUN | Domain workflow contracts/check scripts exist from #1151; no exact-PR execution observed. | Execute exact-head workflow check; add missing illegal-transition cases if exposed. |
| U02 | Source stale while Results open | NOT_RUN | `main.js` clears V3 prepared/package state on dataset/project/master changes; browser behavior is unobserved. | Browser test stale mutation while Results/Explain is open. |
| U03 | Branch basis deduplication | NOT_RUN | Branch/component authority model exists. | Fixture with many nodes referencing one branch process authority; inspect hashes/object custody. |
| U04 | Same class, different NPS | NOT_RUN | #1151 separates branch class identity from component WT/section resolution. | Execute DN150/DN200 component-local section test in representative UI fixture. |
| U05 | Process boundary split | NOT_RUN | Branch/process authority contracts exist. | Execute 180→210 °C split/invalidation fixture. |
| U06 | Source `branchId` mismatch | NOT_RUN | Architecture says source branch is evidence, not automatic calculation-branch authority. | Add adversarial source-branch grouping browser/core test. |
| U07 | HIGH_BLOCK rendering | NOT_RUN | Safety Gate source contains no intended confirmation path for blocker. | Browser prove no approval control and Run disabled. |
| U08 | HIGH_CONFIRM rendering | NOT_RUN | Singular confirmation receipt path exists. | Browser prove value/evidence review + one-risk receipt only. |
| U09 | Stale confirmation | NOT_RUN | Hash-bound confirmation/currentness contracts exist. | Mutate governing source/hash and observe stale receipt + workflow rollback. |
| U10 | No bulk approval | NOT_RUN | Source guards exist; exact-PR checks not observed. | Execute source guard + browser negative test. |
| U11 | Same risk across surfaces | NOT_RUN | Branch/Safety/Explain consume sealed package records. | Prove identical `riskId` across Branch Basis, Safety Gate and result warning surfaces. |
| U12 | Event determinism | NOT_RUN | Structured engineering-event contract/check exists. | Execute twice with same engineering mutations; compare engineering hashes/order excluding audit metadata. |
| U13 | EventBus transport only | NOT_RUN | V3 package/audit records exist separately from EventBus. | Reconstruct after remount without replaying transient events. |
| U14 | Analysis ledger boundary | NOT_RUN | Existing `analysis-ledger/v1` is bounded UX history; V3 audit package is separate. Workspace target is record-compatible by source inspection. | Prove >100 analysis history entries cannot truncate V3 authoritative audit bundle. |
| U15 | Results linkage | NOT_RUN | Coupled evidence + review surfaces exist. | Browser assert every displayed result resolves exact branch/evidence/risk refs. |
| U16 | Explain UI purity | NOT_RUN | Source guard prohibits mechanics imports/re-solve in Explain and now prohibits direct V3 Run from `main.js`. | Execute exact-head source guard + browser trace fixture. |
| U17 | Coupled evidence | NOT_RUN | Sealed coupled evidence exists; previous targeted execution predates final landing/WP2R. | Two-restraint canonical fixture showing off-diagonal coupling and per-component contributions. |
| U18 | Display-only mutation | NOT_RUN | Workspace-scoped coordinator deliberately ignores viewport selection for result custody; engineering identity remains separate from view state. | Execute coordinator contract check + mutate sort/filter/precision/expansion/camera and compare engineering hashes. |
| U19 | Audit identity | NOT_RUN | Audit JSON uses sealed package/evidence. | Compare risk/confirmation/evidence IDs displayed in UI vs exported JSON. |
| U20 | Refresh/remount | NOT_RUN | Workbench can restore downstream records from package. | Full browser refresh/remount reconstruction; no new confirmation creation. |
| U21 | Existing analysis coordinator boundary | **NOT_RUN** | **Implemented in #1157 source:** workspace target + reviewed session + registered V3 capability + `ANALYSIS_REQUESTED`; direct `main.js` live-ROM call removed. | Execute `empirical-v3-governed-analysis-coordinator-check.mjs`, UI source guard, then representative browser Run. |
| U22 | Existing V3 mechanics non-regression | NOT_RUN | WP2R-A changes execution ownership only; no mechanics file changed. | Freeze hashes/benchmark oracle; execute relevant canonical straight/elbow checks after integration. |
| U23 | V1/V2 production non-regression | NOT_RUN | WP2R scope excludes V1/V2 changes. | Execute targeted production-method/profile regression and source-diff guard. |

## Already-landed capability versus WP2R closure

The following are **not new feature projects** in WP2R; they are already substantially present and now require exact-head product qualification:

- workflow-state projection;
- quantity/branch/component authority;
- risk findings and singular confirmations;
- calculation-authorization receipt;
- Branch Basis UI;
- Calculation Safety Gate UI;
- sealed coupled evidence;
- result review;
- Explain Calculation surfaces;
- structured audit JSON;
- stale package/request invalidation in the live straight browser shell.

WP2R should fix defects exposed by qualification, not redesign those contracts gratuitously.

## Implementation waves

### WP2R-A — governed Run ownership closure — P0

Implementation exists in #1157 source. Required qualification remains:

1. execute the workspace-scope coordinator contract check;
2. execute the updated V3 UI/source guard;
3. prove reviewed-session readiness is required for browser Run;
4. prove dataset/workspace mutation blocks stale execution;
5. prove display-only viewport selection does not change engineering scope or hashes;
6. prove the analysis ledger can record the workspace-target session without becoming the V3 audit authority;
7. run a representative real browser V3 straight route through the coordinator.

### WP2R-B — canonical end-to-end browser fixture — P0

Build one deterministic fixture with:

- source-bound straight + elbow route;
- two coupled restraint coordinates;
- at least two calculation branches, or one deterministic process-boundary split;
- common process/piping-class branch authority;
- component-local NPS/WT/section authority;
- one `HIGH_BLOCK`;
- one `HIGH_CONFIRM`;
- one Medium warning;
- one current confirmation designed to become stale;
- sealed result evidence from unchanged V3 mechanics.

Required journey:

```text
load source
→ build/review authorities
→ Branch Basis
→ component exception
→ Safety Gate
→ resolve blocker through governed source correction
→ confirm exactly one HIGH_CONFIRM
→ seal authorization
→ governed Run
→ result review
→ SUMMARY / TRACE / FULL AUDIT
→ export audit JSON
→ mutate one governing branch input
→ confirmation + authorization + result become stale
→ workflow rolls back deterministically
```

### WP2R-C — U01–U23 closure — P0/P1

For every row above, record:

- exact commit SHA tested;
- command/test ID;
- `PASS_OBSERVED | FAIL | MISSING | NOT_RUN`;
- evidence artifact/log;
- defect PR/commit when applicable.

No row becomes `PASS_OBSERVED` from source reading alone.

## Anti-gaming / anti-drift guards

WP2R shall fail if it introduces:

- a second or third UI-owned calculation executor;
- a UI boolean treated as calculation authorization;
- bypass around the sealed V3 calculation authorization/currentness/request checks;
- independent node/result recomputation in UI/report/export;
- mechanics, B31J, thermal or compatibility formula changes merely to make UI tests pass;
- tolerance/quadrature loosening;
- `HIGH_BLOCK` confirmation;
- bulk High-risk approval;
- source branch identity treated as calculation-branch proof;
- EventBus or the bounded analysis ledger as the only audit authority;
- presentation state inside engineering semantic hashes;
- V1/V2 production behavior changes.

## Definition of done

WP2R is complete only when:

1. U21 is `PASS_OBSERVED` and the browser Run path has one explicit governed execution owner;
2. the canonical end-to-end browser fixture passes the full source → audit → stale rollback journey;
3. all U01–U23 rows are `PASS_OBSERVED`, or an owner-approved documented exclusion remains fail-closed and cannot affect authoritative execution;
4. exact-head source guards, build/import graph and relevant regression checks are observed;
5. frozen V3 mechanics benchmarks remain unchanged;
6. V1/V2 production behavior remains unchanged;
7. the durable PR work report identifies every observed and unobserved validation truthfully;
8. no merge occurs without explicit owner authorization.

Only after this gate should the next mechanics batch begin. The recommended next mechanics slice remains **gravity / weight-load completeness and authority**, not contact/friction.