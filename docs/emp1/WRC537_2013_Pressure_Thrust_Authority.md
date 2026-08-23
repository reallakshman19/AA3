# WRC 537 nonzero-Δp pressure-thrust authority — EMP1-22

## Decision

Nonzero differential-pressure WRC production remains **blocked**.

The repository has enough controlled evidence to reject two unsafe simplifications:

1. pressure thrust is not universally negligible; and
2. the existing Lamé pipe-wall pressure calculation is not, by itself, WRC attachment-load authority.

It does **not** yet have enough primary-source/accounting authority to implement a universal nonzero-Δp producer.

## Current production state

The qualified EMP.1.A → WRC producer remains the historical zero-Δp producer:

- `internalPressure === externalPressure` is required;
- differential pressure is exactly zero;
- `pressureThrust = 0`;
- mode = `SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED`;
- historical producer qualification SHA-256 remains `47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b`.

No field in this PR changes that behavior.

The generic WRC load-custody contract already defines three accounting states:

```text
SOURCE_LOAD_ALREADY_INCLUDES_THRUST
SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED
SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM
```

and requires `doubleCountGuardQualified=true`. That is a useful software boundary, but the existence of those enum values is not an engineering decision about which state applies to a real nonzero-Δp case.

## Controlled supplemental pressure-thrust evidence

Retained qualification:

`validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json`

Classification:

`SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK`

Verdict:

`QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY`

The controlled Hexagon WRC example reports:

```text
pressure                  275 psi
nozzle OD                 12.75 in
nozzle wall               0.375 in
nozzle ID                 12.0 in
restraint axial force     -26 lbf
source WRC radial load P  -31128 lbf
source construction       P = -26 - 275*pi*12^2/4
```

Independent decimal arithmetic from those source-reported inputs gives:

```text
inside area               113.09733552923256 in^2
pressure thrust           31101.76727053895 lbf
unrounded total P        -31127.76727053895 lbf
nearest whole pound      -31128 lbf
```

The same controlled reference states that axial pressure thrust uses pressure times inside area and that some or all of the thrust may need to be added depending on restraint configuration.

### What this proves

For the cited example only:

- pressure thrust is mechanically material;
- the effective area is the nozzle inside area;
- the thrust contributes to the reported WRC radial load `P`;
- the example sign/arithmetic is reproducible independently.

### What this does not prove

It does **not** establish a universal EMP.1/WRC rule for arbitrary geometry, end condition, source-load convention, axis orientation, load-reference point, moment translation, or source-load inclusion state.

The retained qualification itself explicitly prohibits using this example to authorize EMP.1.C production.

## Separate pipe-wall pressure authority

`src/core/local-stress/pressure.js` independently supports Lamé pipe-wall pressure stress and explicit end-condition states:

```text
CLOSED_END
OPEN_END
EXPLICIT_AXIAL_RESULTANT
```

That engine can produce axial pressure-stress/resultant evidence for its own qualified scope. It does not automatically answer the WRC load-accounting question.

The following inference is prohibited:

```text
pipe-wall axial pressure stress exists
        ⇒
WRC pressure thrust is source-qualified and correctly included in P
```

Those are different authority layers.

## Double-count boundary

Any future nonzero-Δp producer must prove exactly one of these states for each input load package:

### A — source already includes thrust

```text
mode = SOURCE_LOAD_ALREADY_INCLUDES_THRUST
sourceLoadContainsPressureThrust = true
no additional thrust force is added
```

The evidence proving inclusion must be source-specific and auditable. A field value or user assumption is insufficient.

### B — source excludes thrust and addition is required

```text
mode = SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM
sourceLoadContainsPressureThrust = false
upstreamAdditionVerified = true
```

Before this can exist in production, the effective area, Δp sign, force direction, end-condition rule, application point and translation must all be source-qualified.

### C — source excludes thrust and thrust is not required

The existing zero-Δp route uses this state because thrust is mathematically zero. This does not prove the same disposition for nonzero Δp.

## Unresolved primary-source items

The following remain blocking:

1. exact primary WRC 537 pressure-thrust text and locator relevant to the Table-5 external-load method;
2. universal effective pressure-area definition;
3. universal WRC `P` sign/axis mapping;
4. application/reference point;
5. eccentric translation/moment rule;
6. WRC end-condition policy;
7. required evidence that a source load already contains thrust;
8. required evidence that a source load excludes thrust;
9. exact relation between EMP.1.A pressure evidence and WRC load custody;
10. a separately qualified nonzero-Δp producer/policy hash.

The pinned WRC source remains:

```text
docs/emp1/WRC537_2013.pdf
Git blob ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Its binary page content was not directly readable through the current connected repository interface in this workstream. Therefore no missing primary-source pressure-thrust rule is guessed or reconstructed from the supplemental example.

## Authority effect

EMP1-22 source/accounting phase changes **no production mechanics**. It does not modify the zero-Δp producer, add a nonzero-Δp producer, change WRC load signs, change the gamma5 route, widen gamma/beta/Kn/Kb, change Table-5 numerics/oracles, or grant global EMP.1.C/code/release authority.

Current result:

`BLOCKED_UNIVERSAL_NONZERO_DP_PRESSURE_THRUST_CUSTODY_UNRESOLVED`

## Reopen/implementation gate

A later implementation PR is admissible only after source evidence can answer, for a real load package:

> Is pressure thrust already present? If not, what exact source-qualified force must be added, along which qualified axis, at what reference point, under which end-condition rule, and what moment translation follows?

Until then, nonzero differential pressure remains fail-closed.
