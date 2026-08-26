# PR1454 Work Report — EMP.1 professional JSON intake security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED_INTAKE_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1451
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1454
ISSUE: #1451
UMBRELLA: #1389
BRANCH: agent/issue-1451-emp1-json-intake-security-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
PR_HEAD_AT_ALLOCATION: ea3696960c1c37ed855c056a11aa104ae6655b03
GROUNDING_EPOCH: GE-PR1454-001
CURRENT_STAGE: WIP_TO_PR_RECOVERY_MIGRATION
CURRENT_BLOCKER: executable Node/browser validation remains NOT_RUN under #54; intake-security implementation may proceed
HIGHEST_RISK: unsafe bytes being read before file-policy rejection or unsupported workbench envelope versions falling through as raw documents
EXACT_NEXT_ACTION: finish WIP migration; implement deterministic 5 MiB JSON intake/type/UTF-8/object guards and explicit envelope-schema rejection; add focused checker.
```

## Pre-patch evidence

- browser file input uses `accept='.json,application/json'`, which is advisory UX only;
- `LafeaWorkbenchController.loadFile()` and `.loadAnalysisMeshEvidenceFile()` call `readLafeaUtf8(file)` before `JSON.parse(...)`;
- `readLafeaUtf8()` has no size or filename/MIME enforcement;
- malformed JSON is already caught and reported;
- stage-specific normalizers remain the engineering document authority;
- `importIntoState()` recognizes only exact `lafea-workbench-document/v1`, with no explicit unsupported-version guard;
- repository precedent uses `5 * 1024 * 1024` bytes for governed JSON dossier intake.

## Intended final scope

Technical:
1. `src/workspace/lafea-workbench-controller-io.js`
2. `src/workspace/lafea-workbench-controller.js`
3. `src/workspace/lafea-workbench-store.js`
4. `scripts/emp1-professional-json-intake-security-check.mjs`

Recovery:
5. `agents/PR1454_workreport.md`
6. `agents/status/PR1454.yaml`
7. `agents/claims/PR1454.yaml`

No core EMP.1/WRC mechanics, route/registry, engineering source, oracle/tolerance, release profile/evidence or workflow mutation.

## Invariant

`FILE_INTAKE_POLICY_CAN_REJECT_UNSAFE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_SOURCE_OR_RELEASE_AUTHORITY`

## Appendix A

A1 20/20 — browser file input -> `LafeaWorkbenchController.loadFile()` -> I/O reader/parser -> orchestrator store -> retained import -> stage normalizer.

A2 20/20 — missing pre-read size/type guard isolated to I/O/controller; envelope-version ambiguity isolated to `importIntoState()`.

A3 20/20 — intake policy can reject bytes only; stage normalizers and existing source/run/release contracts retain authority.

A4 19/20 — focused Node/source checker supplies falsifiers; hosted execution remains NOT_RUN under #54.

A5 20/20 — four technical files plus three recovery records.

**99/100; minimum 19/20 — WRITE_ALLOWED intake-security only.**
