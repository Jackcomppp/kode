@echo off
REM Test script for Ocean Data Specialist Agent (Windows)

echo ==========================================
echo Ocean Data Specialist Agent - Quick Test
echo ==========================================
echo.

REM Check if kode is available
where kode >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Kode CLI not found!
    echo Please ensure Kode is installed and in your PATH
    echo.
    echo To install/link Kode:
    echo   cd C:\Users\chj\kode
    echo   bun install
    echo   bun run build
    echo   bun link
    pause
    exit /b 1
)

echo [OK] Kode CLI found
echo.

REM Check if agent file exists
set AGENT_FILE=C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md
if exist "%AGENT_FILE%" (
    echo [OK] Ocean Data Specialist agent file exists
    echo    Location: %AGENT_FILE%
) else (
    echo [ERROR] Agent file not found!
    echo    Expected at: %AGENT_FILE%
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Testing Agent Configuration
echo ==========================================
echo.

REM Show agent details
echo Agent Details:
echo   Name: ocean-data-specialist
echo   Description: Specialized for ocean and marine data processing
echo   Tools: OceanDataPreprocess, OceanDatabaseQuery, OceanProfileAnalysis, etc.
echo   Model: claude-3-5-sonnet-20241022
echo   Color: blue
echo.

echo ==========================================
echo Quick Usage Examples
echo ==========================================
echo.

echo Example 1: Start Kode with Ocean Agent
echo   kode
echo   # Then type: 'I need to process JAXA satellite data'
echo.

echo Example 2: Explicitly use Ocean Agent
echo   kode
echo   # Then type: '/agent ocean-data-specialist'
echo.

echo Example 3: One-line command
echo   kode --agent ocean-data-specialist "Analyze CTD profile data"
echo.

echo ==========================================
echo Testing Agent Loading
echo ==========================================
echo.

echo Attempting to verify agent is loadable...
echo.

REM Check YAML frontmatter
findstr /B /C:"---" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agent file has valid YAML frontmatter
) else (
    echo [!] Agent file might be missing YAML frontmatter
)

REM Check for required fields
findstr /C:"name: ocean-data-specialist" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agent name is set correctly
) else (
    echo [ERROR] Agent name not found or incorrect
)

findstr /C:"description:" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agent has description
) else (
    echo [ERROR] Agent description not found
)

findstr /C:"tools:" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agent has tools list
) else (
    echo [ERROR] Agent tools not found
)

echo.
echo ==========================================
echo Next Steps
echo ==========================================
echo.
echo 1. Read the user guide:
echo    type C:\Users\chj\kode\.claude\agents\OCEAN_AGENT_GUIDE.md
echo.
echo 2. Start using the agent:
echo    kode
echo.
echo 3. Try an ocean data task:
echo    Example: 'Process JAXA satellite data and extract cloud masks'
echo.
echo 4. The agent will automatically:
echo    - Understand your ocean data needs
echo    - Choose the right tool (OceanDataPreprocess, etc.)
echo    - Execute the task
echo    - Provide results
echo.
echo Happy ocean data processing!
echo.
pause
