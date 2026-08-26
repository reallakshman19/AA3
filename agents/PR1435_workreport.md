# PR1435 — LAFEA.4 TECH-13H promotion-bound retained refinement authority

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: SALVAGE_PARTIAL_CLEAN_SUCCESSOR
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO_MODE
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_PREDECESSOR: PR #1246 (H role superseded; I/J remain unresolved there)
PR: #1435
BRANCH: agent/lafea4-tech13h-retained-authority-current-main-20260826
MAIN_HEAD_AT_GROUNDING: 7b2a8119aa5faeee7cc102c894991851019c5a7b
ENGINEERING_HEAD_BEFORE_RECOVERY_RECORDS: 0eec6a437bc50685f21d4d87787042095ddb3bb5
CURRENT_STAGE: VALIDATION_BLOCKED_BY_HOSTED_RUNNER_ALLOCATION
APPENDIX_A_STATUS: PASS 99/100, minimum 19/20
ENGINEERING_FAILURE_PROVEN: false
```

## Handover in 60 seconds

PR #1435 is a clean **TECH-13H-only** successor extracted from the 711-commit-stale combined #1246 branch.

The current-main authority gap was source-proven:

```text
accepted product candidate
-> code-owned promotion authorization
-> adapterResult.productEvidence retained directly   <-- wrong authority boundary
```

That candidate evidence is bound to candidate capability/qualification/plan rather than the exact promotion that authorized product retention. Public generic V2 recovery also lacked a TECH-13 provenance rejection.

#1435 changes the route to:

```text
accepted product candidate
-> code-owned promotion authorization
-> promotion-bound retained capability / qualification / plan
-> reissued retained v2 evidence
   mesh bytes = candidate mesh bytes
   meshHash   = candidate meshHash
   artifactHash / authority hashes = promotion-bound and distinct
-> parent-normal / production gate
-> atomic retained custody
```

Generic portable V2 recovery rejects candidate and promoted TECH-13 product evidence. Dedicated promoted replay remains TECH-13I and is explicitly not implemented here.

Production trust root remains `NULL`; this PR does not activate product refinement.

## Takeover / salvage decision

`SALVAGE_PARTIAL + CLEAN_SUCCESSOR`.

- #1246 base `585a897...` is 711 commits behind current main.
- #1246 combines H/I/J plus historical build/fingerprint/replay changes.
- H’s historical checkpoint was independently located at `1cae3c31242d3bc1073f427789a865a42877250e`.
- The H parent is `a3cc9577f609e415897da35ffb38867dac6a9e31`.
- Every H-shared file was checked and found byte-identical between that parent and current main before the exact post-H blobs were replayed.
- Therefore no conflict-resolution guess or old whole-file rebase was required.
- Current main already contains the old parent-normal representation fix; #1435 does not carry it.

## Exact authority trace

```text
LAFEA.4 current shell midsurface + retained parent mesh
-> evaluateLafea4ShellProductRefinementScope()
-> previewLafea4ShellProductRefinement()
-> evaluateLafea4ShellProductRefinementAcceptance()
-> require candidate PASS
-> parent identity currentness check
-> require code-owned promotion authorization
-> finalizeLafea4ShellProductRefinementRetention()
   -> validate candidate adapter result
   -> validate acceptance
   -> validate promotion record
   -> build promotion-bound retained capability
   -> build promotion-bound retained qualification
   -> build promotion-bound retention plan
   -> recreate V2 evidence around exact candidate mesh
   -> prove same meshHash / same mesh bytes
   -> prove distinct authority artifact/hashes
-> parent-normal companion/gate revalidation
-> atomic retained mesh replacement
```

## Generic recovery boundary

`requireLafea4ShellProductRefinementGenericRecoveryAllowed()` rejects LAFEA.4 V2 evidence when its producer/qualification belongs to the TECH-13 product producer family.

This is applied in public `recoverAnalysisMeshEvidenceV2()` before parent-normal/rebinding/retention. The lower-level internal atomic replacement still receives the already promotion-authorized retained artifact and is not treated as generic portable recovery.

## Exact engineering/currentness custody

Historical H action parent and current main:

```text
src/workspace/lafea-workbench-mesh-generation-actions.js
H parent blob   = 69b558708c08f111220f9411d51561d37a63d738
current-main    = 69b558708c08f111220f9411d51561d37a63d738
H post blob     = 615c0b65e652d7928021da411cb36a6919d1b930
```

Other shared H parents were likewise byte-identical before replay:

```text
bundle verifier parent/main = d7ed076bd165545bef70f2e6edde078003c6a0c9
active G path parent/main    = 9ee71b3734cfdd51b2f91f1dbd91ccacb8571eab
exact-head plan parent/main  = 5bfa7d8a6d07ee2d3ab4fbadd37d76aa1d1d908d
promotion policy parent/main = 9a3457a101a054107152f8655833b8054db1c14d
program policy parent/main   = c9682e9347fe31040ff3f83361239a7051af7161
```

Post-H exact blobs replayed:

```text
retention authority module  = 00396966434ca003ebd9ef6627b8bc49e798c725
H focused checker            = fdc6ab85f91d566bcbabb91bc4c07bfa0bfe4fee
action integration           = 615c0b65e652d7928021da411cb36a6919d1b930
bundle verifier              = 2f1b51b3652eceadd8a63b12788fd99a5a2de569
active G path                = e4faac7abb827fa1788321a325c91597436b0cd2
exact-head plan              = cb7ed8802a4ea2e5156fb34caf933769dff3fd6b
promotion policy             = 44e7da54a1a71c528f27cc865a530128accddaf0
program policy               = 3e294781d36b0748d28ef668a3dab8ec9ce714bb
```

## Exact engineering scope — 8 files

Production:

```text
src/workspace/lafea4-shell-product-refinement-retention-authority.js
src/workspace/lafea-workbench-mesh-generation-actions.js
```

Qualification / exact-head policy:

```text
scripts/lafea-tech13h-retained-refinement-authority-check.mjs
scripts/lafea-tech13g-active-promotion-path-check.mjs
scripts/lafea-tech13-product-refinement-bundle-verifier.mjs
validation/lafea4-refinement/product-refinement-exact-head-plan-v1.json
validation/lafea4-refinement/product-refinement-promotion-v1.json
validation/lafea4-refinement/tech13-product-local-refinement-program-v1.json
```

Recovery files add this workreport plus status/claim records; the temporary WIP record is removed.

## Protected invariants

```text
production trust root = NULL
releaseQualified = false
candidate meshHash == promoted retained meshHash
candidate mesh bytes == promoted retained mesh bytes
candidate artifactHash != promoted retained artifactHash
candidate authority hashes != retained authority hashes
generic V2 recovery rejects TECH-13 product family
parent retained mesh unchanged after rejected generic recovery
adjacent size ratio max unchanged
aspect ratio 5/10 unchanged
scaled Jacobian 0.5/0.2 unchanged
no CST/DKT formulation change
no solver/recovery change
no parent-normal mathematics change
no TECH-13E benchmark/oracle/tolerance change
no workflow/Vite chunking change
```

## Explicit exclusions

```text
TECH-13I dedicated replay/export/recovery package
TECH-13J implementation-currentness / source fingerprint
production promotion activation
release authority
bundle-ceiling policy change
LAFEA.3 v2/v3 custody
B01/B02 numerical mechanics
```

## Validation ledger

| Gate | Status | Observation | Oracle |
|---|---|---|---|
| live current-main grounding | PASS | SOURCE_INSPECTION | live GitHub |
| #1246 staleness isolation | PASS | SOURCE_INSPECTION | 711 commits behind |
| H historical checkpoint identity | PASS | SOURCE_INSPECTION | commit `1cae3c...` |
| H shared-parent byte currentness | PASS | SOURCE_INSPECTION | exact Git blobs |
| current candidate-retention authority defect | PASS / DEFECT_PROVEN | SOURCE_INSPECTION | live action trace |
| current generic-recovery provenance defect | PASS / DEFECT_PROVEN | SOURCE_INSPECTION | live recovery trace |
| exact H engineering delta replay | PASS | SOURCE_INSPECTION | exact post-H Git blobs |
| TECH13H focused Node | NOT_RUN | NOT_OBSERVED | no executable runtime |
| active-promotion path | NOT_RUN | NOT_OBSERVED | no executable runtime |
| exact-head bundle | NOT_RUN | NOT_OBSERVED | no executable runtime |
| browser/build | NOT_RUN | NOT_OBSERVED | hosted runner allocation |

No unexecuted engineering/product gate is PASS.

## Coordination

- #1432 — LAFEA.3 refinement, no exact-file overlap.
- #1433 — merged LAFEA.3 v3 pre-authority baseline, unrelated.
- #1246 — predecessor; H role superseded by #1435, I/J remain provenance/unresolved.
- #1258/#1259 — B01/B02 numerical mechanics, untouched.

## Appendix A

```text
A1 Production Trace            20/20
A2 Current Failure Isolation   20/20
A3 Authority / Invariant       20/20
A4 Independent Validation      19/20
A5 Next-Commit / Minimal Patch 20/20
TOTAL                           99/100
MINIMUM                         19/20
TAKEOVER_AUTHORITY              WRITE_ALLOWED
```

## EXACT_NEXT_ACTION

1. Reconcile live #1435 changed-file/review state after recovery-record migration.
2. Observe the newly-triggered exact-head workflow once; classify zero-step as NOT_RUN if runner allocation still fails and do not rerun.
3. If source ledger remains clean, park #1435 draft / Owner-only pending executable qualification.
4. Mark #1246 H as superseded by #1435 without closing I/J provenance.
5. Proceed to TECH-13I read-only salvage assessment only after H’s boundaries are durably recorded; do not merge or activate H without explicit owner authority.
