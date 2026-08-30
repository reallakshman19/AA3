# Qualification questions — remaining BM4_L residual parity

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
PURPOSE: QUALIFICATION_ONLY
NOT_AN_IMPLEMENTATION_TASK: TRUE
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
CHAIN_ID: ADV-LAFEA-BM4L-RESIDUAL-PARITY
ENDPOINT_ID: EP-0001
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-RESIDUAL-PARITY-0001
QUALIFICATION_BASIS_HEAD: 80dcfe8311b7cee367873fe2794ab059a242921b
QUESTION_SET_STATUS: CURRENT
QUESTION_AUTHOR_ID: /root
QUESTION_SET_AUTHOR: /root
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c

## Q1 — Production Trace

Domain challenge: Trace and numerically reconstruct a real thermal-sensitive BM4_L element-end
action through every production boundary.

Exact repository data required: BM4_L cases L5/L6; ACCDB element 71, nodes 22053/22056,
RIGID_PTR 14; production analysis element and source chain; retained displacement and action
vectors; comparator rows for `GLOBAL_END_MOMENT_FROM/MY`.

Production object/case: Element 71 (`22053->22056`, `BALL_FLG_900`), L5 and L6 FROM/MY.

Repository anchors: BM4_L ACCDB/profile; parity harness and actual adapter; physical-case
builders; frame/rigid thermal augmentation; recovery and element-end mapping modules.

Required technical work: Identify the W/P1/T1 primitive differences; provide the 12-DOF global
and local displacement vectors, `Kd`, equivalent and initial loads, recovered local vector,
global transform and source-chain selection. Prove why the outer source FROM end is reported.

Required numerical/technical evidence: Reproduce L5 CAESAR/production 28.7837371826/
35.0090715559 Nm, L6 4.0000400543/4.4159167516 Nm, and T1 24.7836971283/
30.5931548043 Nm. Include units, I/J convention, axes and semantic identities.

First authority/ownership boundaries: Model input, material/temperature authority, rigid
authority, load construction, assembly, solve, recovery, transform and mapping are distinct.

Fail if: Production is its own oracle, a sign/end is assumed, L5 is treated as pure thermal
without subtracting L6, or an interior/adjacent action is substituted.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: Determine whether absent explicit BM4_L thermal-input custody is the first
wrong boundary behind the dominant remaining T1 residual.

Exact repository data required: Every matched L2/L5/L6 row, current raw errors, generic and BM4_L
installation/alpha values, all affected pipe/rigid thermal primitives, and unchanged stiffness.

Calculation/reconstruction: Form W=L2, P1=L6-L2 and T1=L5-L6 for reference and production.
Compute tail distributions by quantity/component and analytically scale only production T1.

Required numerical/technical evidence: Reproduce production strain 0.00117, retained interval
strain 0.00121096700947, scale 1.035014538008547, current case metrics, and predicted L5 pass,
median and >5% rates. Name which raw objects change first and which cases cannot change.

Predicted intermediate values: Stiffness, W and P1 remain byte-identical; all thermal primitives,
rigid thermal growth, solved T1 displacement and recovered T1 actions scale linearly once.

First wrong boundary: Choose input custody, load construction, assembly, solve, recovery,
transformation, end selection or mapping and provide the first unequal value.

Falsifier: Reject thermal custody if one-factor scaling does not materially improve L5 median and
substantial tail, requires W/P1 changes, or hides a prior recovery/mapping defect.

Fail if: Multiple mechanics change together, zero/cancellation rows select a coefficient, parity
is treated as source authority, or previously rejected mechanics are recycled without evidence.

## Q3 — Authority / Invariant

Domain challenge: Prove whether the retained BM4_L interval record may be supplied to production
through an explicit caller seam without changing generic material authority.

Exact repository data required: Generic thermal resolver, installation-temperature profile,
BM4_L validation profile and M047 records, preparation call chain, rigid/pipe consumers, Owner
roadmap and provenance.

Required technical work: Build a custody matrix for material alpha, installation temperature,
operating temperature, rigid and pipe thermal strain, profile identity, caller selection and
independent oracle. State how stale/missing/mismatched authority fails closed.

Authority/source trace: Distinguish generic A106 data, model-specific interval evidence,
benchmark-only configuration, explicit engineer/caller authorization and CAESAR result custody.

Protected invariant: Generic values, stiffness/load equations, bend/tee/reducer/rigid mechanics,
recovery/conventions, benchmark/profile/oracle/tolerances, roadmap, workflow and merge authority.

First wrong boundary: A missing input-authority seam may be fixed; a new coefficient inferred only
from output parity is `NO_PATCH`.

Falsifier: No patch if source scope does not authorize production use, caller/model identity cannot
be sealed, or pipe and rigid paths cannot prove exactly-once consumption.

Invalid shortcut: Hard-code BM4_L, 21 C, `1.2231989994646464e-5`, or strain
`0.00121096700947` into generic production or replace the generic A106 table.

Fail if: Benchmark output becomes input authority, source scope and runtime ownership are
conflated, or a fallback silently supplies missing thermal data.

## Q4 — Independent Validation

Domain challenge: Independently reconstruct both thermal strains and the node-22053 six-DOF free
body to distinguish input magnitude, equilibrium, and action-distribution evidence.

Exact repository data required: Alpha and installation/operating temperatures; element 70/71
retained L5/L6 end vectors from CAESAR and production; axes/offsets and units.

Calculation/reconstruction: Calculate `1.17e-5*(393.15-293.15)` and
`1.2231989994646464e-5*(393.15-294.15)`, their ratio, the T1 end vectors, and the node-22053
sum of incident actions with required moment transport.

Required technical work: Demonstrate why a linear unchanged-stiffness system permits exact T1
response scaling; state where rigid thermal expansion uses the same input and why it must not be
applied twice.

Independent oracle: Retained CAESAR OUTPUT inside the hash-bound BM4_L ACCDB; production and the
repository diagnostic solver are implementation-coupled.

Required numerical/technical evidence: Strains 0.00117 and 0.00121096700947, ratio
1.035014538008547, element-71 T1 MY values, and componentwise free-body closure.

Units/sign/tolerance: K or C intervals, 1/K, radians, N and Nm; explicit force-on-element/joint
and I/J conventions. Equilibrium tolerance is not comparator tolerance.

Falsifier: Reject input-magnitude diagnosis if the hand strain already matches production or an
earlier source/recovery/transform/mapping discrepancy is found.

Fail if: Units/reference points are omitted, equilibrium is claimed to prove cross-solver
magnitude parity, or production is used as its own independent oracle.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: Design, without implementing, the smallest explicit, sealed thermal-input
authority seam authorized by Q1-Q4, including negative tests and `NO_PATCH` conditions.

Exact repository data required: Preparation option flow, thermal resolver/material/rigid/load
consumers, source identity hashes, focused checks, parity harness and full local gate.

Required technical work: Name exact functions/files, define accepted authority schema and caller
binding, prove default behavior is unchanged, define stale/missing/mismatched rejection, and state
why every new abstraction has a real production consumer.

Safe patch boundary: Caller-supplied installation/interval authority resolution and exactly-once
consumption in existing pipe and rigid thermal paths. No constitutive, stiffness, recovery,
transform, mapping, factor, reducer, benchmark, oracle or tolerance change.

Expected before/after evidence: All three case pass/median metrics; substantial >5%
numerator/denominator/rate; family metrics; condition, residual and qualification; unchanged L2/L6
where only T1 authority changes.

Protected unchanged domains: Generic authority and defaults, mechanics kernels and conventions,
CAESAR output/profile/tolerances, roadmap/workflow/release/merge authority.

Validation required: Pure authority contract/resolution checks, default-parity test, real BM4_L
caller integration, exact pipe/rigid semantic binding, fresh parity, full linear-piping gate and
diff check.

Negative test: Remove or stale the explicit authority and require deterministic rejection or
documented generic fallback only when the caller explicitly selects generic authority; restoring
the old no-seam path must fail the BM4_L explicit-authority assertion.

Rollback/falsifier boundary: Roll back on W/P1 change, double application, unsealed source,
generic default mutation, case/median/tail regression, solver qualification regression,
insensitive negative test or gate failure.

No-patch condition: Return `NO_PATCH` if production use lacks authority, caller/model binding is
not possible, exact strain fails the all-case falsifier, or the first wrong boundary lies elsewhere.

Fail if: The answer implements code, hard-codes benchmark identity/value, tunes from output,
changes implementation and oracle together, omits negative/default parity proof, or broadens scope.
