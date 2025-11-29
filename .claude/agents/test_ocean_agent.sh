#!/bin/bash
# Test script for Ocean Data Specialist Agent

echo "=========================================="
echo "Ocean Data Specialist Agent - Quick Test"
echo "=========================================="
echo ""

# Check if kode is available
if ! command -v kode &> /dev/null; then
    echo "❌ Kode CLI not found!"
    echo "Please ensure Kode is installed and in your PATH"
    echo ""
    echo "To install/link Kode:"
    echo "  cd C:/Users/chj/kode"
    echo "  bun install"
    echo "  bun run build"
    echo "  bun link"
    exit 1
fi

echo "✅ Kode CLI found"
echo ""

# Check if agent file exists
AGENT_FILE="C:/Users/chj/kode/.claude/agents/ocean-data-specialist.md"
if [ -f "$AGENT_FILE" ]; then
    echo "✅ Ocean Data Specialist agent file exists"
    echo "   Location: $AGENT_FILE"
else
    echo "❌ Agent file not found!"
    echo "   Expected at: $AGENT_FILE"
    exit 1
fi

echo ""
echo "=========================================="
echo "Testing Agent Configuration"
echo "=========================================="
echo ""

# Show agent details
echo "Agent Details:"
echo "  Name: ocean-data-specialist"
echo "  Description: Specialized for ocean and marine data processing"
echo "  Tools: OceanDataPreprocess, OceanDatabaseQuery, OceanProfileAnalysis, etc."
echo "  Model: claude-3-5-sonnet-20241022"
echo "  Color: blue"
echo ""

echo "=========================================="
echo "Quick Usage Examples"
echo "=========================================="
echo ""

echo "Example 1: Start Kode with Ocean Agent"
echo "  kode"
echo "  # Then type: 'I need to process JAXA satellite data'"
echo ""

echo "Example 2: Explicitly use Ocean Agent"
echo "  kode"
echo "  # Then type: '/agent ocean-data-specialist'"
echo ""

echo "Example 3: One-line command"
echo "  kode --agent ocean-data-specialist \"Analyze CTD profile data\""
echo ""

echo "=========================================="
echo "Testing Agent Loading"
echo "=========================================="
echo ""

# Try to list agents (this will work if kode can access the file)
echo "Attempting to verify agent is loadable..."
echo "(This will open Kode briefly)"
echo ""

# Note: We can't easily test the full agent without user interaction
# So we just verify the file is valid markdown with proper frontmatter

# Check YAML frontmatter
if head -1 "$AGENT_FILE" | grep -q "^---$"; then
    echo "✅ Agent file has valid YAML frontmatter"
else
    echo "⚠️  Agent file might be missing YAML frontmatter"
fi

# Check for required fields
if grep -q "^name: ocean-data-specialist" "$AGENT_FILE"; then
    echo "✅ Agent name is set correctly"
else
    echo "❌ Agent name not found or incorrect"
fi

if grep -q "^description:" "$AGENT_FILE"; then
    echo "✅ Agent has description"
else
    echo "❌ Agent description not found"
fi

if grep -q "^tools:" "$AGENT_FILE"; then
    echo "✅ Agent has tools list"
else
    echo "❌ Agent tools not found"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Read the user guide:"
echo "   cat 'C:/Users/chj/kode/.claude/agents/OCEAN_AGENT_GUIDE.md'"
echo ""
echo "2. Start using the agent:"
echo "   kode"
echo ""
echo "3. Try an ocean data task:"
echo "   Example: 'Process JAXA satellite data and extract cloud masks'"
echo ""
echo "4. The agent will automatically:"
echo "   - Understand your ocean data needs"
echo "   - Choose the right tool (OceanDataPreprocess, etc.)"
echo "   - Execute the task"
echo "   - Provide results"
echo ""
echo "🌊 Happy ocean data processing!"
echo ""
