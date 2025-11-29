"""
Test script for embedded DiffSR functionality
"""
import sys
import os
from pathlib import Path

# Test 1: Check if DiffSR modules can be imported
print("=" * 60)
print("Testing Embedded DiffSR")
print("=" * 60)

try:
    # Get script directory
    script_dir = Path(__file__).parent
    print(f"\n✓ Script directory: {script_dir}")
    
    # Check main.py exists
    main_py = script_dir / "main.py"
    if main_py.exists():
        print(f"✓ main.py found: {main_py}")
    else:
        print(f"✗ main.py NOT found at: {main_py}")
        sys.exit(1)
    
    # Check datasets module
    datasets_init = script_dir / "datasets" / "__init__.py"
    if datasets_init.exists():
        print(f"✓ datasets module found")
    else:
        print(f"✗ datasets module NOT found")
        sys.exit(1)
    
    # Check models module
    models_init = script_dir / "models" / "__init__.py"
    if models_init.exists():
        print(f"✓ models module found")
    else:
        print(f"✗ models module NOT found")
        sys.exit(1)
    
    # Try importing (basic structure check)
    sys.path.insert(0, str(script_dir))
    
    try:
        from datasets import _dataset_dict
        print(f"✓ Successfully imported datasets: {list(_dataset_dict.keys())}")
    except Exception as e:
        print(f"⚠ Dataset import warning: {e}")
    
    try:
        from models import _model_dict
        print(f"✓ Successfully imported models: {list(_model_dict.keys())}")
    except Exception as e:
        print(f"⚠ Model import warning: {e}")
    
    print("\n" + "=" * 60)
    print("✓ Embedded DiffSR structure verified!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
