export const DESCRIPTION = 'Analyze vertical ocean profiles and calculate key oceanographic parameters.'

export const PROMPT = `Performs comprehensive analysis of vertical ocean profiles (CTD data), calculating essential oceanographic parameters using standard equations of state and oceanographic formulas.

**Core Calculations:**
- Density (σt, σθ): Using UNESCO/TEOS-10 equations of state
- Potential Density: Density referenced to surface or specific pressure
- Brunt-Väisälä Frequency (N²): Buoyancy/stability frequency
- Mixed Layer Depth (MLD): Various criteria-based calculations
- Thermocline Depth: Temperature gradient maximum
- Halocline Depth: Salinity gradient maximum
- Pycnocline Depth: Density gradient maximum
- Sound Speed Profile: Mackenzie/Del Grosso equations
- Dynamic Height: Geopotential anomaly
- Stability Analysis: Richardson number, stratification index

**Input Requirements:**
- data_source: Path to CSV/JSON file containing profile data
- depth_column: Column name for depth values (meters)
- temperature_column: Column name for temperature (°C)
- salinity_column: Column name for salinity (PSU)
- pressure_column: Column name for pressure (optional, calculated from depth if not provided)

**Optional Parameters:**
- latitude: Geographic latitude for Coriolis calculations (degrees)
- longitude: Geographic longitude (degrees)
- reference_pressure: Reference pressure for potential density (default: 0 dbar)
- mld_criteria: Criteria for MLD calculation (temperature, density, or both)
- mld_threshold: Threshold value for MLD detection
- equation_of_state: EOS to use (unesco, teos10, simplified)

**Output:**
Returns comprehensive JSON containing:
- Profile metadata (location, date, depth range)
- Calculated parameters at each depth level:
  - In-situ density
  - Potential density
  - Buoyancy frequency
  - Sound speed
  - Dynamic height
- Derived characteristics:
  - Mixed layer depth
  - Thermocline/halocline/pycnocline depths
  - Stability indices
  - T-S diagram data
- Statistical summaries
- Quality flags and warnings

**Applications:**
- CTD data analysis
- Water mass identification
- Ocean stratification studies
- Mixed layer dynamics
- Sound propagation modeling
- Geostrophic current calculations
- Climate and oceanographic research

**Supported Data Sources:**
- CTD (Conductivity-Temperature-Depth) data
- Argo float profiles
- Bottle samples
- Research vessel data
- Moored instruments
- Any vertical profile data in CSV/JSON format

**Note:** This tool implements standard oceanographic equations. For production use,
consider integrating specialized libraries like:
- Python: gsw (Gibbs SeaWater), seawater
- MATLAB: GSW Oceanographic Toolbox
- R: oce package`
