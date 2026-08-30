# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0018 — support mechanics and mixed-reaction custody qualification

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0018
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: ebb524bf0f3d873e82d4e70a4788360990032e9b
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — HANGER production trace and authority

Trace predefined HANGER rate and theoretical cold load from InputXML source custody to the global system. Name the resolver, structural declaration kind / constraint behavior for rate, the `K` assembly path, the HANGER preload primitive and explicit `+H` physical cases that place cold preload in `F`.

State the unit conversion and why hanger sizing/design and unsupported alternate vertical-axis authority remain outside the qualified subset.

Fail if rate and cold load are conflated, cold load enters `K`, raw rate is passed through, or LFEA claims hanger sizing authority.

## Q2 — Skew/CNODE mechanics, refusals and reference boundary

Derive the finite skew `k(n⊗n)` block and exact axis-aligned reduction. Derive finite CNODE `q=n·(u_i-u_j)` and `k[[nnT,-nnT],[-nnT,nnT]]`, including equal/opposite internal actions and common-translation invariance.

State the retained refusal codes for rigid skew and rigid CNODE and why exact MPC machinery, not penalty stiffness, is required. Explain why self-authored support fixtures exercise mechanics but cannot clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`.

Fail if CNODE is grounded, rigid support is faked with large stiffness, or a self-authored fixture is promoted as external reference authority.

## Q3 — Frozen BM4_L and runtime truth

State frozen BM4_L `96.76 / 93.00 / 95.82` and substantial-reference >5% tail `7.99%`, and explain why BM4_L is non-regression evidence only for issue #1551.

Then trace current exact-head hosted evidence at `ebb524bf0f3d873e82d4e70a4788360990032e9b`: workflow `33306345606`, deterministic job `99243473348` with no executable steps, and dependent BM4 job `99243478432` skipped.

Fail if any unexecuted gate is called PASS/engineering FAIL, or if BM4_L is offered as positive skew/CNODE/HANGER evidence.

## Q4 — Blocked execution public-result custody

Trace BLOCKED execution handling through normal `runLinearPipingAnalysis()`, B-3.4 recovery, retained-result composition and `requireResultRelationships()`.

Explain why EP-0017 is defense-in-depth: prior B-3.4 recovery already refused BLOCKED and recovery status accepts only QUALIFIED/CONDITIONAL, so the new retained/result guards provide earlier deterministic refusal rather than proving a prior valid publish bypass.

State the new guard check and deliberate-break status accurately.

Fail if the pre-hardening path is misrepresented as a proven numerical bypass, or an authored-but-unobserved deliberate break is called red-observed.

## Q5 — Mixed fixed + directional reaction exercise and promotion decision

Describe `MixedFixedSkewSpring.xml` exactly: ordinary anchor at node 10; node 40 with rigid UX plus finite skew spring `n=(0.6,0.8,0)`, `k=1000 N/mm`. Explain why this creates nonzero spring UX action on a DOF whose displacement is rigidly constrained.

Trace `lfea-mixed-fixed-skew-reaction-check.mjs` and state its representation-neutral invariants:

- governed InputXML production path reaches solve;
- rigid UX displacement is zero;
- projected skew deformation is nonzero;
- skew spring UX support action is material;
- public mixed-node UX reaction custody is recorded as one row or two rows rather than preselected;
- if two rows occur, one must equal the exact skew-spring UX action;
- global public UX support reactions close a zero-applied-UX case;
- DRAFT disclosure remains;
- the check records whether generic `nodalResult()` still uses first-match lookup;
- deliberate break invalidates the rigid-UX direction.

Explain why EP-0018 does not yet change aggregation/decomposition semantics. State the exact next decision rule after execution evidence, plus current finite support states, external CAESAR reference state, BM4 state, DRAFT state and merge authority.

Fail if one-row or two-row policy is claimed observed before execution, if reaction semantics are changed from source reasoning alone, if DRAFT is cleared without independent CAESAR evidence, or if merge is authorized without exact Owner phrase `APPROVED MERGE`.
