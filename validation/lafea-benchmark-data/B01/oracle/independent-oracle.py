#!/usr/bin/env python3
"""Independent B01 affine oracle.

Imports only Python standard-library modules. No LAFEA production module or output is
used to construct expected values.
"""
from __future__ import annotations

from decimal import Decimal, getcontext
import argparse
import json
from pathlib import Path

getcontext().prec = 50
D = Decimal

PROBES = (
    ("P1", D("0.25"), D("0.25")),
    ("P2", D("0.50"), D("0.50")),
    ("P3", D("0.75"), D("0.40")),
    ("P4", D("0.30"), D("0.80")),
)


def dec(value):
    return value if isinstance(value, Decimal) else D(str(value))


def text(value: Decimal) -> str:
    value = +value
    if value == 0:
        return "0"
    rendered = format(value, "f")
    return rendered.rstrip("0").rstrip(".") if "." in rendered else rendered


def strain_from_affine(affine):
    return dec(affine["ux"]), dec(affine["vy"]), dec(affine["uy"]) + dec(affine["vx"])


def stress(formulation, E, nu, ex, ey, gxy):
    one, two = D(1), D(2)
    shear = E / (two * (one + nu))
    if formulation == "PLANE_STRESS":
        scale = E / (one - nu * nu)
        return (
            scale * (ex + nu * ey),
            scale * (nu * ex + ey),
            shear * gxy,
            D(0),
            {"constitutive": "PLANE_STRESS_ISOTROPIC_LINEAR_ELASTIC", "scale": text(scale), "G": text(shear)},
        )
    if formulation == "PLANE_STRAIN":
        denom = (one + nu) * (one - two * nu)
        scale = E / denom
        lam = E * nu / denom
        return (
            scale * ((one - nu) * ex + nu * ey),
            scale * (nu * ex + (one - nu) * ey),
            shear * gxy,
            lam * (ex + ey),
            {"constitutive": "PLANE_STRAIN_ISOTROPIC_LINEAR_ELASTIC", "scale": text(scale), "lambda": text(lam), "G": text(shear)},
        )
    raise ValueError(f"Unsupported formulation {formulation}")


def displacement(affine, x, y):
    return (
        dec(affine["u0"]) + dec(affine["ux"]) * x + dec(affine["uy"]) * y,
        dec(affine["v0"]) + dec(affine["vx"]) * x + dec(affine["vy"]) * y,
    )


def boundary_resultants(width, height, thickness, sxx, syy, txy):
    # Outward-normal traction t = sigma.n; Mz = integral(x*ty - y*tx) dA_edge.
    raw = {
        "LEFT": ((-sxx, -txy), (-sxx * height * thickness, -txy * height * thickness), sxx * height * height * thickness / D(2)),
        "RIGHT": ((sxx, txy), (sxx * height * thickness, txy * height * thickness), thickness * (width * txy * height - sxx * height * height / D(2))),
        "BOTTOM": ((-txy, -syy), (-txy * width * thickness, -syy * width * thickness), -syy * width * width * thickness / D(2)),
        "TOP": ((txy, syy), (txy * width * thickness, syy * width * thickness), thickness * (syy * width * width / D(2) - height * txy * width)),
    }
    edges = {
        name: {
            "tractionMPa": [text(traction[0]), text(traction[1])],
            "forceN": [text(force[0]), text(force[1])],
            "momentAboutOriginZ_Nmm": text(moment),
        }
        for name, (traction, force, moment) in raw.items()
    }
    net_fx = sum(force[0] for _, force, _ in raw.values())
    net_fy = sum(force[1] for _, force, _ in raw.values())
    net_mz = sum(moment for _, _, moment in raw.values())
    return edges, net_fx, net_fy, net_mz


def evaluate_case(case):
    E = dec(case["material"]["elasticModulus"])
    nu = dec(case["material"]["poissonRatio"])
    width = dec(case["geometry"]["width"])
    height = dec(case["geometry"]["height"])
    thickness = dec(case["geometry"]["thickness"])
    ex, ey, gxy = strain_from_affine(case["affine"])

    frozen = case["expectedStrain"]
    if (ex, ey, gxy) != (dec(frozen["epsilonXX"]), dec(frozen["epsilonYY"]), dec(frozen["gammaXY"])):
        raise ValueError(f"{case['caseId']} affine coefficients do not reproduce frozen strain")

    sxx, syy, txy, szz, constitutive_trace = stress(case["formulation"], E, nu, ex, ey, gxy)
    density = D("0.5") * (ex * sxx + ey * syy + gxy * txy)
    volume = width * height * thickness
    energy = density * volume

    probes = []
    for probe_id, px, py in PROBES:
        x, y = px * width, py * height
        ux, uy = displacement(case["affine"], x, y)
        probes.append({"probeId": probe_id, "coordinateMm": [text(x), text(y)], "displacementMm": [text(ux), text(uy)]})

    edges, net_fx, net_fy, net_mz = boundary_resultants(width, height, thickness, sxx, syy, txy)
    return {
        "caseId": case["caseId"],
        "formulation": case["formulation"],
        "strain": {"epsilonXX": text(ex), "epsilonYY": text(ey), "gammaXY": text(gxy)},
        "stressMPa": {"sigmaXX": text(sxx), "sigmaYY": text(syy), "tauXY": text(txy), "sigmaZZ": text(szz)},
        "sigmaZZAuthority": "ORACLE_COMPARE_IF_RESULT_CONTRACT_EXPOSES" if case["formulation"] == "PLANE_STRAIN" else "EXACT_ZERO_PLANE_STRESS",
        "strainEnergyNmm": text(energy),
        "probes": probes,
        "boundaryResultants": edges,
        "globalEquilibrium": {"netBoundaryForceN": [text(net_fx), text(net_fy)], "netBoundaryMomentAboutOriginZ_Nmm": text(net_mz)},
        "trace": {
            "E_MPa": text(E), "nu": text(nu), "affine": case["affine"],
            "derivedStrain": [text(ex), text(ey), text(gxy)],
            "constitutive": constitutive_trace,
            "energyDensity_MPa": text(density), "volume_mm3": text(volume),
            "energyEquation": "0.5*(epsilonXX*sigmaXX + epsilonYY*sigmaYY + gammaXY*tauXY)*W*H*t",
        },
    }


def generate(cases_document):
    return {
        "schema": "lafea-b01-independent-oracle-output/v1",
        "baselineCommit": cases_document["baselineCommit"],
        "authority": {"class": "INDEPENDENT_CLOSED_FORM", "productionImports": [], "productionOutputUsed": False, "decimalPrecision": getcontext().prec},
        "units": {"length": "mm", "stress": "MPa", "force": "N", "energy": "N*mm"},
        "probeDefinition": {pid: {"xOverW": text(px), "yOverH": text(py)} for pid, px, py in PROBES},
        "cases": [evaluate_case(case) for case in cases_document["cases"]],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", default=str(Path(__file__).with_name("cases.json")))
    parser.add_argument("--output", default=str(Path(__file__).with_name("expected-values.json")))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    cases_document = json.loads(Path(args.cases).read_text())
    rendered = json.dumps(generate(cases_document), sort_keys=True, separators=(",", ":")) + "\n"
    output_path = Path(args.output)
    if args.check:
        if not output_path.exists():
            raise SystemExit(f"Missing expected output: {output_path}")
        if output_path.read_text() != rendered:
            raise SystemExit("Independent oracle output drifted from committed expected-values.json")
        print("B01 independent oracle: PASS")
        return
    output_path.write_text(rendered)
    print(output_path)


if __name__ == "__main__":
    main()
