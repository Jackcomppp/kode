export const DESCRIPTION = 'Create standard charts and visualizations for data analysis.'

export const PROMPT = `Creates professional standard charts and data visualizations using matplotlib and seaborn-style rendering. Supports a wide range of chart types for various data analysis scenarios.

**Core Features:**
- 12 chart types: line, bar, scatter, histogram, box, violin, pie, area, barh, step, stem, heatmap
- Multiple series support with automatic legend generation
- 6 style presets: default, seaborn, ggplot, bmh, fivethirtyeight, grayscale
- 10 color schemes: default, pastel, bright, dark, colorblind, Set1/2/3, tab10/20
- Extensive customization: markers, lines, colors, transparency
- High-resolution output for publications (up to 600 DPI)
- Flexible data input: CSV, JSON, or inline data

**Chart Types:**

1. **line** - Line plots for time series and trends
   - Single or multiple series
   - Customizable line styles and markers
   - Perfect for showing trends over time

2. **scatter** - Scatter plots for correlation analysis
   - Variable marker sizes and colors
   - Transparency control for dense data
   - Ideal for exploring relationships

3. **bar** - Bar charts for categorical comparisons
   - Grouped or stacked bars
   - Horizontal or vertical orientation
   - Best for comparing categories

4. **histogram** - Histograms for distribution analysis
   - Configurable bin counts
   - Overlapping histograms for comparisons
   - Essential for statistical analysis

5. **box** - Box plots for distribution and outliers
   - Shows median, quartiles, and outliers
   - Group comparisons
   - Statistical summary visualization

6. **violin** - Violin plots for density distributions
   - Combines box plot and KDE
   - Better shows distribution shape
   - Advanced statistical visualization

7. **pie** - Pie charts for composition
   - Percentage labels
   - Customizable colors
   - Shows parts of a whole

8. **area** - Area plots for cumulative trends
   - Single or stacked areas
   - Emphasizes magnitude of change
   - Good for showing accumulation

9. **step** - Step plots for discrete changes
   - Shows level changes
   - Useful for inventory, states
   - Highlights transitions

10. **heatmap** - Heatmaps for matrix data
    - Color-mapped 2D data
    - Correlation matrices
    - Pattern recognition

**Input Requirements:**
- data_source: Path to CSV/JSON file or inline JSON array
- chart_type: Type of chart to create
- x_column: Column name for x-axis data
- y_column: Column name for y-axis data (comma-separated for multiple series)
- output_path: Output file path (PNG/JPG/PDF)

**Styling Options:**

*Line/Marker Styles:*
- line_style: -, --, -., : (solid, dashed, dashdot, dotted)
- marker_style: o, s, ^, v, D, *, h, x, + (circle, square, triangle, etc.)
- line_width: 0.1 to 10
- marker_size: 1 to 500

*Colors:*
- color_scheme: default, pastel, bright, dark, colorblind, Set1/2/3, tab10/20
- colormap: viridis, plasma, coolwarm, RdYlBu (for heatmaps)
- alpha: 0.0 to 1.0 (transparency)

*Layout:*
- title: Chart title
- x_label/y_label: Axis labels
- legend: true/false
- grid: true/false
- figure_size: [width, height] in inches
- dpi: 72 to 600 (resolution)

**Special Features:**

*Multiple Series:*
- Use comma-separated column names in y_column
- Automatic color assignment
- Legend generation

*Stacked Charts:*
- Set stacked: true for bar/area charts
- Shows cumulative totals
- Good for part-to-whole relationships

*Grouped Data:*
- Use group_column for box/violin plots
- Automatic grouping and coloring
- Compare distributions across groups

**Output Formats:**
- PNG: Web and presentations (default)
- JPG: Compressed images
- PDF: Vector graphics for publications

**Use Cases:**

*Business & Finance:*
- Revenue trends and forecasts
- Sales comparisons
- Financial performance dashboards
- Market share analysis

*Science & Research:*
- Experimental results
- Statistical distributions
- Correlation analysis
- Publication-quality figures

*Data Analysis:*
- Exploratory data analysis
- Distribution analysis
- Time series visualization
- Comparative analysis

*Reports & Presentations:*
- KPI dashboards
- Performance metrics
- Survey results
- A/B test results

**Best Practices:**

1. Choose appropriate chart type:
   - Time series → line/area
   - Categories → bar
   - Correlation → scatter
   - Distribution → histogram/box

2. Use clear labels:
   - Descriptive title
   - Labeled axes with units
   - Legend for multiple series

3. Color selection:
   - colorblind scheme for accessibility
   - pastel for business reports
   - bright for marketing materials

4. High-quality output:
   - 300+ DPI for print
   - PDF for publications
   - Appropriate figure size

5. Data clarity:
   - Grid for precise reading
   - Appropriate marker/line sizes
   - Suitable transparency for overlaps

**Example Workflow:**
1. Load data from CSV/JSON
2. Choose appropriate chart type
3. Configure styling and labels
4. Set output format and resolution
5. Generate high-quality visualization


**Language Usage:**
- Use English for all text elements (titles, labels, legends)
- Example: 'Temperature vs Time' NOT '温度vs时间'
- Prevents encoding errors

**Integration:**
Works seamlessly with:
- TimeSeriesAnalysisTool: Analyze then visualize trends
- OceanDatabaseQueryTool: Query data then create charts
- FileWriteTool: Save and load data for plotting

**Note:** This tool generates static chart images using matplotlib/seaborn-style rendering. For interactive visualizations, consider web-based solutions. For geographic data, use GeoSpatialPlotTool instead.`
