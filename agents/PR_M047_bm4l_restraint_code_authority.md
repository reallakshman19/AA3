# M047 BM4_L — exported restraint-code authority correction (F2.5)

## Mission

Correct the BM4_L restraint source classification before any further friction/contact mechanics work. This stage is source/authority work only: it does **not** modify the production linear or nonlinear solver.

## Root cause found

CAESAR II exports the restraint `TYPE` field as the integer **Restraint Code** (`INPUT_RESTRAINTS.RES_TYPEID`). The existing BM4_L source mapping and linear compiler had treated direction cosines as if they were sufficient to determine the restraint DOF/class.

For the codes present in BM4_L, official CAESAR restraint-code authority gives:

```text
1  ANC   anchor
7  RZ    rotational double acting
10 XSNB  translational double-acting static snubber
17 -Y    translational directional
```

Consequences:

- Type 7 is not a translational Z gap; it is RZ. Rotational gaps are angular (degrees).
- Type 10 is not a generic translational contact gap; it is XSNB and requires load-case snubber activation semantics.
- Type 17 is not a bilateral Y spring. It is a -Y directional restraint and the one-way behavior must be preserved together with friction.

## BM4_L source inventory

The pinned source inventory contains 46 active restraint rows across 30 nodes:

```text
ANC   code 1   :  1 row
RZ    code 7   :  3 rows
XSNB  code 10  : 13 rows
-Y    code 17  : 29 rows
                    --
                    46 rows
```

Twenty-six of the 29 `-Y` rows carry `mu=0.3`; the three non-friction directional nodes are `20300`, `20640`, and `21640`.

The old `5 positive gap companions / 4 friction nodes` description is therefore superseded as mechanics authority. Those source fields belong to typed RZ/XSNB rows and cannot be treated as five generic translational gaps.

## Existing solver audit

The current ACCDB linear compiler contains this reduction for every non-anchor restraint:

```text
TYPE != ANC -> dominant translation DOF from |XCOSINE|/|YCOSINE|/|ZCOSINE|
```

That causes three semantic losses relevant to BM4_L:

```text
TYPE 7  RZ   -> translation
TYPE 10 XSNB -> always-present translation
TYPE 17 -Y   -> bilateral translation
```

This stage deliberately does **not** patch that compiler yet. The exact state/sign/case behavior must be qualified first so the 99.5994% frictionless baseline is not disturbed by an unproven reinterpretation.

## New authority components

F2.5 adds:

- `caesar-restraint-code-authority.js` — typed decoder for the BM4_L codes;
- `inputxml-restraint-authority-map.js` — typed InputXML inventory that keeps TYPE semantics separate from direction cosines;
- `m047-bm4l-restraint-code-authority-snapshot.json` — pinned BM4_L inventory and supersession record;
- `lfea-m047-bm4l-restraint-code-authority-check.mjs` — synthetic code-semantic checks plus optional exact InputXML replay.

No state is selected from CAESAR result error.

## L13 accuracy status

The prior L13 diagnostic remains a historical comparison:

```text
1719 / 1914 = 89.8119122257%
```

It is **not re-scored in F2.5**, because the newly identified restraint-code semantics have not yet been integrated into a qualified solver. Reporting a new percentage before that integration would mix old and new mechanics.

## Revised future roadmap

### F2.6 — restraint state/case qualification

Resolve, independently of response fitting:

1. -Y directional active/inactive convention in the BM4_L coordinate/load convention;
2. XSNB participation for L6/L13 SUS cases, including any explicit Snubbers Active override;
3. RZ rotational restraint behavior and the two 25-degree source gaps.

A preliminary unilateral -Y interpretation that released all 29 directional supports produced a grossly unstable gravity solution. That is retained only as a falsification; it is not grounds to reverse the official sign convention from residuals.

### F2.7 — exact CAESAR state evidence

Capture L13 Active Boundary Conditions and nonlinear iteration/status evidence on `14.00.00.0910 Build 231113` with pinned input/configuration custody. Use it to qualify final one-way/RZ/snubber/friction states and update ordering.

### F2.8 — governed solver integration

Only after F2.6/F2.7 close the state semantics, change the production restraint/nonlinear controller. The structural element operator, friction scalar configuration, comparator, tolerances and zero-friction identity remain fixed.

### F2.9 — L13 qualification

Re-solve L13 first and calculate literal governed accuracy on exactly 1,914 rows. Only a converged, state-qualified result may supersede the historical 89.8119% diagnostic.

### F3 — L7 then L15

After L13 qualification, solve L7 against L5 and derive L15 algebraically as `L7 - L13`.

## Guardrails

F2.5 does not authorize:

- production restraint changes;
- flipping -Y activation from residuals;
- activating/deactivating XSNB from accuracy;
- treating RZ gap values as millimetres;
- tuning friction/solver constants;
- changing linear element mechanics or comparator tolerances;
- solving L15 independently.

## Decision

**F2.5 CORRECTS THE SOURCE CLASSIFICATION: BM4_L RESTRAINT TYPES MUST BE DECODED BY CAESAR RESTRAINT CODE BEFORE FURTHER NONLINEAR ACCURACY WORK. NO NEW L13 PERCENTAGE IS VALID UNTIL THAT RESTRAINT-STATE MODEL IS QUALIFIED.**
