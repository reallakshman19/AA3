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
- `PR_HEAD_OBSERVED: bb6a9382894357066fb2a6469b679332f1719c2f`
- `REPORT_BASIS_HEAD: bb6a9382894357066fb2a6469b679332f1719c2f`
- `MAIN_HEAD_LAST_CHECKED: da483e005c46582c86efce2b83218c85594fa562`
- `MERGE_BASE_WITH_MAIN: ddfad5cd12cdbf271509031817ad9590704620c3`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: CURRENT`
- `GROUNDING_EPOCH: GE-002`
- `CURRENT_STAGE: P0_SOURCE_CUSTODY_IMPLEMENTATION`
- `CURRENT_BLOCKER: VALIDATION_NOT_YET_EXECUTED`
- `HIGHEST_RISK: source-derived WRC geometry/reference/axes must not change qualified Table-5 mechanics or widen route authority`
- `EXACT_NEXT_ACTION: export source-custody API, replace PR1301 synthetic B qualification with real retained LAFEA.2 evidence, and run/observe focused falsifiers where available`

## Handover in 60 Seconds

PR #1304 is the stacked successor to draft #1301. #1301 qualifies the bounded WRC537 gamma=5, zero-dp route through `runEmp1()` but still accepted caller-authored `Rm/T/r0`, WRC reference coordinates, axis vectors and Kn/Kb. #1304 has begun removing that duplicate engineering authority.

Current production slice:

```text
retained LAFEA.1 foundation result
        +
real retained LAFEA.2 screening request/result
        +
source-bound attachment diameter
        ↓
existing correlation geometry evidence
        ↓
WRC source custody
  Rm = OD/2 - T/2
  T  = assessment pipe thickness
  r0 = attachment diameter/2
  gamma = Rm/T
  beta  = 0.875*r0/Rm
  WRC reference = selected A load-case target point
  vessel axis = retained A eX
  nozzle/radial axis = retained A eZ
  Kn=Kb=1 = pinned bounded-route authority
        ↓
existing qualified gamma5 WRC route
```

The orchestration request is now identity-only (`loadCaseIdentity`, `pressureResultIdentity`). Free-standing physical WRC geometry/reference/axes/Kn/Kb are rejected as unsupported request fields.

UI work is not yet implemented. Validation of this new slice is `NOT_RUN`; inherited #1301 PASS evidence no longer qualifies the modified production head until re-observed.

## Grounding epochs

### GE-001 — bootstrap

- Repo: `reallaksh19/Advanced_Analysis`
- main observed: `da483e005c46582c86efce2b83218c85594fa562`
- dependency #1301: OPEN / DRAFT / unmerged, exact head `af1bd57d7c7bb178be3909628e3a0d34d1aaea3a`
- #1301 workreport: handover-ready, exact-head orchestration workflows recorded PASS, Chromium NOT_RUN.
- main and #1301 diverged after merge base `ddfad5cd12cdbf271509031817ad9590704620c3`.
- coordination: `COORDINATION_REQUIRED_BUT_STACK_SAFE`.

### GE-002 — first production checkpoint

- PR #1304 allocated and remains DRAFT.
- branch based exactly on #1301 head.
- production changes through `bb6a9382894357066fb2a6469b679332f1719c2f` are described below.
- no workflow file changed.
- current-main reconciliation deferred until this stacked slice is internally qualified.

## Mission / acceptance

### P0-A — runtime geometry custody

- WRC `Rm`, `T`, `r0`, `gamma`, `beta` must come from retained governed geometry evidence, not a parallel caller model.
- inconsistent/tampered duplicate geometry must fail before Table-5 evaluation.
- equal gamma/beta with different absolute dimensions must not silently represent the same physical source.

### P0-B — reference and axis custody

- selected WRC reference must come from retained A load transfer target evidence.
- WRC axes must come from retained A coordinate-system evidence.
- tampering source result/reference/axis evidence must invalidate its retained hash and fail closed.

### UI-A/B/C

- A: named Fx/Fy/Fz/Mx/My/Mz, action sense, source/target references, axis basis, pressure disposition.
- B: OD/thickness/mean-radius lineage, A→B currentness and source hashes.
- C: bounded method/domain status, source-bound geometry, gamma/beta, WRC P/Vc/Vl/Mc/Ml/Mt, Au/Al/Bu/Bl/Cu/Cl/Du/Dl, governing location and blockers.
- UI is read-only projection and never calculation authority.

## Current implementation

### `src/core/emp1/emp1-wrc537-source-custody.js`

New bounded-route source-custody adapter. It intentionally reuses `createCorrelationGeometryEvidenceFromLafea2()` rather than creating a competing geometry authority.

- `createEmp1RetainedSectionScreeningLayer()` retains a real accepted LAFEA.2 request/result and exact source-bound attachment geometry evidence.
- retained B geometry evidence is replayed from the retained B request/result before use.
- exact A foundation result hash is reconstructed before it can become reference/axis authority.
- source geometry is derived as `Rm=OD/2-T/2`, `T=assessment thickness`, `r0=attachment diameter/2`.
- gamma/beta use the existing bounded WRC geometry derivation.
- WRC reference is the selected A transformed load case's retained target point.
- WRC vessel/nozzle axes are retained foundation `eX/eZ` respectively; handedness/orthogonality evidence is carried through.
- Kn/Kb remain pinned to unity and are not caller inputs.

### `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js`

Request contract advanced to `.../v2` and accepts only:

```text
schema
loadCaseIdentity
pressureResultIdentity
```

Removed caller authority:

```text
wrcReferencePointGlobal
geometry
axes
stressConcentration
```

`prepareEmp1Wrc537Gamma5ZeroDpLocalSource()` derives a `wrcSourceCustody` from current A/B evidence, then creates zero-dp load custody using the derived target point. `runEmp1Wrc537Gamma5ZeroDpLocalCorrelation()` sends only the derived custody geometry/reference/axes/Kn/Kb into the unchanged route.

The C result now retains `sourceCustody` before its semantic result hash is calculated.

## Active items

- `ISS-001` **IMPLEMENTING** — caller-owned absolute WRC geometry authority removed; qualification/falsifier pending.
- `ISS-002` **IMPLEMENTING** — caller-owned WRC reference and axes removed; tamper/falsifier pending.
- `ISS-003` **OPEN** — engineer-facing A/B/C evidence UI not yet upgraded.
- `RISK-001` UI must never author/override solver inputs.
- `RISK-002` no route-domain widening while repairing source custody.
- `RISK-003` stacked branch has current-main drift; do not silently cherry-pick broad main changes into the engineering slice.
- `DEC-001` stack on #1301 and preserve its qualified numerical mechanics.
- `DEC-002` Edition-4 source-data and generic correlation-framework PRs remain separate authority workstreams.
- `DEC-003` reuse existing LAFEA.2 correlation geometry evidence as the source-bound OD/T/attachment-diameter primitive.
- `DEC-004` derive WRC reference and axes from retained A load/frame evidence rather than adding new caller declarations.

## Authority / negative assurance

May change: bounded-route source input custody; orchestration preparation; product/read-only presentation; focused tests.

Must remain invariant:

- WRC537 Table-5 coefficient data and equations;
- curve figure mapping and stress sign reconstruction;
- source SHA/dataset hash;
- exact tabulated gamma=5;
- beta 0.05..0.50;
- differential pressure = 0;
- Kn=Kb=1;
- Original curves only;
- interpolation=false;
- cross-variant fallback=false;
- global/full-domain EMP.1.C authority=false;
- releaseQualified=false;
- passIsCodeCompliance=false.

## Validation ledger

| Check | Status | Observation | Oracle | Applicable head | Notes |
|---|---|---|---|---|---|
| #1301 orchestration qualification | HISTORICAL PASS / NOT CURRENT | REMOTE_EXECUTION | INDEPENDENT_REPRODUCTION + implementation-coupled | dependency head | production changed in #1304; requires re-observation |
| source-custody focused qualification | NOT_RUN | NOT_OBSERVED | ANALYTICAL + IMPLEMENTATION_COUPLED | `bb6a938...` | next required gate |
| independent reference-offset arithmetic | NOT_RUN | NOT_OBSERVED | ANALYTICAL | pending | expected `100 mm * 1000 N = 100000 N.mm` |
| exact gamma5 WRC numerical oracle | NOT_RUN on #1304 | NOT_OBSERVED | INDEPENDENT_REPRODUCTION | pending | must show zero numerical drift |
| staged A/B/C UI/browser | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | pending | UI not yet authored |
| full repo regression | NOT_RUN | NOT_OBSERVED | NONE | pending | not claimed |
| local checkout execution | NOT_RUN | NOT_OBSERVED | NONE | current | active environment could not resolve github.com; no local PASS claimed |

## Changed-file ledger

| Path | State | Purpose |
|---|---|---|
| `src/core/emp1/emp1-wrc537-source-custody.js` | NEW production | derive/replay bounded WRC physical input custody from retained A/B evidence |
| `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` | MODIFIED production | identity-only request; consume source-derived geometry/reference/axes/Kn/Kb |
| `agents/PR1304_workreport.md` | CURRENT handover | living recovery record |
| `agents/WIP-EMP1-04-custody-ui-20260820.md` | TO_DELETE | superseded by allocated PR report |

## Exact continuation

1. Export source-custody API from `src/core/emp1/index.js`.
2. Replace synthetic B wrapper in `scripts/emp1-wrc-gamma5-zero-dp-orchestration-qualification.mjs` with actual LAFEA.2 screening request/result and retained source geometry.
3. Add falsifiers for removed caller physical fields, B geometry tamper (including equal gamma/beta scaling attempt), A result/reference tamper and beta/gamma source-domain cases.
4. Re-observe exact WRC loads and 32 stress outputs; no numerical drift is permitted.
5. Then implement stage A/B/C read-only UI evidence.

## Appendix A — implementation authorization challenges

A1 Production trace: trace exact retained fields producing WRC `Rm/T/r0`, target reference and axes after `bb6a938`; identify every retained hash that must agree.

A2 Failure isolation: scale OD/T/attachment diameter together so gamma/beta remain unchanged; explain why replay against retained LAFEA.2 request/result must reject the changed physical geometry before WRC dimensional scaling.

A3 Authority/invariant: explain why replacing caller physical declarations with A/B-derived evidence must not change any WRC curve coefficient, figure map, load transform or Table-5 sign.

A4 Independent validation: prove `100 mm * 1000 N = 100000 N.mm` and explain why common-origin equilibrium is insufficient if both source and duplicate WRC target reference are consistently wrong.

A5 Minimal next patch: replace the synthetic section-screening layer in #1301 qualification with a real LAFEA.2 retained result and prove the original WRC benchmark loads/stresses remain identical.
