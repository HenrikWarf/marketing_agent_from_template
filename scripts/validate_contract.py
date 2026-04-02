import os
import re
import sys

def extract_ts_interface(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract interfaces from BlackboardContext.tsx
    interfaces = re.findall(r'export interface (\w+) \{([\s\S]*?)\}', content)
    return {name: body for name, body in interfaces}

def extract_python_schema(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract Pydantic models from agent.py
    models = re.findall(r'class (\w+)\(BaseModel\):([\s\S]*?)(?=\n\n|\nclass|\Z)', content)
    return {name: body for name, body in models}

def validate():
    print("--- VALIDATING DATA CONTRACT ---")
    root = os.getcwd()
    ts_path = os.path.join(root, "campaign-flow", "src", "context", "BlackboardContext.tsx")
    py_path = os.path.join(root, "agents", "marketing_agent", "agent.py")

    if not os.path.exists(ts_path) or not os.path.exists(py_path):
        print("Error: Contract files not found.")
        return False

    ts_interfaces = extract_ts_interface(ts_path)
    py_models = extract_python_schema(py_path)

    # Mapping of Python Model -> TS Interface
    mappings = {
        "BriefResult": "BriefData",
        "AnalysisResult": "AnalysisData",
        "SegmentationResult": "SegmentationData",
        "ContentResult": "ContentData",
        "ReviewResult": "ReviewData",
        "RecommendationResult": "RecommendationData"
    }

    errors = 0
    for py_name, ts_name in mappings.items():
        if py_name not in py_models:
            print(f"MISSING: Python model {py_name} not found.")
            errors += 1
            continue
        if ts_name not in ts_interfaces:
            print(f"MISSING: TS Interface {ts_name} not found.")
            errors += 1
            continue
        
        # Simple check for field presence (basic heuristic)
        py_fields = re.findall(r'(\w+):', py_models[py_name])
        ts_fields = re.findall(r'(\w+)\??:', ts_interfaces[ts_name])
        
        for field in py_fields:
            if field not in ts_fields:
                print(f"CONTRACT VIOLATION: Field '{field}' in {py_name} is missing in {ts_name}.")
                errors += 1

    if errors == 0:
        print("✅ Data Contract Verified: Frontend and Backend schemas are in sync.")
        return True
    else:
        print(f"❌ Contract Validation Failed: Found {errors} discrepancies.")
        return False

if __name__ == "__main__":
    if not validate():
        sys.exit(1)
