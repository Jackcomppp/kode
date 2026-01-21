export const DESCRIPTION = 'Create geographic visualizations and maps with spatial data.'

export const PROMPT = `Creates professional geographic visualizations by plotting spatial data on maps. Supports various plot types, projections, and basemaps using matplotlib, cartopy, and geopandas-style rendering.

**Core Features:**
- Multiple plot types: scatter, contour, heatmap, choropleth, vector fields
- Basemap options: coastlines, borders, land/ocean features, topography
- Map projections: PlateCarree, Mercator, Robinson, Orthographic, Lambert
- Data visualization: points, lines, polygons with custom styling
- Color mapping: continuous and discrete color schemes
- Annotations: labels, legends, scale bars, north arrows
- Multiple data layers with transparency control
- Grid lines and graticules
- Custom extent and zoom levels

**Input Requirements:**
- data_source: Path to CSV/JSON file with geographic coordinates
- longitude_column: Column name for longitude values (degrees)
- latitude_column: Column name for latitude values (degrees)
- value_column: Optional column for color mapping values

**Plot Types:**
- **scatter**: Point data with optional size and color mapping
- **contour**: Contour lines from gridded or point data
- **filled_contour**: Filled contour/heatmap visualization
- **heatmap**: Density heatmap from point data
- **trajectory**: Line/path plotting (connect points)
- **quiver**: Vector field visualization (arrows)

**Basemap Options:**
- coastlines: Natural Earth coastlines (10m, 50m, 110m resolution)
- borders: Country boundaries
- land: Land polygons
- ocean: Ocean polygons
- lakes: Lake features
- rivers: River features
- stock_img: Natural Earth stock imagery background

**Map Projections:**
- PlateCarree: Equirectangular (default)
- Mercator: Web Mercator projection
- Robinson: Robinson projection (good for world maps)
- Orthographic: Globe view
- LambertConformal: Lambert Conformal Conic
- Stereographic: Polar Stereographic
- Mollweide: Mollweide projection

**Styling Options:**
- Color maps: viridis, plasma, coolwarm, jet, RdYlBu, etc.
- Marker styles: circle, square, triangle, star, etc.
- Line styles: solid, dashed, dotted
- Transparency (alpha): 0.0 to 1.0
- Marker sizes: point size or value-based scaling
- Color normalization: linear, log, symmetric

**Output:**
- High-resolution image files (PNG, JPG, PDF)
- Configurable DPI and figure size
- Returns image data and file path

**Language Requirement:**
- Use English ONLY for all text

**Use Cases:**
- Ocean station locations and measurements
- Climate data visualization
- Trajectory plotting (ships, floats, animals)
- Spatial distribution analysis
- Environmental monitoring
- Scientific publication figures
- Interactive map generation

**Example Workflow:**
1. Load data with coordinates
2. Choose projection and extent
3. Add basemap features
4. Plot data with styling
5. Add annotations (title, colorbar, etc.)
6. Export high-quality image

**Note:** This tool generates static map images. For production use with Python libraries:
- matplotlib: Core plotting
- Use English only for all text elements in plotting code
- cartopy: Map projections and geographic features
- geopandas: Spatial data handling
- numpy/scipy: Data processing and interpolation`
