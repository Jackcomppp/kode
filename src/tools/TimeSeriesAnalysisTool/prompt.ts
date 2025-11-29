export const DESCRIPTION = 'Perform comprehensive time series analysis using statistical methods.'

export const PROMPT = `Performs comprehensive time series analysis on sequential data using pandas, statsmodels, and other statistical libraries. This tool provides:

**Core Analysis Functions:**
- Descriptive Statistics: mean, std, min, max, trends
- Trend Analysis: linear/polynomial trend detection
- Seasonal Decomposition: additive/multiplicative decomposition
- Stationarity Testing: ADF (Augmented Dickey-Fuller) test
- Autocorrelation Analysis: ACF/PACF plots and values
- Forecasting: ARIMA, Exponential Smoothing, Simple forecasts
- Anomaly Detection: statistical outlier detection
- Change Point Detection: identify structural breaks

**Input Requirements:**
- data_source: Path to CSV file or JSON array of data
- time_column: Name of the time/date column (optional if index)
- value_column: Name of the value column to analyze
- date_format: Format string for parsing dates (optional)

**Analysis Options:**
- analysis_type: Type of analysis to perform (all, decomposition, forecast, test, etc.)
- frequency: Data frequency (D=daily, W=weekly, M=monthly, Q=quarterly, Y=yearly)
- forecast_periods: Number of periods to forecast (default: 10)
- seasonal_periods: Length of seasonal cycle (auto-detect if not specified)
- confidence_level: Confidence level for intervals (default: 0.95)

**Output:**
Returns a comprehensive JSON summary containing:
- Descriptive statistics
- Stationarity test results
- Trend analysis
- Seasonal components (if applicable)
- Forecast values and confidence intervals
- Detected anomalies
- Visualization data for plotting

**Supported Data Formats:**
- CSV files with time and value columns
- JSON arrays with timestamp and value fields
- Pandas-compatible date formats

**Use Cases:**
- Financial time series analysis
- Sales forecasting
- Sensor data analysis
- Climate data analysis
- Business metrics trending
- Anomaly detection in monitoring data`
