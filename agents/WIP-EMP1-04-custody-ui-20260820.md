# WIP — EMP1-04 WRC custody and staged UI

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: WRITE_ALLOWED`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `EXECUTION_MODE: MANUAL`
- `DEPENDENCY_PR: #1301`
- `DEPENDENCY_HEAD: af1bd57d7c7bb178be3909628e3a0d34d1aaea3a`
- `BRANCH: agent/emp1-04-custody-ui-20260820`
- `BASE_BRANCH: agent/emp1-03-runemp1-orchestration-issue1261`
- `MAIN_HEAD_LAST_CHECKED: da483e005c46582c86efce2b83218c85594fa562`
- `MERGE_BASE_WITH_MAIN: ddfad5cd12cdbf271509031817ad9590704620c3`
- `REPORT_BASIS_HEAD: af1bd57d7c7bb178be3909628e3a0d34d1aaea3a`
- `REPORT_SYNC: CURRENT`
- `APPENDIX_A_STATUS: CURRENT`
- `GROUNDING_EPOCH: GE-001`
- `CURRENT_STAGE: BASELINE_AND_SOURCE_TRACE`
- `CURRENT_BLOCKER: NONE`
- `HIGHEST_RISK: WRC runtime dimensions/reference may remain caller-consistent but physically unbound`
- `EXACT_NEXT_ACTION: trace PR1301 geometry/reference inputs into bounded WRC route and workspace projection before first production patch`

## Handover in 60 Seconds

This is the stacked successor to draft PR #1301. PR1301 already qualifies the bounded WRC537 gamma=5, zero-dp route through real `runEmp1()` and explicitly excludes workspace/UI changes. This increment must preserve those equations, coefficient tables, load transform, gamma/beta domain, zero-dp restriction, Kn=Kb=1 restriction, and global-route=false authority.

The mission is to close the current wrong-result seams identified by independent audit while making each EMP.1 stage engineer-readable:

1. **A — Load & reference:** visibly show source load reference, transferred WRC reference, axis basis and custody/currentness.
2. **B — Section screening:** visibly show geometry/thickness lineage and the exact source evidence inherited from A.
3. **C — Local correlation:** derive or prove WRC geometry/reference/axes from governed source evidence, fail closed on mismatch, and display gamma/beta/domain/load/reference/result trace.

Do not widen WRC engineering authority. Do not touch Edition-4 source-package work (#1211/#1207). Do not replace generic correlation applicability work (#1187/#1199). Do not add pressure thrust, WRC297, non-unity Kn/Kb, gamma>5, code compliance, release qualification or workflow files without separate authorization.

## Live ground truth — GE-001

- Repository: `reallaksh19/Advanced_Analysis`
- Default branch: `main`
- Current main observed: `da483e005c46582c86efce2b83218c85594fa562`
- Dependency PR #1301: OPEN / DRAFT / unmerged, head `af1bd57d7c7bb178be3909628e3a0d34d1aaea3a`
- PR1301 workreport: `HANDOVER_READINESS=READY`; exact-head orchestration workflows recorded PASS; Chromium `NOT_RUN` because no UI change.
- Main vs PR1301: diverged. Main is four commits ahead of the PR1301 merge base and PR1301 is eight commits ahead; current main changes include EMP.1 presentation/currentness plus unrelated LFEA ACCDB UI changes.
- Coordination classification: `COORDINATION_REQUIRED_BUT_STACK_SAFE`. This branch is stacked on #1301 and will not mutate #1301. Open generic correlation and Edition-4 drafts are observe-only authority dependencies.

## Mission / acceptance

### Phase P0-A — runtime geometry custody

- WRC `Rm`, `T`, `r0`, `gamma`, `beta` must be reproducibly tied to source/governed geometry evidence rather than free-standing caller numbers.
- Any inconsistent duplicate geometry must fail closed before Table-5 evaluation.
- Add a falsifier where equal gamma/beta but changed absolute dimensions cannot silently pass as the same physical model.

### Phase P0-B — reference and axis custody

- WRC load reference must be derived/proven against governed source reference evidence.
- Vessel/nozzle axes must retain source/reference evidence and explicit polarity/basis interpretation.
- A consistent-but-wrong duplicate reference must not be sufficient authority.

### Phase UI-A/B/C

- Stage A: named force/moment components, action sense, source/target references, axis basis and pressure-thrust status.
- Stage B: geometry/thickness/source currentness, section-screening resultants and explicit limitations.
- Stage C: method/domain card, source-bound geometry, gamma/beta, WRC P/Vc/Vl/Mc/Ml/Mt, eight Au/Al/Bu/Bl/Cu/Cl/Du/Dl results, governing location and blockers.
- UI remains projection-only; it never becomes calculation authority.

### Validation

- Existing PR1301 gamma5 oracle and route mechanics must remain numerically unchanged.
- New source-custody regressions must be implementation-coupled plus at least one independent arithmetic falsifier.
- Browser/UI checks must be authored; actual execution is recorded PASS/FAIL/NOT_RUN truthfully.

## Active items

- `ISS-001` WRC absolute geometry can be supplied independently of upstream physical geometry.
- `ISS-002` caller-consistent WRC reference can be wrong relative to the physical junction.
- `ISS-003` engineer-facing EMP.1 does not expose C calculation trace or stage-level custody clearly.
- `RISK-001` do not turn preview/UI declarations into solver authority.
- `RISK-002` do not widen gamma5 bounded method domain while repairing custody.
- `DEC-001` stack on #1301; preserve #1301 exact validated mechanics and keep this PR UI/custody-only.
- `DEC-002` Edition-4 source data and generic correlation-framework drafts are out of scope and must not be copied into this production route.

## Authority / negative assurance

Allowed to change: EMP.1 bounded-route input custody, orchestration-source preparation required to prove source binding, product projection/read-only presentation, focused regressions.

Must remain invariant: WRC537 Table-5 coefficient data/equations/sign reconstruction; WRC source SHA/dataset hash; gamma=5 exact tabulated policy; beta 0.05..0.50; zero differential pressure; Kn=Kb=1; no interpolation; no cross-variant fallback; global EMP.1.C unregistered; releaseQualified=false; passIsCodeCompliance=false.

## Validation ledger

| Check | Status | Observation | Oracle | Applicable head | Notes |
|---|---|---|---|---|---|
| PR1301 exact-head orchestration qualification | PASS inherited | REMOTE_EXECUTION | INDEPENDENT_REPRODUCTION + implementation-coupled | PR1301 validated code head | dependency evidence only; must revalidate after material changes |
| PR1301 Chromium/UI | NOT_RUN | NOT_OBSERVED | NONE | PR1301 | no UI in dependency |
| EMP1-04 focused source custody | NOT_RUN | NOT_OBSERVED | ANALYTICAL + implementation-coupled | pending | required |
| EMP1-04 browser staged UI | NOT_RUN | NOT_OBSERVED | implementation-coupled | pending | required |
| full repository regression | NOT_RUN | NOT_OBSERVED | NONE | pending | not claimed |

## Changed-file ledger

| Path | State | Purpose |
|---|---|---|
| `agents/WIP-EMP1-04-custody-ui-20260820.md` | current | durable recovery record before PR allocation |

## Exact continuation state

Trace these dependency paths first:

- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js`
- `src/core/emp1/emp1-wrc537-cylindrical-frame.js`
- `src/core/emp1/emp1-wrc537-load-custody.js`
- `src/workspace/lafea-analytical-calc-content.js`
- `src/workspace/lafea-guided-workflow-view.js`
- `src/core/emp1/emp1-public-product-contract.js`

## Appendix A — implementation authorization challenges

A1 Production trace: identify the exact fields currently supplying WRC `Rm/T/r0`, reference point and axes through PR1301 into Table-5, and identify which are derived vs caller-authored.

A2 Failure isolation: construct one case where gamma and beta stay identical but absolute dimensions change, predict which dimensional stress scale changes, and identify the first current code boundary that accepts the inconsistent physical geometry.

A3 Authority/invariant: state why source-bound geometry/reference custody may change without changing WRC coefficient selection, Table-5 signs or route-domain authority.

A4 Independent validation: define an arithmetic or source-independent falsifier proving that a 100 mm reference offset under a 1000 N force changes transported moment by 100000 N.mm and must be caught by physical reference custody rather than equilibrium alone.

A5 Minimal patch: identify the smallest production seam that can derive/prove geometry/reference evidence for the bounded route while keeping UI read-only and preserving #1301 invocation/currentness semantics.
