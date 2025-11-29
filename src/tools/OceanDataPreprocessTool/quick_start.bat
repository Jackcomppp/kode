@echo off
REM Quick Start Script for Ocean Data Preprocess Tool (Windows)
REM 快速开始脚本 (Windows版本)

echo ========================================
echo Ocean Data Preprocess Tool - Quick Start
echo ========================================
echo.

REM Step 1: Check Python
echo Step 1: Checking Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo [OK] Python found: %PYTHON_VERSION%
) else (
    echo [ERROR] Python not found!
    echo Please install Python 3.7 or later from https://www.python.org/
    pause
    exit /b 1
)

REM Step 2: Check dependencies
echo.
echo Step 2: Checking Python dependencies...

python -c "import xarray" 2>nul
if %errorlevel% equ 0 (
    echo [OK] xarray installed
) else (
    echo [!] xarray not installed
    set MISSING_DEPS=true
)

python -c "import netCDF4" 2>nul
if %errorlevel% equ 0 (
    echo [OK] netCDF4 installed
) else (
    echo [!] netCDF4 not installed
    set MISSING_DEPS=true
)

python -c "import h5py" 2>nul
if %errorlevel% equ 0 (
    echo [OK] h5py installed
) else (
    echo [!] h5py not installed
    set MISSING_DEPS=true
)

python -c "import numpy" 2>nul
if %errorlevel% equ 0 (
    echo [OK] numpy installed
) else (
    echo [!] numpy not installed
    set MISSING_DEPS=true
)

python -c "import scipy" 2>nul
if %errorlevel% equ 0 (
    echo [OK] scipy installed
) else (
    echo [!] scipy not installed
    set MISSING_DEPS=true
)

REM Step 3: Install if needed
if defined MISSING_DEPS (
    echo.
    echo Some dependencies are missing.
    set /p INSTALL="Would you like to install them now? (y/n): "
    if /i "%INSTALL%"=="y" (
        echo.
        echo Installing dependencies...
        python -m pip install xarray netCDF4 h5py numpy scipy matplotlib

        if %errorlevel% equ 0 (
            echo [OK] Dependencies installed successfully!
        ) else (
            echo [ERROR] Installation failed. Try:
            echo   pip install --user xarray netCDF4 h5py numpy scipy
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo Please install dependencies manually:
        echo   pip install xarray netCDF4 h5py numpy scipy matplotlib
        pause
        exit /b 1
    )
) else (
    echo [OK] All dependencies installed!
)

REM Step 4: Run tests
echo.
echo Step 3: Running tests...
set /p RUNTESTS="Would you like to run the test suite? (y/n): "
if /i "%RUNTESTS%"=="y" (
    python test_processor.py

    if %errorlevel% equ 0 (
        echo.
        echo [OK] All tests passed!
    ) else (
        echo.
        echo [!] Some tests failed. Check the output above.
    )
)

REM Step 5: Show next steps
echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Read the documentation:
echo    - README_ENHANCED.md  - Full usage guide
echo    - INSTALLATION.md     - Installation details
echo    - SUMMARY.md          - Feature summary
echo.
echo 2. Try the Python processor:
echo    python oceandata_processor.py check_deps
echo.
echo 3. Example commands:
echo.
echo    Generate masks from JAXA data:
echo    python oceandata_processor.py generate_masks ^
echo      --file D:/data/jaxa.nc ^
echo      --variable sst ^
echo      --params "{\"missing_ratio_range\": [0.1, 0.6], \"mask_count\": 360}"
echo.
echo    Merge OSTIA monthly files:
echo    python oceandata_processor.py merge_files ^
echo      --files D:/data/2015_01.nc D:/data/2015_02.nc ^
echo      --output D:/data/merged.nc
echo.
echo    Create training pairs:
echo    python oceandata_processor.py apply_masks ^
echo      --file D:/data/ostia.nc ^
echo      --variable analysed_sst ^
echo      --mask-file D:/data/masks.npy ^
echo      --output D:/data/training.h5 ^
echo      --params "{\"latitude_range\": [15.0, 24.0], \"longitude_range\": [111.0, 118.0], \"target_grid\": [451, 351]}"
echo.
echo 4. Use with TypeScript tool (in Kode):
echo    The tool is now ready to use through the OceanDataPreprocessTool
echo.
echo Happy data processing!
echo.
pause
