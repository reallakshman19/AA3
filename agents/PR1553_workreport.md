# PR #1553 Work Report — LFEA support representability #1551

## Current state

```text
PR                         #1553
branch                     codex/lfea-support-representability-1551
state                      OPEN / DRAFT / UNMERGED
chain                      ADV-LFEA-SUPPORT-REPRESENTABILITY
current endpoint           EP-0032 (executable hosted BM4 boundary)
current qualification      QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0029
qualification scope        QSCOPE-1551-FULL-PRODUCTION-PATH-REVIEW
qualification status       STALE / refresh suppressed / takeover not ready
latest technical head      24ec07250718c770ec2caed7df3c9798f379b51e
live main re-ground        70dd23a4fb36533f00d818586d1b753fa4f12276
Common live main           293a3db7993a6945c01adc592a7ff14a339c504a
merge authority            EXACT OWNER PHRASE `APPROVED MERGE` ONLY
```

Issue #1551 closes three terminal support-representability boundaries without reducer/parity scope drift: finite skew directional spring, finite CNODE relative spring, and a bounded predefined HANGER subset; rigid skew/CNODE remain MPC-gated.

Engineering policy: Common `engineering-pr-delivery-v2`, live basis `293a3db7993a6945c01adc592a7ff14a339c504a`.

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

The full `[SIMULATED]` InputXML path now compiles and qualifies through the production solver. It reports 36.94% vertical reaction share with force and moment equilibrium PASS. This still does not establish CAESAR parity.

### Finite CNODE spring

DRAFT production representation is a two-node directional relative spring.

Exact evidence:

- topology/mechanism gate PASS/red: connected spring joins endpoints mechanically but is not ground;
- triplet assembly PASS/red: exact `[+B -B; -B +B]`, symmetry, equal/opposite endpoint action, energy and common-translation invariance;
- lost-connected-node falsifier red at `Kij[0,0]: expected -720, got 0`.

The corrected two-cantilever `[SIMULATED]` fixture now compiles and qualifies through production. The internal connector carries 19.27% of ground vertical reaction; `r_j-r_i=[0.006,0.008,0] m=0.01n`, so equal/opposite actions remain collinear and create no artificial couple.

### Predefined HANGER

Bounded Y-vertical subset retains positive spring rate, positive cold load and positive integer hanger count. H-bearing Load-case -> Run custody is exact PASS/red. The `[SIMULATED]` production solve now passes with 37.30% vertical reaction share. Alternate vertical-axis authority and hanger sizing/design are out of scope/fail closed.

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
10. full production-path `[SIMULATED]` skew, CNODE, HANGER, ordinary-spring and refusal exercises, plus eleven observed deliberate-break reds.

The earlier isolated exact gates use Node v22.16.0 with verified Git-blob closures. The full-worktree review uses Node v26.3.0 with the project-locked dependency set and is explicitly classified as self-authored `[SIMULATED]` evidence.

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

BM4_L contains none of the target support features, so it is non-regression evidence only. The dedicated gate was attempted but stops before solve on inherited `BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED`; the exact PR base fails identically. The aggregate parity stage measures `96.76 / 92.37 / 95.82` on both the PR head and exact PR base, so the issue-frozen L5 `93.00%` value is not confirmed. The frozen oracle is unchanged.

## Runtime truth / NOT_RUN ledger

Hosted GitHub Actions now execute real steps. Run `33460007820` passed deterministic S1-S3, then its authenticated BM4_L job failed at the first production-retopology assertion: 10 source bends versus 12 retopologised bends. The relevant source/test paths are unchanged from the exact PR base, so this is inherited baseline debt, not a #1551 support regression. Six other hosted promotion jobs also execute and fail outside this support scope.

Current validation truth:

```text
full check:lfea-linear-piping                               PASS
aggregate parity stage (PR head and exact PR base)           MEASURED 96.76 / 92.37 / 95.82
hosted deterministic S1-S3                                  PASS_EXECUTED
hosted real BM4_L source/retopology                          FAIL_EXECUTED_BASELINE_PATH_UNCHANGED (10 / 12)
focused support aggregates and refusal/unit guards           PASS [SIMULATED]
eleven deliberate-break discriminators                       RED as intended
repository imports / shell contract / git diff --check        PASS
dedicated BM4_L preflight/comparison                          FAIL_BEFORE_SOLVE_BASE_REPRODUCED
npm run build                                                 FAIL_BASE_REPRODUCED (1,801,999-byte main chunk)
non-FEA aggregate                                             FAIL_BASE_REPRODUCED (exact-float assertion)
external CAESAR skew/CNODE/HANGER qualification               NOT_RUN_EXTERNAL
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

EP-0030 corrects the nine `SPRING_DRAFT` fixture modulus declarations, replaces the shunted CNODE exercise with two independently anchored cantilevers, adds modulus/geometry regression guards, and removes one prohibited API default expression. `PROVENANCE.md`, LEG-006, CURRENT/ACTIVE, this report and EP-0030 record the engineering basis and validation truth.

## Current risks / debt

RISK-001: self-authored full-path evidence is not independent CAESAR validation; all new support features remain DRAFT.

RISK-002: independent CAESAR feature references are absent; all new support features remain DRAFT.

RISK-003: hosted BM4_L reaches real data and fails at 10 source bends versus 12 retopologised bends on paths unchanged from the exact PR base; the local dedicated gate remains blocked further downstream by branch-factor edition authority.

DEBT-001: build and one non-FEA gate are red at the exact PR base; they are recorded but not repaired in this support-scope leg.

DEBT-002: dedicated BM4_L cannot execute until the owning branch-factor authority is supplied.

## Next action

Obtain and qualify REF-SKEW-01, REF-CNODE-01 and REF-HGR-01, or obtain explicit upstream authority to resolve the BM4 branch-factor edition block. Keep PR #1553 DRAFT; do not merge without the exact Owner phrase `APPROVED MERGE`.

## Appendix A — takeover qualification

Incoming agent must answer from the live repository and current PR head, not from this report alone.

1. Trace finite skew and CNODE spring assembly to the exact production owner and derive why skew is `B=k(n⊗n)` while CNODE is `[+B -B; -B +B]`.
2. Reconstruct the observed EP-0028 and EP-0029 numeric invariants and deliberate-break discriminators.
3. Explain why rigid skew/CNODE require MPC/constraint equations and why penalty stiffness is outside authority.
4. Identify exactly which InputXML/full-solve/BM4/external-reference gates remain NOT_RUN and why no bounded PASS may be inflated into them.
5. Re-ground current main, classify overlap against every next-gate dependency, and propose the smallest complete evidence-producing contribution without numerical-policy drift.

HANDOVER_READY: TRUE once EP-0029 repository/issue/PR projections are synchronized.
