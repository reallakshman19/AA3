# PR1454 Work Report — EMP.1 professional JSON intake security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_POST_CHUNK_FIX_RECONCILED
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
TECHNICAL_BASIS_HEAD: 3535a34b7ef880e5e587733a243a01b78f9cf25a
GROUNDING_EPOCH: GE-PR1454-003
CURRENT_STAGE: RECOVERY_ONLY_POST_CHUNK_FIX_AUDIT_COMPLETE
CURRENT_BLOCKER: executable Node/browser validation remains NOT_RUN because hosted jobs fail before step creation; merge authority not granted
HIGHEST_RISK: either reading unsafe bytes before rejection or reintroducing a Rollup evaluation-order cycle by pulling the workbench model/composition graph into the dedicated I/O leaf chunk
EXACT_NEXT_ACTION: leave PR1454 draft/unmerged pending explicit Owner merge authorization; re-ground live main/head/diff/reviews immediately before any merge.
```

Later recovery-only commits updating this report/status/claim do not change the technical basis above. The immutable final branch head must be read from live PR metadata after those recovery writes.

## 1. Defect isolated

Issue #1389 requires safe file import size/type handling, malformed-document rejection, schema-version validation and no arbitrary execution from imported evidence.

At the live-main basis, the browser file input advertised `.json,application/json`, but `readLafeaUtf8(file)` read the selected payload before any runtime size/type policy. Browser `accept` is therefore UX only, not the security boundary.

Existing stage normalizers remain the engineering document authority and are intentionally untouched.

## 2. Implemented result

`src/workspace/lafea-workbench-controller-io.js` now provides the common fail-closed file boundary already used by both current file consumers:

```text
source document file
retained analysis-mesh evidence file
```

The boundary:

1. reuses the repository's existing governed JSON ceiling: `5 * 1024 * 1024` bytes;
2. requires `.json` filename, case-insensitive;
3. permits empty browser MIME metadata but rejects non-empty MIME outside `application/json` / `text/json`;
4. requires integer non-negative declared file size;
5. rejects declared oversize before `slice()` / `arrayBuffer()`;
6. reads only `file.slice(0, maxBytes + 1)`;
7. rejects actual oversize and declared/actual byte mismatch;
8. uses fatal UTF-8 decoding;
9. requires a JSON-object root;
10. emits deterministic malformed-JSON errors without reflecting source content;
11. rejects unknown `lafea-workbench-document/*` envelope versions while accepting exact `lafea-workbench-document/v1`;
12. leaves all stage-specific schema/content validation to existing stage normalizers.

No `eval`, `new Function`, calculation invocation, source-authority issuance, route registration, code-compliance or release mutation is added.

## 3. Chunk-boundary correction found during audit

The first implementation imported `LAFEA_WORKBENCH_DOCUMENT_SCHEMA` from `lafea-workbench-model.js` into `lafea-workbench-controller-io.js`.

That was rejected during the deployment/build-graph audit because `vite.config.js` deliberately routes the I/O module to the dedicated `lafea-workbench-io` leaf chunk. Pulling the workbench model/composition graph into that leaf could recreate the class of Rollup evaluation-order cycle that the configuration is explicitly designed to avoid.

Corrective action at technical basis head `3535a34b...`:

```text
production I/O module -> no workbench-model import
local intake discriminator -> 'lafea-workbench-document/v1'
independent checker -> imports canonical LAFEA_WORKBENCH_DOCUMENT_SCHEMA and asserts equality
```

Thus production remains import-light while drift between the local security discriminator and canonical schema becomes an explicit checker falsifier.

## 4. Exact technical scope

Technical:

1. `src/workspace/lafea-workbench-controller-io.js`
2. `scripts/emp1-professional-json-intake-security-check.mjs`

Recovery:

3. `agents/PR1454_workreport.md`
4. `agents/status/PR1454.yaml`
5. `agents/claims/PR1454.yaml`

Explicitly unchanged:

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

## 5. Independent falsifiers

`scripts/emp1-professional-json-intake-security-check.mjs` encodes falsifiers for:

- exact 5 MiB policy;
- accepted bounded JSON;
- empty MIME plus uppercase `.JSON`;
- wrong extension / wrong MIME;
- invalid/missing size;
- declared oversize rejected before any payload read;
- actual oversize and size mismatch;
- invalid UTF-8;
- malformed JSON;
- array/null root rejection;
- unsupported workbench-envelope schema;
- exact v1 envelope parser acceptance;
- canonical schema discriminator equality;
- stage-specific schema left to stage normalizer;
- malformed error not echoing a proprietary sentinel;
- no `eval` / `new Function`;
- both current file consumers continuing through `readLafeaUtf8(file)`;
- I/O module remaining free of `lafea-workbench-model.js` import.

The checker is encoded and source-inspectable but has not executed in a repository runtime: `NOT_RUN`.

## 6. Current-main / review audit

At technical basis head `3535a34b7ef880e5e587733a243a01b78f9cf25a`:

```text
live main      = 29c688db4a021db900d1f8c67f56f777f73f4ddc
merge base     = 29c688db4a021db900d1f8c67f56f777f73f4ddc
compare        = 16 ahead / 0 behind
net paths      = exactly 5
reviews        = 0
review threads = 0
```

No main drift or exact-path overlap occurred during this recovery epoch.

## 7. Validation ledger

| ID | Status | Observation |
|---|---|---|
| JSON-001 | PASS_SOURCE_INSPECTION | 5 MiB policy matches existing governed repository JSON-intake precedent |
| JSON-002 | PASS_SOURCE_INSPECTION | declared oversize rejected before payload read |
| JSON-003 | PASS_SOURCE_INSPECTION | runtime `.json` extension and JSON MIME policy encoded |
| JSON-004 | PASS_SOURCE_INSPECTION | bounded `maxBytes + 1` read plus actual/declaration consistency checks encoded |
| JSON-005 | PASS_SOURCE_INSPECTION | fatal UTF-8, malformed JSON and non-object JSON rejection encoded |
| JSON-006 | PASS_SOURCE_INSPECTION | unsupported workbench-envelope version rejected explicitly |
| JSON-007 | PASS_SOURCE_INSPECTION | stage normalizers remain untouched and authoritative |
| JSON-008 | PASS_SOURCE_INSPECTION | malformed JSON error does not echo payload/source detail |
| JSON-009 | PASS_SOURCE_INSPECTION | no arbitrary-code-evaluation primitive added |
| JSON-010 | PASS_SOURCE_INSPECTION | net technical diff is only I/O module + focused checker |
| JSON-011 | PASS_SOURCE_INSPECTION | I/O leaf-chunk dependency boundary restored after audit correction |
| JSON-012 | PASS_SOURCE_INSPECTION | checker cross-validates local v1 discriminator against canonical exported schema |
| JSON-013 | PASS_SOURCE_INSPECTION | compatibility search found no old unbounded-reader fixture dependency |
| JSON-014 | NOT_RUN | focused Node security checker not executed in repository runtime |
| JSON-015 | NOT_RUN_EXECUTION_ENVIRONMENT | visible-workbench run `32942884492`, job `98097381646`: `steps=null`, `logs_url=null` |
| JSON-016 | NOT_RUN_EXECUTION_ENVIRONMENT | runEmp1 run `32942884478`, job `98097381423`: `steps=null`, `logs_url=null` |
| JSON-017 | NOT_APPLICABLE | WRC numerical comparison; no mechanics/expected values/tolerances changed |

Hosted classification: `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`. No `NOT_RUN` is promoted to PASS or engineering FAIL.

## 8. Authority boundary

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

## 9. Appendix A — implementation takeover qualification

### A1 Production Trace — 20/20
Browser file input -> `LafeaWorkbenchController.loadFile()` / `loadAnalysisMeshEvidenceFile()` -> shared `readLafeaUtf8()` security boundary -> existing JSON/store/stage normalizer. Security filtering occurs before engineering mutation.

### A2 Failure Isolation — 20/20
The defect is isolated to browser-byte intake. Deterministic rejection codes distinguish extension, MIME, declared size, actual size, UTF-8, JSON shape and envelope version. The later chunk-risk was isolated to one dependency edge and removed.

### A3 Authority / Invariant — 20/20
The policy can only reject unsafe bytes. No source hash, WRC method, route, code-compliance or release authority is created or modified.

### A4 Independent Validation — 19/20
The checker covers positive/negative intake cases, no-source-echo, canonical-schema drift and I/O leaf dependency. Actual Node/browser execution remains NOT_RUN because hosted jobs still fail before step creation.

### A5 Minimal Patch — 20/20
Two technical files plus three recovery records; controller/store/core/release/workflows unchanged.

**Total: 99/100; minimum 19/20 — READY / OWNER MERGE AUTHORIZATION STILL REQUIRED.**
