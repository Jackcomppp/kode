#!/bin/bash
# Ocean Agent 触发测试脚本

echo "=========================================="
echo "Ocean Agent 触发测试"
echo "=========================================="
echo ""

# 测试 1: 检查工具注册
echo "测试 1: 检查工具是否已注册"
echo "----------------------------------------"

if grep -q "OceanDataPreprocessTool" "C:\Users\chj\kode\src\tools.ts"; then
    echo "✅ OceanDataPreprocessTool 已在 tools.ts 中注册"
else
    echo "❌ OceanDataPreprocessTool 未注册"
fi

if grep -q "import.*OceanDataPreprocessTool" "C:\Users\chj\kode\src\tools.ts"; then
    echo "✅ OceanDataPreprocessTool 已导入"
else
    echo "❌ OceanDataPreprocessTool 未导入"
fi

echo ""

# 测试 2: 检查 Agent 配置
echo "测试 2: 检查 Agent 配置"
echo "----------------------------------------"

AGENT_FILE="C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md"

if [ -f "$AGENT_FILE" ]; then
    echo "✅ Agent 文件存在"

    # 检查 YAML frontmatter
    if head -1 "$AGENT_FILE" | grep -q "^---$"; then
        echo "✅ YAML frontmatter 正确"
    else
        echo "❌ YAML frontmatter 缺失"
    fi

    # 检查关键词
    if grep -qi "JAXA" "$AGENT_FILE"; then
        echo "✅ 包含 'JAXA' 关键词"
    else
        echo "⚠️  未找到 'JAXA' 关键词"
    fi

    if grep -qi "satellite" "$AGENT_FILE"; then
        echo "✅ 包含 'satellite' 关键词"
    else
        echo "⚠️  未找到 'satellite' 关键词"
    fi

    # 检查工具列表
    if grep -q "OceanDataPreprocess" "$AGENT_FILE"; then
        echo "✅ 配置了 OceanDataPreprocess 工具"
    else
        echo "❌ 未配置 OceanDataPreprocess 工具"
    fi
else
    echo "❌ Agent 文件不存在"
fi

echo ""

# 测试 3: 检查构建
echo "测试 3: 检查 Kode 构建"
echo "----------------------------------------"

if [ -f "C:\Users\chj\kode\cli.js" ]; then
    echo "✅ cli.js 存在"

    # 检查修改时间
    BUILD_TIME=$(stat -c %Y "C:\Users\chj\kode\cli.js" 2>/dev/null)
    TOOLS_TIME=$(stat -c %Y "C:\Users\chj\kode\src\tools.ts" 2>/dev/null)

    if [ ! -z "$BUILD_TIME" ] && [ ! -z "$TOOLS_TIME" ]; then
        if [ $BUILD_TIME -gt $TOOLS_TIME ]; then
            echo "✅ 构建文件比源代码新（已重新构建）"
        else
            echo "⚠️  构建文件比源代码旧（可能需要重新构建）"
        fi
    fi
else
    echo "❌ cli.js 不存在（需要构建）"
fi

echo ""

# 测试 4: Agent 触发条件分析
echo "测试 4: Agent 触发条件分析"
echo "----------------------------------------"

echo "输入语句: '我需要处理 JAXA 卫星数据，提取云掩码'"
echo ""
echo "触发关键词分析:"

KEYWORDS=("JAXA" "卫星" "数据" "提取" "云掩码" "satellite" "mask")

for keyword in "${KEYWORDS[@]}"; do
    if grep -qi "$keyword" "$AGENT_FILE" 2>/dev/null; then
        echo "  ✅ '$keyword' - Agent 描述中包含此关键词"
    else
        echo "  ⚠️  '$keyword' - Agent 描述中未找到"
    fi
done

echo ""

# 测试总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo ""
echo "如果以上所有测试都通过 (✅)，那么 Agent 应该能够被触发。"
echo ""
echo "接下来请手动测试:"
echo ""
echo "1. 启动 Kode:"
echo "   kode"
echo ""
echo "2. 输入测试语句:"
echo "   我需要处理 JAXA 卫星数据，提取云掩码"
echo ""
echo "3. 观察 Agent 是否加载:"
echo "   - 应该看到 'ocean-data-specialist' 被加载"
echo "   - 可能显示蓝色标识（color: blue）"
echo "   - Agent 会询问文件路径等信息"
echo ""
echo "4. 如果 Agent 未加载，尝试显式调用:"
echo "   /agent ocean-data-specialist"
echo ""
echo "=========================================="
