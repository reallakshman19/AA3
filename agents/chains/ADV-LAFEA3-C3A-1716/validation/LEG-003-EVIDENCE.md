# LEG-003 evidence — exact-main BM005 scheduling observation

CHAIN_ID: ADV-LAFEA3-C3A-1716
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1716
LEG: LEG-003
CLASS: EXECUTION_CONTROL_PLANE_ONLY
PREWORK_ENDPOINT: EP-0006
PREVIOUS_PR: #1717
PREVIOUS_PR_HEAD: 1c0343a8068da70907dd1167a0562893a289dc87
MERGE_COMMIT_AND_EXACT_MAIN: 4fb3548133f53e33d21cd0f3b3d471da592ae871
SUCCESSOR_PR: #1718 DRAFT

## Owner authority

Owner text: `merge, proceed next`.

- merge authorization was explicit and consumed by PR #1717;
- successor progression classified as `PROCEED_NEXT`;
- successor PR #1718 merge remains OWNER_ONLY / FALSE;
- current qualification scope/set remains unchanged and reused.

## Exact merge result

Immediately before merge, PR #1717 was open, mergeable, exact head `1c0343a8...`, with no submitted reviews, no unresolved review threads and zero reported commit statuses. It was marked ready and merged using expected-head protection.

GitHub returned merge commit `4fb3548133f53e33d21cd0f3b3d471da592ae871`, and the main branch independently resolved to that exact SHA.

BM005 was `NOT_RUN_TRIGGER_NOT_SCHEDULED` at merge. Owner merge authorization did not change validation truth.

## Existing hosted execution surface

The unchanged `.github/workflows/lafea3-bm005-qualification.yml` on main watches:

- `push` to `main` when `scripts/lafea.3-bm005-ordinary-route-check.mjs`, the BM005 report contract/data, or the workflow itself changes;
- `pull_request` for the same watched paths;
- manual `workflow_dispatch`.

The merged PR contains `scripts/lafea.3-bm005-ordinary-route-check.mjs`, so the merge changed a watched path on the `main` push.

The workflow itself is not changed by LEG-003 and continues to define exact-head checkout, clean-tree/`git diff --check`, Node 22 setup, BM005 syntax check, BM005 execution, stdout/stderr/exit capture and artifact upload.

## Exact-main observations

Read-only query immediately after merge:

`GET /repos/reallaksh19/Advanced_Analysis/actions/runs?head_sha=4fb3548133f53e33d21cd0f3b3d471da592ae871&per_page=100`

Result: `total_count = 0`, `workflow_runs = []`.

After EP-0006 was committed, Draft PR #1718 opened and repository↔Issue prework synchronization completed, the same exact-main query was repeated.

Result again: `total_count = 0`, `workflow_runs = []`.

Therefore no current run ID, job ID, checkout step, Node process, stdout/stderr, exit code or artifact exists for exact merged main.

## Classification

`BM005_EXACT_MAIN = NOT_RUN_TRIGGER_NOT_SCHEDULED`

This is not:
- `PASS`;
- benchmark `FAIL`;
- runner/job failure after scheduling;
- checkout failure;
- evidence that FEM mechanics are wrong.

It is an external execution/control-plane blocker earlier than the historical scheduled run `33321472589`, which reached a workflow run but failed before checkout.

## Protected unchanged domains

No change in LEG-003 to:
- T3/T6/Q8 formulation or quadrature;
- stiffness/load assembly or solver tolerances;
- mesh generation mathematics or quality policy;
- convergence mathematics/tolerances;
- physical-probe mathematics;
- BM005/Richards independent oracle;
- B02 source authority;
- workflow YAML;
- roadmap, release or publication authority.

## Validation truth

PASS_CONTROL_PLANE:
- #1717 merge exact-head protected and exact-main re-pinned;
- EP-0006 synchronized before final LEG-003 observation;
- watched main-push path is present in merged PR;
- exact-main Actions result observed twice as zero runs;
- no engineering or workflow mutation used to force execution.

NOT_RUN_ENGINEERING:
- `node scripts/lafea.3-continuum-convergence-route-check.mjs`;
- `node scripts/lafea.3-bm005-ordinary-route-check.mjs`;
- BM005 report/artifact hashes;
- `npm run check:lafea-meshing`;
- `npm run check:imports`;
- `npm run build`.

No NOT_RUN item is promoted to PASS.

## Exact next boundary

Do not patch FEM or workflow logic based on scheduler absence. The next useful external input is either:
1. a faithful clean exact-main checkout receipt executing the focused convergence check and BM005 harness; or
2. restored/available GitHub Actions scheduling followed by actual run/job/log/artifact evidence.

Only an actually executed harness FAIL may justify a new engineering owner-boundary investigation.