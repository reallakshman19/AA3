"""
AIV Phase-1 Master Database Validation & Join Integrity Test Suite
Verifies schema conformity, primary key uniqueness, foreign key relationships,
domain/enum constraints, and deterministic join chain resolution.
"""

import os
import sys
import csv

sys.stdout.reconfigure(encoding='utf-8')

MASTERS_DIR = os.path.join(os.path.dirname(__file__), "masters")

def load_csv(filename):
    path = os.path.join(MASTERS_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing master table: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return rows, reader.fieldnames

def test_schemas_and_pks():
    print("=== 1. Validating Schemas and Primary Keys ===")
    
    expected_tables = {
        "M_DOCUMENT_SOURCE.csv": {
            "pk": "SourceDocumentId",
            "required_cols": [
                "SourceDocumentId", "DocumentNumber", "DocumentTitle", "DocumentType", "Organization",
                "Edition", "Revision", "IssueDate", "AuthorityLevel", "RecordVersion",
                "FileReference", "DocumentHash", "SupersededBy", "DataOwner", "Status"
            ]
        },
        "M_UNIT.csv": {
            "pk": "UnitId",
            "required_cols": [
                "UnitId", "QuantityType", "UnitSymbol", "CanonicalUnit", "ScaleToCanonical",
                "OffsetToCanonical", "PressureBasisAllowed", "Description", "Status"
            ]
        },
        "M_MATERIAL.csv": {
            "pk": "MaterialId",
            "required_cols": [
                "MaterialId", "Specification", "Grade", "MaterialFamily", "BaseMaterialType",
                "IsDuplex", "IsStainless", "IsCarbonSteel", "SourceDocumentId", "SourceRecord",
                "StandardEdition", "Status"
            ]
        },
        "M_COMPONENT_TYPE.csv": {
            "pk": "ComponentTypeId",
            "required_cols": [
                "ComponentTypeId", "ComponentFamily", "ComponentSubtype", "ModelType",
                "IsAivAssessmentCandidate", "AivAssessmentType", "RequiresBranchGeometry",
                "MainSizeRequired", "BranchSizeRequired", "Description", "SourceDocumentId",
                "Revision", "Status"
            ]
        },
        "M_SOURCE_DEVICE_TYPE.csv": {
            "pk": "SourceDeviceTypeId",
            "required_cols": [
                "SourceDeviceTypeId", "ComponentFamily", "ComponentSubtype", "ModelType",
                "IsAivSourceCandidate", "AivSourceDeviceType", "RequiresPressureDrop",
                "RequiresMassFlow", "RequiresTemperature", "RequiresMolecularWeight",
                "SupportsLowNoiseTrim", "Description", "SourceDocumentId", "Revision", "Status"
            ]
        },
        "M_PIPE_DIMENSION.csv": {
            "pk": "PipeDimensionId",
            "required_cols": [
                "PipeDimensionId", "Standard", "StandardEdition", "NPS", "DN",
                "OutsideDiameter", "OutsideDiameterUnit", "Schedule", "WallThickness",
                "WallThicknessUnit", "InsideDiameter", "InsideDiameterUnit",
                "SourceDocumentId", "SourceRecord", "Status"
            ]
        },
        "M_PIPING_CLASS.csv": {
            "pk": "PipingClassRecordId",
            "required_cols": [
                "PipingClassRecordId", "PipingClassId", "ComponentFamily", "NPS", "DN",
                "Schedule", "NominalWallThickness", "WallThicknessUnit", "MaterialId",
                "PressureClass", "BranchType", "BranchNPS", "BranchDN", "BranchSchedule",
                "BranchWallThickness", "Standard", "SourceDocumentId", "SourceRecord",
                "Revision", "Status"
            ]
        }
    }
    
    tables_data = {}
    
    for filename, meta in expected_tables.items():
        rows, fields = load_csv(filename)
        tables_data[filename] = rows
        pk = meta["pk"]
        
        # Verify required columns
        for col in meta["required_cols"]:
            assert col in fields, f"Table {filename} missing required column: {col}"
        
        # Verify PK uniqueness
        pks = [r[pk] for r in rows]
        assert len(pks) == len(set(pks)), f"Duplicate primary keys found in {filename}: {[k for k in pks if pks.count(k) > 1]}"
        assert all(k and k.strip() for k in pks), f"Empty or whitespace primary key in {filename}"
        
        print(f"  [PASS] {filename:<25} ({len(rows):3d} rows) - PK '{pk}' unique & verified.")
        
    return tables_data

def test_foreign_keys_and_enums(tables):
    print("\n=== 2. Validating Foreign Keys and Enum Constraints ===")
    
    doc_ids = set(r["SourceDocumentId"] for r in tables["M_DOCUMENT_SOURCE.csv"])
    mat_ids = set(r["MaterialId"] for r in tables["M_MATERIAL.csv"])
    
    # Map (NPS, Schedule) to dimensions
    pipe_dim_keys = set(f"{r['Standard']} | {r['NPS']} | {r['Schedule']}" for r in tables["M_PIPE_DIMENSION.csv"])
    
    # 2.1 Check SourceDocumentId across all tables
    for tbl_name in ["M_MATERIAL.csv", "M_COMPONENT_TYPE.csv", "M_SOURCE_DEVICE_TYPE.csv", "M_PIPE_DIMENSION.csv", "M_PIPING_CLASS.csv"]:
        for r in tables[tbl_name]:
            doc_id = r["SourceDocumentId"]
            assert doc_id in doc_ids, f"FK Error in {tbl_name}: SourceDocumentId '{doc_id}' not found in M_DOCUMENT_SOURCE"
    print("  [PASS] All SourceDocumentId references resolve in M_DOCUMENT_SOURCE.")
    
    # 2.2 Check MaterialId in M_PIPING_CLASS
    for r in tables["M_PIPING_CLASS.csv"]:
        mat_id = r["MaterialId"]
        assert mat_id in mat_ids, f"FK Error in M_PIPING_CLASS: MaterialId '{mat_id}' not found in M_MATERIAL"
    print("  [PASS] All PipingClass MaterialId references resolve in M_MATERIAL.")
    
    # 2.3 Check Header & Branch pipe dimensional resolution
    for r in tables["M_PIPING_CLASS.csv"]:
        nps = r["NPS"]
        sch = r["Schedule"]
        std = "ASME B36.19M" if sch.endswith("S") else "ASME B36.10M"
        eng_key = f"{std} | {nps} | {sch}"
        assert eng_key in pipe_dim_keys, f"Resolution Error: Header pipe ({eng_key}) for record {r['PipingClassRecordId']} not found in M_PIPE_DIMENSION"
        
        # If record has branch, verify branch dimensions resolve too
        if r["BranchNPS"] and r["BranchSchedule"]:
            b_nps = r["BranchNPS"]
            b_sch = r["BranchSchedule"]
            b_std = "ASME B36.19M" if b_sch.endswith("S") else "ASME B36.10M"
            b_key = f"{b_std} | {b_nps} | {b_sch}"
            assert b_key in pipe_dim_keys, f"Resolution Error: Branch pipe ({b_key}) for record {r['PipingClassRecordId']} not found in M_PIPE_DIMENSION"

    print("  [PASS] All PipingClass header and branch dimensions resolve deterministically to M_PIPE_DIMENSION.")

    # 2.4 Enum validation
    allowed_assessment_types = {"WELDOLET", "WELDED_TEE", "WELDED_SUPPORT", "OTHER_WELDED_DISCONTINUITY", "NONE"}
    for r in tables["M_COMPONENT_TYPE.csv"]:
        assert r["AivAssessmentType"] in allowed_assessment_types, f"Invalid AivAssessmentType: {r['AivAssessmentType']}"
        assert r["IsAivAssessmentCandidate"] in {"YES", "NO"}
    print("  [PASS] M_COMPONENT_TYPE enum constraints validated.")

    allowed_source_types = {"CONTROL_VALVE", "RELIEF_VALVE", "RESTRICTION_ORIFICE", "PRESSURE_REDUCING_BRANCH_CONNECTION", "NONE"}
    for r in tables["M_SOURCE_DEVICE_TYPE.csv"]:
        assert r["AivSourceDeviceType"] in allowed_source_types, f"Invalid AivSourceDeviceType: {r['AivSourceDeviceType']}"
        assert r["IsAivSourceCandidate"] in {"YES", "NO"}
    print("  [PASS] M_SOURCE_DEVICE_TYPE enum constraints validated.")

    for r in tables["M_MATERIAL.csv"]:
        assert r["IsDuplex"] in {"YES", "NO"}
        assert r["IsStainless"] in {"YES", "NO"}
        assert r["IsCarbonSteel"] in {"YES", "NO"}
    print("  [PASS] M_MATERIAL Boolean flag constraints validated.")

def test_deterministic_join_chain(tables):
    print("\n=== 3. Simulating End-to-End AIV Join Chains ===")
    
    # Test Scenario 1: Model Component -> Weldolet on 6" SCH 40 header in Class A1
    comp_type_id = "CMP-WELDOLET"
    piping_class_id = "A1"
    nps = "6"
    branch_nps = "2"
    
    # Step 1: Resolve Component Type
    comp_row = next(r for r in tables["M_COMPONENT_TYPE.csv"] if r["ComponentTypeId"] == comp_type_id)
    assert comp_row["IsAivAssessmentCandidate"] == "YES"
    assert comp_row["AivAssessmentType"] == "WELDOLET"
    print(f"  Step 1: Component '{comp_type_id}' -> AssessmentType='{comp_row['AivAssessmentType']}', RequiresBranch={comp_row['RequiresBranchGeometry']}")
    
    # Step 2: Resolve Piping Class
    pc_row = next(r for r in tables["M_PIPING_CLASS.csv"] if r["PipingClassId"] == piping_class_id and r["NPS"] == nps and r["ComponentFamily"] == "WELDOLET" and r["BranchNPS"] == branch_nps)
    material_id = pc_row["MaterialId"]
    main_sch = pc_row["Schedule"]
    main_std = "ASME B36.19M" if main_sch.endswith("S") else "ASME B36.10M"
    branch_sch = pc_row["BranchSchedule"]
    branch_std = "ASME B36.19M" if branch_sch.endswith("S") else "ASME B36.10M"
    print(f"  Step 2: Piping Class '{piping_class_id}' NPS {nps} -> MainSch={main_sch}, BranchSch={branch_sch}, MaterialId={material_id}")
    
    # Step 3a: Resolve Pipe Dimensions (Main Pipe)
    main_dim = next(r for r in tables["M_PIPE_DIMENSION.csv"] if r["Standard"] == main_std and r["NPS"] == nps and r["Schedule"] == main_sch)
    print(f"  Step 3a: Main Pipe Dimensions -> OD={main_dim['OutsideDiameter']} mm, WT={main_dim['WallThickness']} mm, ID={main_dim['InsideDiameter']} mm")
    
    # Step 3b: Resolve Branch Pipe Dimensions
    branch_dim = next(r for r in tables["M_PIPE_DIMENSION.csv"] if r["Standard"] == branch_std and r["NPS"] == branch_nps and r["Schedule"] == branch_sch)
    print(f"  Step 3b: Branch Pipe Dimensions -> OD={branch_dim['OutsideDiameter']} mm, WT={branch_dim['WallThickness']} mm, ID={branch_dim['InsideDiameter']} mm")
    
    # Step 4: Resolve Material
    mat_row = next(r for r in tables["M_MATERIAL.csv"] if r["MaterialId"] == material_id)
    print(f"  Step 4: Material '{material_id}' -> Family={mat_row['MaterialFamily']}, IsDuplex={mat_row['IsDuplex']}, IsCS={mat_row['IsCarbonSteel']}")
    
    # Test Scenario 2: Model Source Device -> PSV
    source_type_id = "SRC-PSV"
    source_row = next(r for r in tables["M_SOURCE_DEVICE_TYPE.csv"] if r["SourceDeviceTypeId"] == source_type_id)
    assert source_row["IsAivSourceCandidate"] == "YES"
    assert source_row["AivSourceDeviceType"] == "RELIEF_VALVE"
    print(f"  Step 5: Source Device '{source_type_id}' -> SourceType='{source_row['AivSourceDeviceType']}', ReqMassFlow={source_row['RequiresMassFlow']}")

    print("\n>>> ALL VALIDATION CHECKS PASSED SUCCESSFULLY. <<<")

if __name__ == "__main__":
    tables = test_schemas_and_pks()
    test_foreign_keys_and_enums(tables)
    test_deterministic_join_chain(tables)
