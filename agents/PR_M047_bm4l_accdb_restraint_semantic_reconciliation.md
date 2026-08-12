# M047 BM4_L — ACCDB restraint semantic reconciliation (F2.6)

## Mission

Reconcile exact ACCDB `INPUT_RESTRAINTS` semantics against the correctly mutated InputXML restraint view before any production nonlinear gap/friction mechanics change.

## Fixed source-domain rule

```text
ACCDB    INPUT_RESTRAINTS.RES_TYPEID -> use directly; no InputXML mutation
InputXML RESTRAINT.TYPE              -> apply the BM4_L mutation exactly once before classification
```

No numeric-code equality is assumed across source domains. Reconciliation is by node, physical direction, gap and friction evidence.

## Exact ACCDB row evidence required

The pinned ACCDB table has 46 rows, but the prior provenance artifact retained only schema/table hashes and per-field multiset hashes. F2.6 therefore extends the read-only provenance output with a deterministic `INPUT_RESTRAINTS` row projection retaining:

```text
REST_PTR
NODE_NUM
RES_TYPEID
STIFFNESS
GAP
FRIC_COEF
CNODE
XCOSINE
YCOSINE
ZCOSINE
RES_TAG
```

The projection is sorted by `REST_PTR` and sealed with its own SHA-256. It does not alter ACCDB bytes, solver inputs, the production solver, comparator, tolerances or reference results.

## Qualification boundary

The exact Windows/ACE run must authenticate the pinned ACCDB member before the projection is accepted. Until that run supplies the 46 row-level values, ACCDB nonlinear class semantics remain `BLOCKED` and no new L13 accuracy is valid.

## Accuracy status

Historical diagnostic only:

```text
1719 / 1914 = 89.8119122257%
```

No new percentage is published from F2.6 source extraction alone.

## Next gate after extraction

1. bind every ACCDB row to corrected InputXML by node/direction/gap/friction;
2. establish the ACCDB-specific `RES_TYPEID` -> physical-class mapping without mutating the ACCDB IDs;
3. preserve `RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL`;
4. verify the five friction-coupled positive-gap companions and node 21640 non-friction GUI gap;
5. determine whether F2.7 exact-build Active Boundary Conditions/state-history evidence is still required before nonlinear integration.

No response fitting or accuracy-based state selection is permitted.
