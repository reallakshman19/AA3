# PR1304 Work Report — EMP1-04 WRC source custody and staged UI

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: WRITE_ALLOWED`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `EXECUTION_MODE: MANUAL`
- `PR: #1304`
- `PR_STATE: DRAFT_UNMERGED`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `DEPENDENCY_PR: #1301`
- `DEPENDENCY_HEAD: af1bd57d7c7bb178be3909628e3a0d34d1aaea3a`
- `BRANCH: agent/emp1-04-custody-ui-20260820`
- `BASE_BRANCH: agent/emp1-03-runemp1-orchestration-issue1261`
- `PR_HEAD_OBSERVED: ba357271f4c1df70630aa63499e66d4d8d86ad5b`
- `REPORT_BASIS_HEAD: ba357271f4c1df70630aa63499e66d4d8d86ad5b`
- `MAIN_HEAD_LAST_CHECKED: da483e005c46582c86efce2b83218c85594fa562`
- `MERGE_BASE_WITH_MAIN: ddfad5cd12cdbf271509031817ad9590704620c3`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: CURRENT`
- `GROUNDING_EPOCH: GE-003`
- `CURRENT_STAGE: SOURCE_CUSTODY_AND_UI_REOBSERVATION`
- `CURRENT_BLOCKER: CI_IN_PROGRESS`
- `HIGHEST_RISK: source-derived WRC custody and UI projection must retain exact gamma5 Table-5 numerics and must not widen global/release authority`
- `EXACT_NEXT_ACTION: inspect exact-head EMP1 orchestration, gamma5, independent-baseline and visible-workbench workflow results; fix only source/UI defects demonstrated by those oracles`

## Handover in 60 Seconds

PR #1304 is stacked on draft #1301. It changes the bounded WRC537 gamma=5 orchestration from a caller-authored physical-input request to a source-derived A/B custody chain, and adds read-only engineer-facing A/B/C evidence.

Current authority chain:

```text
qualified LAFEA.1 foundation model/result
  ├─ selected transformed load-case target point -> WRC reference
  └─ retained frame eX/eZ -> WRC vessel/nozzle axes
              +
qualified LAFEA.2 request/result
  └─ existing source-bound correlation geometry evidence
       OD + assessment T + attachment diameter
              ↓
WRC source custody
  Rm = OD/2 - T/2
  T  = assessment thickness
  r0 = attachment diameter/2
  gamma = Rm/T
  beta  = 0.875*r0/Rm
  Kn = Kb = 1 pinned by bounded route
              ↓
existing authorized gamma5 / zero-dp WRC537 route
```

The route request schema is now v2 and accepts only `loadCaseIdentity` and `pressureResultIdentity`. Caller `geometry`, `wrcReferencePointGlobal`, `axes`, and `stressConcentration` are unsupported fields.

The qualification script now uses a real LAFEA.2 screening request/result rather than #1301's synthetic B wrapper and contains source-custody falsifiers. Exact-head workflows are running; no new PASS is claimed until their completed results are inspected.

The analytical UI now displays:

- **A:** named Fx/Fy/Fz/Mx/My/Mz, source/target references, retained eX/eY/eZ, pressure disposition;
- **B:** OD, assessment thickness, inner/outer/mean radii, A/B ancestry hashes and currentness;
- **C:** exact registered bounded route/domain and remaining blockers; a read-only result renderer is available for source-bound geometry, WRC loads and all eight Au/Al/Bu/Bl/Cu/Cl/Du/Dl stress states when a C result is supplied.

C remains non-clickable in the current workspace because workspace C execution is not wired in this PR slice. The UI no longer falsely says the WRC dataset is unqualified; it distinguishes bounded route authority from global/workspace/release authority.

## Ground truth / coordination

- Repository: `reallaksh19/Advanced_Analysis`.
- #1301 is OPEN/DRAFT/unmerged and is the explicit orchestration dependency.
- #1301 workreport states EMP1-04 is the intended next product/workspace increment.
- Main and #1301 are diverged after merge base `ddfad5...`; current-main reconciliation is required before promotion but is deliberately not mixed into this stacked engineering slice.
- Open generic correlation applicability and WRC Edition-4 source-package PRs are separate authority workstreams and are not copied/rewritten here.
- No workflow file has been modified by #1304.

## Implemented engineering changes

### P0-A — absolute geometry custody

`src/core/emp1/emp1-wrc537-source-custody.js` reuses the existing `createCorrelationGeometryEvidenceFromLafea2()` authority primitive. It retains/replays the exact LAFEA.2 request/result and attachment source reference, binds foundation model/result hashes, and derives WRC Rm/T/r0 from that evidence.

The equal-dimensionless-parameter falsifier intentionally doubles OD, T and attachment diameter together, recomputes the tampered geometry semantic hash, proves gamma/beta remain equal, and requires replay against the retained LAFEA.2 evidence to reject the changed physical geometry.

### P0-B — reference and axes custody

WRC reference is no longer caller input. It is the selected retained A load case's `targetPointGlobal` / `targetReferencePointIdentity`.

WRC axes are no longer caller input. They are retained A `coordinateSystemEvidence.axesGlobal.eX/eZ`; retained A result payload hash is reconstructed before those fields can become authority.

Qualification includes reference/axis tamper cases and an independent arithmetic oracle:

```text
100 mm * 1000 N = 100000 N.mm
```

This demonstrates why a wrong but mutually consistent duplicate reference cannot be accepted merely because common-origin equilibrium closes.

### Request / execution boundary

`src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` now:

- uses request schema `.../v2`;
- accepts only load/pressure identities;
- derives `wrcSourceCustody` during C source preparation;
- creates zero-dp load custody at the derived retained A target;
- feeds only derived geometry/reference/axes/pinned Kn/Kb into the unchanged authorized route;
- retains source custody in the C result before semantic result hashing;
- reconstructs A result hash before using its execution evidence.

### Product/UI projection

`src/core/emp1/emp1-public-product-contract.js` now exposes the existing registered bounded C route while preserving:

- workspace C execution: false;
- global/full-domain C authority: false;
- code-compliance interpretation: false;
- release qualification: false.

`src/workspace/emp1-engineering-evidence-view.js` is a pure DOM projection leaf. It creates no engineering state and has no edit callbacks.

`src/workspace/lafea-analytical-calc-content.js` mounts the A/B custody evidence and bounded C route summary on the existing analytical workbench.

`src/workspace/lafea-guided-workflow-view.js` wording now distinguishes “bounded route qualified” from “workspace/full-domain blocked”; C remains disabled pending a real workspace transaction.

## Qualification / falsifiers authored

`scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs` now asserts or falsifies:

1. real A/B/C successful bounded route;
2. source-derived Rm=100, T=20, r0=17.714285714..., gamma=5, beta=.155;
3. retained target `[0,0,0]`, vessel axis `[1,0,0]`, nozzle/radial axis `[0,0,1]`;
4. original WRC loads remain `P=-1000, Vc=250, Vl=-400, Mc=500000, Ml=-600000, Mt=700000`;
5. unchanged/local-method/load invalidation semantics;
6. gamma15 from real source geometry blocks before C;
7. beta-high from real source geometry blocks before C;
8. nonzero differential pressure remains rejected;
9. caller geometry/reference/axes/stress-concentration fields are rejected;
10. equal-gamma/beta absolute-geometry drift is rejected by B evidence replay;
11. retained A reference and axis tamper are rejected by payload-hash reconstruction;
12. pinned route authority spoofing remains ignored/rebuilt;
13. independent 100000 N.mm reference-offset arithmetic;
14. unscoped legacy orchestrator compatibility.

`scripts/emp1-public-product-check.mjs` now asserts one registered bounded route, its exact gamma/beta/dp domain, and continued false workspace/global/release authority.

## Active issues / decisions

- `ISS-001` **IMPLEMENTED / REOBSERVATION_PENDING** — caller-owned WRC absolute geometry removed.
- `ISS-002` **IMPLEMENTED / REOBSERVATION_PENDING** — caller-owned WRC reference and axes removed.
- `ISS-003` **IMPLEMENTED PARTIAL** — A/B/C evidence UI added; actual visible C execution transaction remains intentionally unwired.
- `ISS-004` **OPEN** — stacked branch must reconcile current-main EMP.1/UI changes after exact-head qualification.
- `RISK-001` UI must remain projection-only.
- `RISK-002` no route-domain widening.
- `RISK-003` do not mask CI failures by weakening existing WRC or browser oracles.
- `DEC-001` stack on #1301 instead of editing its validated PR.
- `DEC-002` reuse existing LAFEA.2 geometry evidence; no second geometry authority.
- `DEC-003` derive reference/axes from retained A result.
- `DEC-004` show bounded C route truth but keep C workspace button disabled until actual transaction wiring exists.
- `DEC-005` no workflow changes in this PR.

## Protected invariants / negative assurance

Unchanged and not authorized to widen:

- WRC537 Table-5 equations;
- coefficient data and figure maps;
- WRC load transform/sign reconstruction;
- WRC source SHA and dataset hash;
- exact source-tabulated gamma=5;
- beta 0.05..0.50;
- differential pressure = 0;
- Kn=Kb=1;
- Original curve variant only;
- interpolation=false;
- cross-variant fallback=false;
- global/full-domain EMP.1.C=false;
- passIsCodeCompliance=false;
- releaseQualified=false.

No pressure-thrust route, WRC297, non-unity Appendix-B factors, gamma>5 route, Edition-4 authority or code acceptance has been added.

## Validation ledger

| Check | Status | Observation | Oracle | Applicable head | Notes |
|---|---|---|---|---|---|
| #1301 orchestration qualification | HISTORICAL PASS / NOT CURRENT | REMOTE_EXECUTION | independent + implementation-coupled | dependency head | predecessor evidence only |
| source-bound orchestration qualification v3 | IN_PROGRESS | GitHub workflow `EMP.1 runEmp1 bounded gamma5 orchestration` | implementation-coupled + analytical falsifiers | `ba357271...` | exact result pending |
| gamma5 bounded route re-observation | QUEUED/IN_PROGRESS | GitHub workflow | independent Table-5 + route falsifiers | `ba357271...` | exact result pending |
| current-main independent baseline | IN_PROGRESS | GitHub workflow | independent gamma15 baseline | `ba357271...` | must remain unchanged |
| visible workbench qualification | QUEUED | GitHub workflow | browser/workbench contracts | `ba357271...` | UI changed; required |
| independent reference-offset arithmetic | AUTHORED / NOT YET OBSERVED | qualification script | analytical | `ba357271...` | 100000 N.mm expected |
| local checkout execution | NOT_RUN | NOT_OBSERVED | none | current | runtime environment could not resolve github.com; no local PASS claimed |
| full repository regression | NOT_RUN | NOT_OBSERVED | none | current | not claimed |

## Changed-file ledger

| Path | Type | Purpose |
|---|---|---|
| `src/core/emp1/emp1-wrc537-source-custody.js` | NEW production | retained A/B source custody, geometry/reference/axis derivation and replay |
| `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` | MOD production | identity-only request and source-derived C inputs |
| `src/core/emp1/index.js` | MOD export | expose source-custody API |
| `scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs` | MOD qualification | real B evidence + source-custody falsifiers |
| `src/core/emp1/emp1-public-product-contract.js` | MOD product projection | bounded C route truth without workspace/global authority |
| `scripts/emp1-public-product-check.mjs` | MOD product qualification | assert bounded C projection/negative authority |
| `src/workspace/emp1-engineering-evidence-view.js` | NEW UI | pure A/B/C engineering evidence renderer |
| `src/workspace/lafea-analytical-calc-content.js` | MOD UI | mount A/B custody and bounded C evidence |
| `src/workspace/lafea-guided-workflow-view.js` | MOD UI | accurate bounded-vs-global C wording |
| `agents/PR1304_workreport.md` | living handover | current recovery/evidence record |

## Exact continuation

1. Inspect exact-head GitHub workflow outcomes and job logs.
2. If source-bound orchestration fails, fix the first production/test mismatch without changing Table-5 or domain authority.
3. If visible workbench fails, preserve current UI contracts where they are still authoritative; do not hide/disable evidence to make tests pass.
4. Add/adjust focused UI contract checks only after workflow evidence identifies gaps.
5. Reconcile #1304 onto then-current `main` only after the stacked slice is internally green; repeat source/oracle/browser checks after reconciliation.
6. Keep PR DRAFT; do not merge without explicit owner authorization.

## Appendix A — takeover qualification questions

A1 Trace the exact hash chain from retained A model/result and B screening request/result through correlation geometry evidence into `wrcSourceCustody`, load custody and C result hash.

A2 Explain why scaling OD/T/attachment diameter by the same factor preserves gamma/beta but changes dimensional WRC stresses, and why replay against retained B evidence must reject that substitution.

A3 Show why the selected A target point is a stronger WRC reference authority than a caller-supplied coordinate that merely agrees with itself elsewhere.

A4 State every engineering authority that remains false after this PR, including global C, nonzero dp, non-unity Kn/Kb, gamma>5, WRC297, code compliance and release qualification.

A5 Explain why the C UI remains disabled even though the bounded route is registered, and identify the required next product increment for a real visible A→B→C execution transaction.
