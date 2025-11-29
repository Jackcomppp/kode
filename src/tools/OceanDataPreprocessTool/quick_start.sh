#!/bin/bash
# Quick Start Script for Ocean Data Preprocess Tool
# 快速开始脚本

echo "🌊 Ocean Data Preprocess Tool - Quick Start"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Python
echo "Step 1: Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "${GREEN}✓${NC} Python found: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python3 not found!"
    echo "Please install Python 3.7 or later from https://www.python.org/"
    exit 1
fi

# Step 2: Check dependencies
echo ""
echo "Step 2: Checking Python dependencies..."

python3 -c "import xarray" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} xarray installed"
else
    echo -e "${YELLOW}!${NC} xarray not installed"
    MISSING_DEPS=true
fi

python3 -c "import netCDF4" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} netCDF4 installed"
else
    echo -e "${YELLOW}!${NC} netCDF4 not installed"
    MISSING_DEPS=true
fi

python3 -c "import h5py" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} h5py installed"
else
    echo -e "${YELLOW}!${NC} h5py not installed"
    MISSING_DEPS=true
fi

python3 -c "import numpy" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} numpy installed"
else
    echo -e "${YELLOW}!${NC} numpy not installed"
    MISSING_DEPS=true
fi

python3 -c "import scipy" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} scipy installed"
else
    echo -e "${YELLOW}!${NC} scipy not installed"
    MISSING_DEPS=true
fi

# Step 3: Install if needed
if [ "$MISSING_DEPS" = true ]; then
    echo ""
    echo -e "${YELLOW}Some dependencies are missing.${NC}"
    echo "Would you like to install them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo ""
        echo "Installing dependencies..."
        python3 -m pip install xarray netCDF4 h5py numpy scipy matplotlib

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Dependencies installed successfully!"
        else
            echo -e "${RED}✗${NC} Installation failed. Try:"
            echo "  pip3 install --user xarray netCDF4 h5py numpy scipy"
            exit 1
        fi
    else
        echo ""
        echo "Please install dependencies manually:"
        echo "  pip3 install xarray netCDF4 h5py numpy scipy matplotlib"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} All dependencies installed!"
fi

# Step 4: Run tests
echo ""
echo "Step 3: Running tests..."
echo "Would you like to run the test suite? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    python3 test_processor.py

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} All tests passed!"
    else
        echo ""
        echo -e "${YELLOW}!${NC} Some tests failed. Check the output above."
    fi
fi

# Step 5: Show next steps
echo ""
echo "=========================================="
echo "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Read the documentation:"
echo "   - README_ENHANCED.md  - Full usage guide"
echo "   - INSTALLATION.md     - Installation details"
echo "   - SUMMARY.md          - Feature summary"
echo ""
echo "2. Try the Python processor:"
echo "   python3 oceandata_processor.py check_deps"
echo ""
echo "3. Example commands:"
echo ""
echo "   # Generate masks from JAXA data"
echo "   python3 oceandata_processor.py generate_masks \\"
echo "     --file /path/to/jaxa.nc \\"
echo "     --variable sst \\"
echo "     --params '{\"missing_ratio_range\": [0.1, 0.6], \"mask_count\": 360}'"
echo ""
echo "   # Merge OSTIA monthly files"
echo "   python3 oceandata_processor.py merge_files \\"
echo "     --files /path/to/2015_*.nc \\"
echo "     --output merged.nc"
echo ""
echo "   # Create training pairs"
echo "   python3 oceandata_processor.py apply_masks \\"
echo "     --file /path/to/ostia.nc \\"
echo "     --variable analysed_sst \\"
echo "     --mask-file masks.npy \\"
echo "     --output training.h5 \\"
echo "     --params '{\"latitude_range\": [15.0, 24.0], \"longitude_range\": [111.0, 118.0], \"target_grid\": [451, 351]}'"
echo ""
echo "4. Use with TypeScript tool (in Kode):"
echo "   The tool is now ready to use through the OceanDataPreprocessTool"
echo ""
echo "Happy data processing! 🌊"
