# PR1454 Work Report — EMP.1 professional JSON intake security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_IMPLEMENTATION_COMPLETE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_INTAKE_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1451
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1454
ISSUE: #1451
UMBRELLA: #1389
BRANCH: agent/issue-1451-emp1-json-intake-security-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
TECHNICAL_BASIS_HEAD: 079d28c4dcce943db338c9da4513b5f07b4cab2e
GROUNDING_EPOCH: GE-PR1454-002
CURRENT_STAGE: IMPLEMENTATION_COMPLETE_FINAL_RECOVERY_SYNC
CURRENT_BLOCKER: executable Node/browser validation remains NOT_RUN because hosted jobs fail before step creation; merge authority not granted
HIGHEST_RISK: file intake policy being mistaken for engineering source authority, or unsafe bytes being read before rejection
EXACT_NEXT_ACTION: leave PR1454 draft/unmerged pending explicit Owner merge authorization; re-ground live main/head/diff/reviews immediately before any merge.
```

## 1. Defect isolated

Issue #1389 requires safe file import size/type handling, malformed document rejection, schema-version validation and no arbitrary execution from imported evidence.

At the current-main basis, the browser file input advertised `.json,application/json`, but `readLafeaUtf8(file)` read the selected payload before any runtime size/type policy. The `accept` attribute therefore provided UX filtering only, not a security boundary.

The existing downstream behavior already supplied two important safeguards and is intentionally preserved:

- malformed JSON is caught and reported by the controller;
- stage-specific normalizers remain the engineering document authority.

The remaining file-boundary defect was pre-read byte/type enforcement plus explicit rejection of unknown `lafea-workbench-document/*` envelope versions.

## 2. Implemented result

The implementation is deliberately smaller than the initial allocation plan. No controller or store change was needed.

`src/workspace/lafea-workbench-controller-io.js` now owns one shared fail-closed JSON file boundary used by both current file consumers:

```text
source document file
retained analysis-mesh evidence file
```

The policy:

1. reuses the repository's existing governed JSON intake ceiling: `5 * 1024 * 1024` bytes;
2. requires a `.json` filename, case-insensitive;
3. permits empty browser MIME metadata, but rejects any non-empty MIME outside `application/json` / `text/json`;
4. requires finite integer non-negative declared file size;
5. rejects declared oversize before calling `slice()` or allocating payload bytes;
6. reads only `file.slice(0, maxBytes + 1)`;
7. rejects actual payload bytes above the limit or inconsistent with declared size;
8. uses fatal UTF-8 decoding;
9. requires the parsed JSON root to be an object;
10. emits deterministic generic malformed-JSON errors without reflecting source content;
11. rejects unknown `lafea-workbench-document/*` envelope versions while accepting exact `lafea-workbench-document/v1`;
12. leaves all other stage-specific schema/content validation to the existing stage normalizers.

There is no `eval`, `new Function`, calculation invocation, source-authority issuance, route registration or release mutation in the intake module.

## 3. Exact technical scope

Technical:

1. `src/workspace/lafea-workbench-controller-io.js`
2. `scripts/emp1-professional-json-intake-security-check.mjs`

Recovery:

3. `agents/PR1454_workreport.md`
4. `agents/status/PR1454.yaml`
5. `agents/claims/PR1454.yaml`

No change to:

```text
src/workspace/lafea-workbench-controller.js
src/workspace/lafea-workbench-store.js
src/core/emp1/**
WRC mechanics / route / registry
WRC source / dataset / oracle / tolerance
validation/emp1/release/**
validation/emp1/wrc537-2013/**
.github/workflows/**
```

## 4. Independent falsifiers

`scripts/emp1-professional-json-intake-security-check.mjs` encodes falsifiers for:

- exact 5 MiB policy;
- accepted bounded JSON;
- empty MIME plus uppercase `.JSON`;
- wrong extension;
- wrong MIME;
- invalid/missing size;
- declared oversize rejected before any payload read;
- actual oversize;
- size mismatch;
- invalid UTF-8;
- malformed JSON;
- array/null root rejection;
- unsupported workbench-envelope schema;
- exact v1 envelope parser acceptance;
- stage-specific schema left to the stage normalizer;
- malformed error not echoing a proprietary sentinel;
- no `eval` / `new Function`;
- both current file consumers continuing through `readLafeaUtf8(file)`.

The checker exists and is source-inspectable, but it has not executed in a repository runtime. It is therefore `NOT_RUN`, not PASS_EXECUTION.

## 5. Compatibility / dependency audit

Repository searches found no direct test or product consumer of `readLafeaUtf8()` other than the current controller, no direct consumer of `loadAnalysisMeshEvidenceFile()`, and no synthetic LAFEA file fixture requiring the previous unbounded `text()` fallback. Browser `File` objects support `slice()`.

Only `lafea-workbench-controller.js` imports `lafea-workbench-controller-io.js`; no reverse import of the I/O module from `lafea-workbench-model.js` was found. Importing the canonical `LAFEA_WORKBENCH_DOCUMENT_SCHEMA` into the I/O module therefore does not create a detected reverse dependency cycle.

## 6. Validation ledger

| ID | Status | Observation |
|---|---|---|
| JSON-001 | PASS_SOURCE_INSPECTION | 5 MiB policy matches existing governed repository JSON-intake precedent |
| JSON-002 | PASS_SOURCE_INSPECTION | declared oversize rejected before `slice()` / `arrayBuffer()` |
| JSON-003 | PASS_SOURCE_INSPECTION | runtime `.json` extension and JSON MIME policy encoded |
| JSON-004 | PASS_SOURCE_INSPECTION | bounded `maxBytes + 1` slice plus actual-size and declared-size checks encoded |
| JSON-005 | PASS_SOURCE_INSPECTION | fatal UTF-8, malformed JSON and non-object JSON rejection encoded |
| JSON-006 | PASS_SOURCE_INSPECTION | unsupported workbench-envelope version rejected explicitly |
| JSON-007 | PASS_SOURCE_INSPECTION | stage-specific normalizers remain untouched and authoritative |
| JSON-008 | PASS_SOURCE_INSPECTION | malformed JSON error no longer reflects parser/source payload detail |
| JSON-009 | PASS_SOURCE_INSPECTION | no arbitrary-code-evaluation primitive added |
| JSON-010 | PASS_SOURCE_INSPECTION | technical net diff is only I/O module + focused checker |
| JSON-011 | PASS_SOURCE_INSPECTION | compatibility/dependency search found no old unbounded-reader fixture dependency |
| JSON-012 | NOT_RUN | focused Node security checker not executed in repository runtime |
| JSON-013 | NOT_RUN_EXECUTION_ENVIRONMENT | visible-workbench run `32942014480`, job `98094741446`: `steps=null`, `logs_url=null` |
| JSON-014 | NOT_RUN_EXECUTION_ENVIRONMENT | runEmp1 run `32942014502`, job `98094741311`: `steps=null`, `logs_url=null` |
| JSON-015 | NOT_APPLICABLE | WRC numerical comparison; no mechanics/expected values/tolerances changed |

Hosted classification: `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`. No `NOT_RUN` is promoted to PASS or engineering FAIL.

## 7. Authority boundary

Invariant:

`FILE_INTAKE_POLICY_CAN_REJECT_UNSAFE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_SOURCE_OR_RELEASE_AUTHORITY`

This PR grants none of:

```text
engineering source authority
WRC method authority
runtime route authority
code compliance
release qualification
deployment authority
```

It closes only the browser JSON intake security boundary. Source semantics, exact-head numerical evidence, #54, build/browser/replay/deployment evidence and professional release remain separately governed.

## 8. Appendix A — implementation takeover qualification

### A1 Production Trace — 20/20
Browser file input delegates to `LafeaWorkbenchController.loadFile()` / `loadAnalysisMeshEvidenceFile()`, both pass through `readLafeaUtf8()`, then existing JSON/store/stage-normalizer paths retain calculation authority. The security patch is upstream of engineering mutation.

### A2 Failure Isolation — 20/20
The defect is the pre-read file boundary, not WRC mechanics or stage normalization. Rejection codes isolate extension, MIME, declared size, actual size, UTF-8, JSON shape and unsupported envelope version.

### A3 Authority / Invariant — 20/20
The policy can only reject unsafe bytes. No source hash, route, engineering method, code-compliance or release bit is created or modified.

### A4 Independent Validation — 19/20
A focused falsifier matrix covers positive/negative intake cases and no-source-echo behavior. Actual Node/browser execution remains NOT_RUN because the available hosted jobs still fail before step creation.

### A5 Minimal Patch — 20/20
Two technical files plus three recovery records. The initially contemplated controller/store edits were unnecessary and are explicitly excluded from the final claim.

**Total: 99/100; minimum 19/20 — READY / OWNER MERGE AUTHORIZATION STILL REQUIRED.**
