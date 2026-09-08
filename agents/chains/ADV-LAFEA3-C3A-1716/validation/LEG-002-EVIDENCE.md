# LEG-002 evidence — hosted BM005 execution trigger diagnosis

CHAIN_ID: ADV-LAFEA3-C3A-1716
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1716
MATERIAL_LEG: LEG-002
LEG_CLASS: EXECUTION_ONLY_NO_ENGINEERING_SOURCE_CHANGE
PREWORK_ENDPOINT: EP-0004
PREWORK_COMMIT: cc9b43cf22b3856fd937359a3b2fb53c3ace9ad6
EXECUTION_TRIGGER_HEAD: aeae5bf14736a457bd98d8935a66df11d04bced2
BASE_MAIN: 27dde65f51e1b9d7e6d20a324510a50ea3631729
PR: 1717
WORKFLOW: .github/workflows/lafea3-bm005-qualification.yml
WORKFLOW_BLOB_MAIN: 22d001b54dd7707df733c9a53982a5086752ffba
WORKFLOW_BLOB_ACTIVE_BRANCH: 22d001b54dd7707df733c9a53982a5086752ffba
WORKFLOW_ID_HISTORICAL: 345988851
OWNER_PROGRESSION_COMMAND: PROCEED_NEXT

## Purpose

Obtain current-head BM005 ordinary-route execution using the existing bounded GitHub Actions workflow without changing workflow YAML or engineering source. If GitHub cannot schedule the workflow, distinguish that trigger/scheduler boundary from both a runner-before-checkout failure and a true BM005 harness failure.

## Existing execution contract

The unchanged workflow `LAFEA.3 BM-005 auditable qualification` declares `workflow_dispatch`, `push` on main for BM005 paths, and `pull_request` for BM005 paths. Its job:

1. checks out `github.event.pull_request.head.sha || github.sha` with full history;
2. asserts exact head, clean worktree and `git diff --check`;
3. configures Node 22;
4. syntax-checks `lafea.3-bm005-report-contract.mjs` and `lafea.3-bm005-ordinary-route-check.mjs`;
5. runs the ordinary-route BM005 harness;
6. captures stdout, stderr and exit code under `/tmp`;
7. uploads receipts even on harness failure;
8. propagates the harness exit code.

Main and active branch contain the identical workflow blob `22d001b...`. No workflow mutation occurred in LEG-002.

## Trigger eligibility

PR #1717's changed-file list at the execution boundary includes:

- `scripts/lafea.3-bm005-ordinary-route-check.mjs`;
- `scripts/lafea.3-continuum-convergence-route-check.mjs`;
- the two convergence custody modules;
- same-chain relay/evidence files.

Therefore the workflow's existing `pull_request` path filter matches the PR through `scripts/lafea.3-bm005-ordinary-route-check.mjs`.

## Trigger action

The connector exposes no action to create a new `workflow_dispatch` run. Under EP-0004 authority, Draft PR #1717 was closed and immediately reopened solely to emit the workflow's existing default `pull_request` `reopened` activity type.

- closed: 2026-09-08T14:00:04Z;
- reopened: 2026-09-08T14:00:13Z;
- head at both transitions: `aeae5bf14736a457bd98d8935a66df11d04bced2`;
- PR remained Draft;
- PR remained unmerged;
- later mergeability observation returned TRUE.

No code, workflow, benchmark, oracle or numerical authority changed to perform this trigger.

## Observation

Actions observations after reopen:

- `fetch_commit_workflow_runs(aeae5bf...)` -> `workflow_runs=[]`;
- repository Actions query `head_sha=aeae5bf...` -> `total_count=0`;
- repeated exact-head Actions query -> `total_count=0`;
- repository Actions query `created=2026-09-08` -> `total_count=0` across the repository.

There is therefore no current workflow run ID, no job ID, no checkout step, no logs and no artifact to inspect.

## Classification

`BM005_CURRENT_HEAD = NOT_RUN_TRIGGER_NOT_SCHEDULED`

This boundary is earlier than the historical hosted-runner failure:

- historical run #33321472589 / workflow ID 345988851 was scheduled and then failed before checkout, so its disposition was `NOT_RUN_EXECUTION_BLOCKED`;
- current LEG-002 produced no Actions run at all, so neither checkout nor runner allocation occurred;
- a missing run is not a BM005 FAIL and is not evidence about solver, mesh, probe, convergence or oracle correctness.

## Engineering disposition

NO_PATCH.

Do not modify:
- solver/formulation/quadrature;
- stiffness/load assembly;
- T3/T6/Q8 mechanics;
- mesher mathematics or quality thresholds;
- convergence policy/tolerances;
- physical-probe permissiveness;
- BM005/Richards or B02/Kirsch oracle/source authority;
- workflow YAML merely to force scheduling;
- roadmap or release authority.

The first unresolved external boundary is Actions scheduling/trigger availability for this repository/account context. A faithful local checkout or a successfully scheduled existing workflow remains required for current-head BM005 execution.

## Validation truth

PASS_SOURCE / CONTROL_PLANE:
- exact current main unchanged;
- workflow main/branch blob identity equal;
- PR path filter eligibility demonstrated;
- close/reopen trigger executed on exact head without source/YAML mutation;
- PR returned open Draft and mergeable;
- zero exact-head runs observed twice;
- zero repository runs observed for 2026-09-08.

NOT_RUN:
- BM005 ordinary-route harness;
- focused convergence route harness;
- meshing/import/build checks;
- any report/artifact hash that requires execution.

No NOT_RUN item is promoted to PASS.

## Exact next action

Retain this scheduler boundary and stop engineering changes. The next useful progression is either (a) execute the two focused Node checks on a faithful local checkout, or (b) when GitHub Actions scheduling is restored/available, invoke the existing BM005 workflow and retain run/job/log/artifact identities. Any true harness FAIL then starts from its first wrong engineering owner; until then no numerical patch is justified.
