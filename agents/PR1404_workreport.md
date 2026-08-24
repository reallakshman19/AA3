# PR1404 — EMP.1 professional release evidence harness

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_EVIDENCE_ONLY
MERGE_AUTHORITY: OWNER_AUTHORIZED_FOR_PR1404
PR: #1404
ISSUE: #1389 PR-H
BRANCH: agent/issue-1389-pr-h-release-evidence-20260824
ORIGINAL_BASE: main@0f85cac384532b5cc35bc24ecedd729275027eb6
MAIN_HEAD_LAST_CHECKED: ff5a7353f3759d72ba27be37095c7f5e06b5f7e2
GROUNDING_EPOCH: GE-H-004
CURRENT_STAGE: IMPLEMENTED_AUDITED_OWNER_MERGE_AUTHORIZED_PENDING_DISJOINT_MAIN_REFRESH
HIGHEST_RISK: encoded release checks mistaken for executed professional-release evidence
EXACT_NEXT_ACTION: refresh the nine-file PR-H tree onto current main, re-audit exact head/reviews/CI, then squash-merge with expected_head_sha. After merge, proceed only to work that does not fabricate PR-D/E/F evidence.
```

## 1. Mission and implemented result

PR-H implements a fail-closed exact-candidate release evidence harness for the bounded WRC 537 gamma=5 route. It does not authorize WRC mechanics, production, global EMP.1.C, code compliance, release or deployment.

Implemented:

1. machine-readable bounded release-readiness contract;
2. dynamic readiness checker with `--require-release` exit 2 while prerequisites are absent;
3. exact candidate executor retaining HEAD/tree/parent, per-command exit/status and stdout/stderr hashes;
4. deterministic regular-file `dist/` content hash with symlink prohibition;
5. provider-neutral deployment receipt verifier bound to candidate HEAD/tree/artifact hash;
6. promotion-compatible real `runEmp1` orchestration release gate;
7. persisted/reloaded route-authority currentness replay/falsifier gate;
8. dedicated post-promotion Chromium release-candidate journey;
9. operator evidence/security/deployment documentation.

## 2. Critical release-gate correction found during final audit

The initial PR-H draft reused:

- `scripts/emp1-public-product-check.mjs`;
- `e2e/emp1-workbench-authority.spec.js`.

Both deliberately contain suspended-route assertions and are valid pre-promotion regressions, but would reject a correctly promoted PR-E route. That would make the release harness structurally incapable of passing after successful authorization.

PR-H now deliberately uses:

```text
node scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs
node scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs
node scripts/run-playwright.mjs e2e/emp1-professional-release.spec.js
```

The new browser release candidate requires real production C execution while retaining:

```text
CODE COMPLIANT = NO
RELEASED       = NO
GLOBAL EMP1.C  = false
```

This is an engineering candidate qualification, not a release-authority mutation.

## 3. Replay / import-export audit

Prior EMP.1 currentness work established that serialized/persisted C evidence reloaded under changed route authority becomes stale and non-reportable. PR-H explicitly carries that falsifier as the replay/currentness gate.

Repository consumer audit found no separate EMP.1.C numerical export/report consumer. Existing workbench export exports the active source document, not retained C numerical evidence. Therefore no additional numerical export patch is required. Any future numerical C export must consume the governed `reportableResult` projection rather than raw historical `execution.result.localCorrelation`.

## 4. Evidence and release rules

Release prerequisite inventory is exact files 01–12. Files 11 and 12 are not accepted by existence alone: PR-H verifies expected status, common authorization head, false global/code/release authority boundary, and canonical semantic hashes.

The readiness checker also reasserts the immutable bounded profile: cylindrical/round, Original gamma=5, beta 0.05–0.50 inclusive, zero dp, Kn=Kb=1, Au..Dl host-shell recovery, no interpolation/cross-variant fallback/off-axis authority, no continuous/global maximum, no nozzle/attachment-wall result and no code-compliance claim.

`--release` cannot pass until P0 semantics, direct CAUx page re-observation, genuine 01–10, bounded authorization, verified 11–12, exact candidate product/currentness/build/browser execution and deployment receipt all succeed.

## 5. Changed-file ledger — exactly nine

1. `validation/emp1/release/emp1-professional-release-readiness-v1.json`
2. `scripts/emp1-professional-release-readiness-check.mjs`
3. `scripts/emp1-professional-release-candidate.mjs`
4. `scripts/emp1-professional-deployment-receipt-check.mjs`
5. `e2e/emp1-professional-release.spec.js`
6. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`
7. `agents/PR1404_workreport.md`
8. `agents/status/PR1404.yaml`
9. `agents/claims/PR1404.yaml`

No `package.json`, workflow, WRC numerical evaluator, route/registry, oracle, qualification/tolerance or frozen release-profile file is changed.

## 6. Main drift / overlap

Live main advanced from `0f85cac...` to `ff5a735...` through Issue #1371 LAFEA merges. Compare from the PR-H base shows LAFEA/recovery paths only; none of PR-H's nine files is touched. This is `SAFE_DISJOINT_MAIN_DRIFT` and requires a mechanical tree refresh, not engineering reconciliation.

PR-D #1401 remains separate/open/draft and recovery-only. Its genuine #1333 files 01–10 remain NOT_GENERATED. PR-H does not satisfy or override that gate.

## 7. Validation ledger

| ID | Status | Observation |
|---|---|---|
| H-001 | PASS | source/diff audit: nine intended files only |
| H-002 | PASS | protected route/registry/Table-5/oracle/profile/workflow paths unchanged |
| H-003 | PASS_AFTER_FIX | suspended-only release gates replaced with promotion-compatible orchestration/browser gates |
| H-004 | PASS | replay/export consumer audit: persisted/reloaded currentness covered; no separate C numerical export bypass found |
| H-005 | PASS | 11/12 status/head/authority/semantic-hash verification encoded |
| H-006 | PASS | deployment receipt tied to exact candidate head/tree and deterministic build-artifact hash |
| H-007 | PASS | live-main drift is file-disjoint from PR-H |
| H-008 | PASS | reviews none; unresolved review threads none at final pre-refresh audit |
| H-009 | NOT_RUN | exact-head Node readiness/release execution |
| H-010 | NOT_RUN | production build |
| H-011 | NOT_RUN | release-candidate Chromium |
| H-012 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted execution remains subject to #54 pre-step infrastructure failure |

No encoded or source-inspected check is promoted into runtime PASS.

## 8. Authority state

Must remain false in this PR:

```text
production route authorization
registry engineering-use authorization
global EMP.1.C authority
code compliance
release qualification
deployment authority
```

PR-H tests future promoted authority; it does not create it.

## 9. Merge disposition

Owner explicitly instructed `merge,proceed next` on 2026-08-24 while PR #1404 was the active PR. This is merge authorization for #1404 only, subject to final exact-head/drift review. It does not authorize merge of PR #1401 or any later authority-bearing PR.

## 10. Appendix A — implementation takeover qualification

### A1 Production trace — 20/20
The release chain is explicit from source/P0/CAUx through 01–12, promoted runEmp1, currentness/replay, build/browser, exact artifact hash and deployment observation.

### A2 Failure isolation — 20/20
Current blockers remain P0, CAUx direct page observation, PR-D/E/F and #54. The harness cannot convert those into PASS.

### A3 Authority / invariants — 20/20
No core numerical, route/registry, code or release authority is mutated. The profile envelope and no-overclaim limitations are reasserted independently.

### A4 Independent validation — 19/20
Source/diff, semantic receipt and overlap logic are inspectable now; actual exact-head product/build/browser/deployment execution remains NOT_RUN until an execution environment and upstream evidence exist.

### A5 Minimal patch — 20/20
Nine release-evidence/test/recovery files; no production mechanics or workflow mutation.

**Total: 99/100; minimum 19/20 — MERGE_ALLOWED_ONLY_BY_EXPLICIT_OWNER_AUTHORIZATION.**
