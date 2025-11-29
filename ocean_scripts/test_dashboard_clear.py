#!/usr/bin/env python3
"""Test Dashboard Clear Function"""
import sys
from pathlib import Path

# Add utils to path
sys.path.insert(0, str(Path(__file__).parent / "utils"))
from dashboard_utils import DashboardClient

def main():
    print("=" * 50)
    print("Dashboard Clear Test")
    print("=" * 50)

    client = DashboardClient()

    # Test connection
    print("\n1. Testing connection...")
    if client.ping():
        print("   ✅ Dashboard is reachable")
    else:
        print("   ❌ Dashboard not reachable")
        print("   Please start dashboard first:")
        print("   > @ocean-ml 启动仪表盘")
        return 1

    # Test clear
    print("\n2. Clearing old data...")
    if client.clear_all():
        print("   ✅ Data cleared successfully")
    else:
        print("   ❌ Clear failed")
        return 1

    # Add test data
    print("\n3. Adding test data...")
    client.log_info("Test message after clear")
    client.update_model_info(
        architecture="Test Model",
        params={"test": "value"}
    )
    print("   ✅ Test data added")

    print("\n" + "=" * 50)
    print("Test completed! Check dashboard at:")
    print("http://localhost:3737")
    print("=" * 50)

    return 0

if __name__ == "__main__":
    sys.exit(main())
