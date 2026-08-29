# Relay Qualification Verdict — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0003
QUESTION_SET_SHA256: 91fa83603735d644c6c2c12f26484413a2fa2734d591d799804291bef9e0f9a4
ANSWER_SHA256: 4b88be862856ba8a46f81b2c434016f7112a41e7a40dc55ae8d90a20d39f2bd6
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca
VERDICT_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c
CANDIDATE_ID: /root
VERIFIER_ID: /root/post_basis_reconciler

## Scoring

Q1 20/20
Q2 18/20
Q3 19/20
Q4 19/20
Q5 20/20
TOTAL 96/100
MINIMUM_QUESTION 18/20

## Independent evidence review

### Q1 — Production Trace

I created a temporary detached worktree at the exact qualification basis and
ran `npm run check:lfea-production-caesar-parity` there. The worktree was
removed after execution. The fresh run reproduced L6 source 13 FROM/FX as
`-10.301004409790039 N` CAESAR versus `-207.74177970367055 N` production,
with `rawRelativeError=19.16713821675811`; L2/L5/L6 baseline pass rates and
medians were `88.87/2.1992`, `83.75/3.1892`, and `73.93/2.5768` percent.

I separately re-executed the production preparation/solve/recovery trace. The
answer's 12-DOF global and local vectors, `K_eff d`, equivalent-load vector,
initial-strain vector, `q_local`, axes and global end-action vector reproduced
component-for-component. Source 13 is the single analysis element `IXP.E13`,
has no rigid offsets or bend chords, and the adapter maps its outer I action
without a sign reversal. The recovered global I-end FX is exactly
`-207.74177970367055 N`. The solve is `QUALIFIED`, condition
`4757639.256053837`, normalized residual `1.0614926349396103e-12` PASS.

Assessment: complete end-to-end retained-value reconstruction with the correct
joint-on-element convention. Recovery, transform, end selection and mapping are
correctly excluded as the first wrong boundary.

### Q2 — Current Unresolved Problem / Failure Isolation

I regenerated `W=L2`, `P1=L6-L2`, and `T1=L5-L6` from fresh comparison rows.
The answer's source-13 vectors, source-13 P1 moment error, complete source
13–17 end/vector table, and node-22120 W/P1/T1 rotation-vector errors reproduce.
The baseline substantial-reference tail independently reproduced as
`1377/5345 = 25.7623948%`, with rotations
`321/823 = 39.0036452%` and zero nodal-moment tail rows.

Fresh source/model introspection proves both central objects are typed `TEE`
while retaining qualified `ACCDB_CORNER_INTERSECTION_V1` tangent starts/ends,
arc centres, positive radii `0.22859999084472665/674 m`, and six governed
chords each. Retopology accepts them through the shared arc-bearing contract;
the production bend predicate rejects them. Baseline compiles 10 bend
components. Changing only that predicate in an ignored diagnostic compiles
exactly 12 and assigns the already sealed factors
`3.0580330385708625` (E33) and `3.0589606102894624` (E36). E36 branch ownership
remains on `IXP.E36.S1`; no arc chord is double-owned.

I reran the one-predicate diagnostic against the retained CAESAR OUTPUT. It
reproduced L2/L5/L6 pass/median values of `96.76/0.3668`, `92.37/2.8566`, and
`95.82/0.3556` percent, condition `4765652.157848946`, residual approximately
`7.40e-13`, substantial tail `589/5349 = 11.0114040%`, and rotation tail
`136/823 = 16.5249089%`.

Assessment: the earliest isolated defect is the component-eligibility boundary
that omits exact bend stiffness/pressure-free-state ownership for E33/E36. The
single-factor, all-case cross-solver improvement falsifies a tuned coefficient.
Two points are withheld because the answer summarizes the E33/E36 before/after
`K`, load and recovered-vector boundary rather than printing the requested raw
matrix/vector entries; the owner boundary and first changed objects are still
correctly identified and independently reproducible.

### Q3 — Authority / Invariant

I inspected the BM4 profile, M047 interval/tee/residual authorities, production
thermal/preparation/capability records, shared arc contract, sealed bend/branch
factor authorities and Owner roadmap. The answer keeps benchmark-only BM4
temperature/mean-alpha evidence separate from generic production authority.
Independent arithmetic gives production strain `0.00117`, BM4 interval strain
`0.00121096700947`, and a `3.3829996317%` production deficit relative to the
BM4 authority. Only T1-bearing L5 could move if an explicit model authority were
later routed; L2 and L6 must remain unchanged.

The bend correction consumes existing source geometry, existing shared
arc-bearing classification and already sealed edition-factor authority. It does
not invent a factor or constitutive rule. Reducer promotion, thermal routing,
oracle/tolerance edits and `newMechanicsAuthorized:false` remain protected.

Assessment: authority and no-patch boundaries are safe. One point is withheld
because the compact custody table does not state the runtime-receipt field for
every listed mechanic as explicitly as the question requested; its conclusions
and protected scopes are nevertheless correct.

### Q4 — Independent Validation

The ACCDB SHA-256 independently reproduced as
`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
Independent SI arithmetic from the raw element-13 values gives
`di=0.2364748001098633 m`, area `0.014615214387541558 m^2`, pressure strain
`7.129604915871123e-5`, free extension `3.9194289368259434e-5 m`,
`EA=2972661647.27573 N`, and initial force `211939.03093638597 N`. These match
the retained signed production initial-load pair at floating precision under
`q=Kd-f_equivalent-f_initial`.

The answer's CAESAR source-13 P1 FROM six-vector reproduces from L6-L2. The
production L6 source-13 TO and source-14 FROM actions close to approximately
`1.02e-10` maximum absolute component, while the displayed CAESAR vectors close
exactly. This proves equilibrium but not magnitude parity, exactly as stated.

Assessment: the independent oracle clears raw pressure input and the closed-end
axial-strain/load kernel and moves diagnosis downstream. One point is withheld
because the answer reports the maximum six-DOF closure rather than printing the
six component sums and relative scale requested by the question.

### Q5 — Next Contribution / Minimal Patch

The answer selects one owner function and one existing dependency-light
contract: import `ARC_BEARING_COMPONENT_TYPES` and expand only the component-kind
gate in `productionBendSourceEligible()`, preserving every tangent-basis,
tangent-point, centre and radius guard. The proposed focused negative/positive
predicate tests, governed exact-bend-count/ownership assertion, fresh parity
metrics, 26-check gate, deliberate old-predicate break, rollback conditions and
separate thermal `NO_PATCH` boundary are all appropriate.

Assessment: this is a minimal classification/ownership correction, not a factor,
kernel, recovery, benchmark, oracle or tolerance change. The design preserves
one-owner topology and explicitly requires the intentional break to fail before
acceptance.

## Verdict

AUTOMATIC_FAILURE_REASON: NONE — no fabricated repository evidence,
self-verification, source/oracle error, authority expansion, unsafe convention
assumption, or validation gaming was found.

VERDICT: PASS_QUALIFIED_READ_ONLY

## Authority recommendation

The candidate is qualified for the narrowly bounded E33/E36 arc-bearing-TEE
eligibility correction and its focused/integration/parity validation at
`ac9b2e2aee61e020620ae694fa36962c3632a8ca` under Common
`9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c`.

This verdict does not grant write, custody, roadmap, benchmark/oracle,
thermal-authority, workflow, merge or release authority. Required next state:

```text
QUALIFICATION_STATE: PASS
CUSTODY_STATE: QUALIFIED_PENDING_RECONCILIATION
WRITE_AUTHORITY: READ_ONLY
POST_BASIS_RECONCILIATION: REQUIRED
```

An independent current-state reconciliation must verify live head/Common,
roadmap/source/oracle stability, canonical-chain overlap and current material-
leg pre-work requirements. Only that reviewer may recommend `WRITE_ALLOWED` for
the one-gate eligibility patch. Merge remains Owner-only.
