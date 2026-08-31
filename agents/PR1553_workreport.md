# PR #1553 Work Report — LFEA support representability #1551

## Current state

```text
PR                         #1553
branch                     codex/lfea-support-representability-1551
state                      OPEN / DRAFT / UNMERGED
chain                      ADV-LFEA-SUPPORT-REPRESENTABILITY
current endpoint           EP-0028 (EP-0029 publication in progress)
current qualification      QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0029
qualification scope        QSCOPE-1551-FINITE-SKEW-SPRING-ASSEMBLY
latest technical head      695aed9899d86eb32e929bf1f2d3cd3d74ea008f
live main re-ground        70dd23a4fb36533f00d818586d1b753fa4f12276
Common live main           293a3db7993a6945c01adc592a7ff14a339c504a
merge authority            EXACT OWNER PHRASE `APPROVED MERGE` ONLY
```

Issue #1551 closes three terminal support-representability boundaries without reducer/parity scope drift: finite skew directional spring, finite CNODE relative spring, and a bounded predefined HANGER subset; rigid skew/CNODE remain MPC-gated.

Engineering policy: Common `engineering-pr-delivery-v2`, pinned basis `4b3a7a9c7ca2fac4a9182ef0028135d17eafaf02`.

## Engineering implementation state

### Finite skew spring

DRAFT production representation uses exact linear directional stiffness `k(n⊗n)`. The isolated production spring owner is `src/core/linear-fea-solver/spring-assembly.js`.

Exact assembly gate at `695aed9899d86eb32e929bf1f2d3cd3d74ea008f`:

- complete 15-file Git-blob closure verified;
- normal exit 0;
- `k=2000`, `n=[0.6,0.8,0]` gives `B=[[720,960,0],[960,1280,0],[0,0,0]]`;
- `u=[0.01,-0.02,0]` gives `q=-0.01`, `F=[-12,-16,0]`, strain energy `0.1`;
- orthogonal displacement `[0.008,-0.006,0]` gives zero force/energy;
- dominant-axis UX-snap falsifier exits 1 at `B[0,0]: expected 720, got 2000`.

This is constitutive/triplet assembly evidence only. Full InputXML structural declaration/compiler/solve remains NOT_RUN.

### Finite CNODE spring

DRAFT production representation is a two-node directional relative spring.

Exact evidence:

- topology/mechanism gate PASS/red: connected spring joins endpoints mechanically but is not ground;
- triplet assembly PASS/red: exact `[+B -B; -B +B]`, symmetry, equal/opposite endpoint action, energy and common-translation invariance;
- lost-connected-node falsifier red at `Kij[0,0]: expected -720, got 0`.

Full InputXML declaration/compiler/production solve and load-share remain NOT_RUN.

### Predefined HANGER

Bounded Y-vertical subset retains positive spring rate, positive cold load and positive integer hanger count. H-bearing Load-case -> Run custody is exact PASS/red. Full production mechanics/solve remains NOT_RUN. Alternate vertical-axis authority and hanger sizing/design are out of scope/fail closed.

### Rigid and malformed controls

Exact classifier-level refusal PASS/red:

- rigid CNODE -> `MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED`;
- rigid skew -> `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`;
- incomplete predefined HANGER -> `MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE`.

Native InputXML preflight propagation of these dedicated refusals remains NOT_RUN.

Rigid skew/CNODE require exact MPC/constraint equations. Penalty stiffness is prohibited as a substitute.

## Exact bounded runtime evidence accumulated

`PASS_EXACT_HEAD_GIT_BLOB_LOCAL` has been observed for:

1. visible reaction aggregation + deliberate break;
2. mixed unilateral + directional-spring review + break;
3. HANGER Load-case -> Run custody + four individual breaks + aggregate break;
4. blocked-execution public-result custody + break;
5. CNODE topology/mechanism + break;
6. spring-rate resolver including N/mm x1000 conversion + two breaks;
7. dedicated rigid-CNODE/rigid-skew/incomplete-HANGER classifier refusals + individual/aggregate breaks;
8. finite CNODE spring constitutive/triplet assembly + lost-connected-node break;
9. finite skew spring constitutive/triplet assembly + dominant-axis-snap break.

All local exact gates use Node v22.16.0. Evidence is admitted only after every file in the complete static runtime closure reproduces its repository Git blob SHA.

## External-reference / DRAFT boundary

Self-authored exercise models are mechanics evidence, not CAESAR reference answers. These packages remain absent:

- `REF-SKEW-01`;
- `REF-CNODE-01`;
- `REF-HGR-01`.

Therefore `DRAFT_SPRING_SUPPORT_NO_REFERENCE` remains mandatory and no feature may be promoted to reference-qualified parity.

## Frozen BM4_L non-regression authority

Frozen target:

```text
L2                  96.76%
L5                  93.00%
L6                  95.82%
>5% tail             7.99%
```

BM4_L contains none of the target support features, so it is non-regression evidence only. Current exact-head BM4 execution remains NOT_RUN.

## Runtime truth / NOT_RUN ledger

Hosted GitHub Actions have repeatedly failed before engineering steps execute (`runner_id:0` / empty runner / no steps); dependent BM4 jobs are skipped. That is infrastructure NOT_RUN, not application PASS/FAIL.

Still NOT_RUN:

```text
finite skew InputXML declaration/compiler/full solve        NOT_RUN
finite CNODE InputXML declaration/compiler/full solve       NOT_RUN
predefined HANGER production mechanics/full solve           NOT_RUN
native dedicated support-refusal preflight + break           NOT_RUN
broad INPUTXML_STRUCTURAL_SPRING_RATE_UNRESOLVED gate        NOT_RUN
mixed fixed + skew production exercise                       NOT_RUN
spring/full aggregate suites                                 NOT_RUN
repository imports/lint/diff                                 NOT_RUN
BM4_L before/after                                           NOT_RUN
external CAESAR skew/CNODE/HANGER qualification              NOT_RUN_EXTERNAL
```

## Authority boundary

This PR must not:

- alter solver formulation, stiffness equations, reaction/recovery convention or numerical tolerances merely to pass checks;
- use penalty stiffness for rigid skew/CNODE;
- claim CAESAR parity from self-authored models;
- clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE` without independent feature references;
- change reducer/parity, Timoshenko, pressure/code-stress, BM4 oracle, workflow, release or roadmap authority;
- infer alternate HANGER vertical axes without source authority;
- add hanger sizing/design authority.

## Drift and coordination

Live main advanced during this chain through unrelated WRC/LAFEA custody work. The latest `2bade51f... -> 70dd23a4...` compare changes only `ADV-LAFEA3-1535-PRODUCTION-ROUTE` chain/custody files and is authority-disjoint from the skew assembly gate.

PR may report non-mergeable while behind/diverged from live main. Do not reconcile or merge merely for status cosmetics; perform an explicit current-main overlap audit before any merge-readiness transition.

## Changed-file ledger — latest bounded leg

EP-0029 leg additions:

1. `scripts/lfea-skew-spring-assembly-check.mjs`
2. `agents/chains/ADV-LFEA-SUPPORT-REPRESENTABILITY/material-legs/LEG-005.md`
3. `agents/qualifications/ADV-LFEA-SUPPORT-REPRESENTABILITY/QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0029-questions.md`
4. `agents/PR1553_workreport.md`

EP-0028 introduced the behavior-preserving spring assembly ownership extraction:

5. `src/core/linear-fea-solver/spring-assembly.js`
6. `src/core/linear-fea-solver/assembly.js`
7. `scripts/lfea-cnode-spring-assembly-check.mjs`

Chain CURRENT/ACTIVE, endpoint and external issue/PR projections are updated at each endpoint publication.

## Current risks / debt

RISK-001: full finite-support production paths remain unexecuted beyond bounded topology/unit/case/assembly micro-gates.

RISK-002: independent CAESAR feature references are absent; all new support features remain DRAFT.

RISK-003: live-main drift requires a complete overlap/reconciliation audit before any merge-ready claim.

DEBT-001: the upstream CNODE/skew InputXML structural declaration/compiler-intake path still has eager package fan-out that makes exact isolated execution expensive.

DEBT-002: native preflight refusal propagation and broad structural spring-rate fail-closed gates remain runtime-unproven.

## Next action

After EP-0029 publication, prioritize a complete upstream finite-support declaration/compiler gate if its dependency closure can be proven. If not, target the predefined HANGER mechanics boundary or native dedicated-refusal preflight as the next complete gate. Never promote a partial import graph.

## Appendix A — takeover qualification

Incoming agent must answer from the live repository and current PR head, not from this report alone.

1. Trace finite skew and CNODE spring assembly to the exact production owner and derive why skew is `B=k(n⊗n)` while CNODE is `[+B -B; -B +B]`.
2. Reconstruct the observed EP-0028 and EP-0029 numeric invariants and deliberate-break discriminators.
3. Explain why rigid skew/CNODE require MPC/constraint equations and why penalty stiffness is outside authority.
4. Identify exactly which InputXML/full-solve/BM4/external-reference gates remain NOT_RUN and why no bounded PASS may be inflated into them.
5. Re-ground current main, classify overlap against every next-gate dependency, and propose the smallest complete evidence-producing contribution without numerical-policy drift.

HANDOVER_READY: TRUE once EP-0029 repository/issue/PR projections are synchronized.
