# PR1263 work report — EMP.1 source custody and qualification boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFICATION_PENDING`
- `PR_HEAD_OBSERVED: fb2753b13c8326705d7c716448fa34109b3bc959`
- `REPORT_BASIS_HEAD: fb2753b13c8326705d7c716448fa34109b3bc959`
- `MAIN_HEAD_LAST_CHECKED: 67317dc9cb47de8897fa7952b86107ab91b1f75c`
- `MERGE_BASE: b841975b20e547c721447e95527a995805d9761a`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: BLOCKED_SOURCE_CUSTODY`
- `GROUNDING_EPOCH: GE-002`
- `LAST_DURABLE_CHECKPOINT: source-custody checker/ledgers committed at fb2753b...`
- `CURRENT_STAGE: SOURCE_CUSTODY`
- `CURRENT_BLOCKER: exact raw WRC/CAUx PDF bytes and exact page extraction are not observable through the current tool transport`
- `HIGHEST_RISK: false WRC authority before exact source/benchmark qualification`
- `EXACT_NEXT_ACTION: obtain exact pinned PDF bytes; compute and independently review raw SHA-256; freeze hashes in a source-only commit`

Repository: `reallaksh19/Advanced_Analysis`  
Issue: `#1261`  
PR: `#1263` (draft)  
Branch: `agent/emp1-core-scaffold-issue1261`  
Criticality: `ENGINEERING_CRITICAL`  
Merge authority: `NOT GRANTED`

## Handover in 60 seconds

PR1263 is the controlled takeover of the dormant EMP.1 WIP for Issue #1261. Current main is `67317dc9...`; the PR branch diverged from merge base `b841975...`, with one unrelated LFEA main commit (#1260) not yet reconciled. Current source-custody work is isolated and safe to continue, but production/public EMP.1 integration must be rebased/reconciled to current main first.

The branch contains a dormant, unregistered `src/core/emp1/**` scaffold plus a new fail-closed source-custody increment. No public route, current LAFEA.1/.2 mechanic, WRC equation/coefficient, UI, FEM solver/mesh, code assessment or release authority is changed.

The new source ledgers record only issue-authorized metadata for the exact pinned source files. `rawPdfSha256` remains `null`, `custodyState=UNRESOLVED_RAW_BYTES`, and `qualificationState=BLOCKED`. The checker computes byte count/SHA-256 only from locally supplied exact files; it never downloads mutable sources, substitutes Git blob SHA for raw SHA-256, or silently writes a candidate hash back into the ledger.

Production mutation remains prohibited because Issue #1261 Appendix A requires `>=92/100` total and `>=17/20` on each item. A3/A4 cannot pass until the exact PDFs are read and source-derived benchmark evidence is frozen.

## Live ground truth — GE-002

- main: `67317dc9cb47de8897fa7952b86107ab91b1f75c`
- PR head before this recovery-only metadata checkpoint: `fb2753b13c8326705d7c716448fa34109b3bc959`
- merge base: `b841975b20e547c721447e95527a995805d9761a`
- branch relation before PR creation: ahead 1 / behind 1 at inherited scaffold; subsequent commits are PR-local recovery/source-custody changes
- `agents/MASTER_INDEX.md`: absent on current main
- Issue #1261 fetched live and controls mission/Appendix A/source rules
- source folder at `reallaksh19/XML_Compare_Utilities@dc1371afcd44c12de86b2dad6eddf00f1f0b3c55/docs/emp.1/` contains exactly:
  - `WRC537_2013.pdf`, blob `ce861233928154145a9257efbbf8dbef3f5a17d1`, 1,443,744 bytes
  - `CAUx 2017 - WRC01f.pdf`, blob `76573b41462943b2987e28b23ebbbf7e51ac0a02`, 7,260,396 bytes
- open PR #1258: B01 B-bar/nullspace solver qualification; no EMP.1 source-custody overlap
- open PR #1259: B02D mesh/reaction qualification; no EMP.1 source-custody overlap
- overlap state: `SAFE_FOR_SOURCE_CUSTODY_ONLY`
- base drift: `RECONCILIATION_REQUIRED_BEFORE_PRODUCTION_INTEGRATION`

## Mission / acceptance

1. exact raw-byte custody for WRC537_2013 and CAUx 2017 WRC01f;
2. exact CAUx pp. 24–31 source extraction and frozen independent hand calculation before production WRC observation;
3. one authoritative EMP.1 source with separable A/B/C evidence/hash boundaries;
4. preserve current LAFEA.1 load/reference transfer and LAFEA.2 nominal screening through thin adapters, after qualification;
5. implement source-bound EMP.1.C WRC mechanics only from the pinned 2013 source;
6. unify public empirical UI to EMP.1 while preserving LAFEA.3+ behavior;
7. retain fail-closed engineering/code/release authority.

## Implemented / inherited

### Dormant inherited scaffold

- `src/core/emp1/emp1-identity.js`
- `src/core/emp1/emp1-source-contract.js`
- `src/core/emp1/emp1-dependency-graph.js`
- `src/core/emp1/emp1-local-correlation-gate.js`
- `src/core/emp1/emp1-assessment.js`
- `src/core/emp1/emp1-orchestrator.js`
- `src/core/emp1/index.js`
- `scripts/emp1-core-scaffold-check.mjs`
- `docs/emp1/CORE_MODULES.md`

These remain unregistered and carry no WRC/code/release authority.

### Source-custody increment — implemented at `fb2753b...`

- `scripts/emp1-source-custody-lib.mjs`
  - validates pinned repository/commit/path/blob/byte metadata;
  - streams SHA-256 from an exact local file;
  - distinguishes PASS / BLOCKED / FAIL;
  - never freezes a candidate hash automatically.
- `scripts/emp1-source-custody-check.mjs`
  - checks both exact ledgers from a caller-supplied source directory;
  - exit `0=PASS`, `2=BLOCKED`, `1=FAIL`.
- `scripts/emp1-source-custody-self-test.mjs`
  - isolated standard-library regression for correct hash, unfrozen hash, wrong hash and wrong byte count.
- `validation/emp1/wrc537-2013/source-ledger.json`
  - exact issue-pinned metadata; raw SHA unresolved; qualification blocked.
- `validation/emp1/caux2017-wrc01f/source-ledger.json`
  - exact issue-pinned metadata and PDF page scope 24–31; raw SHA unresolved; qualification blocked.

## Authority / invariants

- method-source authority: exact pinned `WRC537_2013.pdf` only.
- benchmark-source authority: exact pinned CAUx PDF pp. 24–31 only.
- independent-derived values must remain distinguishable from source-reported values.
- production results cannot create/overwrite benchmark expected values.
- Git blob SHA-1 cannot substitute for raw PDF SHA-256.
- generic `d/D × D/t` correlation semantics cannot be promoted as WRC without exact source proof.
- EMP.1.A load transfer, EMP.1.B nominal section screening and EMP.1.C local correlation remain distinct engineering objects.
- no WRC coefficient/equation/interpolation data before exact source extraction.
- no tolerance relaxation to force benchmark PASS.
- `PASS` is not code compliance; release remains false.
- current LAFEA.1/.2 production mechanics remain unchanged until Appendix A passes.
- LAFEA.3+ behavior remains unchanged.
- SVG/UI rendering can never be calculation authority.

## Active findings / decisions / risks

- `DEC-001`: one visible EMP.1 product; separable A/B/C calculation/evidence boundaries.
- `DEC-002`: use thin adapters around existing qualified A/B mechanics; do not reimplement them.
- `DEC-003`: WRC local method fail-closed until source SHA, dataset, qualification record and benchmark PASS are all controlled.
- `DEC-004`: first takeover mutation is validation-only source custody.
- `ISS-001`: exact raw PDF SHA-256 values remain unresolved because source bytes are not observable in the current transport.
- `ISS-002`: CAUx pp. 24–31 exact extraction/handcalc is NOT_RUN.
- `ISS-003`: branch requires current-main reconciliation before production/public integration.
- `RISK-001`: a candidate raw SHA printed by the checker must be independently reviewed before freezing.
- `RISK-002`: source geometry/sign/reference-point/recovery semantics remain unknown until exact PDF extraction.
- `RISK-003`: inherited dormant scaffold check is still NOT_RUN on an exact repository checkout.

## Appendix A

Controlling questions are copied from Issue #1261 and remain the implementation authorization gate.

- **A1 Production Trace:** current production trace has been inspected through analytical UI descriptors/content, workbench controller/store/model, local-stress load transfer, screening source/result, lifecycle/product evidence and results rendering. Final score is intentionally not promoted while A3/A4 are blocked.
- **A2 Current Failure / UX Isolation:** current registry still exposes LAFEA.1 and LAFEA.2 as first-class analytical stages; a naïve stage-ID rename would break descriptors/contracts/evidence and LAFEA.3+ routing expectations. Public migration is deliberately unstarted.
- **A3 Authority / Invariant:** `BLOCKED` — exact PDFs, raw SHA-256, page locators and every benchmark-critical sign/unit/reference/recovery invariant must be observed first.
- **A4 Independent Validation:** `BLOCKED` — freeze sequence/tolerance classes are designed, but the mandatory source-derived numerical prediction cannot be invented before exact extraction.
- **A5 Next Commit / Minimal Patch:** source-custody ledgers/checker/self-test is the executed minimal validation-only patch; no source extraction, WRC mechanics, migration or UI was mixed into it.

`APPENDIX_A_STATUS=BLOCKED_SOURCE_CUSTODY`; production mutation authority remains unavailable.

## Validation ledger

| Check | Status | Observation | Oracle | Basis / notes |
|---|---|---|---|---|
| current main grounding | PASS | REMOTE_EXECUTION | repository state | `67317dc9...` |
| issue #1261 live requirements | PASS | SOURCE_INSPECTION | controlling issue | Appendix A/source rules re-read |
| pinned source folder metadata | PASS | REMOTE_EXECUTION | source repository metadata | filenames/blob IDs/byte counts match issue |
| new custody self-test | PASS | LOCAL_EXECUTION | implementation-coupled software regression | matching hash PASS; unfrozen BLOCKED; wrong SHA FAIL; wrong size FAIL |
| new custody scripts syntax | PASS | LOCAL_EXECUTION | Node parser | Node 22.16.0 `--check` |
| raw WRC PDF SHA-256 | NOT_RUN | NOT_OBSERVED | cryptographic | exact binary unavailable in current transport |
| raw CAUx PDF SHA-256 | NOT_RUN | NOT_OBSERVED | cryptographic | exact binary unavailable in current transport |
| CAUx pp. 24–31 extraction | NOT_RUN | NOT_OBSERVED | authoritative reference | qualification blocker |
| independent WRC/CAUx handcalc | NOT_RUN | NOT_OBSERVED | ANALYTICAL + AUTHORITATIVE_REFERENCE | source extraction required first |
| inherited scaffold check | NOT_RUN | NOT_OBSERVED | implementation-coupled | exact checkout unavailable |
| production build | NOT_RUN | NOT_OBSERVED | repository build | no production patch |
| Chromium EMP.1 workflow | NOT_RUN | NOT_OBSERVED | browser | UI intentionally deferred |
| WRC engineering qualification | BLOCKED | NOT_OBSERVED | authoritative reference + independent reproduction | fail-closed |

## Changed-file ledger

PR-owned paths now include:

- `src/core/emp1/**` — inherited dormant scaffold only
- `docs/emp1/CORE_MODULES.md` — inherited architecture note
- `scripts/emp1-core-scaffold-check.mjs` — inherited, NOT_RUN
- `scripts/emp1-source-custody-lib.mjs` — new validation helper
- `scripts/emp1-source-custody-check.mjs` — new validation CLI
- `scripts/emp1-source-custody-self-test.mjs` — new focused regression
- `validation/emp1/wrc537-2013/source-ledger.json` — new blocked method-source ledger
- `validation/emp1/caux2017-wrc01f/source-ledger.json` — new blocked benchmark-source ledger
- `agents/PR1263_workreport.md` — recovery authority
- `agents/status/PR1263.yaml` — machine-readable status
- `agents/claims/PR1263.yaml` — scope/authority claim

No current production LAFEA workspace/calculation/FEM files are modified.

## Review / CI state

- PR is draft.
- merge authority: not granted.
- review threads: not yet observed after PR creation.
- CI/checks: refresh after this recovery metadata checkpoint; do not infer PASS from absence of checks.

## Exact continuation

1. obtain exact raw bytes for both pinned PDFs outside the failing connector binary transport;
2. run `node scripts/emp1-source-custody-check.mjs --source-root <exact-pinned-folder>`;
3. independently verify the two observed candidate SHA-256 values and freeze them in a source-only commit;
4. render/read exact PDFs; extract WRC source data and CAUx pp. 24–31 benchmark with page/source locators;
5. freeze benchmark and independent hand calculation before any WRC production evaluator observation;
6. re-score Appendix A;
7. only after `>=92/100` and each `>=17/20`, reconcile branch to current main and begin production A/B adapter work.
