#!/bin/bash
# Fix and rebuild Kode with Ocean tools

echo "=========================================="
echo "Ocean Agent Fix - Rebuild Script"
echo "=========================================="
echo ""

# Change to Kode directory
cd C:\Users\chj\kode || exit 1

echo "Step 1: Cleaning old build..."
bun run clean

echo ""
echo "Step 2: Rebuilding Kode..."
bun run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

echo "Step 3: Relinking Kode CLI..."
bun link

echo ""
echo "Step 4: Verifying Kode installation..."
kode --version

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Fix Complete!"
    echo "=========================================="
    echo ""
    echo "Ocean tools have been registered in Kode:"
    echo "  - OceanDataPreprocess"
    echo "  - OceanDatabaseQuery"
    echo "  - OceanProfileAnalysis"
    echo "  - TimeSeriesAnalysis"
    echo "  - GeoSpatialPlot"
    echo "  - StandardChart"
    echo ""
    echo "Next steps:"
    echo "  1. Start Kode: kode"
    echo "  2. Test with: '我需要处理 JAXA 卫星数据'"
    echo "  3. The Ocean Agent should load automatically!"
    echo ""
else
    echo ""
    echo "⚠️  Warning: Kode command not found"
    echo "You may need to add Kode to your PATH"
fi
