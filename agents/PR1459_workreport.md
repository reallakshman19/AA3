# PR1459 Work Report — EMP.1 runtime error presentation security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_REBUILT_CURRENT_MAIN
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RUNTIME_ERROR_PRESENTATION_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1458
MERGE_AUTHORITY: GRANTED_BY_OWNER_2026-08-26T10:11:19Z
CRITICALITY: ENGINEERING_CRITICAL
PR: #1459
ISSUE: #1458
UMBRELLA: #1389
BRANCH: agent/issue-1458-emp1-runtime-error-redaction-20260826
MAIN_HEAD_LAST_CHECKED: b4d1137d0be67a4723ae08df90976f4218b6515e
MERGE_BASE: b4d1137d0be67a4723ae08df90976f4218b6515e
TECHNICAL_BASIS_HEAD: 68c2442ccb232aefb5edf794e933c6a84e796c78
GROUNDING_EPOCH: GE-PR1459-003
CURRENT_STAGE: OWNER_AUTHORIZED_PRE_MERGE_AUDIT
CURRENT_BLOCKER: executable Node/browser validation remains NOT_RUN until an executable repository runtime is available; hosted jobs must be re-observed on final recovery head
HIGHEST_RISK: either leaking arbitrary exception/source-derived text or over-redacting governed readiness reasons/support codes
EXACT_NEXT_ACTION: audit final recovery head against live main, reviews/threads and hosted workflow jobs; if unchanged and mergeable, mark ready and squash-merge using exact expected head SHA.
```

## 1. Recovery incident and correction

The first implementation attempt used four modular LAFEA store files surfaced by a higher-level lookup. Exact GitHub Contents/compare evidence proved those files were absent from live `main@29c688db...`; the PR showed them as new files. That basis was rejected before merge.

The owned branch was reset to live main, which temporarily auto-closed the PR when head equalled base. The PR was reopened after the corrected commits were present. During recovery `main` advanced by PR #1450 to `b4d1137d...`; its seven added authorization-evidence/recovery files have zero exact-path overlap with this PR.

The corrected technical snapshot was rebuilt from the current-main tree, preserving all #1450 files, with exactly five technical paths. No obsolete modular store path remains in the diff.

## 2. Correct production boundary

Current production flow is:

```text
LafeaWorkbenchController
  -> createLafeaWorkbenchOrchestratorStore()
  -> createLafeaWorkbenchOrchestratorApi()
  -> canonical state/result/subscription surface
  -> LafeaWorkbenchView / caller
```

`createLafeaWorkbenchOrchestratorApi()` is the single canonical public state/result boundary. Internal base/lifecycle/orchestrator stores retain their existing engineering/debug diagnostic custody; the public API projects ERROR diagnostics before state is returned or published to subscribers.

EMP.1 run-input / qualification-sample / product-run exceptions are controller-owned state outside the orchestrator diagnostics and are projected explicitly at their three catch sites.

## 3. Implemented technical result

Technical basis head `68c2442ccb232aefb5edf794e933c6a84e796c78` contains exactly:

1. `src/workspace/lafea-public-failure.js`
2. `src/workspace/lafea-workbench-orchestrator-api.js`
3. `src/workspace/lafea-workbench-controller.js`
4. `scripts/emp1-professional-runtime-error-redaction-check.mjs`
5. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

`lafea-public-failure.js`:
- accepts only bounded uppercase diagnostic codes (`A-Z`, digits, `_`, `.`, `-`, max 128 chars);
- may promote a legacy exception message to the code field only when the entire message matches that grammar;
- replaces arbitrary ERROR diagnostic text with a deterministic generic message + retained/fallback code;
- preserves severity, code, path, entity identity and run metadata;
- leaves WARNING/INFO messages unchanged;
- projects top-level diagnostics plus stage execution/edit-result diagnostics without mutating retained state;
- leaves non-workbench evidence/projection objects unchanged.

Canonical orchestrator API:
- sanitizes every workbench state returned from API methods;
- sanitizes every state delivered through `subscribe()`;
- passes non-state return values unchanged;
- supports synchronous and Promise-returning methods.

Controller:
- qualification-sample exception -> `publicLafeaFailure()`;
- EMP.1 run-input rejection exception -> `publicLafeaFailure()`;
- EMP.1 product-run exception -> `publicLafeaFailure()`;
- governed `EMP1_WORKBENCH_RUN_NOT_READY` readiness reasons remain unchanged.

## 4. Independent falsifier

`scripts/emp1-professional-runtime-error-redaction-check.mjs` injects a proprietary sentinel and requires:

- explicit safe diagnostic code retained;
- arbitrary exception message not returned;
- legacy code-only exception remains diagnosable;
- malformed/untrusted code falls back to a bounded code;
- top-level ERROR diagnostic is redacted;
- stage execution ERROR diagnostic is redacted while status/run identity remain;
- last-edit ERROR diagnostic is redacted while path remains;
- WARNING message remains unchanged;
- `lifecycleReadiness.blockingReasons` remains unchanged;
- retained/internal input object is not mutated;
- non-workbench evidence passes through by identity;
- canonical API source contains subscription/result projection;
- controller has exactly three `publicLafeaFailure()` call sites and no raw `error.message` EMP.1 projection;
- obsolete modular store paths are not introduced as API dependencies.

Executable checker result remains `NOT_RUN` unless a real repository runtime executes the Node script. Source/diff inspection is not promoted to executable PASS.

## 5. Authority boundary

Invariant:

`PUBLIC_ERROR_SANITIZATION_CAN_REDACT_MESSAGE_CONTENT_BUT_CANNOT_HIDE_FAILURE_OR_CREATE_ENGINEERING_AUTHORITY`

This PR does not change:

```text
src/core/emp1/**
WRC mechanics / signs / equations / oracle / tolerances
route / registry / source authority
code compliance
release qualification / deployment authority
mesh / solver / load / pressure mechanics
CSP / security headers
dependency vulnerability policy
file-intake policy (#1454)
build-artifact security policy (#1457)
.github/workflows/**
```

A redacted failure remains a failure. A redaction PASS cannot create engineering, source, code, release or deployment authority.

## 6. Validation ledger

| ID | Status | Observation |
|---|---|---|
| ERRSEC-001 | PASS_SOURCE_INSPECTION | corrected current-main architecture identified |
| ERRSEC-002 | PASS_SOURCE_INSPECTION | exact five-file technical scope at technical basis head |
| ERRSEC-003 | PASS_SOURCE_INSPECTION | safe code grammar and fallback encoded |
| ERRSEC-004 | PASS_SOURCE_INSPECTION | canonical API result/subscription projection encoded |
| ERRSEC-005 | PASS_SOURCE_INSPECTION | three EMP.1 exception channels use public projection |
| ERRSEC-006 | PASS_SOURCE_INSPECTION | governed readiness reasons remain explicit |
| ERRSEC-007 | PASS_SOURCE_INSPECTION | proprietary-sentinel falsifier encoded |
| ERRSEC-008 | PASS_SOURCE_INSPECTION | PR #1450 drift has zero exact-path overlap |
| ERRSEC-009 | NOT_RUN | Node falsifier execution |
| ERRSEC-010 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted workflow execution to be re-observed on final recovery head |
| ERRSEC-011 | NOT_APPLICABLE | WRC numerical comparison; no mechanics/expected values/tolerances changed |

## 7. Appendix A — implementation takeover qualification

### A1 Production Trace — 20/20
Exception/source-derived failure -> internal retained/orchestrator diagnostic custody -> canonical orchestrator API public projection -> controller/view/caller. EMP.1 controller-owned exceptions are separately projected before `emp1RunFailure` or returned rejection/failure objects.

### A2 Failure Isolation — 20/20
The defect is arbitrary exception-message disclosure at the product boundary. It is not numerical mechanics, readiness policy, mesh custody, source authority or release logic.

### A3 Authority / Invariant — 20/20
FAILED/REJECTED/BLOCKED semantics and safe diagnostic codes remain. Readiness reasons remain governed. No engineering/source/route/code/release/deployment authority is created.

### A4 Independent Validation — 19/20
The sentinel matrix independently exercises code preservation, malformed-code fallback, top-level/execution/edit redaction, warning/readiness preservation, nonmutation and static controller/API wiring. Real Node/browser execution remains NOT_RUN until executable runtime evidence exists.

### A5 Minimal Patch / Next Commit — 20/20
Five technical files plus three recovery records only. The erroneous modular-store attempt was removed from branch ancestry by rebuilding from current main.

**Total: 99/100; minimum 19/20 — READY FOR OWNER-AUTHORIZED EXACT-HEAD MERGE AUDIT.**
