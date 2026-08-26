# WIP-EMP1-JSON-INTAKE-20260826 — professional JSON intake security

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_PR_ALLOCATION
PR_RECOVERY_STATE: HEALTHY_NEW_WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED_INTAKE_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1451
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #1451
UMBRELLA: #1389
BRANCH: agent/issue-1451-emp1-json-intake-security-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
GROUNDING_EPOCH: GE-WIP-JSON-INTAKE-001
CURRENT_STAGE: PR_ALLOCATION
CURRENT_BLOCKER: executable Node/browser validation remains NOT_RUN under #54; intake-security source patch may proceed
HIGHEST_RISK: treating browser accept= as a security boundary or allowing an unsupported workbench envelope schema to fall through as a raw stage document
EXACT_NEXT_ACTION: allocate draft PR, migrate WIP records, implement deterministic JSON file intake guard and explicit workbench-envelope schema rejection.
```

## Pre-patch defect

Current `readLafeaUtf8(file)` reads the complete selected payload with no byte limit and no runtime filename/MIME enforcement. `loadFile()` and `loadAnalysisMeshEvidenceFile()` then call `JSON.parse(...)`. The browser `accept='.json,application/json'` is UX only.

Current `importIntoState()` recognizes `lafea-workbench-document/v1`; an envelope-like `lafea-workbench-document/*` value with another version is not explicitly rejected before raw-stage normalization.

Repository precedent already uses a 5 MiB fail-closed JSON intake limit in topology review dossier intake.

## Intended technical scope

1. `src/workspace/lafea-workbench-controller-io.js`
2. `src/workspace/lafea-workbench-controller.js`
3. `src/workspace/lafea-workbench-store.js`
4. `scripts/emp1-professional-json-intake-security-check.mjs`

No `src/core/emp1/**`, WRC mechanics, route/registry, source/dataset/oracle/tolerance, release evidence/profile, or workflow YAML mutation.

## Invariant

`FILE_INTAKE_POLICY_CAN_REJECT_UNSAFE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_SOURCE_OR_RELEASE_AUTHORITY`

## Appendix A

A1 Production Trace 20/20 — browser file input -> `LafeaWorkbenchView` `onFile` -> `LafeaWorkbenchController.loadFile()` -> `readLafeaUtf8()` -> JSON parse -> orchestrator/retained `importDocument()` -> stage normalizer.

A2 Failure Isolation 20/20 — unsafe pre-read boundary is isolated to controller I/O; malformed JSON and stage normalization already fail closed downstream.

A3 Authority / Invariant 20/20 — file policy may reject bytes only; it cannot issue source authority, run C, alter WRC route authority, code compliance or release state.

A4 Independent Validation 19/20 — focused Node/source checker can falsify oversize/type/UTF-8/schema behavior; hosted execution remains subject to #54.

A5 Minimal Patch 20/20 — three existing workspace intake/store files plus one checker and recovery records.

**99/100; minimum 19/20 — WRITE_ALLOWED intake-security only.**
