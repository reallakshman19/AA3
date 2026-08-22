# PR1325 Work Report — EMP1-17 retained-C authority currentness and qualification sample

## Recovery header
- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: ACTIVE_IMPLEMENTATION`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `ISSUE: #1324`
- `PR: #1325`
- `BRANCH: agent/issue-1324-emp1-authority-currentness`
- `BASE_MAIN: a222e18c38bd20fb55c1c6c95f724f40e40e8532`
- `OWNER: reallaksh19`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Assignment
Implement issue #1324 in this one continuously stacked PR:
1. make retained EMP.1.C results authority-current, so a qualification/route-authority change invalidates reportability without deleting historical evidence or rerunning A/B;
2. add one `Load complete EMP.1 qualification sample` path that supplies only legitimate source/sample inputs and traverses the same normalization/source-binding/execution custody as real inputs;
3. make C button/badge/result/evidence state derive from one domain projection so stale numerical C results cannot remain visible after authority changes;
4. add engineering-critical falsifiers proving the implementation is route-specific/currentness-aware rather than a global C disable.

## Ground truth
- Current `main` was pinned at `a222e18c38bd20fb55c1c6c95f724f40e40e8532` before branch creation.
- No `AGENTS.md` and no `agents/MASTER_INDEX.md` are present on this base.
- Open PR/status/claim review found no active EMP.1 ownership collision for these workbench/core files.
- Current bounded WRC 537 gamma=5, zero-differential-pressure production route remains suspended; this assignment does not grant route, global C, code-compliance, or release authority.
- Current run-state compares A/B/run-input hashes only; route authority/qualification is absent from retained-execution currentness.
- `runEmp1()` may reuse previous local correlation when C is not invalidated; the dependency graph currently has no route-authority change class.
- Current UI independently derives C route suspension from the registry instead of consuming a single domain C-state projection.
- Existing EMP.1 workbench qualification already checks typed `r0`, WRC §4.5 source custody, spoofed nearest-end distance rejection, canonical units, and truthful `PREPARED_C_BLOCKED` behavior while the route is suspended.

## Protected engineering invariants
- A/B are not invalidated merely because C route authority changes.
- A retained numerical C execution is immutable historical evidence; authority changes alter currentness/reportability, not the historical record.
- A stale C numerical result must be excluded from current result/report/export consumption while remaining available as explicitly historical evidence.
- Qualification/sample code must not inject derived `Rm`, `T`, `r0`, `gamma`, `beta`, nearest-end distance, WRC load components, WRC coefficients, stresses, governing point, applicability PASS, or route authorization.
- Sample source bindings must use the existing canonical normalizers and typed source-authority constructors.
- Route suspension remains fail-closed unless existing exact-head engineering qualification independently authorizes a later change; no such authorization is assumed here.
- No workflow YAML change is planned.

## Implementation plan
1. Add a route-authority change class that invalidates only C/assessment/benchmark.
2. Build and retain a deterministic route-authority semantic snapshot binding route-module state plus registry qualification/method/scope authority.
3. Reconcile previous/current authority snapshots before `runEmp1()` so stale C cannot be reused.
4. Extend workbench currentness with authority-aware C reportability and create a single C-state projection for button/badge/current result/evidence behavior.
5. Wire the controller/view to that projection and add the complete qualification sample through normal source/run-input paths.
6. Extend focused qualification plus adversarial falsifiers; then inspect exact-head CI/status without treating environment failures as PASS.

## Validation plan
Engineering-critical adversarial checks will include:
- Q1 retained numeric C + Q1 authority snapshot => current/reportable.
- Q1 -> distinct authorized Q2 snapshot with unchanged A/B/input => old C stale/hidden but rerun remains enabled.
- new Q2 retained numeric C => current/reportable.
- Q2 suspension => retained numeric evidence preserved, current stress result hidden, production-C action disabled.
- unrelated/no authority change => retained C remains current.
- legacy/missing authority snapshot => fail-closed stale for numerical C.
- authority change invalidates C/assessment only, not A/B.
- sample follows canonical run-input/source-binding path and reaches truthful `PREPARED_C_BLOCKED` while production route is suspended.
- attempted sample injection of derived C authority fields is rejected by exact-shape normalization.

## Validation state
- Repository exact-head execution: `NOT_RUN`.
- Focused EMP.1 qualification: `NOT_RUN`.
- Authority-currentness falsifiers: `NOT_RUN`.
- UI/product projection checks: `NOT_RUN`.
- Full regression: `NOT_RUN`.

## Changed-file ledger
- `agents/PR1325_workreport.md` — living PR recovery/validation record.
- `agents/WIP_issue1324_reallaksh19_20260822_workreport.md` — pre-PR record, scheduled for removal immediately after this file is created.

## Open findings / risks
- `ISS-1324-01` P0: route authority is not part of retained C currentness/invalidation.
- `ISS-1324-02` P0: current C UI authority state is partly derived locally in the view and can diverge from domain currentness.
- `ISS-1324-03` P1: qualification sample wiring must reuse current refactored controller/store architecture and must not become a privileged result injection path.
- `RISK-1324-01`: route registry and route module jointly define production authority; snapshot semantics must bind both without hashing transient UI/time metadata.

## Exact next action
Remove the pre-PR WIP file, then implement authority snapshot/invalidation and state projection before UI/sample wiring.

## Appendix A — takeover qualification
1. Why can a numerically unchanged WRC result cease to be engineering-current when A/B/input bytes are unchanged?
2. Which route/qualification fields belong in the authority semantic hash, and which transient fields must be excluded?
3. Why must a route-authority change invalidate C/assessment but not A/B?
4. How does `runEmp1()` currently permit reuse of a previous local correlation?
5. What negative control proves the fix is not a global C disable?
6. Why must historical C evidence be retained while its reportable projection becomes null?
7. Which fields may the complete qualification sample legitimately author, and which must CORE derive?
8. Which existing normalization/source-authority functions must the sample traverse?
9. What should the current C UI show when an old authorized result exists but the current route is suspended?
10. Which engineering authorities remain false throughout this PR unless separately and explicitly qualified?
