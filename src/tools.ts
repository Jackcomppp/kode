import { Tool } from './Tool'
import { TaskTool } from './tools/TaskTool/TaskTool'
import { ArchitectTool } from './tools/ArchitectTool/ArchitectTool'
import { BashTool } from './tools/BashTool/BashTool'
import { AskExpertModelTool } from './tools/AskExpertModelTool/AskExpertModelTool'
import { FileEditTool } from './tools/FileEditTool/FileEditTool'
import { FileReadTool } from './tools/FileReadTool/FileReadTool'
import { FileWriteTool } from './tools/FileWriteTool/FileWriteTool'
import { GlobTool } from './tools/GlobTool/GlobTool'
import { GrepTool } from './tools/GrepTool/GrepTool'
import { LSTool } from './tools/lsTool/lsTool'
import { MemoryReadTool } from './tools/MemoryReadTool/MemoryReadTool'
import { MemoryWriteTool } from './tools/MemoryWriteTool/MemoryWriteTool'
import { MultiEditTool } from './tools/MultiEditTool/MultiEditTool'
import { NotebookEditTool } from './tools/NotebookEditTool/NotebookEditTool'
import { NotebookReadTool } from './tools/NotebookReadTool/NotebookReadTool'
import { ThinkTool } from './tools/ThinkTool/ThinkTool'
import { TodoWriteTool } from './tools/TodoWriteTool/TodoWriteTool'
import { WebSearchTool } from './tools/WebSearchTool/WebSearchTool'
import { URLFetcherTool } from './tools/URLFetcherTool/URLFetcherTool'
import { getMCPTools } from './services/mcpClient'
import { memoize } from 'lodash-es'
// Ocean data preprocessing tools (modular)
import { OceanBasicPreprocessTool } from './tools/OceanBasicPreprocessTool/OceanBasicPreprocessTool'
import { OceanDataFilterTool } from './tools/OceanDataFilterTool/OceanDataFilterTool'
import { OceanQualityControlTool } from './tools/OceanQualityControlTool/OceanQualityControlTool'
import { OceanMaskProcessTool } from './tools/OceanMaskProcessTool/OceanMaskProcessTool'
import { OceanTrainingDataTool } from './tools/OceanTrainingDataTool/OceanTrainingDataTool'
import { OceanFullPreprocessTool } from './tools/OceanFullPreprocessTool/OceanFullPreprocessTool'
// Ocean data preprocessing tools (legacy)
import { OceanDataPreprocessTool } from './tools/OceanDataPreprocessTool/OceanDataPreprocessTool'
// Ocean data analysis and visualization tools
import { OceanDatabaseQueryTool } from './tools/OceanDatabaseQueryTool/OceanDatabaseQueryTool'
import { OceanProfileAnalysisTool } from './tools/OceanProfileAnalysisTool/OceanProfileAnalysisTool'
import { TimeSeriesAnalysisTool } from './tools/TimeSeriesAnalysisTool/TimeSeriesAnalysisTool'
import { GeoSpatialPlotTool } from './tools/GeoSpatialPlotTool/GeoSpatialPlotTool'
import { StandardChartTool } from './tools/StandardChartTool/StandardChartTool'
import { OceanDashboardTool } from './tools/OceanDashboardTool/OceanDashboardTool'
// Ocean deep learning tools (from Ocean-skill integration)
import { OceanFNOTrainingTool } from './tools/OceanFNOTrainingTool/OceanFNOTrainingTool'
import { OceanOptunaOptimizeTool } from './tools/OceanOptunaOptimizeTool/OceanOptunaOptimizeTool'
import { OceanModelInferenceTool } from './tools/OceanModelInferenceTool/OceanModelInferenceTool'
// ResShift super-resolution tools (DiffSR integration)
import { ResShiftTool } from './tools/ResShiftTool/ResShiftTool'
import { ResShiftTrainingTool } from './tools/ResShiftTrainingTool/ResShiftTrainingTool'
import { ResShiftPreprocessTool } from './tools/ResShiftPreprocessTool/ResShiftPreprocessTool'
// DiffSR tools (complete DiffSR-main integration)
import { DiffSRDatasetTool } from './tools/DiffSRDatasetTool/DiffSRDatasetTool'
import { DiffSRModelTool } from './tools/DiffSRModelTool/DiffSRModelTool'
import { DiffSRForecastorTool } from './tools/DiffSRForecastorTool/DiffSRForecastorTool'
import { DiffSRPipelineTool } from './tools/DiffSRPipelineTool/DiffSRPipelineTool'

const ANT_ONLY_TOOLS = [MemoryReadTool as unknown as Tool, MemoryWriteTool as unknown as Tool]

// Function to avoid circular dependencies that break bun
export const getAllTools = (): Tool[] => {
  return [
    TaskTool as unknown as Tool,
    AskExpertModelTool as unknown as Tool,
    BashTool as unknown as Tool,
    GlobTool as unknown as Tool,
    GrepTool as unknown as Tool,
    LSTool as unknown as Tool,
    FileReadTool as unknown as Tool,
    FileEditTool as unknown as Tool,
    MultiEditTool as unknown as Tool,
    FileWriteTool as unknown as Tool,
    NotebookReadTool as unknown as Tool,
    NotebookEditTool as unknown as Tool,
    ThinkTool as unknown as Tool,
    TodoWriteTool as unknown as Tool,
    WebSearchTool as unknown as Tool,
    URLFetcherTool as unknown as Tool,
    // Ocean data preprocessing tools (modular)
    OceanBasicPreprocessTool as unknown as Tool,
    OceanDataFilterTool as unknown as Tool,
    OceanQualityControlTool as unknown as Tool,
    OceanMaskProcessTool as unknown as Tool,
    OceanTrainingDataTool as unknown as Tool,
    OceanFullPreprocessTool as unknown as Tool,
    // Ocean data preprocessing tools (legacy)
    OceanDataPreprocessTool as unknown as Tool,
    // Ocean data analysis and visualization tools
    OceanDatabaseQueryTool as unknown as Tool,
    OceanProfileAnalysisTool as unknown as Tool,
    TimeSeriesAnalysisTool as unknown as Tool,
    GeoSpatialPlotTool as unknown as Tool,
    OceanDashboardTool as unknown as Tool,
    StandardChartTool as unknown as Tool,
    // Ocean deep learning tools
    OceanFNOTrainingTool as unknown as Tool,
    OceanOptunaOptimizeTool as unknown as Tool,
    OceanModelInferenceTool as unknown as Tool,
    // ResShift super-resolution tools
    ResShiftTool as unknown as Tool,
    ResShiftTrainingTool as unknown as Tool,
    ResShiftPreprocessTool as unknown as Tool,
    // DiffSR tools
    DiffSRDatasetTool as unknown as Tool,
    DiffSRModelTool as unknown as Tool,
    DiffSRForecastorTool as unknown as Tool,
    DiffSRPipelineTool as unknown as Tool,
    ...ANT_ONLY_TOOLS,
  ]
}

export const getTools = memoize(
  async (enableArchitect?: boolean): Promise<Tool[]> => {
    const tools = [...getAllTools(), ...(await getMCPTools())]

    // Only include Architect tool if enabled via config or CLI flag
    if (enableArchitect) {
      tools.push(ArchitectTool as unknown as Tool)
    }

    const isEnabled = await Promise.all(tools.map(tool => tool.isEnabled()))
    return tools.filter((_, i) => isEnabled[i])
  },
)

export const getReadOnlyTools = memoize(async (): Promise<Tool[]> => {
  const tools = getAllTools().filter(tool => tool.isReadOnly())
  const isEnabled = await Promise.all(tools.map(tool => tool.isEnabled()))
  return tools.filter((_, index) => isEnabled[index])
})
