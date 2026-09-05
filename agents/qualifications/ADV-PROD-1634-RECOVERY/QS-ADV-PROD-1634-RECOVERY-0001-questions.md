QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
CHAIN_ID: ADV-PROD-1634-RECOVERY
QUESTION_SET_ID: QS-ADV-PROD-1634-RECOVERY-0001
QUALIFICATION_SCOPE_ID: QSCOPE-1634-PRODUCTION-BOOT-UI-FEA-RECOVERY
QUALIFICATION_BASIS_HEAD: ad72465b4359fc660dd68e7cb04a1e091c2fe3b9
QUESTION_SET_STATUS: CURRENT
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
OWNER_QUALIFICATION_BASELINE: QB-ISSUE-1634-A
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a

# Q1 — Production Trace

**Domain challenge:** Trace one actual production application start and one LAFEA.4 result from source ownership through browser presentation without allowing the UI to become engineering authority.

**Repository anchors:** `vite.config.js`; `src/main.js`; `src/core/local-shell/**`; `src/workspace/lafea-stage-components.js`; `src/workspace/lafea-result-presenters/**`; `scripts/lafea.4-production-route-benchmarks-check.mjs`; `agents/chains/ADV-LFEA-ERROR-CHECK-AUTHORIZATION-UI/endpoints/EP-0002.md`.

**Production object/case:** current-main production bundle at `ad72465...`, observed startup failure `core-linear-piping-C9IC1q8P.js:1:8238`; LAFEA4-COMB-01 element-local membrane/curvature recovery on the two-triangle patch.

**Exact repository data required:** the current manual chunk rules, the two known reverse core dependency edges, LAFEA.4 retained `meshEvidence.localFrame`, result schema fields, and presenter consumption path.

**Concrete payload:** explain why forcing `/src/core/linear-piping-*` into `core-linear-piping` while geometry/default core is in `core-application` can create a temporal-dead-zone cycle when imports exist in both directions; name the two currently demonstrated reverse edges. Then trace one element result from canonical model → mesh evidence/local frame → solve/recovery → retained result → presenter.

**Required derivation:** construct the directed chunk dependency graph and identify the minimum strongly-connected set; separately show that the presenter can display a local result but cannot redefine the frame or recompute stress.

**Required numerical/technical evidence:** exact chunk names/error locus from EP-0002; exact source paths for both reverse edges; exact local-frame/result field names.

**First authority/ownership boundaries:** chunking/build ownership is software infrastructure; shell formulation/recovery and result-frame semantics remain `local-shell` engineering authority; UI/presenter remains read-only projection.

**Fail if:** the answer proposes changing solver/recovery/oracle values to fix startup, treats dev-server boot as production boot, or allows presentation code to become the calculation owner.

# Q2 — Current Unresolved Problem / Failure Isolation

**Domain challenge:** Prove the LAFEA.4 local/global frame issue independently and use it as a falsifier against changing shell mechanics when the demonstrated defect is an oracle-frame mismatch.

**Repository anchors:** `scripts/lafea.4-membrane-check.mjs`; PR #1632 versions of `scripts/lafea.4-mitc-adoption-shared-qualification-check.mjs` and `scripts/lafea.4-production-route-benchmarks-check.mjs`; `src/core/local-shell/**`.

**Calculation/reconstruction:** Rotate a global plane-stress tensor and an engineering-strain triple into a facet whose local x-axis has `c=2/sqrt(5)` and `s=1/sqrt(5)` (26.565051°).

**Exact repository data required:** local-frame convention and engineering shear/twist convention used by LAFEA.4.

**Concrete payload:** global stress `[sigmaX,sigmaY,tauXY] = [120,40,30] MPa`; global engineering strain `[epsilonX,epsilonY,gammaXY] = [0.0010,-0.0002,0.0006]`; `c=2/sqrt(5)`, `s=1/sqrt(5)`.

**Required derivation:** compute `sigma'_x`, `sigma'_y`, `tau'xy` using tensor rotation and compute `epsilon'_x`, `epsilon'_y`, `gamma'xy` using the doubled engineering-shear transform. Show which invariants are unchanged. Then explain why raw global component comparison against local element output is invalid.

**Required numerical/technical evidence:** all six transformed components to at least 8 significant digits; stress trace and principal-stress invariance; strain tensor invariance when engineering shear is halved for tensor form.

**Predicted intermediate values:** explicitly derive `c^2=0.8`, `s^2=0.2`, `cs=0.4` before substitution.

**First wrong boundary:** qualification oracle frame if production local values transform back to the global tensor and equilibrium/energy remain correct.

**Falsifier:** if transformed-back production results fail the same independent global tensor or if energy/equilibrium fail, the problem is not only the test oracle and production mechanics must be re-opened.

**Fail if:** engineering shear is transformed as tensor shear without the factor-of-two convention, or tolerance/expected values are tuned to production output.

# Q3 — Authority / Invariant

**Domain challenge:** Define the smallest safe production-boot repair while respecting active-chain engineering authority and the Owner-required UI/layout recovery.

**Repository anchors:** `AGENTS.md`; `vite.config.js`; `scripts/bundle-chunk-check.mjs`; `scripts/bundle-chunk-ownership-check.mjs`; `src/core/linear-piping-analysis-consumer/restraint-spring-rate.js`; `agents/chains/ADV-LFEA-SUPPORT-REPRESENTABILITY/ACTIVE.md`; `src/core/geometry/adapters/inputxml-unit-system.js`; `src/core/geometry/adapters/inputxml-resolved-ground-truth.js`; `src/core/linear-piping-presentation/export.js`; PR #1635.

**Required technical work:** identify every authority touched by a chunk-cycle repair and every authority that must remain unchanged.

**Exact repository data required:** Issue #1551 chain statement that spring-rate conversion/withholding is protected; its current formula owner; hard chunk ceiling; workflow mutation prohibition; property-inspector presentation-only diff.

**Concrete payload:** Common basis `293a3db7993a6945c01adc592a7ff14a339c504a`; current hard chunk ceiling `1.125 MiB`; untouched-head startup exception at `core-linear-piping-C9IC1q8P.js:1:8238`.

**Required derivation:** demonstrate a one-way dependency arrangement that removes the cross-chunk strongly-connected component without moving or rewriting the qualified spring-rate arithmetic. Explain how a neutral serializer/helper may be extracted only if failure semantics and hashes remain byte/semantic compatible.

**Authority/source trace:** Owner instruction → Issue #1634 → Common/project policy → active #1551 spring-rate authority → build/chunk configuration → browser smoke.

**Protected invariant:** no change to spring-rate conversion, shell solver/formulation/recovery, benchmark expected values/tolerances, source/applicability authority, workflow files, or release authority merely to obtain green.

**First wrong boundary:** module/chunk dependency ownership until a built-browser reproduction disproves it.

**Falsifier:** a built bundle with the proposed graph change still throws a TDZ/startup exception, or a focused spring-rate/export semantic regression changes output.

**Invalid shortcut:** raise the bundle ceiling, collapse everything into one forced chunk, modify `restraint-spring-rate.js` arithmetic, or change workflow YAML without explicit Owner authority.

**Fail if:** the answer conflates mergeability/build success with release qualification.

# Q4 — Independent Validation

**Domain challenge:** Reconstruct manual and published shell oracles independently of the production implementation.

**Repository anchors:** `docs/LAFEAagent.md` verification ladder; `docs/conceptcumroadmapLAFEA.md`; `scripts/lafea.4-*.mjs`; benchmark registry to be created under this chain/validation scope.

**Calculation/reconstruction:** perform two manual calculations and define three published-benchmark reproductions.

**Exact repository data required:** current canonical units mm/N/MPa/radian/inverse-mm and result surface/frame convention.

**Concrete payload A — pure bending:** isotropic plane stress `E=200000 MPa`, `nu=0.3`, thickness `t=2 mm`, midsurface strain `epsilon0=[0,0,0]`, curvature `kappa=[1.0e-4,0,0] 1/mm`. Use `z=-1,0,+1 mm`. **Required derivation:** calculate `epsilon(z)=epsilon0+z*kappa` and `sigma(z)=D*epsilon(z)` at BOTTOM/MIDSURFACE/TOP, including `sigmaY` from Poisson coupling and zero expected shear.

**Concrete payload B — cantilever strip:** `L=1000 mm`, width `b=100 mm`, thickness `t=10 mm`, `E=200000 MPa`, end load `P=100 N`. **Required derivation:** compute `I=b*t^3/12`, Euler-Bernoulli `delta=PL^3/(3EI)`, root `M=PL`, and extreme-fiber `sigma=Mc/I`. State the modelling/BC conditions required before comparing this beam reference to a shell strip. Do not add a shear term unless the formulation and comparison case actually carry transverse shear.

**Published benchmarks:** reproduce and cite exact source definitions for (1) Scordelis-Lo roof, (2) pinched cylinder, and (3) twisted beam. The source set must include MacNeal-Harder (1985) and the MITC literature (Dvorkin-Bathe 1984 and/or Ko-Lee-Lee-Bathe 2017). Freeze geometry, material, BC, load, mesh convention, QoI location/direction, units and reference source before implementation results are examined.

**Independent oracle:** hand mechanics plus authoritative published benchmark definitions/reference solutions. Production output is never the oracle.

**Required numerical/technical evidence:** manual values with units; mesh ladders; relative error; observed convergence; regular/distorted mesh comparison; thickness sensitivity where literature defines it; source locator/DOI/page/table/figure for each frozen reference.

**Units/sign/tolerance:** tolerances are derived from exact arithmetic/conditioning or declared published/convergence criteria, never reverse-fitted from production output.

**Falsifier:** a benchmark only passes after changing its published definition, QoI location, tolerance, mesh family, or production formulation without separate authority.

**Fail if:** a folklore Scordelis-Lo number is accepted without source-custody verification, or a single displacement match is treated as complete shell qualification.

# Q5 — Next Contribution / Minimal Patch

**Domain challenge:** Design the staged recovery so boot, UI/layout, numerical verification and release authority remain separable and reversible.

**Repository anchors:** Issue #1634; PRs #1632/#1635; `vite.config.js`; bundle checks; LAFEA core/solver/import/build gates; `docs/conceptcumroadmapLAFEA.md`; `docs/LAFEAagent.md`; Common basis `293a3db7993a6945c01adc592a7ff14a339c504a`.

**Required technical work:** identify the first safe material leg and the complete downstream gate sequence.

**Concrete payload:** P0 startup exception; 1.125 MiB ceiling; PR #1632 exact-head CI NOT_RUN; manual cases `epsilon(z)=epsilon0+z*kappa` and `delta=PL^3/(3EI)`; published cases Scordelis-Lo, pinched cylinder, twisted beam.

**Required derivation:** show why the first material patch should only break the demonstrated unsafe dependency/chunk cycle while preserving qualified engineering owners. Then specify before/after graph evidence, built-browser smoke, static cycle guard, focused regression checks, and rollback trigger. Separately specify later UI/layout and benchmark legs.

**Safe patch boundary:** build/dependency ownership only for Leg 1; no shell mechanics, spring-rate arithmetic, benchmark expected values, workflow, roadmap, or release mutation.

**Expected before/after evidence:** before = reproducible TDZ startup exception; after = built `dist/` opens with zero page/startup exceptions and focused semantic regressions unchanged. Chunk-size FAIL may remain as a separately tracked P1 after boot is restored.

**Protected unchanged domains:** shell formulation/recovery; #1551 spring-rate conversion/withholding; source/applicability; published benchmark definitions; acceptance tolerances; workflow YAML; `RELEASE_QUALIFIED`.

**Validation required:** static dependency graph guard, build output inspection, real production-bundle browser smoke, focused spring-rate/export regressions, `check:imports`, shell/LFEA checks affected by dependency movement, then later LAFEA benchmark ladder and UI walkthrough.

**Negative test:** deliberately reintroduce a forbidden core cross-import or unsafe chunk back-edge and prove the new guard fails before browser release.

**Rollback/falsifier boundary:** if boot still fails, if semantic hashes/exports/spring-rate outputs change, or if the patch creates a new chunk cycle, revert the graph patch and re-isolate rather than broadening scope.

**No-patch condition:** do not modify numerical mechanics/oracles/UI authority merely because build/boot infrastructure is red; do not modify workflow files without explicit Owner authorization; do not flip release state until every release gate is independently evidenced.

**Fail if:** the proposed recovery is one monolithic PR, silently changes an active chain’s authority, or treats source inspection/NOT_RUN as PASS.
