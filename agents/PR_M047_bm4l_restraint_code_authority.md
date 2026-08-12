# M047 BM4_L — restraint source-domain authority correction (F2.5)

## Mission

Correct BM4_L restraint-type custody before any further friction/contact mechanics work. This stage is source/authority work only: it does **not** modify the production linear or nonlinear solver.

## Owner correction applied

The restraint numeric namespace depends on the source.

```text
ACCDB    INPUT_RESTRAINTS.RES_TYPEID -> use directly; NO InputXML mutation
InputXML RESTRAINT.TYPE              -> apply the governed mutation exactly once
```

The exact BM4_L InputXML mutation supplied on 2026-08-12 is:

| Label | Raw InputXML TYPE | Corrected TYPE |
|---|---:|---:|
| +Y | 17 | 14 |
| LIM | 7 | 8 |
| GUI | 10 | 9 |
| X | 1 | 2 |
| Y | 2 | 3 |
| Z | 3 | 5 |
|  | 18 | 15 |

The earlier F2.5 interpretation that read raw InputXML `17/7/10` directly as ACCDB/product codes is withdrawn. In particular, the raw InputXML rows must **not** be described as `-Y/RZ/XSNB`.

The repo-wide default mutation table is not silently changed in this BM4_L layer. F2.5 requires the exact BM4_L mutation config explicitly whenever InputXML is parsed. That prevents accidental use of a different default row while keeping the change benchmark-scoped.

## Source-domain inventory

The pinned InputXML contains 46 active restraint rows across 30 nodes. Before mutation:

```text
raw TYPE 0  :  1 row
raw TYPE 7  :  6 rows
raw TYPE 10 : 10 rows
raw TYPE 17 : 29 rows
                  --
                  46 rows
```

After the exact InputXML mutation:

```text
ANC  corrected 0  :  1 row
LIM  corrected 8  :  6 rows
GUI  corrected 9  : 10 rows
+Y   corrected 14 : 29 rows
                       --
                       46 rows
```

Twenty-six of the 29 corrected `+Y` rows carry `mu=0.3`; the three non-friction `+Y` nodes are `20300`, `20640`, and `21640`.

ACCDB custody is separate. The exact `INPUT_RESTRAINTS` table has 46 rows and is pinned by table hash plus the `RES_TYPEID` multiset hash. **No InputXML mutation is permitted on those ACCDB values.** F2.5 does not force ACCDB IDs and corrected InputXML IDs into one numeric namespace.

## Gap/contact inventory after correction

The corrected InputXML has six positive-gap rows total:

```text
LIM: 20030 gap 25, 21480 gap 25
GUI: 20390 gap 5, 21480 gap 10, 21640 gap 10, 22310 gap 10
```

Five of those rows are companion restraints on four friction nodes (`20030`, `20390`, `21480`, `22310`). Therefore the earlier **5 positive-gap companions / 4 friction nodes** count remains numerically valid for the friction-coupled subset, but the class semantics are now correctly **LIM/GUI**, not RZ/XSNB. Node `21640` contributes one additional positive-gap GUI row and is not a friction node.

## Existing ACCDB solver audit

The current qualified linear solver correctly stays on the ACCDB source path and does not ingest InputXML. It reads `RES_TYPEID` directly, but for each non-anchor row it reduces the restraint to the dominant translation direction cosine.

That linear compression is sufficient for the existing qualified frictionless baseline, but it does not by itself authorize the nonlinear class behavior needed for friction/contact:

- class-specific gap active-set behavior is not represented;
- friction state history is not represented;
- ACCDB type IDs must be classified from ACCDB/product authority, not by applying the InputXML mutation table.

The user-verified BM4_L file setting `RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL` remains governing custody and must be preserved when the nonlinear restraint semantics are integrated.

## New/updated authority components

F2.5 now provides:

- a source-domain-aware restraint authority helper that keeps ACCDB IDs unmutated;
- an InputXML authority mapper that refuses to run without an explicit mutation config;
- a v2 BM4_L snapshot containing both source-domain policy and the exact mutation rows;
- a checker that proves ACCDB bypass, InputXML one-time mutation, corrected inventories, and the 6/5 positive-gap counts;
- the F2.4/F2.5 work reports now record the exact source-normalization policy and future roadmap;
- the work report includes the revised future roadmap below.

No active state is selected from CAESAR result error.

## L13 accuracy status

The prior L13 comparison remains a historical diagnostic:

```text
1719 / 1914 = 89.8119122257%
```

F2.5 does **not** publish a new L13 percentage. The production nonlinear restraint/contact semantics have not been qualified, so rescoring now would mix source-normalization work with unqualified mechanics.

## Future Roadmap

### F2.6 — reconcile ACCDB restraint semantics with corrected InputXML custody

Use the exact ACCDB artifact as the production source. Keep `RES_TYPEID` unchanged and establish the ACCDB-specific semantic classification by node/type/direction/gap/friction evidence. Use corrected InputXML only as an independently normalized source view; do not compare raw numeric TYPE values across namespaces as though they were identical enumerations.

Required outputs:

1. exact ACCDB restraint-type inventory with pinned custody;
2. node-by-node reconciliation against corrected InputXML class labels (`+Y`, `LIM`, `GUI`, `ANC`);
3. explicit treatment of the file-level `RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL` authority;
4. exact identification of the five friction-coupled positive-gap companions and the non-friction node-21640 gap.

No response fitting is allowed to choose a type or state.

### F2.7 — qualify gap/contact and friction state history

Capture exact-build CAESAR L13 Active Boundary Conditions and enough nonlinear iteration/status evidence to resolve:

- LIM/GUI gap OPEN/CLOSED/REOPENED ordering;
- restraint state commit/convergence ordering;
- STICK -> SLIDING scheduling;
- first-slide 15-degree handling;
- subsequent friction-direction/zero-crossing handling;
- held versus recomputed normal-force basis around the 0.15 threshold.

This evidence is product-state authority, not a parameter-fitting source.

### F2.8 — governed nonlinear solver integration

Only after F2.6/F2.7 close the semantics, integrate the exact restraint/contact/friction rules into the governed nonlinear controller. Preserve the qualified structural operator and exact zero-friction bypass identity for L2/L3/L4/L5/L6/L14.

### F2.9 — qualify L13 first

Solve L13 (`W+P1`, friction multiplier 1) first. Require nonlinear equilibrium convergence, stable restraint/contact state, unchanged tolerances, and literal comparison on exactly 1,914 governed rows. Only that result may supersede the historical 89.8119% diagnostic.

### F3 — L7 then algebraic L15

After L13 qualification, solve L7 against L5. Derive L15 algebraically as `L7 - L13`; never solve L15 as an independent nonlinear equilibrium case.

### F4/F5 — later friction families

After ordinary friction is qualified, address hydro friction L1. Keep L9/L11 and L16-L20 deferred until independent T2/T3 thermal authority is available.

### Final exact-head qualification

Any production nonlinear mechanics change must finish with exact-head Windows/ACE qualification and artifact custody. Automatic CI is integration evidence only and is not a substitute for that production qualification boundary.

## Guardrails

F2.5 does not authorize:

- applying the InputXML mutation table to ACCDB `RES_TYPEID`;
- interpreting raw InputXML TYPE without the exact mutation;
- forcing ACCDB and InputXML into one numeric code namespace;
- choosing LIM/GUI/friction states from the CAESAR error surface;
- tuning friction stiffness, Slide Multiplier, 0.15 normal-force variation, 15-degree angle variation, damping, or relaxation from BM4_L accuracy;
- changing gravity, bends, tees/B31J, reducer station, pressure, thermal authority, comparator, tolerance, or zero-reference boundaries;
- solving L15 independently;
- calling a nonconverged iterate an accuracy result.

## Decision

**F2.5 IS SOURCE-DOMAIN-CORRECT: ACCDB TYPES ARE USED DIRECTLY; INPUTXML TYPES ARE MUTATED EXACTLY ONCE WITH THE USER-SUPPLIED TABLE. THE 26 FRICTION ROWS ARE +Y IN THE CORRECTED INPUTXML VIEW, AND THE FRICTION-COUPLED GAP SUBSET REMAINS 5 ROWS ON 4 NODES. NO NEW L13 ACCURACY IS VALID UNTIL ACCDB NONLINEAR RESTRAINT/CONTACT SEMANTICS ARE QUALIFIED.**
