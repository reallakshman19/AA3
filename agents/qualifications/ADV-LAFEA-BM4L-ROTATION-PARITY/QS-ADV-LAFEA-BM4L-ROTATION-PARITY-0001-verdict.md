# Relay Qualification Verdict — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0001
QUALIFICATION_BASIS_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a
CANDIDATE_ID: /root
VERIFIER_ID: /root/qualification_verifier
VERDICT_BASIS_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a

## Scoring

Q1 20/20
Q2 19/20
Q3 20/20
Q4 20/20
Q5 19/20
TOTAL 98/100
MINIMUM_QUESTION 19/20

## Evidence review

### Q1

Evidence checked: Fresh execution of `npm run check:lfea-production-caesar-parity`
at the pinned basis reproduced L6 source 13 FROM/FX as
`-10.301004409790039 N` CAESAR versus `-207.74177970367055 N` production,
with raw relative error `19.16713821675811`. I independently executed the
production preparation, element-authority, solver and recovery path and checked
the candidate's 12-DOF global/local vectors, `K_eff d`, equivalent load,
initial load, `q_local`, axes, no-offset state and `q_global`. The componentwise
subtraction is exact at JavaScript floating-point precision; global component 0
is `-207.74177970367055 N`. Source inspection confirms the adapter walks the
complete FROM-to-TO source chain and emits first-I/last-J without a sign change.

Reasoning: The evidence distinguishes solve, recovery, transformation, offset,
end convention and reporting. The result is joint-on-element action. Source 13
is one ordinary analysis element, so no interior chord can contaminate the row.
The reproduced solve is `QUALIFIED`, condition `4757639.256053837`, normalized
residual `1.0614926349396103e-12` PASS.

Defects/uncertainty: None material.

### Q2

Evidence checked: I regenerated baseline actual rows from the ACCDB and formed
`W=L2`, `P1=L6-L2`, and `T1=L5-L6` separately for CAESAR and production. The
candidate's source 13 force vectors and P1 moment vector reproduce exactly. The
reported vector-relative error table for both ends of sources 13–17 also
reproduces, including the repeated P1 force errors of about `26.942%` for
sources 13–14 and `53.908%` for sources 15–17. Node 22120 rotations reproduce
as W `168.478%`, P1 `0.890%`, T1 `2.409%` vector errors. Independent substantial-
reference counting reproduced `1377/5345 = 25.7624%`, including rotations
`321/823 = 39.0036%` and zero nodal-moment tail rows.

Source inspection and fresh model introspection prove the first owner defect:
`ACCDB.E33` and `ACCDB.E36` are classified `TEE` by TYPE=3 precedence while
both retain qualified ACCDB tangent basis, tangent points, centre, positive
`0.2285999908447267 m` radius and six arc chords. `bend-retopology.js` already
recognizes this condition through `ARC_BEARING_COMPONENT_TYPES`; literal
`segment.type === 'BEND'` in `productionBendSourceEligible()` does not.
Baseline compiles 10 exact bends. A one-expression diagnostic compiles 12 and
assigns existing sealed factors `3.0580330385708625` to E33 and
`3.0589606102894624` to E36. E33 node 20700 has only two incident source legs
and is not a branch junction. E36 node 20295 has three; its distinct tee
modifier remains on finite incoming straight `IXP.E36.S1`, with no arc-chord
authority overlap.

The single-factor diagnostic, with no other mechanics or oracle change,
reproduced:

```text
         baseline pass / median       diagnostic pass / median
L2       88.87% / 2.1992%             96.76% / 0.3668%
L5       83.75% / 3.1892%             92.37% / 2.8566%
L6       73.93% / 2.5768%             95.82% / 0.3556%
tail     1377/5345 = 25.7624%          589/5349 = 11.0114%
rotation 321/823 = 39.0036%            136/823 = 16.5249%
```

Diagnostic L6 remained `QUALIFIED`, condition `4765652.157848946`, residual
`7.396482373269756e-13` PASS. CAESAR OUTPUT is the independent result oracle;
the repository benchmark solver was not used as authority.

Reasoning: The omission is in component eligibility/element authority assembly,
upstream of `u`. Downstream recovery and mapping faithfully reproduce the
wrongly assembled state. Large, coherent improvement across W, W+P1 and
W+P1+T1 with existing sealed factors falsifies coefficient fitting and isolates
one classification/ownership defect.

Defects/uncertainty: The answer summarizes vector-relative errors for all
source/end/family combinations but does not print every component-relative
error requested by Q2; source 13 vectors and all vector norms were independently
regenerated. This presentation omission does not change the isolated boundary.

### Q3

Evidence checked: I inspected the benchmark profile, M047 interval and residual
authorities, production preparation/thermal/capability profiles, handover and
owner roadmap. The candidate keeps model-specific BM4 authority separate from
generic A106 runtime authority. Thermal arithmetic independently reproduces
`0.00117` production strain and `0.00121096700947` BM4 interval strain, a
`3.3829996317%` production deficit relative to the BM4 authority. Only the
T1-bearing L5 case could move from correct routing; L2 and L6 must remain
unchanged. The M047 residual record explicitly states
`newMechanicsAuthorized:false`.

Reasoning: Bend/tee edition authority remains explicit and sealed; pressure
axial/Bourdon capabilities remain distinct; reducer promotion remains disabled;
benchmark-only 21 C/mean-alpha evidence is not silently promoted to a generic
default. The proposed eligibility fix consumes existing source arc evidence and
existing bend authority, not a new constitutive rule.

Defects/uncertainty: Generic-product behavior for absent model-specific thermal
authority remains a separate contract decision and is correctly excluded from
this patch.

### Q4

Evidence checked: ACCDB SHA-256 independently matched
`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
Direct extraction verified element 13 inputs and INPUT_UNITS. Independent SI
arithmetic reproduced `di=0.2364748001098633 m`, pressure strain
`7.129604915871123e-5`, free extension `3.9194289368259434e-5 m`, area
`0.014615214387541558 m^2`, `EA=2972661647.27573 N`, and axial initial force
`211939.03093638597 N`. This matches the retained local initial pair and its
sign under `q=Kd-f_equivalent-f_initial`.

The CAESAR pressure-only source-13 vector formed from L6-L2 matches the answer.
Production L6 source-13 TO plus source-14 FROM closes to approximately
`1.02e-10` maximum absolute component; the retained CAESAR vectors close at
display precision. This verifies free-body equilibrium while correctly not
claiming magnitude parity.

Reasoning: The independent hand calculation clears raw pressure input and the
closed-end axial-strain/load kernel. The first wrong boundary is downstream
element-authority assembly, consistent with the isolated arc-bearing-TEE gate.

Defects/uncertainty: None material.

### Q5

Evidence checked: The proposed production change is one owner-function gate in
`src/core/linear-piping-analysis-consumer/production-capability-profile.js`:
accept the already defined `ARC_BEARING_COMPONENT_TYPES` while retaining every
qualified geometry check. The contract constant is dependency-light and can be
imported without an ownership cycle. Fresh diagnostic execution proves exactly
this behavioral delta: 10 to 12 bend components, E33/E36 exact bend ownership,
and unchanged E36 tee ownership on `IXP.E36.S1`. The existing overlap guard in
`inputxml-linear-element-authorities.js` remains active and the governed
preflight succeeds.

Reasoning: This is a classification/eligibility correction, not a new factor,
stiffness kernel, load kernel, recovery convention, benchmark or tolerance.
The negative synthetic TEE-without-arc-evidence assertion preserves fail-closed
behavior. Reverting the corrected gate must fail the positive E33/E36 and exact
bend-count-12 assertions; restoring it must pass. All 26 linear-piping checks
and the parity metrics remain required after implementation, with rollback on
case degradation, ownership overlap, conditioning/residual regression or gate
failure.

Defects/uncertainty: The answer describes the focused and governed integration
tests but does not name their final exact script filenames. Before mutation the
implementer should bind them explicitly—most naturally extending
`scripts/lfea-production-capability-profile-check.mjs` and adding/using a
governed BM4 production integration assertion—then execute the deliberate-break
proof. This is a minor delivery-detail gap, not an unsafe patch boundary.

AUTOMATIC_FAILURE_REASON: NONE — no fabricated anchor, source/oracle error, unsafe authority claim, self-verification, or validation gaming found.

VERDICT: PASS_QUALIFIED_READ_ONLY

## Authority boundary

This verdict proves candidate competence only against basis
`382fac125f775efda2bbfe014abb025185ce3a2a`. It authorizes no production change,
roadmap mutation, benchmark/oracle edit, tolerance change, merge, thermal-
authority routing, reducer promotion, or other solver/mechanics work.

Required next state:

```text
QUALIFICATION_STATE: PASS
CUSTODY_STATE: QUALIFIED_PENDING_RECONCILIATION
WRITE_AUTHORITY: READ_ONLY
POST_BASIS_RECONCILIATION: REQUIRED
```

Only an independent current-state reconciliation may retain/confirm coverage
and grant write authority for the narrowly qualified arc-bearing-TEE
eligibility correction and its focused/integration/parity validation.
