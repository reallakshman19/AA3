# WRC 537 off-axis longitudinal-moment extrema authority — EMP1-23

## Decision

A production off-axis longitudinal-moment route is **not authorized**.

The retained WRC source interpretation is sufficient to distinguish the off-axis `1B-1 / 2B-1` curves from the existing Table-5 eight-point `1B / 2B` route, but it is not sufficient to establish a source-qualified production recovery location, flexible-nozzle classification, common-location superposition rule, or global absolute maximum claim.

## Existing eight-point production boundary

The bounded route evaluates exactly:

```text
Au, Al, Bu, Bl, Cu, Cl, Du, Dl
```

For longitudinal moment it uses:

```text
circumferential stress family: 1B
longitudinal stress family:    2B
```

Its authority object explicitly states:

```text
continuousJunctureSearchPerformed = false
absoluteShellMaximumAssured = false
offAxisMaximum.authorizedByThisRoute = false
```

This PR does not change that contract.

## Retained source meaning of `1B-1 / 2B-1`

The existing source ledger records:

- Table 5 references longitudinal-moment bending as `1B or 1B-1` and `2B or 2B-1`;
- WRC §4.4 distinguishes the `-1` curves as maximum longitudinal-moment bending stresses away from the axes of symmetry;
- retained applicability is limited, to the best of WRC knowledge, to a round flexible-nozzle connection;
- WRC §4.3.6/eight-point custody does not assure that the absolute maximum shell stress intensity occurs at the eight Table-5 locations.

Therefore `1B-1/2B-1` are not a generic switch from “eight-point” to “global maximum.”

## Current comparison selector is not engineering classification authority

`src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js` contains a guarded comparison selector for `OFF_AXIS_MAXIMUM`. It requires:

```text
attachmentShape = ROUND
connectionFlexibility = FLEXIBLE_NOZZLE
applicabilitySourceRef = non-empty
```

and returns `1B-1/2B-1` with:

```text
productionAuthorityForTable5EightPointRoute = false
```

This is a useful software separation. However, a caller asserting `FLEXIBLE_NOZZLE` plus an arbitrary source-ref string is not, by itself, a qualified engineering classification. The selector permits controlled comparison experiments; it does not grant production authority.

## Three different maximum claims

The following must remain separate:

### A — off-axis longitudinal-moment component maximum

A maximum bending response associated with the `1B-1/2B-1` source curves for their source-qualified applicability domain.

### B — combined shell stress at one physical location

Requires proof that all stress components being superposed are recovered at the **same physical shell point and surface**.

### C — global absolute shell stress intensity under arbitrary six-component loading

Requires a search/recovery method that is source-qualified for the combined loading problem and proves that the reported location/value is globally governing.

Authority for A does not imply B or C.

## Why component maxima cannot be blindly combined

If Figure 1B-1 and Figure 2B-1 provide independently maximized circumferential and longitudinal bending responses, their maxima may occur at different angular positions. Without a source-qualified common recovery location, combining those maxima with each other or with other load-family stresses would create a synthetic stress state that may not exist anywhere on the shell.

Accordingly this inference is prohibited:

```text
max(component X) + max(component Y) + max(component Z)
        ⇒
maximum combined shell stress
```

unless source evidence establishes coincidence or a conservative combination rule.

## Unresolved production-critical items

Before an off-axis production route can be proposed, source custody must resolve:

1. the engineering definition and qualification method for `flexible nozzle`;
2. exact off-axis physical location/angle semantics of `1B-1` and `2B-1`;
3. whether their maxima occur at a common physical point;
4. whether other Table-5 load-family stresses can be recovered/superposed at that point;
5. sign/location behavior when longitudinal moment reverses;
6. inside/outside surface recovery;
7. exact Original-curve domain intersection applicable to off-axis production use;
8. whether a continuous angular search is required or whether the source curves themselves fully define the maximum without location recovery;
9. common-location combined-stress authority;
10. any basis for a global absolute shell stress-intensity claim.

The pinned source remains:

```text
WRC537_2013.pdf
raw SHA-256 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Direct primary binary-page re-observation is not available in the current connected repository environment, so this increment preserves the retained source interpretation and does not invent the missing classification/location rules.

## Authority effect

This source phase changes no production mechanics. It does not:

- change `1B/2B` selection for the eight-point route;
- add an off-axis production route;
- infer flexible-nozzle status;
- add a continuous search;
- change WRC coefficients or stress equations;
- widen gamma/beta/pressure/SCF authority;
- claim global EMP.1.C, code-compliance, or release authority.

Current disposition:

`BLOCKED_OFF_AXIS_PRODUCTION_AUTHORITY_RECOVERY_AND_APPLICABILITY_UNRESOLVED`

## Reopen gate

A later numerical/production increment is admissible only when repository evidence can answer:

> Why is this connection source-qualified as a round flexible nozzle; where on the shell do the off-axis results occur; which stress components share that location; what may be superposed there; and what maximum statement does WRC actually authorize?
