# Pressure structural effects — one implemented, two scoped

The parity harness identified pressure as the dominant discrepancy against
CAESAR. This records what was implemented, what it measured, and precisely why
the other two effects stop where they do.

## Implemented: closed-end axial thrust

A closed-end pressurized pipe carries longitudinal thrust and grows along its
axis the way a heated one does:

```text
e = (1 - 2v) * P * di^2 / (E * (do^2 - di^2))
```

The `(1 - 2v)` term is what makes this a net axial strain rather than raw
end-cap thrust — hoop expansion contracts the pipe axially through Poisson
coupling and the two partly cancel. Applied as an initial strain superposed onto
the thermal one, since both act on the same axis.

### Measured

| Case | | Pass rate | | Median error |
|---|---|---|---|---|
| L2 (W) | 84.25% → 84.25% | | 1.5689% → 1.5689% |
| L5 (W+T1+P1) | 63.65% → **67.85%** | | 8.6166% → **3.4710%** |
| L6 (W+P1) | 40.29% → **52.23%** | | 63.2908% → **7.7782%** |

L6 improves by a factor of eight. L2 is unchanged, which is the check that
matters: a weight-only case carries no pressure, so a correct pressure term must
do nothing there.

### Authority

The pressure primitive already carried `authorizedEffects` from the production
capability profile — the seam existed with nothing behind it. The kernel honours
it now and applies nothing when `axialThrust` is false, so a pressure retained
for code stress cannot silently move the structure.

`compileFrameElement`'s input contract is exact-key, so twenty-two call sites now
state `pressure` explicitly. More churn than a defaulted parameter, and the right
trade in a package whose own anti-drift guard forbids hidden defaults.

---

## Blocked: bend pressure stiffening

**Not blocked on physics.** The B31 factor calculator already accepts `pressure`
in its geometry and computes a pressure-corrected flexibility factor;
`inputxml-production-bend-components.js` passes `pressure: 0` deliberately, with
a guard asserting `pressureCorrectionApplied === false`. Supplying the real
pressure is a one-line change.

**Blocked on the sealing model.** Pressure stiffening makes bend stiffness
*case-dependent* — a weight case and a weight+pressure case would have different
bend flexibility, so different stiffness. Production seals a single
`stiffnessStateHash`:

- `compileInputXmlStiffnessElementAuthorities` compiles the stiffness preflight
  with `loadCase: null`, deliberately case-independent;
- `prepareInputXmlLinearPreFea` seals that as `stiffnessStateHash`;
- `requireResultRelationships` requires every execution result to carry the same
  `stiffnessStateHash` as its parent.

A per-case stiffness therefore violates a custody invariant the whole result
chain is built on. This is what separates S5 from S3, and it is a real
architectural change — the stiffness seal has to become per-case, or bend
stiffness has to be sealed per case alongside the load case — not a parameter
tweak.

Making the number improve by relaxing that invariant would trade a measurable
gain for an unmeasurable loss of custody. Left closed.

---

## Scoped, not implemented: Bourdon

Bourdon does **not** hit the stiffness-seal problem: it is an initial load, and
loads are already per-case in production under `physicalLoadCaseHash`.

What it needs is per-chord geometry that production does not currently derive.
`buildBourdonSegments` builds a reference triad (a/b/c axes) per bend from the
arc points, centre and incoming direction, then a per-chord frame with a
cumulative swept angle; `buildBourdonBendInitialLoad` converts the cumulative
MEC-21 free field into each chord's initial load, sampling both chord ends
relative to the physical bend start so a free bend gives `q = K(d - d0) = 0` and
its endpoint is independent of how finely the arc was subdivided.

Production has the inputs — `bendRecord` retains arc length and incoming
direction, and the chords carry their own positions — so this is a port rather
than new engineering. It is simply a substantial one, and it should be measured
chord-by-chord as it lands rather than written in one go.

## Reproducing

```text
npm run check:lfea-production-caesar-parity
```
