# Repository Agent Instructions

This file applies to **all contributors and agents** working in this repository: ChatGPT, Codex, Claude, Cursor, Copilot, Gemini, local agents, scripts acting as agents, and humans.

The repository—not a chat session—is the durable source of work state.

Canonical cross-repository delivery protocol:

`reallaksh19/Common/skills/engineering-pr-delivery/`

Repository-local rules may be stricter. Explicit current owner instructions override generic defaults, but no agent may silently weaken engineering evidence, validation integrity, authority boundaries, or handover requirements.

## 1. Repository criticality

Treat work affecting FEA, structural/piping mechanics, solvers, stiffness/load assembly, numerical recovery, transformations, reactions, code stress, engineering master data, geometry/topology, material/section properties, benchmark expected values, or engineering result publication as:

```text
CRITICALITY = ENGINEERING_CRITICAL
```

unless a stronger classification is required.

## 2. Continuous handover invariant

Assume the active agent may disappear, lose context, become incapable, or be replaced after any meaningful action.

At every durable checkpoint, another qualified agent must be able to recover the mission, current truth, evidence, partial work, risks, authority boundaries, validation state, and exact next action from repository + PR artifacts without chat history.

No essential technical state may exist only in private reasoning or conversation history.

## 3. Establish live ground truth before mutation

Before changing production or engineering-sensitive files, determine from live Git/GitHub where available:

- repository/default/base branch and current base SHA;
- WIP/branch/PR identity;
- current PR head and merge base;
- actual changed files and commits;
- current checks/workflows and review state;
- source issue/task;
- predecessor/follow-on PRs;
- other active PR/WIP work that may overlap;
- base/main drift.

Live mutable repository state overrides stale reports and prior conversation.

## 4. Durable WIP/PR recovery artifacts

Before a PR exists use a unique identity:

```text
WIP-<short-id>
agents/WIP-<short-id>_workreport.md
```

Do not use one shared `PR_PENDING_workreport.md`.

After PR allocation use:

```text
agents/PR<NUMBER>_workreport.md
```

If repository status/claim registries exist, keep the matching `agents/status/` and `agents/claims/` records current.

The work report must continuously preserve current mission/scope, implementation state, active `ISS-*`/`RISK-*`/`DEC-*`/`QST-*`, current hypothesis and falsifier, authority/invariants, validation PASS/FAIL/NOT_RUN, changed-file ledger, review state, highest risk, exact work location, and one executable `EXACT_NEXT_ACTION`.

## 5. Engineering-critical takeover starts READ_ONLY

An incoming agent taking over an engineering-critical PR begins with:

```text
TAKEOVER_AUTHORITY = READ_ONLY
```

Before production mutation it must independently:

1. re-ground against live GitHub/main;
2. reconcile the existing work report against the actual PR head/diff;
3. reproduce or inspect the critical evidence;
4. identify inherited, stale, contradicted, and newly observed facts;
5. complete Appendix A qualification against the current unresolved work;
6. decide whether to `CONTINUE`, `QUARANTINE`, `SALVAGE_PARTIAL`, or `SUPERSEDE`.

Do not grant implementation authority because an agent claims expertise.

## 6. Appendix A — Implementation Takeover Qualification

Appendix A is an implementation authorization gate, not a theory quiz.

Normally require five repository-specific challenges:

```text
A1 Production Trace
A2 Current Failure Isolation
A3 Authority / Invariant
A4 Independent Validation
A5 Next-Commit / Minimal Patch
```

A question is invalid if it can be answered correctly without opening the current repository, PR diff, tests, benchmark evidence, or work report.

Prefer `trace`, `reproduce`, `calculate`, `isolate`, `predict`, `falsify`, `compare`, `prove`, `reconcile`, and `identify the first wrong value` over generic `define`/`describe`/`explain` prompts.

For engineering-critical takeover, default qualification:

```text
total >= 92/100
minimum per challenge >= 17/20
```

Fabricated repository evidence, unsafe engineering claims, incorrect authority assumptions, or validation gaming may cause immediate failure regardless of score.

## 7. Numerical/FEA evidence expectations

Where relevant, qualification and debugging must be able to distinguish:

```text
stiffness/load assembly
vs solver equilibrium
vs element recovery
vs local/global transformation
vs moment transport
vs end-I/end-J convention
vs result/report mapping
```

For element-end discrepancies, require as applicable:

- six-DOF residual/equilibrium checks;
- free-body cuts;
- `q = K u - f_fixed - f_initial`;
- local/global axis verification;
- unit, DOF and end-order verification;
- transformation/moment-transport trace;
- trace from a failed reported row to the raw solver quantity;
- independent analytical/reference/cross-solver evidence.

Do not modify several mechanics at once when a single-factor isolation test is possible.

## 8. Multi-agent coordination

Before implementation and before each new stage, inspect other active PRs/WIPs for:

- exact-file overlap;
- path-prefix overlap;
- engineering/software authority overlap;
- benchmark/oracle overlap;
- dependency/stacked-PR relationships;
- base drift.

Classify:

```text
SAFE
COORDINATION_REQUIRED
BLOCKED_BY_ACTIVE_CLAIM
UNKNOWN
```

No exact-file overlap does not prove numerical/authority independence.

## 9. Validation integrity

Every material check must distinguish:

```text
STATUS      = PASS | FAIL | NOT_RUN | NOT_APPLICABLE
OBSERVATION = execution/inspection/inference basis
ORACLE      = implementation-coupled or independent authority class
```

Never weaken tolerances merely because a case fails, replace independent expected values with production output, change implementation and oracle together and call the result independent, delete difficult benchmarks to obtain green status, hard-code benchmark answers into production, silence fail-closed behavior, or claim `NOT_RUN` as `PASS`.

## 10. Damaged PRs and incapable agents

Do not preserve a PR because of sunk effort.

If current intent cannot be reconstructed safely, authority is unclear, commits cannot be classified, expected values changed with implementation, or conflict resolution requires guessing engineering intent, quarantine and perform a salvage assessment.

Valid outcomes:

```text
CONTINUE
SALVAGE_PARTIAL
SUPERSEDE
ABANDON
```

Preserve known-good commits, benchmarks, independent evidence, decisions, invariants and provenance even when the implementation PR is superseded.

## 11. Scope and merge discipline

- One coherent assignment per PR unless the owner explicitly changes scope.
- Keep changes surgical and explain every changed file.
- Do not silently broaden scope.
- Do not modify workflow files unless explicitly authorized.
- Keep the PR handover-ready while waiting for review/merge.
- **Never merge without explicit owner authorization.**

## 12. AUTO MODE — autonomous phase execution

The exact owner keyword `AUTO MODE` sets:

```text
EXECUTION_MODE = AUTO
AUTO_STATE = RUNNING
SCOPE_AUTHORITY = LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION = AUTO
MERGE_AUTHORITY = OWNER_ONLY
```

AUTO MODE authorizes automatic phase progression through the approved plan. It does not authorize scope expansion, changing engineering authority/formulation, weakening validation, destructive operations, or merge.

For each phase the agent shall record the objective, expected files, engineering rationale, prediction, invariants, and validation; implement only that phase; validate; update the work report/status/claims/Appendix A as needed; create a durable checkpoint; evaluate hard stops; then continue automatically when none applies.

Routine phase completion is not a reason to ask `Would you like me to continue?`.

### Advanced_Analysis AUTO hard stops

In addition to the universal hard stops, AUTO must stop when continuing requires an unapproved change to solver formulation, stiffness/load assembly, recovery convention, coordinate/sign/end convention, governing code methodology, benchmark authority, engineering master-data authority, or publication authority.

An independent analytical/reference/cross-solver contradiction may trigger bounded automatic diagnosis, but the agent must not alter multiple mechanics or weaken expected values/tolerances to force agreement.

If repeated diagnosis does not narrow the discrepancy, or the agent can no longer state a concrete hypothesis, falsifier, next isolating experiment, and protected invariants, stop production mutation and set:

```text
PR_RECOVERY_STATE = TAKEOVER_REQUIRED
TAKEOVER_AUTHORITY = READ_ONLY
AUTO_STATE = TAKEOVER_REQUIRED
```

Refresh the work report and Appendix A for the next qualified agent.

`AUTO MODE` never implies `AUTO MERGE`; merge remains owner-only unless separately and explicitly authorized.
