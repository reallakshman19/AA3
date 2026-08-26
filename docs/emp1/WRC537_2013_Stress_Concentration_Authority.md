# WRC 537 stress-concentration authority — EMP1-11

## Decision

The current bounded EMP.1.C route remains a **unity-multiplier route only**:

- `Kn = 1`
- `Kb = 1`
- no Appendix-B stress-concentration amplification is applied;
- non-unity `Kn` or `Kb` is not authorized;
- this does **not** claim that Appendix B is unnecessary or that unity is a generally valid WRC stress-concentration model.

The historical source-custody payload remains exactly:

```text
{ Kn: 1, Kb: 1, authority: PINNED_BOUNDED_ROUTE_UNITY_ONLY }
```

That payload is preserved because it participates in already-qualified EMP.1 evidence identity.

## Retained source state

`docs/01_WRC537_METHOD_DEFINITION.md` is explicitly marked `NOT_READY_FOR_IMPLEMENTATION`. It records that the licensed WRC 537 PDF was not available to that extractor.

The retained extraction identifies:

- `Kn` — membrane stress-concentration factor;
- `Kb` — bending stress-concentration factor;
- WRC Appendix B as the source section;
- candidate equations B.3, B.4 and B.5;
- Peterson and Heywood as external bases for those relations.

The same retained extraction provides candidate formula text, but that is **secondary/unqualified implementation evidence**. EMP1-11 therefore does not encode those equations into a production SCF evaluator.

## Why unity and general Appendix-B authority are separate

Table-5 arithmetic actively uses the factors:

```text
P membrane scale  ∝ Kn
P bending scale   ∝ Kb
M membrane scale  ∝ Kn
M bending scale   ∝ Kb
```

A simple falsifier demonstrates the consequence without authorizing it: changing `Kn` from `1.0` to `1.2` changes the affected membrane scale by exactly `+20%`; changing `Kb` from `1.0` to `1.3` changes the affected bending scale by exactly `+30%` for unchanged geometry, load and curve ordinate.

Therefore silently treating arbitrary `Kn/Kb` as cosmetic would be numerically wrong. The low-level Table-5 kernel remains parameterized, while the bounded product authority fails closed on non-unity values.

## General Appendix-B reopen gate

A future non-unity implementation requires, at minimum:

1. licensed/authorized primary-source verification of Appendix B;
2. exact symbol and geometry definitions used in B.3–B.5;
3. exact applicability limits and dimensional basis;
4. authoritative selection rule between the alternative `Kb` relations;
5. clarification of the retained note concerning replacement of `2T` for nozzle evaluation;
6. independent hand calculations at more than one geometry ratio;
7. deliberate equation-selection and sign/geometry mutation falsifiers;
8. a new semantic authority identity and qualification record;
9. explicit UI distinction between shell Table-5 stress and any SCF-amplified result;
10. no retrospective mutation of the historical unity-only evidence payload.

Until all gates are closed, `WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED` remains visible product limitation and `NONUNITY_STRESS_CONCENTRATION` remains blocked.

## Authority effect of EMP1-11

EMP1-11 changes **authority semantics and evidence validation only**. It does not:

- change Table-5 equations or curve data;
- change the frozen gamma-5 or gamma-15 oracle values;
- register the suspended gamma-5 production route;
- remove any existing WRC source-authority suspension reason;
- authorize nonzero differential pressure;
- authorize global/full-domain EMP.1.C;
- produce code-compliance or release authority.
