# Repository Agent Instructions

This file applies to **all contributors and agents** working in this repository: ChatGPT, Codex, Claude, Cursor, Copilot, Gemini, local agents, scripts acting as agents, and humans.

The repository—not a chat session—is the durable source of work state.

## Canonical cross-repository delivery protocol

For new engineering work, new legs, takeover, abrupt-agent recovery, multi-agent coordination, and AUTO MODE, use:

`reallaksh19/Common/skills/engineering-pr-delivery-v2/`

Adoption basis for this repository pilot:

`Common@d9f19ea4d5ab988ef2f2ab6500fba906e8a7184f`

Always re-ground live Common before relying on mutable cross-repository policy.

Repo-wide relay traffic is indexed in:

`agents/agentchain.md`

The previous Common protocol:

`reallaksh19/Common/skills/engineering-pr-delivery/`

is retained as **LEGACY / ROLLBACK-ONLY** for new work. Existing `agents/PR*_workreport.md`, `agents/status/**`, `agents/claims/**`, and embedded Appendix A records remain valid historical/recovery evidence and must not be mass-rewritten or deleted. Existing open v1-era PRs may retain their current artifacts; any new takeover/new leg after this adoption must create or join the applicable v2 chain endpoint and preserve prior evidence by reference.

Repository-local engineering rules below are stricter where applicable. No relay/governance change may silently weaken engineering evidence, validation integrity, authority boundaries, source custody, or fail-closed behavior.

## 1. Repository criticality

Treat work affecting FEA, structural/piping mechanics, solvers, stiffness/load assembly, numerical recovery, transformations, reactions, code stress, engineering master data, geometry/topology, material/section properties, benchmark expected values, source-qualified engineering methods, or engineering result publication as:

```text
CRITICALITY = ENGINEERING_CRITICAL
```

unless a stronger classification is required.

## 2. Durable relay identity

For v2 work the durable identity is:

```text
REPOSITORY
  -> CHAIN_ID
  -> LEG_ID
  -> ENDPOINT_ID
  -> PR / branch / commits
```

A PR is a delivery container, not the durable engineering mission identity.

Use:

```text
agents/agentchain.md
agents/agentchain/<CHAIN_ID>/<ENDPOINT_ID>.md
```

`agents/agentchain.md` is the compact repo-wide traffic/index log. Detailed endpoint files are immutable after durable creation; correct or supersede prior state by appending a later endpoint rather than rewriting history.

## 3. Continuous crash-recovery invariant

Assume the active agent may disappear after any meaningful action. A competent replacement must be able to recover the mission, current truth, evidence, partial work, risks, authority boundaries, validation state, governing inputs, and exact next action from repository + PR artifacts without chat history and without the outgoing agent.

No essential technical state may exist only in private reasoning or conversation history.

If an agent disappears, do **not** require `AGENT_A_RELEASES_BATON`. Recover from the latest durable endpoint and live repository state. If later commits exist, inspect and classify them before continuing.

## 4. Mandatory endpoint custody

Every non-terminal v2 endpoint must include:

- mission/current/completed/remaining work;
- exactly one executable next action;
- known/proven and not-proven state;
- explicit `NOT_RUN` / `NOT_APPLICABLE` state;
- current hypothesis and falsifier;
- protected invariants, do-not-redo and do-not-change boundaries;
- expected next-leg files/domains;
- changed-this-leg summary and validation state;
- exactly five next-agent qualification questions;
- the source/input inventories below.

Always list:

```text
INPUTS
BENCHMARKS
COMMON / GOVERNING DOCUMENTS
AUTHORITATIVE SOURCES
PRODUCTION PATHS
VALIDATION / TEST PATHS
```

Where practical pin repository/path/commit/blob/hash plus the relevant standard/source locator. If a category is empty, record `NONE — <reason>` rather than omitting it.

## 5. Five-question takeover gate

Every non-terminal endpoint contains exactly:

```text
Q1 Production Trace
Q2 Current Unresolved Problem / Failure Isolation
Q3 Authority / Invariant
Q4 Independent Validation
Q5 Next Contribution / Minimal Patch
```

Questions test the **next unresolved work**, not generic theory and not retrospective praise of completed work. A challenge is invalid if it can be answered correctly without opening current repository/PR/evidence.

Prefer `trace`, `reproduce`, `calculate`, `isolate`, `predict`, `falsify`, `compare`, `prove`, `reconcile`, and `identify the first wrong value` over generic `define`/`describe` prompts.

## 6. Engineering-critical takeover starts READ_ONLY

Incoming takeover begins:

```text
TAKEOVER_AUTHORITY = READ_ONLY
```

Before engineering-critical mutation the candidate must:

1. read `agents/agentchain.md` and the latest endpoint;
2. read endpoint-listed inputs, benchmarks, Common/governing docs, authoritative sources, production paths, and validation paths;
3. re-ground live main/PR/head/diff/reviews/checks;
4. reconcile durable state with live state;
5. inspect material commits after the endpoint;
6. answer Q1-Q5;
7. obtain a separate verifier verdict;
8. acquire write authority only after a valid verdict.

Candidate and verifier artifacts are separate. The candidate cannot self-award write authority.

Default engineering-critical threshold:

```text
total >= 92/100
minimum each >= 17/20
```

Fabricated repository evidence, unsafe engineering claims, incorrect authority assumptions, source-custody errors, or validation gaming may cause immediate failure regardless of numeric score.

## 7. Qualification freshness

Bind every current question set to:

```text
QUALIFICATION_BASIS_HEAD
QUESTION_SET_ID
QUESTION_SET_STATUS
```

Material changes to production, tests, benchmarks, oracles, engineering inputs, source authority, behavior-changing configuration, methodology, or publication authority make the prior qualification stale. Metadata-only relay synchronization does not itself change the material basis.

## 8. Numerical / FEA evidence expectations

Where relevant, qualification and debugging must distinguish:

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

## 9. Multi-agent coordination

Before mutation and before each new leg, inspect active chains and open PR/WIP work for:

- exact-file overlap;
- path-prefix overlap;
- engineering/software authority overlap;
- benchmark/oracle overlap;
- dependency/stacked-PR relationships;
- base/main drift.

Classify:

```text
SAFE
COORDINATION_REQUIRED
BLOCKED_BY_ACTIVE_CHAIN
UNKNOWN
```

No exact-file overlap proves neither numerical nor authority independence. Root governance is a shared authority surface and requires compatibility reasoning when engineering PRs are active.

## 10. Validation integrity

Every material check must distinguish:

```text
STATUS      = PASS | FAIL | NOT_RUN | NOT_APPLICABLE
OBSERVATION = execution | source inspection | artifact inspection | inference
ORACLE      = implementation-coupled | independent reproduction |
              analytical | authoritative reference | cross-solver | experimental
```

Never weaken tolerances merely because a case fails, replace independent expected values with production output, change implementation and oracle together and call the result independent, delete difficult benchmarks to obtain green status, hard-code benchmark answers into production, silence fail-closed behavior, or claim `NOT_RUN` as `PASS`.

A syntactically valid qualification artifact is not proof. Material repository anchors must be live-checked; nonexistent paths/functions/SHAs are automatic failure.

## 11. Source / authority boundaries

Engineering source authority, benchmark/oracle authority, solver formulation, coordinate/sign/end conventions, publication authority, and release/code authority are protected domains. A governance change does not create authority in any of them.

For WRC/EMP.1/LAFEA/load-calculation work, preserve the exact source-custody and authority boundaries recorded by the owning engineering artifacts. Do not infer engineering authorization from relay/governance adoption.

## 12. Damaged PRs and incapable agents

Do not preserve a PR because of sunk effort.

If current intent cannot be reconstructed safely, authority is unclear, commits cannot be classified, expected values changed with implementation, or conflict resolution requires guessing engineering intent, quarantine and perform salvage assessment.

Valid recovery outcomes:

```text
CONTINUE
SALVAGE_PARTIAL
SUPERSEDE
ABANDON
```

Preserve known-good commits, benchmarks, independent evidence, decisions, invariants and provenance even when implementation is superseded.

## 13. Legacy v1 evidence and migration

Existing workreports/status/claims are not deleted by v2 adoption. They remain authoritative for the historical facts they actually establish and may be referenced from a v2 endpoint.

For an existing v1-era PR:

- do not rewrite the old workreport merely to look v2-native;
- on the next takeover/new leg, create or join a `CHAIN_ID` in `agents/agentchain.md`;
- list the old workreport/status/claim as inputs/provenance;
- regenerate Q1-Q5 for the **current unresolved work**;
- keep `NOT_RUN`, blockers, source authority and protected invariants intact.

Rollback, if v2 proves operationally defective, is a root-policy pointer change back to the preserved legacy Common skill; pilot/endpoint history is retained rather than erased.

## 14. Scope and merge discipline

- One coherent assignment per PR unless the owner explicitly changes scope.
- Keep changes surgical and explain every changed file.
- Do not silently broaden scope.
- Do not modify workflow files unless explicitly authorized.
- Keep the chain recoverable while waiting for review/merge.
- PR merge does not imply chain completion.
- **Never merge without explicit owner authorization.**

## 15. AUTO MODE

The exact owner keyword `AUTO MODE` sets autonomous phase progression within the approved mission. It does not authorize scope expansion, engineering-authority changes, validation weakening, destructive operations, or merge.

For each phase:

1. re-check live repo/active-chain overlap;
2. select the next bounded action;
3. preserve rationale, prediction, invariants and expected files;
4. implement one coherent unit;
5. validate accurately;
6. create/refresh the durable endpoint and Q1-Q5;
7. continue automatically unless a hard stop exists.

### Advanced_Analysis AUTO hard stops

Stop when continuing requires an unapproved change to solver formulation, stiffness/load assembly, recovery convention, coordinate/sign/end convention, governing code methodology, source authority, benchmark/oracle authority, engineering master-data authority, publication authority, or another protected engineering domain.

An independent analytical/reference/cross-solver contradiction may trigger bounded diagnosis, but do not alter multiple mechanics or weaken expected values/tolerances to force agreement.

If repeated diagnosis does not narrow the discrepancy, stop production mutation and create a recovery/qualification-required endpoint with one exact next action.

`AUTO MODE` never implies `AUTO MERGE`; merge remains owner-only unless separately authorized.

## 16. Completion semantics

Distinguish:

```text
AGENT_LEG_COMPLETE
PR_COMPLETE
CHAIN_COMPLETE
```

A terminal chain endpoint records:

```text
STATE: COMPLETE
NEXT_AGENT_QUALIFICATION: NOT_REQUIRED
QUESTION_SET_STATUS: NOT_REQUIRED
COMPLETION_BASIS:
```

Remove terminal chains from `ACTIVE CHAINS` but retain their endpoint-log history.
