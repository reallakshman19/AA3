# PR1263 work report — EMP.1 source custody and qualification boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFICATION_PENDING`
- `PR_HEAD_OBSERVED: 913c2320c412cc9256dfaabe61b5251c60060195`
- `REPORT_BASIS_HEAD: fb2753b13c8326705d7c716448fa34109b3bc959`
- `MAIN_HEAD_LAST_CHECKED: 67317dc9cb47de8897fa7952b86107ab91b1f75c`
- `MERGE_BASE: b841975b20e547c721447e95527a995805d9761a`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: BLOCKED_SOURCE_CUSTODY`
- `GROUNDING_EPOCH: GE-002`
- `LAST_DURABLE_CHECKPOINT: fb2753b... source-custody implementation; 913c232... recovery-record migration`
- `CURRENT_STAGE: SOURCE_CUSTODY`
- `CURRENT_BLOCKER: exact raw WRC/CAUx PDF bytes and exact page extraction are not observable through the current tool transport`
- `HIGHEST_RISK: false WRC authority before exact source/benchmark qualification`
- `EXACT_NEXT_ACTION: obtain exact pinned PDF bytes; compute/review raw SHA-256; freeze hashes in a source-only commit`

Repository: `reallaksh19/Advanced_Analysis`  
Issue: `#1261`  
PR: `#1263` (draft/open)  
Branch: `agent/emp1-core-scaffold-issue1261`  
Criticality: `ENGINEERING_CRITICAL`  
Merge authority: `NOT GRANTED`

## Handover in 60 seconds

PR1263 is the controlled takeover of the dormant EMP.1 WIP for Issue #1261. It contains the inherited, unregistered `src/core/emp1/**` scaffold plus the first validation-only source-custody implementation. No current LAFEA.1/.2 production path, public UI, WRC equation/coefficient, LAFEA.3+ FEM path, code-assessment authority, or release authority has been modified.

Current `main` is `67317dc9...`; the PR merge base is `b841975...`. Main advanced by one unrelated LFEA commit (#1260) before this takeover. The PR is currently mergeable, but current-main reconciliation remains required before any production/public EMP.1 integration because engineering-critical work must be grounded on the live base.

The source ledgers deliberately retain `rawPdfSha256: null`, `custodyState=UNRESOLVED_RAW_BYTES`, and `qualificationState=BLOCKED`. Git blob SHA-1 is not substituted for raw PDF SHA-256. The new checker computes candidate SHA-256 only from caller-supplied exact local bytes and never writes the candidate back into the ledger.

Issue #1261 Appendix A remains the production-mutation gate. A3/A4 cannot pass until the exact pinned PDFs are read, raw SHA-256 values are frozen, CAUx pp. 24–31 are extracted with exact locators, and at least one independent source-derived numerical prediction is frozen before production WRC observation.

## Live ground truth — GE-002

- main: `67317dc9cb47de8897fa7952b86107ab91b1f75c`
- PR implementation basis: `fb2753b13c8326705d7c716448fa34109b3bc959`
- later head `913c2320...` changes only recovery metadata, so `REPORT_SYNC=CURRENT`
- merge base: `b841975b20e547c721447e95527a995805d9761a`
- PR: open, draft, mergeable, not merged
- actual changed-file list reconciled: 17/17 paths explained below
- review threads: none observed
- workflow runs for `913c2320...`: none observed
- combined commit statuses for `913c2320...`: none observed
- therefore remote CI is `NOT_RUN`, not PASS
- `agents/MASTER_INDEX.md`: absent on current main
- source folder at `reallaksh19/XML_Compare_Utilities@dc1371afcd44c12de86b2dad6eddf00f1f0b3c55/docs/emp.1/` verified to contain exactly:
  - `WRC537_2013.pdf`, blob `ce861233928154145a9257efbbf8dbef3f5a17d1`, 1,443,744 bytes
  - `CAUx 2017 - WRC01f.pdf`, blob `76573b41462943b2987e28b23ebbbf7e51ac0a02`, 7,260,396 bytes
- raw binary fetch through the current connector/web transport remains unavailable
- PR #1258 owns B01 solver/nullspace qualification; no EMP.1 source-custody overlap
- PR #1259 owns B02D mesh/reaction qualification; no EMP.1 source-custody overlap
- overlap: `SAFE_FOR_SOURCE_CUSTODY_ONLY`

## Mission / acceptance

1. establish exact raw-byte custody for WRC537_2013 and CAUx WRC01f;
2. freeze exact CAUx pp. 24–31 source evidence and an independent hand calculation before production WRC observation;
3. retain one authoritative EMP.1 source with separable A/B/C evidence/hash boundaries;
4. after Appendix A passes, bind current LAFEA.1 load/reference-transfer and LAFEA.2 nominal-screening mechanics through thin adapters with numerical-identity regressions;
5. implement EMP.1.C only from exact qualified WRC source data;
6. unify the engineer-facing empirical UI to EMP.1 while keeping LAFEA.3+ behavior invariant;
7. keep code/release authority separate and fail-closed.

## Current implementation

### Inherited dormant scaffold

`src/core/emp1/` contains identity, source-envelope, dependency-graph, fail-closed local-method gate, assessment and injected-adapter orchestration modules. `docs/emp1/CORE_MODULES.md` and `scripts/emp1-core-scaffold-check.mjs` accompany it. These modules are not registered into current production routes and carry no WRC/code/release authority. The inherited scaffold check remains `NOT_RUN` on an exact checkout.

### Source-custody implementation — `fb2753b...`

- `scripts/emp1-source-custody-lib.mjs`
  - validates the pinned repository/commit/path/Git-blob/byte metadata;
  - streams SHA-256 from an exact local file;
  - classifies PASS/BLOCKED/FAIL;
  - cannot auto-freeze a candidate raw hash.
- `scripts/emp1-source-custody-check.mjs`
  - checks both controlled ledgers from `--source-root`;
  - exit codes: `0=PASS`, `2=BLOCKED`, `1=FAIL`.
- `scripts/emp1-source-custody-self-test.mjs`
  - tests matching hash, unfrozen hash, wrong hash, and wrong byte count.
- `validation/emp1/wrc537-2013/source-ledger.json`
  - method-source metadata frozen to the issue-pinned repo/commit/blob/byte count; raw SHA unresolved/blocked.
- `validation/emp1/caux2017-wrc01f/source-ledger.json`
  - benchmark-source metadata and requested PDF pages 24–31 frozen; raw SHA unresolved/blocked.

## Authority / invariants

- exact pinned WRC537_2013 PDF is the only candidate method-source authority for this issue.
- exact pinned CAUx pp. 24–31 is benchmark/reference authority, not WRC equation/coefficient authority.
- source-reported, independent-derived, benchmark-reported and production values must remain distinguishable.
- production results may never create or rewrite expected benchmark values.
- Git blob SHA-1 may never substitute for raw PDF SHA-256.
- generic `d/D × D/t` correlation semantics may not be promoted as WRC without exact source proof.
- EMP.1.A load/reference transfer, EMP.1.B nominal pipe-section screening and EMP.1.C local shell correlation remain different engineering quantities.
- no WRC coefficient/equation/interpolation values are allowed before exact extraction.
- no tolerance may be weakened to obtain benchmark PASS.
- product `PASS` is not code compliance; release remains false unless separately authorized.
- current LAFEA.1/.2 production mechanics remain unchanged until Appendix A passes.
- LAFEA.3+ behavior remains unchanged.
- SVG/UI geometry remains display-only, never calculation authority.

## Active items

- `DEC-001`: one visible EMP.1 product; A/B/C remain separable evidence boundaries.
- `DEC-002`: reuse current A/B mechanics through thin adapters after qualification; do not duplicate them.
- `DEC-003`: WRC local method remains fail-closed until exact source/dataset/qualification/benchmark authority exists.
- `DEC-004`: first takeover code change is validation-only source custody.
- `ISS-001`: raw PDF SHA-256 values are unresolved because exact source bytes cannot be fetched by the current transport.
- `ISS-002`: CAUx pp. 24–31 extraction and independent WRC/CAUx hand calculation are NOT_RUN.
- `ISS-003`: current-main reconciliation is required before production/public integration.
- `RISK-001`: a checker-emitted candidate SHA must be independently reviewed before freezing.
- `RISK-002`: WRC geometry/sign/reference-point/recovery/interpolation semantics remain unresolved until exact PDF extraction.
- `RISK-003`: dormant scaffold software check is NOT_RUN on an exact repository checkout.

## Appendix A

The exact five questions in Issue #1261 remain controlling.

- **A1 Production Trace:** current architecture has been traced through analytical UI input descriptors/content, workbench controller/store/model, foundation load transfer, screening source/result, lifecycle/product evidence and results presentation. No production edit is authorized while A3/A4 remain blocked.
- **A2 Current Failure / UX Isolation:** current stage registry still exposes separate LAFEA.1/LAFEA.2 routes; public EMP.1 migration remains deliberately unstarted. A naïve rename would threaten stage descriptors/contracts/evidence identity and LAFEA.3+ routing.
- **A3 Authority / Invariant:** `BLOCKED` — requires exact PDF reading, raw SHA-256, page locators and all benchmark-critical unit/sign/reference/recovery invariants.
- **A4 Independent Validation:** `BLOCKED` — freeze/tolerance/metamorphic strategy is known, but the required source-derived numerical prediction cannot be invented before exact extraction.
- **A5 Next Commit / Minimal Patch:** executed as the source-custody ledgers/checker/self-test only; it did not mix source extraction, WRC mechanics, migration or UI.

`APPENDIX_A_STATUS=BLOCKED_SOURCE_CUSTODY`; production mutation authority remains unavailable.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| current main grounding | PASS | REMOTE_EXECUTION | repository state | `67317dc9...` |
| Issue #1261 live requirements | PASS | SOURCE_INSPECTION | controlling issue | Appendix A/source rules re-read |
| pinned source-folder metadata | PASS | REMOTE_EXECUTION | source repository metadata | filenames/blob IDs/byte counts match issue |
| custody self-test | PASS | LOCAL_EXECUTION | implementation-coupled software regression | PASS/BLOCKED/FAIL behaviors exercised |
| custody scripts syntax | PASS | LOCAL_EXECUTION | Node parser | Node 22.16.0 `--check` |
| PR changed-file reconciliation | PASS | REMOTE_EXECUTION | live PR | 17 actual files, all explained |
| PR review-thread check | PASS | REMOTE_EXECUTION | live PR | zero threads observed |
| remote workflows/statuses | NOT_RUN | REMOTE_EXECUTION | GitHub | zero workflow runs/statuses observed |
| raw WRC PDF SHA-256 | NOT_RUN | NOT_OBSERVED | cryptographic | exact raw bytes unavailable |
| raw CAUx PDF SHA-256 | NOT_RUN | NOT_OBSERVED | cryptographic | exact raw bytes unavailable |
| CAUx pp. 24–31 extraction | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | qualification blocker |
| independent hand calculation | NOT_RUN | NOT_OBSERVED | ANALYTICAL + AUTHORITATIVE_REFERENCE | source extraction required |
| inherited scaffold check | NOT_RUN | NOT_OBSERVED | implementation-coupled | exact checkout unavailable |
| production build | NOT_RUN | NOT_OBSERVED | repository build | no production patch |
| Chromium EMP.1 workflow | NOT_RUN | NOT_OBSERVED | browser | UI deliberately deferred |
| WRC engineering qualification | BLOCKED | NOT_OBSERVED | authoritative reference + independent reproduction | fail-closed |

## Changed-file ledger — reconciled 17/17

Recovery/coordination:
- `agents/PR1263_workreport.md`
- `agents/status/PR1263.yaml`
- `agents/claims/PR1263.yaml`

Inherited dormant scaffold:
- `docs/emp1/CORE_MODULES.md`
- `scripts/emp1-core-scaffold-check.mjs`
- `src/core/emp1/emp1-assessment.js`
- `src/core/emp1/emp1-dependency-graph.js`
- `src/core/emp1/emp1-identity.js`
- `src/core/emp1/emp1-local-correlation-gate.js`
- `src/core/emp1/emp1-orchestrator.js`
- `src/core/emp1/emp1-source-contract.js`
- `src/core/emp1/index.js`

New source-custody validation:
- `scripts/emp1-source-custody-check.mjs`
- `scripts/emp1-source-custody-lib.mjs`
- `scripts/emp1-source-custody-self-test.mjs`
- `validation/emp1/caux2017-wrc01f/source-ledger.json`
- `validation/emp1/wrc537-2013/source-ledger.json`

No current `src/workspace/lafea-*`, `src/core/local-stress/**`, `src/core/local-attachment-screening/**`, `src/core/local-attachment-correlation/**`, FEM solver, meshing, or workflow file is changed.

## Review / CI / merge state

- PR #1263: draft/open/mergeable.
- review threads: none.
- remote workflow runs: none observed.
- commit statuses: none observed.
- merge authority: NOT GRANTED.
- do not mark ready for review or merge while source custody/Appendix A remain blocked.

## Exact continuation

1. obtain exact raw bytes for both pinned PDFs;
2. run `node scripts/emp1-source-custody-check.mjs --source-root <exact-pinned-folder>`;
3. independently verify candidate raw SHA-256 values and freeze them in a source-only commit;
4. render/read the exact PDFs and extract WRC method data + CAUx pp. 24–31 benchmark with exact page locators;
5. freeze benchmark and independent hand calculation before any production WRC evaluator observation;
6. re-score Appendix A;
7. only if `>=92/100` total and each `>=17/20`, reconcile to current main and begin production A/B adapter work.
