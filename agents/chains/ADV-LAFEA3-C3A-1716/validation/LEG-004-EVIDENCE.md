# LEG-004 evidence — BM005 scheduler/dispatch boundary isolation

CHAIN_ID: ADV-LAFEA3-C3A-1716
LEG_ID: LEG-004
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1716
PREWORK_ENDPOINT: EP-0008
OWNER_PROGRESSION_COMMAND: PROCEED_NEXT
BASE_MAIN: 4fb3548133f53e33d21cd0f3b3d471da592ae871
PR: #1718 DRAFT
COMMON_PROTOCOL_BASIS: 487b856330797f6421d2ac0a8583d3a85ebde990

## Question answered

Why did exact merged-main BM005 remain NOT_RUN even though PR #1717 changed the BM005 harness and the repository already contains a dedicated qualification workflow?

## Evidence

### 1. Exact-main trigger predicate is satisfied

The unchanged workflow `.github/workflows/lafea3-bm005-qualification.yml` on exact main has:

- `push` branch filter: `main`;
- watched path: `scripts/lafea.3-bm005-ordinary-route-check.mjs`;
- manual `workflow_dispatch` entrypoint;
- exact-head checkout, clean-tree verification, Node 22, BM005 execution and artifact capture.

The merge compare `27dde65f... -> 4fb35481...` includes `scripts/lafea.3-bm005-ordinary-route-check.mjs` as modified. Therefore the merged `push: main` event is path-eligible. This rules out a workflow path-filter mismatch as the explanation for zero runs.

### 2. Exact-main scheduling remains absent

Post-EP-0008 exact-main Actions query:

- target SHA: `4fb3548133f53e33d21cd0f3b3d471da592ae871`;
- `total_count = 0`;
- `workflow_runs = []`.

This reproduces the prior LEG-003 observation after a synchronized successor prework boundary.

### 3. Repository-date scheduling is also absent

Repository Actions query for `created=2026-09-08` returns:

- `total_count = 0`;
- `workflow_runs = []`.

The latest visible repository run in the unfiltered run collection is dated 2026-09-04. This supports a repository execution-control-plane scheduling absence on the relevant date, not an isolated BM005 numerical failure.

This evidence does not prove the account-level reason (for example disabled Actions, billing/quota, repository policy, or another GitHub-side suppression); the connected read surface does not expose enough authority to distinguish those causes safely.

### 4. PR #1718 is not a legitimate BM005 PR trigger

Current #1718 changed paths are only under `agents/chains/ADV-LAFEA3-C3A-1716/**` and related evidence/state. None match the BM005 workflow's `pull_request.paths` filter.

Closing/reopening #1718 would therefore not be an eligible BM005 trigger. Adding a trigger-only edit to a watched script was rejected because that would execute a non-exact-main head and contaminate the required exact-main evidence target.

### 5. Historical runner failure is a different boundary

Historical BM005 workflow run `33321472589` exists. Its latest rerun job `99284139696` is `failure` with `steps=[]`. That proves the workflow was recognized historically but the executor did not reach checkout in that run.

Current exact-main state is earlier/different: **no run is scheduled at all**. Do not conflate historical runner failure with current scheduler absence.

### 6. Connected execution surface limitation

The connected GitHub tool surface exposes:

- workflow-run/job/step/log/artifact reads;
- rerun of an existing failed run/job.

It does not expose a safe action to create a new `workflow_dispatch` run for the current exact-main SHA. Re-running the historical BM005 job would execute historical code and is therefore not acceptable current-main qualification evidence.

## Classification

`BM005_EXACT_MAIN = NOT_RUN_EXECUTION_CONTROL_PLANE_BLOCKED`

Subclassification:

`TRIGGER_ELIGIBLE__RUN_NOT_SCHEDULED__CURRENT_HEAD_DISPATCH_UNAVAILABLE_IN_CONNECTED_SURFACE`

This is **not**:

- BM005 PASS;
- BM005 FAIL;
- solver FAIL;
- mesher FAIL;
- workflow path-filter mismatch;
- authorization to change engineering numerics or workflow YAML.

## Protected domains unchanged

No changes in LEG-004 to:

- solver formulation, stiffness/load assembly or recovery;
- T3/T6/Q8 formulation/integration;
- mesher algorithms or quality thresholds;
- probe mathematics;
- convergence policy/tolerances;
- independent BM005/B02/Kirsch source/oracle authority;
- `.github/workflows/**`;
- roadmap, publication, release or deployment authority.

No engineering source/test/benchmark file changed in LEG-004.

## Validation truth

PASS_CONTROL_PLANE:
- exact main re-grounded;
- trigger predicate independently proven from workflow source + merge compare;
- exact-main zero-run observation repeated post-sync;
- repository-date zero-run observation repeated post-sync;
- #1718 path-filter ineligibility proven;
- historical runner failure separated from current scheduler absence;
- current connected dispatch limitation recorded without inventing execution.

NOT_RUN:
- `node scripts/lafea.3-continuum-convergence-route-check.mjs`;
- `node scripts/lafea.3-bm005-ordinary-route-check.mjs`;
- `npm run check:lafea-meshing`;
- `npm run check:imports`;
- `npm run build`;
- BM005 stdout/stderr/exit/report/artifact hashes.

## Exact next input

One of these is required before engineering diagnosis can advance:

1. a faithful clean checkout of exact main `4fb3548133f53e33d21cd0f3b3d471da592ae871` executing the focused convergence route and BM005 commands with retained stdout/stderr/exit/report hashes; or
2. restoration of GitHub Actions scheduling plus a current-head manual/push run of the unchanged BM005 workflow.

Only an actually executed current-main harness FAIL may reopen an engineering owner boundary.