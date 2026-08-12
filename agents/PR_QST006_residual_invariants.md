# M047 / BM4_L QST-006 — source-local residual invariants

## Mission

Close canonical PR #1001 question QST-006 without changing mechanics: convert the remaining primitive comparison failures from component-relative output errors into source-local and cancellation-aware diagnostics that remain meaningful near zero resultants.

This stage is **evidence-only**. It changes no production solver, stiffness, load, topology, recovery equation, reference row, tolerance, or case definition.

## Pinned evidence

- qualification source commit: `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- workflow run: `31457644192`;
- artifact ID: `9088676941`;
- artifact digest: `sha256:8819dbbbf21aff8e314fe6cae85db0c3407afc12ca71dde3b459442242d3e934`;
- `bm4l-report.json` SHA-256: `d19d34a0f7ca7abd533b0c1123ba30ecf84bb3369a260e08f78c4fcb5b79c915`;
- pristine `BM4_L.ACCDB` SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

The L2 and L4 primitive states are unchanged by the delivered tee thermal-free-growth and resolved T1 interval-alpha changes, so the exact-head artifact remains authoritative for those 12 primitive rows. The five L3 primitive rows retain the resolved Stage-10 documentary evidence because the pinned artifact predates the delivered thermal candidate.

## Operator reconstruction

The generator reconstructs the assembled LFEA operator from the retained 322-element recovery ledger.

Recovered model:

- 323 analysis nodes / 1938 DOFs;
- 51 finite restraint DOFs;
- translational restraint stiffness `1.0e14 N/m`;
- rotational restraint stiffness `5.729577951308232e13 N.m/rad`;
- maximum recovered restraint-stiffness relative difference about `5.2e-15`.

Exact-state replay from the reconstructed operator:

| primitive | max solved-state difference | max equation residual | max source-superposition difference |
|---|---:|---:|---:|
| L2 | `3.08e-13` | `2.07e-7` | `2.36e-13` |
| L4 | `4.85e-13` | `1.46e-6` | `8.13e-13` |

The source decomposition is therefore performed against the same K, restraint state and element load vectors retained by the qualification artifact.

## Invariant definitions

### Nodal cancellation factor

For a target displacement/rotation component,

```text
C = sum_s |u_s| / |sum_s u_s|
```

where each `u_s = K_total^-1 f_s` is the response caused by one source element's equivalent + initial load vector.

`C >> 1` means the reported nodal value is a small cancellation of larger source-owned responses. Such a row is unsuitable for selecting a global coefficient or constitutive correction.

### Source-end vector invariant

For one source-element end, force and moment components are assessed as three-vectors:

```text
r_F = ||F_lfea - F_caesar||_2 / ||F_caesar||_2
r_M = ||M_lfea - M_caesar||_2 / ||M_caesar||_2
```

These norms are invariant under rigid rotation of coordinate axes. A failing tiny global component does not authorize source mechanics tuning when the complete source-end force/moment vector remains inside 10%.

Component conditioning is recorded as

```text
k_component = ||vector_reference||_2 / |component_reference|
```

so near-zero components are explicitly identified rather than treated as stable constitutive observables.

## Twelve primitive L2/L4 failures — reconstructed

### Nodal rows

| row | cancellation factor | disposition |
|---|---:|---|
| `L2:20500:UY` | `287.69x` | global cancellation dominated |
| `L2:20510:UY` | `289.05x` | global cancellation dominated |
| `L2:22140:RX` | `446.49x` | global cancellation dominated |
| `L4:20150:UY` | `30.86x` | global cancellation dominated |

These reproduce the canonical Stage-10 cancellation factors from the exact retained operator.

### Direct source-end rows

All eight failing L2/L4 direct source-action components belong to source-end vectors that still pass the 10% vector invariant:

- source 5 L2 FROM force-vector error: `3.79%` while FY alone fails at `11.65%`;
- source 19 L2 FROM force-vector error: `9.92%` while FY alone fails at `12.61%`;
- source 84 L4 TO moment-vector error: `0.0063%`; failing MZ has conditioning about `4.45e4`;
- source 85/86 L4 force-vector errors: about `0.0363%`; failing FY has conditioning about `1.31e4`;
- source 85 L4 FROM moment-vector error: `0.0063%`; failing MZ again has conditioning about `4.45e4`.

Therefore none of these eight rows supports a change to gravity, pressure integration, bend stiffness, reducer stiffness, or global coordinate handling.

## Five resolved-thermal primitive rows

Canonical Stage 10 already records the remaining L3 primitive family after tee + resolved interval alpha:

- node `20250:RX` cancellation factor about `521.8x`;
- source 62/63 failing MY references about `0.638 N.m`;
- source 64/65 failing MX references about `0.147 N.m`.

These are retained as resolved-candidate documentary evidence rather than regenerated from the older pre-delivery artifact. Their classification is the same: one global cancellation row plus four near-zero source-action components.

## QST-006 decision

**COMPLETE — NO_NEW_MECHANICS.**

All 17 primitive nonzero-reference failures now have a conditioning-aware classification:

- 5 nodal rows are dominated by multi-source cancellation;
- 12 direct source-action rows are near-zero/global-component effects whose complete source-end vector does not identify a source constitutive defect.

The 28 nonprimitive nonzero failures remain algebraic duplicates/cancellation-amplified combinations already closed in Stage 10.

No residual family is sufficiently well-conditioned and source-owned to authorize another production mechanics change.

## Durable assets

- `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-residual-invariant-authority.json`
- `scripts/lfea-m047-bm4l-residual-invariant-generate.py`
- `scripts/lfea-m047-bm4l-residual-invariant-check.mjs`
- this report.

The Python generator uses NumPy only for deterministic dense operator solves. The Node checker has no external dependency and verifies report custody, recovered restraint semantics, source-end vector invariants, fixture superposition, conditioning policy and closure counts.

## Local validation

Executed locally against the pinned artifact:

```text
python scripts/lfea-m047-bm4l-residual-invariant-generate.py <bm4l-report.json> <authority.json>
PASS m047 BM4_L residual invariant generator

node scripts/lfea-m047-bm4l-residual-invariant-check.mjs <authority.json> <bm4l-report.json>
PASS m047 BM4_L residual invariant authority
```

## Remaining authority boundary

Further BM4_L mechanics work requires **new independent source/product authority**, not residual minimization. The principal unresolved lane remains CAESAR's exact representative section/property station inside its documented ten-cylinder reducer model. Current residuals must not be used to fit that station.
