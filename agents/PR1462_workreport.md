# PR1462 — LAFEA local exact-head authorization runner

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_EVIDENCE_INFRASTRUCTURE_ONLY
EXECUTION_MODE: OWNER_DIRECTED
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371 successor after merged PR #1450
PR: #1462
BRANCH: agent/lafea-authorization-local-runner-20260826
BASE_BRANCH: main
BASE_HEAD_AT_LAST_GROUNDING: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
CURRENT_STAGE: CURRENT_MAIN_SYNCHRONIZED_LOCAL_ENTRYPOINT_PARSER_PREFLIGHT_PLUS_POST_ENGINEERING_CUSTODY_PENDING_REAL_Q1_Q5_EXECUTION
ENGINEERING_FAILURE_PROVEN: false
EXACT_NEXT_ACTION: from an exact clean checkout of the current PR head run `node scripts/lafea-implementation-authorization-local-preflight.mjs`; preserve the first delegated child failure if non-zero; retain `reports/qualification/lafea-implementation-authorization-gate.json` only if the gate reaches PASS.
```

## Handover in 60 seconds

PR #1450 merged the Q1-Q5 implementation-authorization evidence stack at `b4d1137d0be67a4723ae08df90976f4218b6515e`. Numerical execution remained `NOT_RUN`; no release or registry authority was created.

PR #1462 remains evidence/custody infrastructure only. It owns exactly seven paths:

```text
scripts/lafea-implementation-authorization-local-preflight.mjs
scripts/lafea-implementation-authorization-local-preflight-self-test.mjs
scripts/lafea-implementation-authorization-gate-retain.mjs
.gitignore
agents/PR1462_workreport.md
agents/status/PR1462.yaml
agents/claims/PR1462.yaml
```

No solver formulation, shell pressure mechanics, mesh algorithm, benchmark/oracle/tolerance, source topology, release/registry, package command surface, UI/build, or workflow authority is changed.

## Current-main synchronization

While open, this PR was synchronized non-destructively onto:

```text
main@dd7f13e2c73e596c7ac6625fbe211779bc61ce94
synchronization commit = 4056369cde466d01dc9d6b38c9821cd56192d1ad
```

The intervening six main commits had no exact-file overlap with this PR, but changed downstream LAFEA workbench/controller integration. Therefore they are `SAFE_EXACT_FILE` but require re-execution of the live authorization route before any engineering authorization claim.

## Local preflight contract

Before delegation the runner requires:

```text
cwd == repository root
package.name == advanced-analysis
package.type == module
required Node primitives exist
all authorization scripts exist as files
Git top-level == repository root
HEAD is a full 40-character SHA
checkout is clean including untracked files
all four authorization .mjs entrypoints parse under current process.execPath --check
```

The order matters: Git root/HEAD/cleanliness is proven before the parser checks, so the parser is validating clean exact-head files rather than a dirty local edit.

The parser-checked files are:

```text
scripts/lafea-implementation-authorization-gate-check.mjs
scripts/lafea3-direct-loaded-element-authorization-check.mjs
scripts/lafea4-independent-pressure-resultant-authorization-check.mjs
scripts/lafea-implementation-authorization-gate-retain.mjs
```

A parser/runtime-syntax failure is therefore pre-delegation infrastructure/runtime incompatibility, not an engineering result:

```text
classification = NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED
delegatedEngineeringGateEntered = false
q1ToQ5Disposition = NOT_RUN
```

A delegated non-zero remains:

```text
classification = DELEGATED_ENGINEERING_GATE_NONZERO_STOP_AT_FIRST_CHILD_FAILURE
delegatedEngineeringGateEntered = true
q1ToQ5Disposition = UNKNOWN_OR_PARTIAL_SEE_FIRST_CHILD_FAILURE
```

The child output and exit status remain authoritative.

## Parser-classification negative control

A new synthetic negative control in the repository self-test creates a clean temporary Git repository whose main authorization checker is intentionally malformed. Expected result:

```text
malformed checker
→ current Node --check fails
→ delegated gate is not entered
→ q1ToQ5Disposition = NOT_RUN
```

Independent local reproduction of this exact boundary was executed after the parser-preflight edit using the same process/ordering semantics:

```text
parserFailureExit = 1
parserFailurePreDelegationNotRun = true
delegatedFailureExit = 7
delegatedFailureClassified = true
```

This is software/process validation only. It does not execute LAFEA mechanics and is not Q1-Q5 evidence.

The repository-owned self-test source now contains the malformed-checker negative control. That updated repository self-test itself has not been executed from the exact PR checkout because the checkout remains unavailable; do not upgrade that item to exact-head PASS.

## Wrapper self-test / failure-depth control

`scripts/lafea-implementation-authorization-local-preflight-self-test.mjs` uses temporary synthetic Git repositories to test wrapper process/exit semantics without executing LAFEA mechanics.

Previously executed behavior remains:

```text
environment failure → pre-delegation NOT_RUN
delegated exit 7 → exit 7 preserved / gate entry distinguished
successful delegated zero → wrapper zero
```

The current source additionally guards the v4 retention ordering below and now adds the malformed-parser case.

## Exact-head custody hardening — clean after engineering checks

The merged retention gate originally proved only:

```text
checkout clean BEFORE engineering execution
```

It then ran the main Q1-Q5 checker, Q1 direct-loaded-element addendum and Q3 independent pressure-resultant addendum and could write a PASS envelope without proving those scripts left repository state unchanged.

PR #1462 adds a second fail-closed Git status assertion after engineering checks and all cross-bindings but before envelope construction and receipt writing:

```text
engineering checks complete
→ git status --porcelain=v1 --untracked-files=all
→ must be empty
→ construct v4 envelope
→ write ignored exact receipt
```

The envelope is now:

```text
schema = lafea-implementation-authorization-exact-head-envelope/v4
checkoutCleanBeforeExecution = true
checkoutCleanAfterEngineeringChecks = true
```

The evidence hash input is correspondingly `...hash-input/v4`.

The self-test source guards this order:

```text
Q3 independent checker run
< post-engineering clean-status check
< envelope construction
< receipt write
```

A checker that mutates visible Git state can no longer leave behind a sealed v4 PASS receipt.

## Repeat-run receipt custody

The default generated receipt is narrowly ignored:

```text
/reports/qualification/lafea-implementation-authorization-gate.json
```

Only that path is ignored. The `reports/` directory and unrelated evidence remain visible to Git custody.

## Exact checkout retry

The latest exact-branch clone retry again failed before materialization:

```text
fatal: unable to access 'https://github.com/reallaksh19/Advanced_Analysis.git/':
Could not resolve host: github.com
```

The agent runtime itself has usable local executables:

```text
node v22.16.0
git 2.47.3
```

but there is no exact checkout, so this remains an infrastructure/DNS failure, not an engineering failure.

Disposition:

```text
exact repository execution = NOT_RUN
Q1-Q5 engineering execution = NOT_RUN
engineering assertion failure proven = false
```

Do not reconstruct a partial repository and call it exact-head evidence.

## ISS / RISK / DEC

- `ISS-1462-01` ACTIVE — real exact-head Q1-Q5 receipt has not executed.
- `ISS-1462-02` RESOLVED_BY_IMPLEMENTATION_PENDING_REAL_RUN — default receipt no longer dirties repeat runs.
- `ISS-1462-03` RESOLVED_BY_SYNCHRONIZATION_PENDING_REAL_RUN — branch synchronized to `dd7f13e2...`.
- `ISS-1462-04` RESOLVED_BY_IMPLEMENTATION_PENDING_REAL_RUN — retention proves checkout cleanliness after engineering checks before sealing receipt.
- `ISS-1462-05` RESOLVED_BY_IMPLEMENTATION_PENDING_EXACT_HEAD_RUN — Node parser incompatibility is now rejected before engineering delegation.
- `RISK-1462-01` CONTROLLED — environment and delegated-gate failures are separately classified.
- `RISK-1462-02` CONTROLLED_PENDING_EXECUTION — downstream workbench drift requires re-execution.
- `RISK-1462-03` CONTROLLED — child scripts cannot mutate visible Git state and still obtain a sealed v4 PASS envelope.
- `RISK-1462-04` CONTROLLED — malformed/incompatible authorization script cannot be mislabeled as delegated engineering-gate execution.
- `DEC-1462-01` — no package alias; direct Node entrypoint remains sufficient.
- `DEC-1462-02` — wrapper/retention infrastructure cannot create release authority.
- `DEC-1462-03` — ignore only the exact generated receipt path.
- `DEC-1462-04` — delegated entry does not imply full Q1-Q5 execution.
- `DEC-1462-05` — synthetic tests qualify control flow only, not mechanics.
- `DEC-1462-06` — receipt sealing requires clean Git state both before and after engineering checks.
- `DEC-1462-07` — parser compatibility is part of pre-delegation runtime custody and uses the same `process.execPath` that will execute the gate.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | `main@dd7f13e2...` GitHub readback | repository state |
| current-main branch synchronization | PASS | current-main tree retained with PR changes | Git tree/parents |
| parser-preflight source contract | PASS | clean-head proof precedes four `node --check` calls | source/order contract |
| malformed-parser local negative control | PASS | exit 1, pre-delegation NOT_RUN | independent synthetic process behavior |
| delegated-exit local control | PASS | exit 7 propagated/classified delegated | independent synthetic process behavior |
| exact generated receipt ignore rule | PASS_SOURCE_INSPECTION | one exact path only | Git custody invariant |
| post-engineering clean-checkout gate | PASS_SOURCE_INSPECTION | second Git status assertion before envelope/write | source/order contract |
| v4 envelope fields/hash schema | PASS_SOURCE_INSPECTION | before+after cleanliness facts retained | evidence custody contract |
| repository-owned latest self-test | NOT_RUN_AFTER_LATEST_EDIT | source includes parser + v4 guards; exact checkout unavailable | Node/self-test |
| exact checkout retry | NOT_RUN | DNS failure before clone materialization | infrastructure |
| exact synchronized repository execution | NOT_RUN | no exact checkout | execution environment |
| Q1-Q5 engineering execution | NOT_RUN | real delegated gate not executed | implementation-authorization evidence |

No `NOT_RUN` is represented as PASS.

## Changed-file ledger

```text
.gitignore
agents/PR1462_workreport.md
agents/claims/PR1462.yaml
agents/status/PR1462.yaml
scripts/lafea-implementation-authorization-gate-retain.mjs
scripts/lafea-implementation-authorization-local-preflight-self-test.mjs
scripts/lafea-implementation-authorization-local-preflight.mjs
```

## Appendix A — takeover qualification

```text
A1 Production Trace             20/20
A2 Current Failure Isolation    20/20
A3 Authority / Invariant        20/20
A4 Independent Validation       20/20
A5 Next-Commit / Minimal Patch  19/20
TOTAL                            99/100
MINIMUM                          19/20
```

This qualifies evidence-infrastructure continuation only. It does not authorize mechanics mutation, registry cleanup, release promotion, or claim Q1-Q5 numerical PASS.
