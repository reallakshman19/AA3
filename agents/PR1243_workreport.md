# PR1243 Work Report — Merged LoadCalc / SJSON Performance Stack Qualification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: RESTRICTED

PR_HEAD_OBSERVED: e7bd87e2a111fccc2a9d1a540dc0521f69373aea
REPORT_BASIS_HEAD: e7bd87e2a111fccc2a9d1a540dc0521f69373aea
MAIN_HEAD_LAST_CHECKED: 585a897afa0f5c9799cb68a58de00a55808062b3
MERGE_BASE: 585a897afa0f5c9799cb68a58de00a55808062b3
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NO_TAKEOVER
GROUNDING_EPOCH: GE-002
LAST_DURABLE_CHECKPOINT: 2026-08-18T02:23Z
CURRENT_STAGE: QUALIFICATION / P0_ROLE_VERIFICATION_NOT_RUN
CURRENT_BLOCKER: repository bytes are present, but LARGE_MODEL_4884_ENTITY explicit role verification, exact-head P0 browser/command ladder, 20-object SHA Owner acceptance, and P0 Owner acceptance are not complete
HIGHEST_RISK: treating repository presence or historical benchmark evidence as current exact-head role verification/P0 acceptance
EXACT_NEXT_ACTION: execute exact-current-main P0 with explicit LARGE_MODEL_4884_ENTITY=benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json binding, retain browser/command evidence, resolve the 20-object SHA acceptance gate, and obtain explicit Owner P0 acceptance before any P1 production salvage
```

`TAKEOVER_AUTHORITY=RESTRICTED` means this PR is an evidence/qualification vehicle only. It must not acquire P1 production changes. A future incoming agent taking over this engineering-critical PR begins READ_ONLY and completes Appendix A before technical mutation.

## Handover in 60 Seconds

- PR #1243 qualifies the already-merged performance stack from #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242.
- It changes no production or workflow file.
- Live production `main` at GE-002: `585a897afa0f5c9799cb68a58de00a55808062b3`.
- #1244/#1245 are `SALVAGE_PARTIAL / AUTHORITY_HOLD`; do not absorb their production diffs here.
- Current repository **does contain** `benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json`.
- Git tree independently records that blob as `13442af26a1415b70849f5daaca1766a38ac355c`, size **25,219,174 bytes**.
- `scripts/non-fea-baseline/runner-options.mjs` includes that repository path in the default execution inventory.
- The governed authority manifest intentionally still classifies `LARGE_MODEL_4884_ENTITY` as `EXTERNAL_CONTENT_ADDRESSED_FILE`, `defaultPath:null`; therefore repository presence is **not** role verification.
- Accepted role SHA remains `88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6`; accepted identity remains 4,884 entities / 3,277 pipes / 1,331 supports.
- `resolveNonFeaFixtureRoleBindings()` will compute/compare the actual executed fixture SHA and identity only after an explicit `--fixture-role` binding.
- P0 remains `P0_ACCEPTED=false`; P1 production remains unauthorized.

## Identity and classification

```text
WORK_INTENT: INVESTIGATE / VALIDATE
REPOSITORY_STATE: EXISTING_PR
MUTATION_AUTHORITY: WRITE_ALLOWED_FOR_QUALIFICATION_AND_RECOVERY_ONLY
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
```

- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1243
- Branch: `agent/performance-stack-qualification-main68efa`
- Base: `main`
- Production qualification target: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Original merged performance-stack head: `68efa98c62537f0fdad127d0ccdd45fb6e8a328f`
- PR state before GE-002 metadata commit: OPEN / DRAFT / mergeable

## GE-002 — live repository grounding

Live GitHub re-grounding established:

```text
main head:       585a897afa0f5c9799cb68a58de00a55808062b3
merge base:      585a897afa0f5c9799cb68a58de00a55808062b3
branch drift:    behind_by=0 before GE-002 metadata commit
reviews:         0
review threads:  0
commit statuses: 0
workflow runs:   0
```

Repository coordination registries are absent on current `main` (`agents/MASTER_INDEX.md`, `agents/status/`, `agents/claims/`). Live PR state/diffs are therefore the mutable coordination authority.

Open PR #1246 was inspected: no exact-file or engineering-authority overlap with this qualification-only PR. Classification: `SAFE`.

## Source-task authority

Controlling source task: Issue #541. Merged P0 PR #544 and Issue #541 retain:

```text
P0_ACCEPTED: false
P1_QUALIFICATION_STATUS: BLOCKED
P1_PRODUCTION_FIX_AUTHORIZED: false
```

No later `P0_ACCEPTED=true` or Owner production override was found during GE-002 reconciliation.

This does not block qualification/evidence work in #1243. It does block P1 production changes, ready/merge promotion of #1244/#1245, and selection of another optimization.

## Large-model fixture custody — corrected state

### Physical repository custody — PASS

Current `main` contains:

```text
benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json
```

Git object custody:

```text
blob SHA-1: 13442af26a1415b70849f5daaca1766a38ac355c
byteLength: 25219174
```

Historical accepted real-project authority:

```text
schema: inputxml-managed-stage/v1
accepted SHA-256: 88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
rawRootCount: 276
rawNodeCount: 4884
rawSupportCount: 1331
normalizedPipeCount: 3277
normalizedSupportCount: 1331
normalizedComponentCount: 276
```

Current runner inventory explicitly includes the repository path.

### Governed role verification — NOT_RUN

`fixture-authority-manifest.mjs` intentionally retains:

```text
role: LARGE_MODEL_4884_ENTITY
sourceKind: EXTERNAL_CONTENT_ADDRESSED_FILE
defaultPath: null
expectedSourceSha256: 88e627...
expectedIdentity: 4884 / 3277 / 1331
```

The accepted P0 audit requires:

```text
--fixture-role LARGE_MODEL_4884_ENTITY=<repository-relative-path>
```

The role resolver then requires all of the following before `VERIFIED`:

1. explicit path exists;
2. bound fixture was actually executed;
3. computed `sourceSha256` equals accepted SHA-256;
4. observed production identity equals accepted identity.

Therefore the accurate current classification is:

```text
PHYSICAL_FIXTURE_CUSTODY: PASS
ROLE_BINDING_CONFIGURED_IN_SEED_REPORT: NO
ROLE_SHA256_VERIFICATION_ON_CURRENT_HEAD: NOT_RUN
ROLE_IDENTITY_VERIFICATION_ON_CURRENT_HEAD: NOT_RUN
```

No substitute fixture is permitted.

## Seed-report reconciliation

`reports/non-fea-current-main-baseline.json` still records the large role as `UNBOUND`, and `reports/p1-current-main-qualification.json` has `fixturePath:null`. Those are seed/pre-execution reports and are stale relative to physical repository custody, but they must **not** be hand-edited into a passing state. The authoritative way to replace them is execution of the existing fail-closed P0/P1 evidence machinery.

## Qualification runner

`scripts/performance-stack-exact-head-qualification.mjs` remains qualification-only. At GE-002 its allowed-change set was tightened to exactly:

- `agents/PR1243_workreport.md`;
- `scripts/performance-stack-exact-head-qualification.mjs`.

The deleted pre-PR WIP path was removed from the allowlist, so it cannot silently reappear above the production target.

Runner classifications remain distinct:

```text
FAIL
FULL_PASS
TARGETED_PASS_FULL_NOT_RUN
NOT_RUN
```

`NOT_RUN` never counts as PASS.

## Targeted qualification evidence already obtained

| Gate | Status | Observation | Oracle | Limitation |
|---|---|---|---|---|
| Production target / merge-base custody | PASS | REMOTE_EXECUTION | NONE | live GitHub |
| Qualification-only diff | PASS | REMOTE_EXECUTION | NONE | no production/workflow paths |
| Reviews/threads | PASS | REMOTE_EXECUTION | NONE | none |
| Commit CI/workflows | NOT_RUN | REMOTE_EXECUTION | NONE | no statuses/runs |
| Support-load EMPTY/OPE/HYD IEEE-754 hand arithmetic | PASS | LOCAL_EXECUTION | ANALYTICAL | targeted |
| Staged identity parity | PASS 5/5 | LOCAL_EXECUTION | INDEPENDENT_REPRODUCTION | targeted |
| Evidence alias cache | PASS 3/3 | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | targeted |
| Immutable snapshot custody | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime test NOT_RUN |
| LoadCalc binding currentness | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime fixture NOT_RUN |
| Dependency invalidation | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime fixture NOT_RUN |
| Support-load execution index/base mass | PASS | SOURCE_INSPECTION + LOCAL_EXECUTION | ANALYTICAL | integrated fixture NOT_RUN |
| Repository 4,884 blob presence/size | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | SHA-256 role verification still NOT_RUN |
| LARGE_MODEL_4884_ENTITY explicit role verification | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | execute P0 with explicit binding |
| Full exact-head P0 command ladder | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | exact checkout required |
| Exact-head P0 browser ledger | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | browser execution required |
| 20-object SHA Owner acceptance | FAIL / NOT SATISFIED | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | P0 audit gate remains open |
| P0 Owner acceptance | FAIL / NOT SATISFIED | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | Issue #541/#544 |
| P1 production authorization | FAIL / NOT AUTHORIZED | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | blocked until P0 Owner acceptance |

`FAIL / NOT SATISFIED` above describes authority gates, not discovered product numerical failures.

No `NOT_RUN` is represented as PASS.

## Previous targeted numerical evidence

Support-load analytical check retained:

```text
inside diameter = 154.08 mm
metal            = 134.252021893143 kg
insulation       =  19.545575773942 kg
EMPTY            = 153.797597667084 kg
OPE              = 229.080257741813 kg
HYD              = 242.206010945431 kg
```

For EMPTY/OPE/HYD, old/new mass values were IEEE-754 identical via `Object.is`.

No engineering/numerical mismatch has been observed in the executed/source-qualified checks. That is not equivalent to full application qualification.

## Active items

- `ISS-001` — LARGE_MODEL_4884_ENTITY explicit role verification on current head is not executed. **OPEN / BLOCKING P0**.
- `ISS-002` — exact-head P0 browser + command ladder are not executed in this environment. **OPEN / BLOCKING**.
- `ISS-003` — 20-object fixture SHA awaits explicit Owner acceptance/freeze. **OPEN / BLOCKING**.
- `ISS-004` — P0 completed report has not been explicitly accepted by Owner. **OPEN / BLOCKING P1 PRODUCTION**.
- `RISK-001` — confusing physical repository custody with content-addressed role verification. **OPEN / CONTROLLED**.
- `RISK-002` — future main drift invalidates the exact-head browser/build basis. **OPEN**.
- `DEC-001` — #1243 stays qualification-only. **ACTIVE**.
- `DEC-002` — no substitute fixture, manifest weakening, tolerance relaxation, or manual seed-report promotion. **ACTIVE**.
- `DEC-003` — operation-count savings do not authorize another optimization without current wall-clock evidence. **ACTIVE**.
- `QST-001` — explicit Owner acceptance is required after executable P0 evidence exists. **OPEN**.

## Falsifier

Quarantine/recommend revert of the merged performance stack if exact-head execution changes any protected source/dataset identity, normalized engineering value/evidence source, authorized empirical binding, stale/current transition, topology invalidation semantics, mass/force/allocation, support reaction/contributor order, CoG/equilibrium, blocker/readiness content/order, output/evidence identity, or browser render-owner/page-error contract.

## Current disposition

```text
PARTIAL_TARGETED_QUALIFICATION_PASS
PHYSICAL_4884_FIXTURE_CUSTODY_PASS
4884_ROLE_VERIFICATION_NOT_RUN
FULL_EXACT_HEAD_P0_NOT_RUN
P0_ACCEPTANCE_NOT_SATISFIED
P1_PRODUCTION_FIX_NOT_AUTHORIZED
```

## EXACT_NEXT_ACTION

Run the **existing production P0 machinery** from an execution-capable clean checkout of the exact current `main` head; do not change the authority manifest.

Use the repository-bound large fixture explicitly:

```text
LARGE_FIXTURE=benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json
EXPECTED_SHA256=88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
```

First generate exact-head P0 browser evidence with the existing `e2e/non-fea-p0-current-main-baseline.spec.js`, binding the same execution ID, exact head SHA, fixture path and accepted SHA-256.

Then execute:

```bash
node scripts/run-non-fea-current-main-baseline.mjs \
  --warm-samples 5 \
  --fixture-role LARGE_MODEL_4884_ENTITY=benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json \
  --browser-evidence <repository-relative-P0-browser-evidence.json> \
  --execution-id <same-browser-execution-id> \
  --run-commands \
  --fail-on-gate
```

Accept `LARGE_MODEL_4884_ENTITY` only if the runner itself reports `VERIFIED`, thereby proving computed SHA-256 and production identity. Resolve the separately retained 20-object SHA acceptance gate and all command/browser failures without weakening the oracle.

Only after the completed exact-head P0 report is explicitly accepted by the Owner may P1 production work resume. Re-ground `main` before salvaging/reconstructing #1244/#1245 or choosing another optimization.
