#!/usr/bin/env python3
"""Independent S1-S3 oracle for BM-S B02.

This module intentionally imports no production code. It reconstructs frozen
closed-form/manufactured/static values and verifies committed oracle records
without executing LAFEA.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EXPECTED = ROOT / "validation/lafea-benchmark-data/B02/oracle/expected-values.json"
LOAD_EXPECTED = ROOT / "validation/lafea-benchmark-data/B02/oracle/load-path-expected-values.json"
SOLVER_EXPECTED = ROOT / "validation/lafea-benchmark-data/B02/oracle/solver-numerics-expected-values.json"


def lame_values() -> dict[str, object]:
    ri, ro, pi, e, nu = 50.0, 100.0, 10.0, 200000.0, 0.3
    a_const = pi * ri**2 / (ro**2 - ri**2)
    b_const = pi * ri**2 * ro**2 / (ro**2 - ri**2)

    def stress(radius: float) -> tuple[float, float]:
        return a_const - b_const / radius**2, a_const + b_const / radius**2

    probe_r = 73.0
    probe_theta = math.radians(37.0)
    sigma_r, sigma_hoop = stress(probe_r)
    displacement = ((1 - nu) * a_const * probe_r + (1 + nu) * b_const / probe_r) / e
    inner = stress(ri)
    outer = stress(ro)
    return {
        "A_MPa": a_const,
        "B_MPa_mm2": b_const,
        "boundary": {
            "sigmaRadialInnerMPa": inner[0],
            "sigmaHoopInnerMPa": inner[1],
            "sigmaRadialOuterMPa": outer[0],
            "sigmaHoopOuterMPa": outer[1],
        },
        "fixedProbe": {
            "radiusMm": probe_r,
            "thetaDegrees": 37.0,
            "xMm": probe_r * math.cos(probe_theta),
            "yMm": probe_r * math.sin(probe_theta),
            "sigmaRadialMPa": sigma_r,
            "sigmaHoopMPa": sigma_hoop,
            "displacementMagnitudeMm": displacement,
        },
    }


def kirsch_polar(radius: float, theta_radians: float) -> tuple[float, float, float]:
    hole_radius, remote = 10.0, 50.0
    a2 = (hole_radius / radius) ** 2
    a4 = a2**2
    sigma_r = remote / 2 * (1 - a2) + remote / 2 * (1 - 4 * a2 + 3 * a4) * math.cos(2 * theta_radians)
    sigma_hoop = remote / 2 * (1 + a2) - remote / 2 * (1 + 3 * a4) * math.cos(2 * theta_radians)
    sigma_shear = -remote / 2 * (1 + 2 * a2 - 3 * a4) * math.sin(2 * theta_radians)
    return sigma_r, sigma_hoop, sigma_shear


def kirsch_values() -> dict[str, object]:
    probe_r = 20.0
    probe_theta = math.radians(45.0)
    probe = kirsch_polar(probe_r, probe_theta)
    hole_edge = kirsch_polar(10.0, math.radians(90.0))
    outer_0 = kirsch_polar(100.0, 0.0)
    outer_90 = kirsch_polar(100.0, math.radians(90.0))
    return {
        "holeEdge": {
            "radiusMm": 10.0,
            "thetaDegrees": 90.0,
            "stressConcentrationFactor": hole_edge[1] / 50.0,
            "sigmaHoopMPa": hole_edge[1],
        },
        "fixedProbe": {
            "radiusMm": probe_r,
            "thetaDegrees": 45.0,
            "xMm": probe_r * math.cos(probe_theta),
            "yMm": probe_r * math.sin(probe_theta),
            "sigmaRadialMPa": probe[0],
            "sigmaHoopMPa": probe[1],
            "sigmaShearMPa": probe[2],
        },
        "outerBoundaryChecks": {
            "theta0SigmaRadialMPa": outer_0[0],
            "theta0SigmaShearMPa": outer_0[2],
            "theta90SigmaRadialMPa": outer_90[0],
            "theta90SigmaShearMPa": outer_90[2],
        },
    }


def load_path_values() -> dict[str, dict[str, object]]:
    e, nu, width, height = 200000.0, 0.3, 100.0, 50.0
    traction = 10.0
    thermal = 0.001
    delta = 0.005
    a_quad = 1.0e-6
    probe_x, probe_y = 50.0, 25.0
    return {
        "LOAD-EDGE-TRACTION-01": {
            "sigmaXMPa": traction,
            "sigmaYMPa": 0.0,
            "tauXYMPa": 0.0,
            "rightEdgeUxMm": traction * width / e,
            "topEdgeUyMm": -nu * traction * height / e,
        },
        "LOAD-PRESSURE-01": {
            "sigmaXMPa": -traction,
            "sigmaYMPa": 0.0,
            "tauXYMPa": 0.0,
            "rightEdgeUxMm": -traction * width / e,
            "topEdgeUyMm": nu * traction * height / e,
        },
        "LOAD-BODY-FORCE-01": {
            "bodyForceX": -2 * e * a_quad,
            "rightEdgeTractionXMPa": 2 * e * a_quad * width,
            "fixedProbe": {
                "xMm": probe_x,
                "yMm": probe_y,
                "uxMm": a_quad * (probe_x**2 + nu * probe_y**2),
                "uyMm": -2 * nu * a_quad * probe_x * probe_y,
                "sigmaXMPa": 2 * e * a_quad * probe_x,
                "sigmaYMPa": 0.0,
                "tauXYMPa": 0.0,
            },
            "rightTop": {
                "uxMm": a_quad * (width**2 + nu * height**2),
                "uyMm": -2 * nu * a_quad * width * height,
                "sigmaXMPa": 2 * e * a_quad * width,
            },
        },
        "LOAD-TEMPERATURE-01": {
            "nodeB_UxMm": thermal * 100.0,
            "nodeC_UyMm": thermal * 100.0,
            "sigmaXMPa": 0.0,
            "sigmaYMPa": 0.0,
            "sigmaZMPa": 0.0,
            "tauXYMPa": 0.0,
            "strainEnergyNmm": 0.0,
        },
        "LOAD-IMPOSED-DISPLACEMENT-01": {
            "sigmaXMPa": e * delta / width,
            "sigmaYMPa": 0.0,
            "tauXYMPa": 0.0,
            "rightEdgeUxMm": delta,
            "topEdgeUyMm": -nu * delta * height / width,
        },
    }


def solver_numerics_values() -> dict[str, dict[str, object]]:
    width, height, thickness = 100.0, 50.0, 10.0
    e, nu, traction = 200000.0, 0.3, 10.0
    applied_x = traction * height * thickness
    eps_x = traction / e
    eps_y = -nu * traction / e
    right_ux = eps_x * width
    top_uy = eps_y * height
    volume = width * height * thickness
    strain_energy = 0.5 * traction * eps_x * volume
    external_work = applied_x * right_ux
    response_factor = -500.0 / 1000.0
    return {
        "SOLVER-EQUILIBRIUM-ENERGY-01": {
            "appliedResultantN": {"x": applied_x, "y": 0.0},
            "reactionResultantN": {"x": -applied_x, "y": 0.0},
            "epsilonX": eps_x,
            "epsilonY": eps_y,
            "rightEdgeUxMm": right_ux,
            "topEdgeUyMm": top_uy,
            "volumeMm3": volume,
            "strainEnergyNmm": strain_energy,
            "externalWorkNmm": external_work,
            "externalWorkOverTwoStrainEnergy": external_work / (2 * strain_energy),
        },
        "SOLVER-LINEAR-SCALING-01": {
            "responseFactor": response_factor,
            "strainEnergyFactor": response_factor**2,
        },
        "SOLVER-SUPERPOSITION-01": {
            "displacementCombination": [1, 1],
            "stressCombination": [1, 1],
            "reactionCombination": [1, 1],
        },
        "SOLVER-DIAGONAL-SCALING-01": {
            "maximumRelativeSolutionDifferenceLimit": 1.0e-10,
            "maximumScaledDiagonalAbsoluteErrorLimit": 1.0e-9,
        },
    }


def assert_close(actual: object, expected: object, path: str) -> None:
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            raise AssertionError(f"{path}: expected mapping")
        for key, value in expected.items():
            assert_close(actual[key], value, f"{path}.{key}")
        return
    if isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise AssertionError(f"{path}: expected list of length {len(expected)}")
        for index, value in enumerate(expected):
            assert_close(actual[index], value, f"{path}[{index}]")
        return
    if isinstance(expected, (int, float)):
        actual_value = float(actual)
        limit = 1e-12 * max(1.0, abs(float(expected)))
        if abs(actual_value - float(expected)) > limit:
            raise AssertionError(f"{path}: {actual_value} != {expected}")
        return
    if actual != expected:
        raise AssertionError(f"{path}: {actual!r} != {expected!r}")


def check_expected_values() -> None:
    record = json.loads(EXPECTED.read_text(encoding="utf-8"))
    cases = {row["caseId"]: row for row in record["cases"]}
    assert_close(lame_values(), cases["CONT-CYL-01"]["derived"], "CONT-CYL-01.derived")
    assert_close(kirsch_values(), cases["CONT-HOLE-01"]["derived"], "CONT-HOLE-01.derived")

    load_record = json.loads(LOAD_EXPECTED.read_text(encoding="utf-8"))
    load_cases = {row["caseId"]: row for row in load_record["cases"]}
    for case_id, values in load_path_values().items():
        assert_close(values, load_cases[case_id]["derived"], f"{case_id}.derived")

    solver_record = json.loads(SOLVER_EXPECTED.read_text(encoding="utf-8"))
    solver_cases = {row["caseId"]: row for row in solver_record["cases"]}
    for case_id, values in solver_numerics_values().items():
        assert_close(values, solver_cases[case_id]["derived"], f"{case_id}.derived")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    payload = {
        "schema": "lafea-b02-independent-oracle/v1",
        "productionImports": [],
        "productionOutputUsed": False,
        "CONT-CYL-01": lame_values(),
        "CONT-HOLE-01": kirsch_values(),
        "S2-load-paths": load_path_values(),
        "S3-solver-numerics": solver_numerics_values(),
    }
    if args.check:
        check_expected_values()
        payload["expectedValuesCheck"] = "PASS"
    print(json.dumps(payload, sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
