# PR1439 — Load Calc effective canonical load-case authority

## Current recovery state

```text
REPOSITORY: reallaksh19/Advanced_Analysis
ISSUE: #1321
PR: #1439
BRANCH: agent/issue-1321-effective-load-case-authority
BASE / MERGE BASE: 29c688db4a021db900d1f8c67f56f777f73f4ddc
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
CURRENT_STAGE: IMPLEMENTATION_COMPLETE_EXECUTION_SKIPPED_NOT_RUN
HANDOVER_READINESS: READY
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
WORKFLOW_POLICY: OWNER_SKIP_WORKFLOW_GATING_FOR_CONTINUATION
```

## Handover in 60 seconds

#1439 closes one #1321 authority/provenance inconsistency. The Product-default provider already fills an empty `loadCalculation.activeLoadCases` slot with `PD-ACTIVE-CASES = [EMPTY,OPE,HYD]`; common-input runtime already evaluates load cases from that effective profile. The load-case authority object still called Project Data the sole authority and lost the Product default ID/profile/hash/basis.

This PR makes the authority object describe the **effective** authority while preserving every existing case-selection gate.

## Production trace

```text
raw Project Data profile
-> createNonFeaProductDefaultProvider()
-> effectiveProfile
-> higher-authority project value OR PD-ACTIVE-CASES Product default
-> createNonFeaLoadCaseAuthority(effectiveProfile)
-> approved canonical cases + effective authority provenance
-> requested-case subset enforcement
-> empirical primitive-case subset enforcement
```

No execution method, scenario authorization, statics, solver, or tolerance changes.

## Implemented behavior

`src/workspace/project-data/non-fea-load-case-authority.js`

Adds additive fields to `non-fea-load-case-authority/v1`:

```text
effectiveAuthority
provenance.authority
provenance.source
provenance.basis
provenance.defaultId
provenance.defaultSemanticHash
provenance.profileId
provenance.profileVersion
provenance.productDefaultProfileSemanticHash
```

Normal approved project evidence without an explicit authority token is exposed as `PROJECT_DATA_APPROVED` for backward-compatible provenance.

When evidence claims `PRODUCT_DEFAULT`, the authority fails closed unless basis, default ID/hash, profile ID/version, and Product-default profile hash are present.

Existing public fields remain:

```text
state
approvedLoadCases
evidenceSource
blockers
semanticHash
```

Existing compatibility error code `LOAD_CASE_NOT_PROJECT_DATA_APPROVED` is intentionally retained even though its message now refers to approved effective authority.

## Fail-closed rules retained

- raw missing `activeLoadCases` -> BLOCKED;
- raw empty/unapproved evidence slot -> BLOCKED;
- empty approved case array -> BLOCKED;
- unknown canonical case such as `STARTUP` -> BLOCKED;
- requested case outside effective approved set -> rejected;
- empirical case configuration with unauthorized weight primitive -> rejected;
- Product default fills only an empty slot;
- explicit project value shadows Product default even when the explicit value is invalid;
- invalid explicit value is never silently repaired by Product default.

## Qualification definition

`scripts/non-fea-load-case-authority-check.mjs` now encodes:

1. deterministic project-approved authority;
2. canonical ordering `EMPTY,OPE,HYD`;
3. requested subset enforcement;
4. empirical primitive-case subset enforcement;
5. raw empty Project Data remains blocked;
6. the same raw profile after Product-default composition becomes READY;
7. exact Product-default provenance for `PD-ACTIVE-CASES`;
8. explicit project OPE-only authority shadows Product default;
9. invalid explicit `STARTUP` remains blocked and is not replaced;
10. malformed/forged partial Product-default evidence blocks;
11. unapproved/missing/unknown historical negative controls remain.

The check was already present in `scripts/run-non-fea-checks.mjs`; no aggregate edit is required.

## Independent falsifier

```text
raw createEmptyProjectDataProfile()
-> createNonFeaLoadCaseAuthority(raw)
-> BLOCKED

same raw profile
-> createNonFeaProductDefaultProvider(raw).effectiveProfile
-> createNonFeaLoadCaseAuthority(effective)
-> READY
-> [EMPTY,OPE,HYD]
-> PRODUCT_DEFAULT
-> PD-ACTIVE-CASES
```

Explicit project `['EMPTY','STARTUP']` must stay BLOCKED after Product-default provider composition. Any fallback to the built-in set would falsify authority precedence.

## Changed-file ledger

Exactly five paths:

1. `src/workspace/project-data/non-fea-load-case-authority.js`
2. `scripts/non-fea-load-case-authority-check.mjs`
3. `agents/PR1439_workreport.md`
4. `agents/claims/PR1439.yaml`
5. `agents/status/PR1439.yaml`

No `.github/workflows/**`, scenario store, support-load mechanics, #1431 production path, solver, tolerance, or Method Basis UI file is changed.

## Grounding / coordination

Current main and merge base:

`29c688db4a021db900d1f8c67f56f777f73f4ddc`

The latest main commit is LAFEA.4 TECH-13H and is path/authority-disjoint.

Open-PR search found no active PR owning `non-fea-load-case-authority.js`. #1431 remains a separate draft component-contained-fluid slice and has no exact production-file overlap.

Current compare after implementation:

```text
status = ahead
ahead_by = 15
behind_by = 0
changed paths = 5
```

## Validation ledger

| Gate | Status | Observation |
|---|---|---|
| live grounding | PASS | SOURCE_INSPECTION |
| overlap | PASS_NONE | SOURCE_INSPECTION |
| effective-profile trace | PASS | SOURCE_INSPECTION |
| Product default `PD-ACTIVE-CASES` exists | PASS | SOURCE_INSPECTION |
| common runtime passes effective profile to authority | PASS | SOURCE_INSPECTION |
| 5-file diff ledger | PASS | GitHub compare |
| raw-profile fail-closed behavior retained in code | PASS | SOURCE_INSPECTION |
| malformed Product evidence fail-closed | PASS | SOURCE_INSPECTION |
| independent falsifier definition | PASS | SOURCE_INSPECTION / ANALYTICAL |
| focused Node check | NOT_RUN | owner instructed workflow gating be skipped; faithful local checkout unavailable |
| canonical Non-FEA aggregate | NOT_RUN | same |
| imports/build | NOT_RUN | same |

`NOT_RUN` is not represented as PASS.

## Appendix A

```text
A1 Production Trace             20/20
A2 Current Failure Isolation    20/20
A3 Authority / Invariant        20/20
A4 Independent Validation       18/20
A5 Next-Commit / Minimal Patch  20/20
TOTAL                            98/100
MINIMUM                          18/20
```

A4 loses points because executable validation is not observed. Source implementation authority is complete; merge authority is still Owner-only.

## Deferred presentation debt

`src/workspace/non-fea-method-basis-view.js` still uses wording such as “Project Data-approved load cases” and “Project Data owns the active load-case set.” That presentation mismatch is deliberately **not** folded into this core authority PR. The new provenance fields now provide a clean input for a bounded UI disclosure slice.

## Merge disposition

```text
PR STATE: DRAFT
MERGE AUTHORITY: OWNER_ONLY / NOT_GRANTED
WORKFLOW EXECUTION: SKIPPED AS CONTINUATION BLOCKER, STILL NOT_RUN
DISPOSITION: DO NOT MERGE
```

## Exact next action

No further core authority change is justified. Continue #1321 in a non-overlapping batch (Method Basis provenance disclosure or gravity-method AUTO selection). Merge #1439 only on explicit owner authorization.