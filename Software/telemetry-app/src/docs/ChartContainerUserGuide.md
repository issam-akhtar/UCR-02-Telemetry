### 1. Overview of Chart Wrappers

The application utilizes two main wrapper components for charts:

- **RealTimeChartWrapper**  
  This component is responsible for handling real-time data visualizations. It fetches live data using the `useRealTimeData` hook and renders charts (e.g., line charts) using libraries like Plotly. Real-time charts are useful for monitoring continuously updating metrics.

- **HistoricalChartWrapper**  
  This component handles historical data visualizations. It leverages the `useHistoricalData` hook to retrieve data from your API endpoints and renders charts (using ECharts in our example). A key feature is the refresh button positioned in the top-right corner, which allows users to manually trigger a data refresh in addition to any auto-refresh intervals.

Both wrappers depend on configuration settings stored in `src/config/chart-config.js`. These configurations define properties such as chart type, title, endpoints, color schemes, axis formatting, and more. The wrappers also include error handling and loading states to ensure a smooth user experience.

---

### 2. Adding New Graphs

Follow these steps to add a new graph to your dashboard:

#### a. Define the Chart Configuration

1. **Open the Configuration File:**  
   Navigate to `src/config/chart-config.js` in your project.

2. **Choose the Appropriate Section:**  
   Decide whether your new graph is real-time or historical:
   - If the graph displays live data, add its configuration under the `realTime` section.
   - If the graph shows past data, add its configuration under the `historical` section.

3. **Add a New Configuration Object:**  
   For example, to add a new historical graph:
   ```js
   historical: {
     my_new_history: {
       type: 'line',
       title: 'My New Historical Data',
       endpoint: '/api/my_new_history',
       timeField: 'timestamp', // Field in the API response for time values
       valueField: 'value',    // Field in the API response for the data value
       colors: ['#FF6B6B']      // Array of colors to be used for the chart
     },
   }
   ```
   Ensure that the endpoint returns data in the expected format (e.g., each data point should include a timestamp and a value).

#### b. Integrate the Graph in the Dashboard
1. **Insert the Graph Instance:**  
   Add a new instance of the wrapper to your dashboard, passing the required props. For example:
   ```jsx
   <HistoricalChartWrapper
     endpoint="/api/my_new_history" // API endpoint from the configuration
     title="My New Historical Data" // Chart title
     width={800} // Width of the chart in pixels
     height={400} // Height of the chart in pixels
     axisTitles={{ x: 'Time', y: 'Value' }} // Labels for the x and y axes
   />
   ```
   For a real-time chart, use:
   ```jsx
   <RealTimeChartWrapper
     chartType="myRealTimeMetric" // Key that matches the configuration
     title="My Real-Time Data"
     width={800}
     height={400}
     axisTitles={{ x: 'Time', y: 'Metric Value' }}
   />
   ```

#### c. Verify Data Flow and Rendering

1. **Ensure API Response Format:**  
   Confirm that your API returns data in a format that matches the expectations of your data hooks (`useHistoricalData` or `useRealTimeData`). For historical data, each data point should include a timestamp (or a time field) and the required metric values.

2. **Check Chart Rendering:**  
   After adding the graph, run your application (using `npm run dev` or similar) and verify that the new graph appears correctly on the dashboard. Use the refresh button in historical charts to manually reload data, and observe the real-time updates for live charts.

---

### 3. Customizing Graph Appearance with CSS

To apply custom styles to specific graphs without affecting global styles:

1. **Add a Custom CSS Class:**  
   When using a wrapper, add a custom class name:
   ```jsx
   <HistoricalChartWrapper
     className="custom-graph-style"
     endpoint="/api/my_new_history"
     title="Custom Styled Graph"
     width={800}
     height={400}
     axisTitles={{ x: 'Time', y: 'Value' }}
   />
   ```

2. **Define Styles in Your CSS File:**  
   In your CSS file (for example, `src/index.css`), create rules for your custom class:
   ```css
   .custom-graph-style {
     border: 2px dashed #2A9D8F;
     background-color: #ffffff;
     padding: 1rem;
   }
   ```
3. **Scoped Styling Alternatives:**  
   Alternatively, consider using CSS Modules or styled-components for more encapsulated styling that does not affect other components.


