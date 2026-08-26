# PR1444 Work Report — deterministic exact-candidate provenance manifest

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_PROVENANCE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1441
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1444
ISSUE: #1441
UMBRELLA: #1389
BRANCH: agent/issue-1441-release-candidate-manifest-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
PR_HEAD_AT_ALLOCATION: cefd72a65366378f80658c3d9707473a9e182880
GROUNDING_EPOCH: GE-PR1444-001
CURRENT_STAGE: WIP_TO_PR_RECOVERY_MIGRATION
CURRENT_BLOCKER: professional release prerequisites remain blocked; PR1444 may implement provenance contracts only
HIGHEST_RISK: candidate manifest mistaken for numerical/release qualification or becoming a parallel authority source
EXACT_NEXT_ACTION: finish WIP record migration; extend existing candidate receipt with deterministic manifest; add independent manifest checker; update release-evidence documentation.
```

## Mission

Close #1441 by extending the existing PR1404 release-candidate harness, not by creating a second release engine. The runtime candidate receipt shall contain a first-class `emp1-release-candidate/v1` manifest binding exact Git identity, EMP.1/profile, WRC+CAUx source hashes, dataset/route-qualification/oracle identities, execution evidence hashes, deterministic build artifact hash and bounded authority.

A real `--release` run must retain the receipt/manifest. Current missing P0/CAUx/01–12/build/browser/deployment evidence remains blocked/NOT_RUN; this PR cannot manufacture it.

## Pre-patch failure

Current `scripts/emp1-professional-release-candidate.mjs` already retains exact HEAD/tree/parent, execution hashes and build artifact SHA-256, but:

1. no first-class `emp1-release-candidate/v1` provenance object exists;
2. no independent manifest checker exists;
3. `--release` can theoretically qualify without `--write-receipt`, leaving no retained candidate manifest/receipt.

## Intended final changed-file ledger — exactly six

Technical:
1. `scripts/emp1-professional-release-candidate.mjs`
2. `scripts/emp1-professional-release-manifest-check.mjs`
3. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Recovery:
4. `agents/PR1444_workreport.md`
5. `agents/status/PR1444.yaml`
6. `agents/claims/PR1444.yaml`

Temporary WIP recovery files must be deleted before final audit.

## Protected exclusions

- `src/core/emp1/**`
- frozen release profile/readiness JSON
- P0 aggregate and individual source records
- WRC/CAUx source and benchmark values
- gamma5 oracle/tolerances/evidence 01–12
- UI/browser production code
- `.github/workflows/**`

## Required manifest contract

```text
schema              emp1-release-candidate/v1
git                 exact head/tree/parents
product             EMP.1 + releaseProfileId
source              WRC SHA-256 + CAUx SHA-256
method              identity + dataset + route qualification + independent oracle
evidence            gate statuses/stdout hashes + deterministic build artifact + deployment gate when present
authority           bounded engineering true; global/code false; candidate qualification mirrors receipt
semanticHash         canonical deterministic SHA-256
```

No timestamp/random UUID participates in semantic authority.

## Authority invariant

`RELEASE_CANDIDATE_MANIFEST_RECORDS_AUTHORITY_AND_EVIDENCE_BUT_CANNOT_CREATE_THEM`

The manifest cannot set source semantics PASS, create 01–12 evidence, turn NOT_RUN into PASS, authorize code compliance/global EMP.1.C, or grant deployment/release authority.

## Validation plan

- exact six-file net diff;
- canonical manifest hash reproduction;
- identity cross-check against release profile, WRC/CAUx ledgers and owner-override authorization record;
- manifest evidence rows must correspond exactly to receipt execution rows;
- qualified release impossible without release mode, retained receipt, all gates and deployment evidence;
- independent checker `--require-qualified` fails closed for blocked receipt;
- production numerical comparison: NOT_APPLICABLE;
- hosted execution may remain NOT_RUN under #54.

## Appendix A

A1 Production Trace — **20/20**. PR1404 candidate executor → readiness/P0/CAUx/runEmp1/currentness/build/Chromium → build hash → deployment receipt is traced.

A2 Failure Isolation — **20/20**. Gap is provenance retention/field binding, not WRC numerical mechanics.

A3 Authority / Invariant — **20/20**. Manifest records authority; it cannot create source/code/global/release/deployment authority.

A4 Independent Validation — **19/20**. Static identities and canonical hashing are independently verifiable; genuine release execution remains unavailable.

A5 Minimal Patch — **20/20**. Existing candidate script + one checker + one existing document; no core engineering mutation.

**Total: 99/100; minimum 19/20 — WRITE_ALLOWED within release-provenance scope only.**