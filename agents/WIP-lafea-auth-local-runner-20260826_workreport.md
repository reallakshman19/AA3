# WIP — LAFEA implementation-authorization local runner

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: NEW_PR_REQUIRED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_EVIDENCE_INFRASTRUCTURE_ONLY
EXECUTION_MODE: OWNER_DIRECTED
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371 successor after PR #1450
BRANCH: agent/lafea-authorization-local-runner-20260826
BASE_BRANCH: main
BASE_HEAD_AT_GROUNDING: b4d1137d0be67a4723ae08df90976f4218b6515e
CURRENT_STAGE: LOCAL_EXECUTION_ENTRYPOINT_PLANNED
ENGINEERING_FAILURE_PROVEN: false
EXACT_NEXT_ACTION: add one repository-native local/offline preflight entrypoint plus package command that invokes the merged exact-head authorization retain gate without changing engineering mechanics or authority.
```

## Handover in 60 seconds

PR #1450 merged the exact-head Q1-Q5 authorization receipt and independent Q1/Q3 evidence paths at `b4d1137d0be67a4723ae08df90976f4218b6515e`. Engineering execution remains `NOT_RUN`; the merge explicitly did not grant release/registry authority.

This successor addresses only execution portability. The intended command must run from an ordinary clean repository checkout with Node + Git and must fail before engineering execution if repository-root/head/clean-checkout prerequisites are not satisfied. It may not use GitHub Actions, browser automation, alternate solver paths, changed tolerances, or hidden fallback data.

## Planned scope

Technical:

```text
scripts/lafea-implementation-authorization-local-preflight.mjs
package.json                         # one additive npm script only
```

Recovery files will replace this WIP record after PR allocation.

Protected:

```text
src/core/local-continuum/**
src/core/local-shell/**
src/core/lafea-meshing/**
src/workspace/lafea-shell-solver-model.js
validation/** expected values/probes/tolerances
registry/release authority
.github/workflows/**
```

## Runtime contract

The preflight should prove, before invoking engineering execution:

```text
running from repository root
package identity == advanced-analysis
Git HEAD is a full 40-character SHA
checkout is clean
required merged authorization scripts exist
required Node runtime primitives exist
Git executable is callable
```

Then it delegates to:

```text
node scripts/lafea-implementation-authorization-gate-retain.mjs
```

The retained Q1-Q5 envelope remains the engineering evidence. The preflight is not an oracle and cannot create PASS/release authority.

## Coordination

- PR #1432 may change LAFEA.3 retained mesh identity if merged; final numerical receipt must re-ground after such a merge.
- PR #1258 may change continuum solver authority; final numerical receipt must re-ground after such a merge.
- PR #1259 is B02D and does not own B02C fixed-probe authority.
- LAFEA.4 TECH-13 I/J drafts own separate promotion/replay/currentness authority.

Classification: `SAFE_EXACT_FILE / COORDINATION_REQUIRED_BEFORE_FINAL_EXECUTED_RECEIPT`.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub readback | repository state |
| PR #1450 merge/current main | PASS | GitHub exact SHA | repository state |
| successor overlap review | PASS | open-PR source inspection | coordination policy |
| local runner implementation | NOT_RUN | not yet authored | source/runtime contract |
| Q1-Q5 engineering execution | NOT_RUN | no executable checkout in agent container | merged authorization gate |

No `NOT_RUN` is represented as PASS.

## Appendix A

Prior implementation qualification remains applicable to evidence-only continuation:

```text
A1 Production Trace             20/20
A2 Current Failure Isolation    20/20
A3 Authority / Invariant        20/20
A4 Independent Validation       20/20
A5 Next-Commit / Minimal Patch  19/20
TOTAL                            99/100
MINIMUM                          19/20
```

This does not authorize mechanics mutation or claim numerical PASS.
