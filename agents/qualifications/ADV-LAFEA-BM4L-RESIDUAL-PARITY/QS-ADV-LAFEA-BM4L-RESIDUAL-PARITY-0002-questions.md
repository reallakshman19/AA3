# Qualification questions — BM4_L explicit thermal interval seam

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
PURPOSE: QUALIFICATION_ONLY
NOT_AN_IMPLEMENTATION_TASK: TRUE
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
CHAIN_ID: ADV-LAFEA-BM4L-RESIDUAL-PARITY
ENDPOINT_ID: EP-0002
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-RESIDUAL-PARITY-0002
QUALIFICATION_BASIS_HEAD: ed3920da5d4eef5c7f1cdbf9c05cc9ea366d1425
QUESTION_SET_STATUS: CURRENT
QUESTION_AUTHOR_ID: /root
QUESTION_SET_AUTHOR: /root
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c

## Q1 — Production Trace

Domain challenge: Trace one source-qualified interval authority through every real thermal consumer.

Exact repository data required: M047 interval record, InputXML source bundle/model/material identities,
element 71 L5/L6 thermal primitives, pipe/rigid requests, recovered vectors and comparator rows.

Production object/case: Element 71 (`22053->22056`, RIGID_PTR 14), L5/L6 FROM/MY.

Repository anchors: Thermal resolver, preparation option flow, material/rigid/load authorities,
physical-case assembly, recovery/mapping modules and retained CAESAR output.

Required technical work: Show the sealed record, semantic binding and exactly-once consumption from
preparation to reported outer source end. Reproduce L5 28.7837371826/35.0090715559 Nm, L6
4.0000400543/4.4159167516 Nm and derived T1 24.7836971283/30.5931548043 Nm.

Required numerical/technical evidence: Installation/operating temperatures, alpha, strain, source
hashes, 12-DOF displacement/recovery chain, axes, units and I/J convention.

First authority/ownership boundaries: Source interval, runtime caller, material, rigid, thermal load,
assembly, solve, recovery, transform and mapping are distinct.

Fail if: CAESAR output is used as input authority, a sign/end is assumed, or a neighboring action is substituted.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: Prove input custody is the first changed boundary and the patch remains one factor.

Exact repository data required: Matched L2/L5/L6 rows, generic and explicit intervals, thermal
primitives, K and W/P/T family responses.

Repository anchors: M047 interval record; current parity rows; generic thermal resolver; preparation
load authorities; pipe/rigid thermal consumers; assembled stiffness and load cases.

Calculation/reconstruction: Calculate strains 0.00117 and 0.00121096700947, ratio
1.035014538008547, `W=L2`, `P1=L6-L2`, and `T1=L5-L6` for reference and production.

Required numerical/technical evidence: Name the first unequal object, demonstrate unchanged K/W/P1,
and report pass, median, deterministic >5% and family metrics before/after.

Predicted intermediate values: Only thermal primitive magnitudes, T1 displacements and T1 recovered
actions scale; L2/L6 comparator metrics remain unchanged.

First wrong boundary: Input authority resolution before load construction.

Falsifier: Reject on W/P1 movement, double scaling, earlier recovery/mapping error or incoherent tail change.

Fail if: Several mechanics change, near-zero rows tune alpha, or an oracle/tolerance is edited.

## Q3 — Authority / Invariant

Domain challenge: Distinguish generic material data from an explicit scoped model interval and make
wrong-source use impossible.

Exact repository data required: Generic resolver, M047 authority scope/evidence, source bundle/model
identity, preparation callers, pipe/rigid consumers, profile provenance and Owner roadmap.

Repository anchors: `inputxml-thermal-authority.js`; preparation option/caller files; BM4_L profile;
M047 interval authority; input source bundle semantic hash; rigid and load authority consumers.

Required technical work: Build the custody matrix and prove deterministic missing, stale, wrong-model,
wrong-material and tampered-hash behavior.

Authority/source trace: Generic A106/A334 defaults remain generic; the M047 record applies only to
BM4_L 21 C to 120 C; CAESAR outputs remain independent comparison data.

Protected invariant: Generic values, mechanics/recovery/conventions, oracle/tolerances, roadmap,
workflow and owner-only merge authority.

First wrong boundary: Missing explicit input-authority seam; output-derived fitting remains `NO_PATCH`.

Falsifier: No patch if model/source binding cannot be sealed or every thermal consumer cannot prove one use.

Invalid shortcut: Hard-code BM4 identity, interval numbers or strain into generic production.

Fail if: Scope and runtime ownership are conflated or missing explicit data silently falls back.

## Q4 — Independent Validation

Domain challenge: Independently distinguish correct input magnitude from equilibrium and distribution.

Exact repository data required: Both intervals; element 70/71 L5/L6 actions, axes/offsets and units.

Repository anchors: Hash-bound BM4_L ACCDB/profile; M047 interval record; element 70/71 retained
actions; frame/rigid thermal, recovery and result-mapping modules.

Calculation/reconstruction: Recalculate both strains/ratio, T1 end vectors and node-22053 six-DOF
free body including moment transport.

Required technical work: Prove unchanged-stiffness linear response and exactly-once rigid expansion.

Independent oracle: Retained CAESAR OUTPUT inside the hash-bound BM4_L ACCDB.

Required numerical/technical evidence: 0.00117, 0.00121096700947, 1.035014538008547,
element-71 T1 MY and componentwise closure.

Units/sign/tolerance: K/C interval, 1/K, rad, N and Nm; force-on-element/joint and I/J explicit.

Falsifier: Reject if hand input already matches production or an earlier boundary is wrong.

Fail if: Equilibrium is treated as cross-solver magnitude proof or production is its own oracle.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: Verify the smallest safe implementation and a sensitive local acceptance gate.

Exact repository data required: Contract/resolver, option flow, all thermal consumers, source semantic
hashes, focused checks, parity harness and registered local gate.

Repository anchors: InputXML thermal and preparation modules; workspace preflight caller; M047 JSON;
focused check; production parity harness; `check:lfea-linear-piping` registration.

Required technical work: Name exact functions/files and prove sealed schema, caller binding, default
parity, fail-closed mismatch behavior and real pipe/rigid consumption.

Safe patch boundary: Explicit installation/mean-interval authority resolution only; no mechanics,
benchmark, oracle, tolerance, workflow or roadmap change.

Expected before/after evidence: Three-case pass/median, deterministic >5%, family metrics, condition,
residual and unchanged L2/L6.

Protected unchanged domains: Generic authority/defaults, kernels/conventions, CAESAR data/profile,
roadmap/workflow/release/merge authority.

Validation required: Pure contract checks, default parity, real BM4_L integration, semantic binding,
fresh parity, deliberate break, full local gate and diff check.

Negative test: Tamper model/material/source hash or remove explicit consumption and require failure.

Rollback/falsifier boundary: Roll back on W/P1 movement, double use, unsealed source, generic mutation,
metric/solver regression, insensitive break or gate failure.

No-patch condition: `NO_PATCH` if source authority is absent, binding is impossible or the real response
does not reproduce the one-factor diagnosis.

Fail if: Code is hard-coded to the benchmark, output tunes input, implementation and oracle change together,
or default/negative/deliberate-break evidence is missing.
