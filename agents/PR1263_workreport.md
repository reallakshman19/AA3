# PR1263 work report — EMP.1 source custody and qualification boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFICATION_PENDING`
- `PR_HEAD_OBSERVED: 266832e8f2e621d46b608a69d8d95985f4c7dc4a`
- `REPORT_BASIS_HEAD: 266832e8f2e621d46b608a69d8d95985f4c7dc4a`
- `MAIN_HEAD_LAST_CHECKED: 67317dc9cb47de8897fa7952b86107ab91b1f75c`
- `MERGE_BASE: b841975b20e547c721447e95527a995805d9761a`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: BLOCKED_SOURCE_CUSTODY`
- `GROUNDING_EPOCH: GE-003`
- `LAST_DURABLE_CHECKPOINT: 266832e8... adds pinned-Git-blob candidate-byte identity guard and regression`
- `CURRENT_STAGE: SOURCE_CUSTODY`
- `CURRENT_BLOCKER: exact raw WRC/CAUx PDF bytes and exact page extraction are not observable through current tool transports`
- `HIGHEST_RISK: false WRC authority from a secondary/derived source or non-identical PDF`
- `EXACT_NEXT_ACTION: obtain candidate PDF bytes, require exact byte count + recomputed pinned Git blob SHA-1, then independently review/freeze raw SHA-256`

Repository: `reallaksh19/Advanced_Analysis`  
Issue: `#1261`  
PR: `#1263` (draft/open)  
Branch: `agent/emp1-core-scaffold-issue1261`  
Criticality: `ENGINEERING_CRITICAL`  
Merge authority: `NOT GRANTED`

## Handover in 60 seconds

PR1263 is the controlled takeover of the dormant EMP.1 WIP for Issue #1261. Current public LAFEA.1/.2 routes, their numerical mechanics, the UI, WRC equations/coefficient data, and LAFEA.3+ remain untouched. Production mutation authority is still blocked by Issue #1261 Appendix A.

The source-custody layer now proves candidate bytes against three independent identities in order:

1. exact expected byte count;
2. Git object SHA-1 recomputed from the candidate bytes as `SHA1("blob " + byteCount + "\\0" + bytes)` and compared to the issue-pinned Git blob;
3. raw PDF SHA-256 compared to a separately frozen ledger value.

This permits a candidate obtained from any transport only when its bytes reproduce the exact pinned Git object. Git blob SHA-1 remains repository-object identity, not a substitute for the required raw PDF SHA-256. A newly observed SHA-256 is emitted only as a candidate and cannot be auto-written into the ledger.

The exact PDFs remain unavailable through current GitHub binary fetch, raw-URL transport, local Git/DNS, and ChatGPT file-library searches. A prior derivative `01_WRC537_METHOD_DEFINITION.md` and public mirrors were inspected only as recovery/sourcing leads and are explicitly **not method authority**.

## Live ground truth — GE-003

- current main: `67317dc9cb47de8897fa7952b86107ab91b1f75c`;
- implementation head: `266832e8f2e621d46b608a69d8d95985f4c7dc4a`;
- merge base: `b841975b20e547c721447e95527a995805d9761a`;
- PR #1263 remains draft/open/mergeable/not merged;
- Issue #1261 source folder metadata verified at `reallaksh19/XML_Compare_Utilities@dc1371afcd44c12de86b2dad6eddf00f1f0b3c55/docs/emp.1/`:
  - `WRC537_2013.pdf` — Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`, 1,443,744 bytes;
  - `CAUx 2017 - WRC01f.pdf` — Git blob `76573b41462943b2987e28b23ebbbf7e51ac0a02`, 7,260,396 bytes, benchmark scope PDF pp. 24–31;
- PR #1258/#1259 remain FEM solver/mesh work; overlap is `SAFE_FOR_SOURCE_CUSTODY_ONLY`;
- current-main reconciliation remains required before any production/public EMP.1 integration.

## Current implementation

### Inherited dormant scaffold

The unregistered `src/core/emp1/**` scaffold retains EMP.1 identity, A/B/C boundaries, dependency graph, fail-closed local-method gate, assessment and injected-adapter orchestration. It grants no WRC/code/release authority.

### Source-custody increment

- `validation/emp1/wrc537-2013/source-ledger.json`
- `validation/emp1/caux2017-wrc01f/source-ledger.json`
- `scripts/emp1-source-custody-check.mjs`
- `scripts/emp1-source-custody-lib.mjs`
- `scripts/emp1-source-custody-self-test.mjs`

The ledgers deliberately retain `rawPdfSha256: null`, `custodyState=UNRESOLVED_RAW_BYTES`, and `qualificationState=BLOCKED` until exact bytes are observed and independently reviewed.

At `b9032fcd...`, `gitBlobSha1File()` was added. It hashes the canonical Git blob header plus exact source bytes. `inspectEmp1SourceFile()` now fails with `FAIL_SOURCE_GIT_BLOB_MISMATCH` before SHA-256 evaluation when candidate bytes do not reproduce the pinned Git object.

At `266832e8...`, the self-test was extended to prove:

- correct byte count + correct Git blob + frozen SHA-256 → PASS;
- correct byte count + correct Git blob + unfrozen SHA-256 → BLOCKED;
- wrong Git blob identity → FAIL;
- wrong raw SHA-256 → FAIL;
- wrong byte count → FAIL.

## Authority / invariants

- exact pinned `WRC537_2013.pdf` is the only candidate method-source authority for Issue #1261;
- exact pinned CAUx PDF pp. 24–31 is benchmark authority, not WRC formula/coefficient authority;
- source-reported, independent-derived, benchmark-reported and production values remain separate;
- production results may never create or rewrite expected benchmark values;
- a candidate PDF is usable for custody only if its bytes reproduce the exact pinned Git blob ID and byte count;
- the pinned Git blob ID does not replace the separately required raw PDF SHA-256;
- no derivative report or public mirror becomes authority merely because its content appears similar;
- no WRC equation/coefficient/interpolation/sign/domain value may be added before exact source extraction;
- generic `d/D × D/t` correlation semantics may not be promoted as WRC without exact source proof;
- EMP.1.A load/reference transfer, EMP.1.B nominal screening and EMP.1.C local shell correlation remain different engineering objects;
- no tolerance weakening to obtain benchmark PASS;
- `PASS` is not code compliance; release remains false;
- LAFEA.3+ and SVG/display authority remain unchanged.

## Active items

- `DEC-001`: one visible EMP.1 product; A/B/C remain separable evidence boundaries.
- `DEC-002`: after qualification, reuse existing A/B mechanics through thin adapters rather than duplicating formulas.
- `DEC-003`: WRC remains fail-closed until exact source, dataset, qualification record and benchmark evidence exist.
- `DEC-004`: source-custody code may advance while production engineering authority remains pending.
- `DEC-005`: candidate bytes from any transport are acceptable only after recomputed Git-blob identity exactly matches the pinned repository object.
- `ISS-001`: exact WRC/CAUx raw bytes remain unavailable through current transports.
- `ISS-002`: CAUx pp. 24–31 exact extraction and independent hand calculation remain NOT_RUN.
- `ISS-003`: branch requires current-main reconciliation before production/public integration.
- `RISK-001`: a candidate SHA-256 must be independently reviewed before ledger freeze.
- `RISK-002`: WRC geometry/sign/reference-point/recovery/interpolation semantics remain unresolved until exact PDF extraction.
- `RISK-003`: secondary/derived WRC material exists but is non-authoritative and must not leak into production/benchmark expected data.

## Appendix A

- **A1 Production Trace:** repository trace is substantially complete; no production edit authorized while A3/A4 are blocked.
- **A2 Current Failure / UX Isolation:** current registry still exposes separate LAFEA.1/LAFEA.2; public EMP.1 migration deliberately unstarted.
- **A3 Authority / Invariant:** `BLOCKED` — exact raw PDF SHA-256, rendered source pages, and benchmark-critical unit/sign/reference/recovery invariants are still not observed from the exact bytes.
- **A4 Independent Validation:** `BLOCKED` — freeze sequence and negative/metamorphic design exist, but the required source-derived numerical prediction cannot be fabricated from secondary material.
- **A5 Next Commit / Minimal Patch:** source-custody was kept isolated; the latest patch strengthens exact-byte identity without mixing WRC mechanics/UI/migration.

`APPENDIX_A_STATUS=BLOCKED_SOURCE_CUSTODY`; `TAKEOVER_AUTHORITY=QUALIFICATION_PENDING`.

## Validation ledger

| Check | Status | Observation | Oracle | Basis / limitation |
|---|---|---|---|---|
| current main grounding | PASS | REMOTE_EXECUTION | repository state | `67317dc9...` |
| pinned source metadata | PASS | REMOTE_EXECUTION | source repository metadata | path/blob/byte count match Issue #1261 |
| custody metadata/self-test baseline | PASS | LOCAL_EXECUTION | implementation-coupled | prior PASS/BLOCKED/FAIL cases |
| Git blob recomputation guard | PASS | LOCAL_EXECUTION | implementation-coupled | exact fixture Git object reproduced; wrong blob rejected |
| updated custody self-test | PASS | LOCAL_EXECUTION | implementation-coupled | correct/unfrozen/wrong-blob/wrong-SHA/wrong-size paths exercised |
| Node syntax for updated custody files | PASS | LOCAL_EXECUTION | Node parser | exact updated files |
| exact WRC candidate byte verification | NOT_RUN | NOT_OBSERVED | cryptographic + pinned Git object | raw bytes unavailable |
| exact CAUx candidate byte verification | NOT_RUN | NOT_OBSERVED | cryptographic + pinned Git object | raw bytes unavailable |
| raw WRC PDF SHA-256 freeze | NOT_RUN | NOT_OBSERVED | cryptographic | exact candidate bytes required |
| raw CAUx PDF SHA-256 freeze | NOT_RUN | NOT_OBSERVED | cryptographic | exact candidate bytes required |
| CAUx pp. 24–31 extraction | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | exact source required |
| independent hand calculation | NOT_RUN | NOT_OBSERVED | ANALYTICAL + AUTHORITATIVE_REFERENCE | exact extraction required |
| production build | NOT_RUN | NOT_OBSERVED | repository build | production intentionally untouched |
| Chromium EMP.1 workflow | NOT_RUN | NOT_OBSERVED | browser | UI intentionally deferred |
| WRC engineering qualification | BLOCKED | NOT_OBSERVED | authoritative reference + independent reproduction | fail-closed |

## Changed-file ledger

PR-owned paths remain 17 files: recovery/status/claim records, dormant `src/core/emp1/**` scaffold/docs/check, the three source-custody scripts, and two source ledgers. No `src/workspace/lafea-*`, existing A/B mechanics, generic correlation mechanics, FEM solver/meshing, or workflow file is changed.

## Review / CI / merge state

- draft PR #1263; merge authority NOT GRANTED;
- no readiness/release claim while source custody and Appendix A remain blocked;
- remote CI must remain `NOT_RUN` unless an actual run is observed at the current head.

## Exact continuation

1. obtain candidate bytes for both PDFs;
2. run source-custody check: byte count → recomputed Git blob SHA-1 → candidate raw SHA-256;
3. reject any candidate whose Git object identity does not exactly equal the pinned blob;
4. independently review and freeze both raw SHA-256 values in a source-only commit;
5. render/read exact PDFs; extract WRC method data and CAUx pp. 24–31 with exact page locators;
6. freeze benchmark and independent hand calculation before any production WRC evaluator observation;
7. re-score Appendix A;
8. only after `>=92/100` total and every item `>=17/20`, reconcile current main and begin production A/B adapters and unified UI.
