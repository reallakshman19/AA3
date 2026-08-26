# WIP-EMP1-RCM-20260826 — deterministic exact-candidate provenance manifest

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_PR_ALLOCATION
PR_RECOVERY_STATE: HEALTHY_NEW_WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_PROVENANCE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1441
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
WIP: WIP-EMP1-RCM-20260826
ISSUE: #1441
UMBRELLA: #1389
BRANCH: agent/issue-1441-release-candidate-manifest-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
GROUNDING_EPOCH: GE-WIP-RCM-001
CURRENT_STAGE: PR_ALLOCATION
CURRENT_BLOCKER: professional release prerequisites remain blocked; this WIP may implement provenance contracts only
HIGHEST_RISK: a manifest being mistaken for numerical/release qualification or becoming a second authority source
EXACT_NEXT_ACTION: allocate a draft PR; migrate WIP records to PR-numbered records; then extend the existing candidate receipt with a first-class deterministic manifest and independent checker.
```

## Mission

Close #1441 by extending the existing PR1404 release-candidate harness, not by creating a second release engine. The retained runtime receipt shall carry one first-class `emp1-release-candidate/v1` manifest binding exact Git identity, product/profile, controlled source hashes, dataset/qualification/oracle identities, execution evidence hashes, deterministic build artifact hash and bounded authority.

A real `--release` run must require a retained receipt path. Current missing P0/CAUx/01–12/build/browser/deployment evidence remains blocked/NOT_RUN; this WIP cannot manufacture it.

## Pre-patch defect

Current `scripts/emp1-professional-release-candidate.mjs` retains exact HEAD/tree/parent, execution hashes and build artifact SHA-256, but has no first-class candidate manifest schema and allows a theoretically qualified `--release` run without requiring `--write-receipt`.

## Intended technical scope

1. `scripts/emp1-professional-release-candidate.mjs`
2. `scripts/emp1-professional-release-manifest-check.mjs` (new)
3. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Final PR recovery scope after allocation:

4. `agents/PR<NUMBER>_workreport.md`
5. `agents/status/PR<NUMBER>.yaml`
6. `agents/claims/PR<NUMBER>.yaml`

## Protected exclusions

- `src/core/emp1/**`
- frozen release profile/readiness JSON
- P0 aggregate and individual source records
- WRC/CAUx source and benchmark values
- gamma5 oracle/tolerances/evidence 01–12
- UI/browser production code
- `.github/workflows/**`

## Required manifest identity

```text
schema              emp1-release-candidate/v1
git                 exact head/tree/parents
product             EMP.1 + releaseProfileId
source              WRC SHA-256 + CAUx SHA-256
method              dataset + route qualification + independent oracle
evidence            exact gate stdout hashes + build artifact + deployment gate when present
authority           bounded engineering only; global/code false; qualification mirrors actual receipt
semanticHash         canonical deterministic SHA-256
```

No timestamps/random IDs participate in semantic authority.

## Validation plan

- exact changed-file ledger;
- independent manifest hash recomputation;
- exact source/profile/authorization cross-checks;
- evidence hashes must match receipt execution rows;
- `--require-qualified` checker fails closed on blocked receipt;
- `--release` without retained receipt path is rejected;
- production numerical comparison: NOT_APPLICABLE;
- hosted execution may remain NOT_RUN under #54.

## Appendix A

A1 Production Trace — 20/20. PR1404 candidate executor → readiness/P0/CAUx/runEmp1/currentness/build/Chromium → build hash → deployment receipt is traced.

A2 Failure Isolation — 20/20. The gap is provenance retention/field binding, not WRC numerical mechanics.

A3 Authority / Invariant — 20/20. Manifest records authority; it cannot create source/code/global/release/deployment authority.

A4 Independent Validation — 19/20. Static identities and canonical hashing can be independently checked; genuine release execution remains unavailable.

A5 Minimal Patch — 20/20. Existing candidate script + one independent checker + one existing document; no core engineering mutation.

**99/100; minimum 19/20 — WRITE_ALLOWED within release-provenance scope only.**