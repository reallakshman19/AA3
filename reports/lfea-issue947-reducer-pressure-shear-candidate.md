# Issue 947 — reducer pressure/shear candidate evidence

Candidate production commit: `6d520781a83a2944041c2e7f31c912fbcdc3baa9`.

## Mechanics delta

The existing ten-cylinder reducer authority now accepts an explicit frame formulation and pressure free-strain authority. For the CAESAR ACCDB path, each cylinder uses the CAESAR-specific Timoshenko thin-wall pipe mapping `kappa_y = kappa_z = 0.5` and the existing closed-end pressure axial-strain law

`epsilon_p = (1 - 2 nu) p Di^2 / [E (Do^2 - Di^2)]`.

The per-cylinder pressure initial-load vectors are assembled and statically condensed through the same boundary/internal partition as stiffness, gravity and thermal loads. The sparse global solver, scaling, convergence tolerances, restraints, B31/B31J factors and result recovery are unchanged.

## Pre-commercial gates

Actions run `31305253100` passed all of the following before committing production code:

- B-3.23 ten-cylinder reducer qualification, including uniform Timoshenko condensation identity, uniform pressure initial-load identity, and uniform/tapered free-pressure zero-boundary-action checks;
- independent legacy shadow parity: the extended authority configured as Euler–Bernoulli with pressure disabled reproduces the pre-change full condensed stiffness, gravity vector and thermal vector;
- syntax validation of the BM3 caller after it explicitly declares the legacy Euler–Bernoulli/pressure-off profile;
- real E11/E16 constitutive audit against the pinned BM4_NL canonical package, where the production reducer authority is compared against an independently assembled ten-cylinder Timoshenko+pressure reconstruction;
- CAESAR pipe shear-authority mapping regression;
- MEC-21 Bourdon subdivision regression.

The full BM3 solve is not claimed: `benchmarks/LFEA/BM3/BM3_InputXML.xml` is not committed on this branch and the hosted runner reports that boundary explicitly.

## Falsification evidence before production

With CAESAR endpoint displacements imposed, the old reducer law (Euler–Bernoulli, no pressure initial strain) produced orders-of-magnitude axial residuals. Adding independently derived per-cylinder pressure strain removed the dominant axial error; applying the independently sourced CAESAR pipe shear formulation reduced the remaining transverse/moment residual further. No CAESAR result value is used as a solver parameter or update rule.

## Acceptance state

`PENDING_EXACT_HEAD_L19`.

This documentation commit exists to trigger both the canonical-package replay and the fresh Windows/ACE ACCDB qualification on the exact production reducer head. The reducer change is retained only if L19 improves without violating residual, equilibrium, deterministic-hash, or regression invariants. L20 remains gated behind L19.
