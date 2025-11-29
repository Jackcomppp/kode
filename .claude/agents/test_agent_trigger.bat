@echo off
REM Ocean Agent 触发测试脚本

echo ==========================================
echo Ocean Agent 触发测试
echo ==========================================
echo.

REM 测试 1: 检查工具注册
echo 测试 1: 检查工具是否已注册
echo ----------------------------------------

findstr /C:"OceanDataPreprocessTool" "C:\Users\chj\kode\src\tools.ts" >nul
if %errorlevel% equ 0 (
    echo [OK] OceanDataPreprocessTool 已在 tools.ts 中注册
) else (
    echo [ERROR] OceanDataPreprocessTool 未注册
)

findstr /C:"import.*OceanDataPreprocessTool" "C:\Users\chj\kode\src\tools.ts" >nul
if %errorlevel% equ 0 (
    echo [OK] OceanDataPreprocessTool 已导入
) else (
    echo [ERROR] OceanDataPreprocessTool 未导入
)

echo.

REM 测试 2: 检查 Agent 配置
echo 测试 2: 检查 Agent 配置
echo ----------------------------------------

set AGENT_FILE=C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md

if exist "%AGENT_FILE%" (
    echo [OK] Agent 文件存在

    REM 检查 YAML frontmatter
    findstr /B /C:"---" "%AGENT_FILE%" >nul
    if %errorlevel% equ 0 (
        echo [OK] YAML frontmatter 正确
    ) else (
        echo [ERROR] YAML frontmatter 缺失
    )

    REM 检查关键词
    findstr /I /C:"JAXA" "%AGENT_FILE%" >nul
    if %errorlevel% equ 0 (
        echo [OK] 包含 'JAXA' 关键词
    ) else (
        echo [!] 未找到 'JAXA' 关键词
    )

    findstr /I /C:"satellite" "%AGENT_FILE%" >nul
    if %errorlevel% equ 0 (
        echo [OK] 包含 'satellite' 关键词
    ) else (
        echo [!] 未找到 'satellite' 关键词
    )

    REM 检查工具列表
    findstr /C:"OceanDataPreprocess" "%AGENT_FILE%" >nul
    if %errorlevel% equ 0 (
        echo [OK] 配置了 OceanDataPreprocess 工具
    ) else (
        echo [ERROR] 未配置 OceanDataPreprocess 工具
    )
) else (
    echo [ERROR] Agent 文件不存在
)

echo.

REM 测试 3: 检查构建
echo 测试 3: 检查 Kode 构建
echo ----------------------------------------

if exist "C:\Users\chj\kode\cli.js" (
    echo [OK] cli.js 存在
) else (
    echo [ERROR] cli.js 不存在 (需要构建^)
)

if exist "C:\Users\chj\kode\dist" (
    echo [OK] dist 目录存在
) else (
    echo [!] dist 目录不存在
)

echo.

REM 测试 4: Agent 触发条件分析
echo 测试 4: Agent 触发条件分析
echo ----------------------------------------

echo 输入语句: '我需要处理 JAXA 卫星数据，提取云掩码'
echo.
echo 触发关键词分析:

findstr /I /C:"JAXA" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo   [OK] 'JAXA' - Agent 描述中包含此关键词
) else (
    echo   [!] 'JAXA' - Agent 描述中未找到
)

findstr /I /C:"ocean" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo   [OK] 'ocean' - Agent 描述中包含此关键词
) else (
    echo   [!] 'ocean' - Agent 描述中未找到
)

findstr /I /C:"mask" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo   [OK] 'mask' - Agent 描述中包含此关键词
) else (
    echo   [!] 'mask' - Agent 描述中未找到
)

findstr /I /C:"satellite" "%AGENT_FILE%" >nul
if %errorlevel% equ 0 (
    echo   [OK] 'satellite' - Agent 描述中包含此关键词
) else (
    echo   [!] 'satellite' - Agent 描述中未找到
)

echo.

REM 测试总结
echo ==========================================
echo 测试总结
echo ==========================================
echo.
echo 如果以上所有测试都通过 [OK]，那么 Agent 应该能够被触发。
echo.
echo 接下来请手动测试:
echo.
echo 1. 启动 Kode:
echo    kode
echo.
echo 2. 输入测试语句:
echo    我需要处理 JAXA 卫星数据，提取云掩码
echo.
echo 3. 观察 Agent 是否加载:
echo    - 应该看到 'ocean-data-specialist' 被加载
echo    - 可能显示蓝色标识 (color: blue^)
echo    - Agent 会询问文件路径等信息
echo.
echo 4. 如果 Agent 未加载，尝试显式调用:
echo    /agent ocean-data-specialist
echo.
echo 5. 检查可用工具列表:
echo    在 Kode 中输入 /help 或查看工具列表
echo    应该能看到 OceanDataPreprocess 等工具
echo.
echo ==========================================

pause
