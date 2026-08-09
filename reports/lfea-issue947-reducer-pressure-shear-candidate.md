# Issue 947 — reducer pressure/shear candidate evidence

Candidate production commit: `6d520781a83a2944041c2e7f31c912fbcdc3baa9`.
Rejected by revert commit: `9f1ab2ea8aa1be814ef149fe14aac7a9fb9334e2`.

## Mechanics delta tested

The candidate extended the existing ten-cylinder reducer authority with an explicit frame formulation and pressure free-strain authority. For the CAESAR ACCDB path, each cylinder used the CAESAR-specific Timoshenko thin-wall pipe mapping `kappa_y = kappa_z = 0.5` and the existing closed-end pressure axial-strain law

`epsilon_p = (1 - 2 nu) p Di^2 / [E (Do^2 - Di^2)]`.

The per-cylinder pressure initial-load vectors were assembled and statically condensed through the same boundary/internal partition as stiffness, gravity and thermal loads. The sparse global solver, scaling, convergence tolerances, restraints, B31/B31J factors and result recovery were unchanged.

## Pre-commercial gates

Actions run `31305253100` passed all of the following before the candidate was committed:

- B-3.23 ten-cylinder reducer qualification, including uniform Timoshenko condensation identity, uniform pressure initial-load identity, and uniform/tapered free-pressure zero-boundary-action checks;
- independent legacy shadow parity: the extended authority configured as Euler–Bernoulli with pressure disabled reproduced the pre-change full condensed stiffness, gravity vector and thermal vector;
- syntax validation of the BM3 caller after it explicitly declared the legacy Euler–Bernoulli/pressure-off profile;
- real E11/E16 constitutive audit against the pinned BM4_NL canonical package, where the production reducer authority was compared against an independently assembled ten-cylinder Timoshenko+pressure reconstruction;
- CAESAR pipe shear-authority mapping regression;
- MEC-21 Bourdon subdivision regression.

The full BM3 solve was not claimed: `benchmarks/LFEA/BM3/BM3_InputXML.xml` is not committed on this branch and the hosted runner reported that boundary explicitly.

## Constitutive evidence retained

With CAESAR endpoint displacements imposed, the old reducer law (Euler–Bernoulli, no pressure initial strain) produced orders-of-magnitude axial residuals. Adding independently derived per-cylinder pressure strain removed the dominant axial error; applying the independently sourced CAESAR pipe shear formulation reduced the remaining transverse/moment residual further. This remains useful evidence that the current reducer candidate omits real pressure/shear mechanics, but it does **not** establish that the ten-cylinder midpoint-sampling reducer is CAESAR-equivalent.

No CAESAR result value was used as a solver parameter or update rule.

## Exact-head BM4 falsification

Canonical-package replay run `31305297010`, artifact digest `sha256:7ad2587b1a9b956647e505b8116c54e90bc4b9b2fa571f8a0e144a768c3c417f`, executed the exact candidate against the pinned source package.

Compared with the accepted pre-reducer CAESAR-pipe-frame state (`kappa=0.5`):

| L19 metric | Before reducer candidate | With reducer candidate | Disposition |
|---|---:|---:|---|
| restraint components >10% | 1 | **2** | worse |
| displacement/rotation components >10% | 54 | **50** | improved |
| source end-action components >10% | 17 | **27** | worse |
| total compared failures | 73 | **81** | worse |

The original node 20090 UY target remained within tolerance (`-1618.899 N` versus `-1659.837 N`, 2.47%), and node 20390 UZ improved slightly to `-30.949 N` versus `-36.450 N`, 11.00% on the fixed 50 N scale floor. However, the candidate introduced a new L19 restraint failure at node 21470 UY: `-583.962 N` versus `-656.904 N`, 11.10%.

That violates issue #947 change control: a mechanics change cannot be retained when it introduces a new restraint failure and increases source-element action failures, even if one local residual or displacement count improves.

## Disposition

`REVERT`.

The production mechanics commit was reverted in full by `9f1ab2ea8aa1be814ef149fe14aac7a9fb9334e2`. The reducer pressure/shear canonical and diagnostic evidence is retained for the future reducer-formulation work, but it is **not** part of the accepted BM4 L19 solver state.

The active L19 investigation returns to the CAESAR-specific Timoshenko pipe-frame state with the reducer candidate unchanged. The next change must again be justified by the first element/component constitutive residual, not by downstream benchmark improvement.
