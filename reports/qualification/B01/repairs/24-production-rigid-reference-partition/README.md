# Attempt 24 — production rigid-reference partition conditioning

This retained repair is the first production mechanics change that qualifies the frozen B01 base matrix.

The solver fits a best-fit in-plane rigid translation/rotation only when the prescribed scalar displacement constraints span all three rigid modes. It subtracts that reference before the existing partition solve, solves the deformational correction, evaluates equilibrium on the correction, and restores the rigid reference in the reported displacement. Rank-deficient or zero-reference constraint sets use the legacy path.

Exact-head validation for branch commit `292cc1736b7e0403d89a54067bccbe8f2a900dfc` completed in workflow run `31681143183`. The 54-run T3/T6/Q8 base matrix passed 54/54; all prior continuum controls passed; frozen benchmark values, meshes, probes and tolerances were unchanged. B01 grants no release authority.
