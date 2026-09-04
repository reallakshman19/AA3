ISSUE_CURRENT_STATE_VERSION: 1
CHAIN_ID: ADV-PROD-1634-RECOVERY
ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0003
UPDATED_AT: 2026-09-03

# Current state — Issue #1634 production recovery

## Original task / acceptance ledger

| ID | Requirement | Status | Current evidence / disposition |
|---|---|---|---|
| TASK-001 | Start fixing production-readiness gaps. | IN_PROGRESS | Recovery chain/plan + draft #1637 created; LEG-001 material patch implemented, focused semantics checked, production acceptance still pending. |
| TASK-002 | Use Common exact basis `293a3db7993a6945c01adc592a7ff14a339c504a`. | SATISFIED | Common skill + mandatory references re-grounded before material work. |
| TASK-003 | Restore production bundle browser boot. | PATCHED_NOT_VALIDATED | LEG-001 routes the existing import-free spring-rate authority leaf with generic core to remove the demonstrated generated chunk back-edge; production build/browser execution remains NOT_RUN. |
| TASK-004 | Restore build/chunk budget without weakening ceiling. | BLOCKED | Main ~1.8 MiB vs 1.125 MiB hard ceiling. LEG-002 may start only after boot disposition. |
| TASK-005 | Restore exact-head LAFEA.4 CI execution. | BLOCKED | PR #1632 exact head has no associated executing workflow; workflow mutation not authorized. LEG-003. |
| TASK-006 | Real-app LAFEA/UI flow recovery. | OPEN | Browser matrix defined in PLAN-0001; execution pending post-boot. |
| TASK-007 | Correct UI layout for engineering use. | PARTIAL | Draft PR #1635 covers property-inspector label wrapping only; full layout matrix pending. |
| TASK-008 | Keep UI/presentation non-authoritative. | OPEN | Presentation custody tests specified in LEG-005. |
| TASK-009 | Independent manual calculations. | OPEN | BM-001..BM-005 defined; execution/frozen expected artifacts pending. |
| TASK-010 | Published shell benchmark programme. | OPEN | Source candidates and BM-006..BM-009 defined; source custody/reference freezing pending. |
| TASK-011 | Preserve source/oracle/tolerance/solver/recovery authority. | ACTIVE_INVARIANT | LEG-001 changes no qualified spring-rate arithmetic or FEA mechanics; focused resolver normal + two negative controls executed successfully. |
| TASK-012 | Hold MITC release qualification until exact-head evidence. | HOLD | `RELEASE_QUALIFIED` remains false/held. |

## Input ledger

| ID | Input | Status | Evidence / note |
|---|---|---|---|
| INPUT-001 | current main `ad72465b4359fc660dd68e7cb04a1e091c2fe3b9` | AVAILABLE | branch recovery basis |
| INPUT-002 | PR #1632 head `5b755e645f41c5860cb380759e748b38110ad42b` | AVAILABLE | local/global oracle correction; draft |
| INPUT-003 | PR #1635 head `b4d199e29fe0a3ace61a71f487876e8218bf6072` | AVAILABLE | narrow property-inspector layout fix; draft |
| INPUT-004 | TDZ production smoke reproduction | AVAILABLE | `ADV-LFEA-ERROR-CHECK-AUTHORIZATION-UI/EP-0002.md` |
| INPUT-005 | chunk-size reproduction | AVAILABLE | same endpoint: untouched main 1,801,999 B vs 1,179,648 B |
| INPUT-006 | LEG-001 material head `62b5bd88d0d2b8997254215210124cfd32317043` | AVAILABLE_NOT_FULLY_EXECUTED | `vite.config.js` + ownership check only |
| INPUT-007 | spring-rate conversion owner | PROTECTED_AVAILABLE_PASS_FOCUSED | Issue #1551 source formula/withholding untouched; exact two-file resolver executed PASS; two deliberate-break controls exited nonzero |
| INPUT-008 | LAFEA source/result checks | AVAILABLE | `src/core/local-shell/**`, `scripts/lafea.4-*.mjs` |
| INPUT-009 | published benchmark references | PARTIAL | candidate literature identified; exact page/figure/value custody must be frozen before PASS |
| INPUT-010 | executable exact-head CI/runtime | UNRESOLVED | GitHub API `actions/runs?head_sha=65653aa...` returned `total_count=0` |

## Benchmark / oracle ledger

| ID | Status | Current evidence / next action |
|---|---|---|
| BM-001 Rotated affine membrane | READY | independent equations defined; freeze expected worksheet then execute |
| BM-002 Rigid motion | READY | exact invariant; execute on candidate |
| BM-003 Pure bending surfaces | READY | hand payload defined in Q4; freeze expected worksheet |
| BM-004 Pressure/resultant FBD | READY | free-body equations defined; execute |
| BM-005 Cantilever strip | READY | Euler-Bernoulli payload defined; verify shell idealization before comparison |
| BM-006 Scordelis-Lo | NOT_RUN | freeze exact source definition/reference provenance first |
| BM-007 Pinched cylinder | NOT_RUN | freeze source definition/QoI first |
| BM-008 Twisted beam | NOT_RUN | regular/distorted mesh ladder pending |
| BM-009 MITC thin-limit/distortion | NOT_RUN | thickness/distortion ladder pending |
| BM-010 Orientation/normal/permutation | READY | execute after production candidate established |
| BM-011 Solver/equilibrium/energy | NOT_RUN | execute focused + aggregate gates |
| BM-012 UI evidence fidelity | NOT_RUN | execute browser/view-model comparison after boot |

## LEG-001 validation ledger

| Check | Status | Evidence |
|---|---|---|
| Spring-rate resolver normal path | PASS | exact head source/check reconstructed and executed: `400 N/mm -> 400000 N/m`; unresolved units withheld |
| Spring-rate wrong-rate negative | PASS | `--deliberate-break-rate` exits nonzero |
| Spring-rate unresolved fallback negative | PASS | `--deliberate-break-unresolved` exits nonzero |
| Ownership guard source contract | PASS_SOURCE_INSPECTION | exact head checker asserts leaf -> `core-application`, geometry still imports same authority, authority leaf must remain import-free |
| Ownership guard executable | NOT_RUN | faithful full dependency runtime unavailable |
| `check:imports` | NOT_RUN | full repository/dependencies unavailable |
| production build | NOT_RUN | no runner/full dependency materialization |
| built-dist Chromium smoke | NOT_RUN | no candidate `dist/` artifact exists |
| exact-head GitHub Actions | NOT_RUN | zero runs for validated head `65653aa151be1d4c5bcad9ca478b001dfa81e2c5` |

## Roadmap ledger

| ID | Binding | Class | Status | Mutation authority |
|---|---|---|---|---|
| RM-001 | `docs/conceptcumroadmapLAFEA.md@088f4cebfd954e5d1e37da855c95142712463a31` | governing project roadmap | ALIGNED | NONE this leg |
| RM-002 | `docs/LAFEAagent.md@c4328e6a949c9004332a405aec335ec6ede62053` | technical qualification standard | ALIGNED | NONE |
| RM-003 | Common `engineering-pr-delivery-v2@293a3db7993a6945c01adc592a7ff14a339c504a` | protocol | CURRENT | Owner-selected basis |
| RM-004 | repository `AGENTS.md` | project overlay | ALIGNED | NONE |

## Owner qualification baseline

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: owner-chat:2026-09-03T02:09:47Z
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/ADV-PROD-1634-RECOVERY/qualification-baselines/QB-ISSUE-1634-A.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Current blocker / diagnosis

LEG-001 has implemented the smallest source-authority-preserving chunk-graph correction, and the protected spring-rate micro-gate now has executable positive/negative evidence. The production claim remains unaccepted because the full Vite/Rollup dependency graph has not been built and the generated `dist/` has not been booted in a real browser. The exact validated PR head has no Actions run.

## Exact next action

Do not make another material change. Obtain faithful exact-head execution of `bundle-chunk-ownership-check`, `check:imports`, production `npm run build`, and served-`dist/` Chromium smoke. PASS → accept LEG-001 and prepare measured LEG-002 size profiling. FAIL → freeze/re-isolate the generated SCC. All UI/layout/manual/published benchmark obligations remain open and release remains HOLD.
