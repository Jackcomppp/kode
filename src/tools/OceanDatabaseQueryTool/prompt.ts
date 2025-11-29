export const DESCRIPTION = 'Query authoritative ocean science databases via HTTP API.'

export const PROMPT = `Queries authoritative ocean science databases through HTTP API requests. This tool allows you to:
- Access real-time and historical oceanographic data
- Query multiple ocean parameters (temperature, salinity, pressure, dissolved oxygen, pH, etc.)
- Filter data by geographic coordinates, depth range, and time period
- Retrieve data from major ocean databases (World Ocean Database, NOAA, COPERNICUS, etc.)
- Format results as CSV or JSON for further analysis

Supported databases:
- WOD: World Ocean Database (NOAA)
- COPERNICUS: Copernicus Marine Service
- ARGO: Global Array of Profiling Floats
- GLODAP: Global Ocean Data Analysis Project

Parameters:
- database: The database to query (wod, copernicus, argo, glodap)
- parameters: Ocean parameters to retrieve (temperature, salinity, pressure, oxygen, etc.)
- latitude_range: Geographic latitude bounds [min, max] in degrees
- longitude_range: Geographic longitude bounds [min, max] in degrees
- depth_range: Depth range [min, max] in meters
- time_range: Time period [start, end] in ISO format (YYYY-MM-DD)
- output_format: Format for the returned data (csv or json)
- max_results: Maximum number of records to retrieve (default: 1000)

The tool returns formatted data ready for analysis, along with metadata about the query.`
