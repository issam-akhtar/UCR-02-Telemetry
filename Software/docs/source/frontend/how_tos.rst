How-To Guides
============

This section provides practical step-by-step guides for common tasks related to the UCR-02-Telemetry frontend application.

Adding a New Chart
---------------

Follow these steps to add a new real-time chart to the application:

1. **Define the data structure** - First, determine what data the chart will display:

   .. code-block:: javascript

      // Define the data structure in src/types/ChartTypes.js
      export const NEW_CHART_TYPE = 'new_chart';

2. **Create the chart component** - Create a new component file:

   .. code-block:: jsx

      // src/components/charts/NewChartComponent.jsx
      import React from 'react';
      import { useRealTimeData } from '../../hooks/useRealTimeData';
      import { RealTimeChart } from '../RealTimeChart';

      export function NewChartComponent() {
        // Subscribe to the real-time data stream
        const chartData = useRealTimeData('new_chart_data_type');
        
        // Chart configuration
        const chartConfig = {
          title: 'New Chart',
          yAxis: {
            min: 0,
            max: 100,
            label: 'Value'
          }
        };
        
        return (
          <RealTimeChart 
            data={chartData} 
            config={chartConfig} 
          />
        );
      }

3. **Update the WebSocket subscription** - Ensure the frontend subscribes to the relevant data:

   .. code-block:: javascript

      // In src/services/websocket.js or where subscriptions are managed
      this.subscribe('new_chart_data_type', callback);

4. **Add to a page or dashboard** - Include your new component in the relevant page:

   .. code-block:: jsx

      import { NewChartComponent } from '../components/charts/NewChartComponent';
      
      function DashboardPage() {
        return (
          <div className="dashboard">
            {/* Other components */}
            <NewChartComponent />
          </div>
        );
      }

Adding a New Data Type
-------------------

To add support for a new data type from the backend:

1. **Update the Protobuf definition** - Ensure the backend and frontend use the same message format:

   .. code-block:: protobuf

      // In the proto file
      message NewDataType {
        float value = 1;
        string unit = 2;
        // Other fields as needed
      }

2. **Rebuild the Protobuf files** - Regenerate the JavaScript Protobuf files:

   .. code-block:: bash

      # From project root
      cd telemetry-app
      npm run build-proto

3. **Add the decoder function** - Create a function to handle the new message type:

   .. code-block:: javascript

      // In src/utils/protobuf.js or a dedicated decoder file
      export function decodeNewDataType(binaryData) {
        const decoded = proto.NewDataType.decode(binaryData);
        return {
          value: decoded.value,
          unit: decoded.unit,
          // Process other fields as needed
        };
      }

4. **Register the handler** - Update the message type mapping:

   .. code-block:: javascript

      // In the WebSocket message handler
      const messageHandlers = {
        // Existing handlers
        'new_data_type': handleNewDataType
      };
      
      function handleNewDataType(binaryData) {
        const decoded = decodeNewDataType(binaryData);
        // Update state or notify subscribers
        notifySubscribers('new_data_type', decoded);
      }

Creating a Custom Visualization
---------------------------

To create a specialized visualization component:

1. **Design the component structure** - Start with a basic React component:

   .. code-block:: jsx

      // src/components/visualizations/CustomViz.jsx
      import React, { useEffect, useRef } from 'react';
      import { useRealTimeData } from '../../hooks/useRealTimeData';
      
      export function CustomVisualization({ dataType }) {
        const canvasRef = useRef(null);
        const data = useRealTimeData(dataType);
        
        useEffect(() => {
          if (!data || !canvasRef.current) return;
          
          // Get the canvas context
          const ctx = canvasRef.current.getContext('2d');
          
          // Clear previous drawing
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw visualization based on data
          // ...
        }, [data]);
        
        return <canvas ref={canvasRef} width={600} height={400} />;
      }

2. **Implement the rendering logic** - Add custom drawing code:

   .. code-block:: javascript

      // Inside the useEffect from the previous step
      // Example drawing logic for a custom gauge
      const value = data.value;
      const percentage = (value / 100) * Math.PI;
      
      // Draw arc
      ctx.beginPath();
      ctx.arc(300, 200, 150, Math.PI, Math.PI + percentage, false);
      ctx.lineWidth = 20;
      ctx.strokeStyle = value > 80 ? 'red' : 'green';
      ctx.stroke();
      
      // Draw value text
      ctx.font = '24px Arial';
      ctx.fillText(`${value}${data.unit || ''}`, 290, 200);

3. **Add performance optimization** - Optimize for real-time updates:

   .. code-block:: jsx

      // Consider using requestAnimationFrame for smooth rendering
      const animationRef = useRef();
      
      useEffect(() => {
        // Cancel any ongoing animation frame
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        // Schedule drawing on next animation frame
        animationRef.current = requestAnimationFrame(() => {
          // Drawing logic here
        });
        
        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
      }, [data]);

Customizing the Theme
------------------

To customize the application theme:

1. **Locate the theme file** - Open the theme configuration:

   .. code-block:: javascript

      // src/theme.js
      export const theme = {
        palette: {
          primary: {
            main: '#1976d2',
            // ...
          },
          // ...
        },
        // ...
      };

2. **Modify color values** - Change colors according to your requirements:

   .. code-block:: javascript

      // Updated colors
      export const theme = {
        palette: {
          primary: {
            main: '#00796b', // New primary color
            light: '#48a999',
            dark: '#004c40',
            contrastText: '#ffffff',
          },
          // Other colors
        },
      };

3. **Update typography or spacing** - Customize other theme aspects:

   .. code-block:: javascript

      // Typography and spacing customization
      export const theme = {
        // Colors...
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          fontSize: 14,
          h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
          },
          // Other typography settings
        },
        spacing: factor => `${0.25 * factor}rem`,
      };

4. **Apply dark mode** - Implement dark mode support:

   .. code-block:: javascript

      // Create a dark theme variant
      export const darkTheme = {
        ...theme,
        palette: {
          ...theme.palette,
          mode: 'dark',
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0bec5',
          },
        },
      };

5. **Implement theme switching** - Add theme toggle functionality:

   .. code-block:: jsx

      // In a ThemeProvider component
      import { ThemeProvider, createTheme } from '@mui/material/styles';
      import { useState } from 'react';
      import { theme, darkTheme } from './theme';
      
      function AppThemeProvider({ children }) {
        const [isDarkMode, setIsDarkMode] = useState(false);
        const activeTheme = createTheme(isDarkMode ? darkTheme : theme);
        
        return (
          <ThemeContext.Provider value={{ isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode) }}>
            <ThemeProvider theme={activeTheme}>
              {children}
            </ThemeProvider>
          </ThemeContext.Provider>
        );
      }

Optimizing Performance
-------------------

Follow these steps to improve frontend performance:

1. **Implement component memoization** - Prevent unnecessary re-renders:

   .. code-block:: jsx

      import React, { memo } from 'react';
      
      // Memoize components that don't need frequent updates
      const ChartComponent = memo(function ChartComponent({ data, config }) {
        // Component logic
        return (
          <div className="chart">
            {/* Chart content */}
          </div>
        );
      });
      
      export default ChartComponent;

2. **Use virtualization for long lists** - Render only visible items:

   .. code-block:: jsx

      import { FixedSizeList } from 'react-window';
      
      function LogList({ logs }) {
        const Row = ({ index, style }) => (
          <div style={style} className="log-item">
            {logs[index].message}
          </div>
        );
        
        return (
          <FixedSizeList
            height={400}
            width="100%"
            itemCount={logs.length}
            itemSize={35}
          >
            {Row}
          </FixedSizeList>
        );
      }

3. **Implement data throttling** - Limit update frequency:

   .. code-block:: javascript

      // In your WebSocket or data handler
      import { throttle } from 'lodash';
      
      const throttledUpdate = throttle((newData) => {
        // Update state or trigger re-render
        setState(newData);
      }, 100); // Update at most every 100ms
      
      // In the message handler
      function onMessage(data) {
        throttledUpdate(data);
      }

4. **Use Web Workers for intensive processing** - Move heavy calculations off the main thread:

   .. code-block:: javascript

      // Create a Web Worker for data processing
      // worker.js
      self.onmessage = function(e) {
        const data = e.data;
        // Perform intensive calculations
        const result = processData(data);
        self.postMessage(result);
      };
      
      // In your component
      useEffect(() => {
        const worker = new Worker('./worker.js');
        worker.onmessage = (e) => {
          // Handle the processed result
          setProcessedData(e.data);
        };
        
        // Send data to worker when it changes
        if (data) {
          worker.postMessage(data);
        }
        
        return () => worker.terminate();
      }, [data]);

5. **Implement proper cleanup** - Ensure resources are freed:

   .. code-block:: jsx

      useEffect(() => {
        // Subscribe to WebSocket or other data source
        const unsubscribe = subscribeToData(dataType, handleData);
        
        // Cleanup function
        return () => {
          unsubscribe();
          // Cancel any pending operations
          // Close any open connections
        };
      }, [dataType]);

Creating a New Page
----------------

To add a new page to the application:

1. **Create the page component** - Start with a basic page structure:

   .. code-block:: jsx

      // src/pages/NewPage.jsx
      import React from 'react';
      import { MainLayout } from '../layouts/MainLayout';
      
      export function NewPage() {
        return (
          <MainLayout title="New Page">
            <div className="new-page">
              {/* Page content goes here */}
              <h1>New Page Content</h1>
              <div className="content-section">
                {/* Add components and content */}
              </div>
            </div>
          </MainLayout>
        );
      }

2. **Add routing configuration** - Update the router to include your new page:

   .. code-block:: jsx

      // In your routing configuration file (e.g., src/App.jsx or src/routes.js)
      import { NewPage } from './pages/NewPage';
      
      // React Router v6 example
      function App() {
        return (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-page" element={<NewPage />} />
            {/* Other routes */}
          </Routes>
        );
      }

3. **Add navigation link** - Update your navigation menu to include a link to the new page:

   .. code-block:: jsx

      // In your navigation component (e.g., src/components/Navigation.jsx)
      <NavLink to="/new-page" className={({isActive}) => isActive ? "active" : ""}>
        <span className="icon">{/* Icon */}</span>
        <span className="label">New Page</span>
      </NavLink>

4. **Implement page-specific logic** - Add data fetching and state management:

   .. code-block:: jsx

      // In your page component
      import React, { useState, useEffect } from 'react';
      import { fetchRequiredData } from '../services/api';
      
      export function NewPage() {
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          async function loadData() {
            try {
              const result = await fetchRequiredData();
              setData(result);
            } catch (error) {
              console.error("Failed to load data:", error);
              // Handle error state
            } finally {
              setLoading(false);
            }
          }
          
          loadData();
        }, []);
        
        if (loading) return <LoadingIndicator />;
        
        return (
          <MainLayout title="New Page">
            {/* Render content using data */}
            {data && (
              <div className="data-container">
                {/* Render your data */}
              </div>
            )}
          </MainLayout>
        );
      }

5. **Add page-specific styles** - Create a stylesheet for the new page:

   .. code-block:: css

      /* In src/styles/NewPage.css */
      .new-page {
        padding: 1.5rem;
      }
      
      .new-page .content-section {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      /* Import in your component */
      import './styles/NewPage.css';

Updating the 3D Model
------------------

To update or change the 3D models used in the application:

1. **Prepare your 3D model** - Export your model in a web-friendly format:

   - Export from your 3D modeling software (Blender, Maya, etc.) to glTF (.glb or .gltf) format
   - Optimize the model for web display (reduce polygon count, optimize textures)
   - Test the model with a viewer like https://gltf-viewer.donmccurdy.com/

2. **Add the model to the project** - Place the files in the appropriate directory:

   .. code-block:: bash

      # Place in the public directory for static serving
      cp your-model.glb public/3D/your-model.glb

3. **Load the 3D model** - Update the model loading code:

   .. code-block:: jsx

      // In your 3D visualization component
      import React, { useRef, useEffect } from 'react';
      import * as THREE from 'three';
      import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
      
      export function Model3DViewer() {
        const containerRef = useRef(null);
        const sceneRef = useRef(null);
        
        useEffect(() => {
          if (!containerRef.current) return;
          
          // Setup scene, camera, renderer
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(
            75, 
            containerRef.current.clientWidth / containerRef.current.clientHeight, 
            0.1, 
            1000
          );
          
          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(
            containerRef.current.clientWidth, 
            containerRef.current.clientHeight
          );
          containerRef.current.appendChild(renderer.domElement);
          
          // Add lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
          scene.add(ambientLight);
          
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(1, 1, 1);
          scene.add(directionalLight);
          
          // Load the model
          const loader = new GLTFLoader();
          loader.load(
            '/3D/your-model.glb',
            (gltf) => {
              scene.add(gltf.scene);
              
              // Center and scale the model if needed
              const box = new THREE.Box3().setFromObject(gltf.scene);
              const center = box.getCenter(new THREE.Vector3());
              gltf.scene.position.sub(center);
              
              // Position camera
              camera.position.z = 5;
              
              // Store scene for updates
              sceneRef.current = { scene, camera, renderer, model: gltf.scene };
              
              // Initial render
              renderer.render(scene, camera);
            },
            (xhr) => {
              // Loading progress
              console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
              console.error('Error loading model:', error);
            }
          );
          
          // Animation loop
          const animate = () => {
            requestAnimationFrame(animate);
            
            if (sceneRef.current) {
              // Any animations or updates to the model
              // sceneRef.current.model.rotation.y += 0.01;
              
              // Render
              sceneRef.current.renderer.render(
                sceneRef.current.scene, 
                sceneRef.current.camera
              );
            }
          };
          
          animate();
          
          // Cleanup
          return () => {
            if (containerRef.current) {
              containerRef.current.removeChild(renderer.domElement);
            }
            
            // Dispose of resources
            if (sceneRef.current && sceneRef.current.model) {
              scene.remove(sceneRef.current.model);
              // Dispose of geometries, materials, textures
            }
          };
        }, []);
        
        return <div ref={containerRef} style={{ width: '100%', height: '400px' }} />;
      }

4. **Update the model with real-time data** - Modify the 3D model based on telemetry data:

   .. code-block:: text

      // Inside your component
      const data = useRealTimeData('battery_cells');
      
      useEffect(() => {
        if (!sceneRef.current || !data) return;
        
        // Example: Update cell colors based on temperature
        data.cells.forEach((cell, index) => {
          const cellMesh = sceneRef.current.model.getObjectByName(`cell_${index}`);
          if (cellMesh) {
            // Create a color based on temperature (blue-green-yellow-red)
            const normalizedValue = (cell.temperature - 20) / 40; // Assuming 20-60°C range
            const color = new THREE.Color();
            color.setHSL(0.7 - normalizedValue * 0.7, 1.0, 0.5);
            
            // Update the material
            if (cellMesh.material) {
              cellMesh.material.color = color;
            }
          }
        });
      }, [data]);

5. **Add interaction controls** - Implement user interaction with the model:

   .. code-block:: jsx

      // Add OrbitControls for interactive rotation/zoom
      import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
      
      // In your setup code
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // Smooth camera movements
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 3;
      controls.maxDistance = 10;
      
      // Update controls in animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (sceneRef.current) {
          // Update controls
          controls.update();
          
          // Render
          sceneRef.current.renderer.render(
            sceneRef.current.scene, 
            sceneRef.current.camera
          );
        }
      };

Changing Database Data Queries
---------------------------

To modify which data is retrieved from the database:

1. **Understand the API structure** - Review the current API endpoints:

   .. code-block:: javascript

      // Example API service
      // src/services/api.js
      
      // Current endpoint for historical battery data
      export async function fetchBatteryHistory(startTime, endTime) {
        const response = await fetch(
          `/api/historical/battery?start=${startTime.toISOString()}&end=${endTime.toISOString()}`
        );
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return response.json();
      }

2. **Update API service functions** - Modify or add new functions to query different data:

   .. code-block:: javascript

      // Add new query parameters or endpoints
      export async function fetchBatteryHistory(startTime, endTime, options = {}) {
        // Build query string with additional options
        const params = new URLSearchParams();
        params.append('start', startTime.toISOString());
        params.append('end', endTime.toISOString());
        
        // Add optional filtering
        if (options.cellIds) {
          params.append('cells', options.cellIds.join(','));
        }
        
        if (options.metrics) {
          params.append('metrics', options.metrics.join(','));
        }
        
        if (options.resolution) {
          params.append('resolution', options.resolution);
        }
        
        const response = await fetch(`/api/historical/battery?${params}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return response.json();
      }
      
      // Add new function for different data type
      export async function fetchMotorHistory(startTime, endTime, motorId = 'all') {
        const params = new URLSearchParams({
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          motor: motorId
        });
        
        const response = await fetch(`/api/historical/motors?${params}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return response.json();
      }

3. **Update UI components** - Modify your UI to allow selection of different data:

   .. code-block:: jsx

      // Example filter component for data selection
      function DataFilters({ onFilterChange }) {
        const [selectedMetrics, setSelectedMetrics] = useState(['voltage', 'temperature']);
        const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h
        const [resolution, setResolution] = useState('1m'); // 1s, 1m, 5m
        
        // Update filters and notify parent
        const updateFilters = () => {
          onFilterChange({
            metrics: selectedMetrics,
            timeRange,
            resolution
          });
        };
        
        return (
          <div className="data-filters">
            <div className="filter-section">
              <h4>Metrics</h4>
              <div className="checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={selectedMetrics.includes('voltage')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMetrics([...selectedMetrics, 'voltage']);
                      } else {
                        setSelectedMetrics(
                          selectedMetrics.filter(m => m !== 'voltage')
                        );
                      }
                    }}
                  />
                  Voltage
                </label>
                {/* More metrics checkboxes */}
              </div>
            </div>
            
            {/* Time range selector */}
            <div className="filter-section">
              <h4>Time Range</h4>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
            
            {/* Resolution selector */}
            <div className="filter-section">
              <h4>Resolution</h4>
              <select 
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="1s">1 Second</option>
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>
            
            <button onClick={updateFilters} className="apply-btn">
              Apply Filters
            </button>
          </div>
        );
      }

4. **Implement the data fetching with new parameters** - Use the filters in your data fetch:

   .. code-block:: jsx

      // In your page or chart component
      function HistoricalDataChart() {
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(false);
        const [filters, setFilters] = useState({
          metrics: ['voltage', 'temperature'],
          timeRange: '1h',
          resolution: '1m'
        });
        
        // Convert time range to actual start/end times
        const getTimeRange = () => {
          const end = new Date();
          const start = new Date();
          
          switch (filters.timeRange) {
            case '1h':
              start.setHours(end.getHours() - 1);
              break;
            case '6h':
              start.setHours(end.getHours() - 6);
              break;
            case '24h':
              start.setHours(end.getHours() - 24);
              break;
            case '7d':
              start.setDate(end.getDate() - 7);
              break;
            default:
              start.setHours(end.getHours() - 1);
          }
          
          return { start, end };
        };
        
        // Fetch data with current filters
        const fetchData = async () => {
          setLoading(true);
          try {
            const { start, end } = getTimeRange();
            
            const result = await fetchBatteryHistory(start, end, {
              metrics: filters.metrics,
              resolution: filters.resolution
            });
            
            setData(result);
          } catch (error) {
            console.error("Failed to fetch data:", error);
            // Handle error state
          } finally {
            setLoading(false);
          }
        };
        
        // Fetch data when filters change
        useEffect(() => {
          fetchData();
          
          // Optional: Set up periodic refresh
          const intervalId = setInterval(fetchData, 60000); // Refresh every minute
          
          return () => clearInterval(intervalId);
        }, [filters]);
        
        return (
          <div className="historical-chart">
            <DataFilters onFilterChange={setFilters} />
            
            {loading && <LoadingIndicator />}
            
            {data && (
              <ChartComponent 
                data={data} 
                metrics={filters.metrics} 
              />
            )}
          </div>
        );
      }

Adding Animations
----------------

To add smooth animations to your components:

1. **Create CSS animations** - Define keyframes and animation properties:

   .. code-block:: css

      /* In your CSS file */
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      .alert-indicator {
        animation: pulse 2s infinite;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .slide-in {
        animation: slideIn 0.3s forwards;
      }

2. **Implement React animation hooks** - Use useState and useEffect for controlled animations:

   .. code-block:: jsx

      import React, { useState, useEffect } from 'react';
      
      function AnimatedValue({ value, threshold = 80 }) {
        const [animating, setAnimating] = useState(false);
        
        useEffect(() => {
          // Trigger animation when value exceeds threshold
          if (value > threshold) {
            setAnimating(true);
            
            // Reset animation after it completes
            const timer = setTimeout(() => {
              setAnimating(false);
            }, 1000); // Animation duration
            
            return () => clearTimeout(timer);
          }
        }, [value, threshold]);
        
        return (
          <div className={`value-display ${animating ? 'animate-alert' : ''}`}>
            {value}
          </div>
        );
      }

3. **Use React Transition Group** - For more complex transitions:

   .. code-block:: jsx

      import { Transition, TransitionGroup } from 'react-transition-group';
      
      // Component styles
      const transitionStyles = {
        entering: { opacity: 0, transform: 'translateY(20px)' },
        entered: { opacity: 1, transform: 'translateY(0)' },
        exiting: { opacity: 0, transform: 'translateY(-20px)' },
        exited: { opacity: 0 }
      };
      
      // Component with transitions
      function DataList({ items }) {
        return (
          <TransitionGroup className="data-list">
            {items.map(item => (
              <Transition key={item.id} timeout={300}>
                {state => (
                  <div
                    style={{
                      transition: 'all 300ms ease-in-out',
                      ...transitionStyles[state]
                    }}
                    className="data-item"
                  >
                    {item.name}: {item.value}
                  </div>
                )}
              </Transition>
            ))}
          </TransitionGroup>
        );
      }

4. **Animate data changes** - Create smooth transitions between data updates:

   .. code-block:: jsx

      import { useState, useEffect } from 'react';
      import { motion } from 'framer-motion';
      
      function AnimatedGauge({ value }) {
        const [prevValue, setPrevValue] = useState(value);
        
        useEffect(() => {
          setPrevValue(value);
        }, [value]);
        
        // Calculate rotation based on value (0-100)
        const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees
        
        return (
          <div className="gauge-container">
            <svg width="200" height="120" viewBox="0 0 200 120">
              {/* Gauge background */}
              <path
                d="M20,100 A80,80 0 0,1 180,100"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="8"
              />
              
              {/* Animated gauge value */}
              <motion.path
                d="M20,100 A80,80 0 0,1 180,100"
                fill="none"
                stroke="#2196f3"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ 
                  strokeDashoffset: 251.2 - (value / 100) * 251.2
                }}
                transition={{ duration: 0.5 }}
              />
              
              {/* Gauge needle */}
              <motion.line
                x1="100"
                y1="100"
                x2="100"
                y2="40"
                stroke="#333"
                strokeWidth="2"
                initial={{ transform: `rotate(${(prevValue / 100) * 180 - 90}deg)` }}
                animate={{ transform: `rotate(${rotation}deg)` }}
                transition={{ type: "spring", stiffness: 60 }}
                style={{ transformOrigin: '100px 100px' }}
              />
              
              {/* Center circle */}
              <circle cx="100" cy="100" r="6" fill="#333" />
            </svg>
            
            {/* Value text */}
            <motion.div
              className="gauge-value"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={value} // Remount on value change
            >
              {value}%
            </motion.div>
          </div>
        );
      }

5. **Create animated alerts** - Implement attention-grabbing animations for critical alerts:

   .. code-block:: jsx

      function AlertMessage({ message, type, visible }) {
        return (
          <Transition
            in={visible}
            timeout={300}
            mountOnEnter
            unmountOnExit
          >
            {state => (
              <div
                className={`alert alert-${type}`}
                style={{
                  transition: 'all 300ms ease',
                  opacity: 0,
                  transform: 'translateY(-20px)',
                  ...{
                    entering: { opacity: 0, transform: 'translateY(-20px)' },
                    entered: { opacity: 1, transform: 'translateY(0)' },
                    exiting: { opacity: 0, transform: 'translateY(-20px)' },
                    exited: { opacity: 0, transform: 'translateY(-20px)' }
                  }[state]
                }}
              >
                <div className="alert-icon">{/* Icon based on type */}</div>
                <div className="alert-content">{message}</div>
                <button className="alert-close">x</button>
              </div>
            )}
          </Transition>
        );
      }

Creating Custom Graphs
------------------

To create custom graph visualizations:

1. **Set up the basic chart structure** - Create a reusable chart component:

   .. code-block:: jsx

      // src/components/charts/CustomChart.jsx
      import React, { useRef, useEffect } from 'react';
      import * as d3 from 'd3';
      
      export function CustomChart({ data, width = 600, height = 300, margin = { top: 20, right: 30, bottom: 30, left: 40 } }) {
        const svgRef = useRef(null);
        
        // Calculate inner dimensions
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        useEffect(() => {
          if (!data || !svgRef.current) return;
          
          // Clear previous chart
          d3.select(svgRef.current).selectAll("*").remove();
          
          // Create SVG and chart group
          const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
            
          const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
          
          // X scale (time)
          const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.timestamp)))
            .range([0, innerWidth]);
          
          // Y scale (value)
          const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1]) // Add 10% padding
            .range([innerHeight, 0]);
          
          // Line generator
          const line = d3.line()
            .x(d => x(new Date(d.timestamp)))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX); // Smooth curve
          
          // Add axes
          g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5));
          
          g.append("g")
            .call(d3.axisLeft(y));
          
          // Add the line path
          g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#2196f3")
            .attr("stroke-width", 2)
            .attr("d", line);
          
          // Add dots for data points
          g.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(new Date(d.timestamp)))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", "#2196f3");
            
          // Add chart title
          svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Custom Data Visualization");
            
        }, [data, width, height, margin]);
        
        return (
          <div className="chart-container">
            <svg ref={svgRef}></svg>
          </div>
        );
      }

2. **Create a multi-line chart** - Display multiple data series:

   .. code-block:: jsx

      // Enhanced version for multiple data series
      export function MultiLineChart({ 
        data, // Format: [{ name: "Series1", values: [{timestamp, value}, ...] }, ...]
        width = 600, 
        height = 300 
      }) {
        const svgRef = useRef(null);
        const tooltipRef = useRef(null);
        
        useEffect(() => {
          if (!data || !svgRef.current) return;
          
          // Clear previous chart
          d3.select(svgRef.current).selectAll("*").remove();
          
          const margin = { top: 20, right: 80, bottom: 30, left: 50 };
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          
          // Create SVG and chart group
          const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
            
          const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
          
          // Create tooltip div if it doesn't exist
          if (!tooltipRef.current) {
            tooltipRef.current = d3.select("body").append("div")
              .attr("class", "chart-tooltip")
              .style("position", "absolute")
              .style("visibility", "hidden")
              .style("background", "white")
              .style("border", "1px solid #ddd")
              .style("border-radius", "3px")
              .style("padding", "8px")
              .style("pointer-events", "none");
          }
          
          // Combine all data points to determine scales
          const allDataPoints = data.flatMap(d => d.values);
          
          // X scale (time)
          const x = d3.scaleTime()
            .domain(d3.extent(allDataPoints, d => new Date(d.timestamp)))
            .range([0, innerWidth]);
          
          // Y scale (value)
          const y = d3.scaleLinear()
            .domain([0, d3.max(allDataPoints, d => d.value) * 1.1])
            .range([innerHeight, 0]);
          
          // Color scale
          const color = d3.scaleOrdinal(d3.schemeCategory10);
          
          // Line generator
          const line = d3.line()
            .x(d => x(new Date(d.timestamp)))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);
          
          // Add axes
          g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5));
          
          g.append("g")
            .call(d3.axisLeft(y));
          
          // Add lines for each data series
          const series = g.selectAll(".series")
            .data(data)
            .enter().append("g")
            .attr("class", "series");
          
          series.append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", (d, i) => color(i))
            .attr("stroke-width", 2)
            .attr("d", d => line(d.values));
          
          // Add dots with tooltips
          series.each(function(seriesData, seriesIndex) {
            d3.select(this).selectAll(".dot")
              .data(seriesData.values)
              .enter().append("circle")
              .attr("class", "dot")
              .attr("cx", d => x(new Date(d.timestamp)))
              .attr("cy", d => y(d.value))
              .attr("r", 4)
              .attr("fill", color(seriesIndex))
              .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6);
                tooltipRef.current
                  .style("visibility", "visible")
                  .html(`<strong>${seriesData.name}</strong><br/>
                         Time: ${new Date(d.timestamp).toLocaleTimeString()}<br/>
                         Value: ${d.value.toFixed(2)}`);
              })
              .on("mousemove", function(event) {
                tooltipRef.current
                  .style("top", (event.pageY - 10) + "px")
                  .style("left", (event.pageX + 10) + "px");
              })
              .on("mouseout", function() {
                d3.select(this).attr("r", 4);
                tooltipRef.current.style("visibility", "hidden");
              });
          });
          
          // Add legend
          const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - margin.right + 10},${margin.top})`);
          
          data.forEach((d, i) => {
            const legendRow = legend.append("g")
              .attr("transform", `translate(0, ${i * 20})`);
              
            legendRow.append("rect")
              .attr("width", 10)
              .attr("height", 10)
              .attr("fill", color(i));
              
            legendRow.append("text")
              .attr("x", 20)
              .attr("y", 10)
              .attr("text-anchor", "start")
              .style("font-size", "12px")
              .text(d.name);
          });
          
        }, [data, width, height]);
        
        return (
          <div className="chart-container">
            <svg ref={svgRef}></svg>
          </div>
        );
      }

3. **Create an area chart** - Visualize ranges or cumulative values:

   .. code-block:: jsx

      export function AreaChart({ data, width = 600, height = 300 }) {
        const svgRef = useRef(null);
        
        useEffect(() => {
          if (!data || !svgRef.current) return;
          
          // Clear previous chart
          d3.select(svgRef.current).selectAll("*").remove();
          
          const margin = { top: 20, right: 20, bottom: 30, left: 50 };
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          
          // Create SVG and chart group
          const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
            
          const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
          
          // X scale (time)
          const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.timestamp)))
            .range([0, innerWidth]);
          
          // Y scale (value)
          const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1])
            .range([innerHeight, 0]);
          
          // Area generator
          const area = d3.area()
            .x(d => x(new Date(d.timestamp)))
            .y0(innerHeight)
            .y1(d => y(d.value))
            .curve(d3.curveMonotoneX);
          
          // Add axes
          g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5));
          
          g.append("g")
            .call(d3.axisLeft(y));
          
          // Add the area path
          g.append("path")
            .datum(data)
            .attr("fill", "rgba(33, 150, 243, 0.3)")
            .attr("stroke", "#2196f3")
            .attr("stroke-width", 1.5)
            .attr("d", area);
          
          // Add line on top of area
          const line = d3.line()
            .x(d => x(new Date(d.timestamp)))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);
            
          g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#2196f3")
            .attr("stroke-width", 2)
            .attr("d", line);
        }, [data, width, height]);
        
        return (
          <div className="chart-container">
            <svg ref={svgRef}></svg>
          </div>
        );
      }

4. **Create interactive charts** - Add brushing and zooming:

   .. code-block:: jsx

      export function ZoomableChart({ data, width = 800, height = 400 }) {
        const svgRef = useRef(null);
        
        useEffect(() => {
          if (!data || !svgRef.current) return;
          
          // Clear previous chart
          d3.select(svgRef.current).selectAll("*").remove();
          
          const margin = { top: 20, right: 20, bottom: 110, left: 40 };
          const margin2 = { top: height - 70, right: 20, bottom: 30, left: 40 };
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          const innerHeight2 = height - margin2.top - margin2.bottom;
          
          // Create SVG and chart groups
          const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
            
          const focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", `translate(${margin.left},${margin.top})`);
            
          const context = svg.append("g")
            .attr("class", "context")
            .attr("transform", `translate(${margin2.left},${margin2.top})`);
          
          // X scales
          const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.timestamp)))
            .range([0, innerWidth]);
            
          const x2 = d3.scaleTime()
            .domain(x.domain())
            .range([0, innerWidth]);
          
          // Y scales
          const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1])
            .range([innerHeight, 0]);
            
          const y2 = d3.scaleLinear()
            .domain(y.domain())
            .range([innerHeight2, 0]);
          
          // Line generators
          const line = d3.line()
            .x(d => x(new Date(d.timestamp)))
            .y(d => y(d.value));
            
          const line2 = d3.line()
            .x(d => x2(new Date(d.timestamp)))
            .y(d => y2(d.value));
          
          // Add axes to focus (main chart)
          focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x));
          
          focus.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y));
          
          // Add line to focus
          focus.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);
          
          // Add axes to context (brush chart)
          context.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0,${innerHeight2})`)
            .call(d3.axisBottom(x2));
          
          // Add line to context
          context.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line2);
          
          // Add brush for zooming
          const brush = d3.brushX()
            .extent([[0, 0], [innerWidth, innerHeight2]])
            .on("brush end", brushed);
            
          context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());
          
          // Brush event handler
          function brushed(event) {
            if (event.sourceEvent && event.sourceEvent.type === "zoom") return;
            
            const selection = event.selection;
            if (!selection) return;
            
            // Update x domain based on brush selection
            const [x0, x1] = selection.map(x2.invert);
            x.domain([x0, x1]);
            
            // Update main chart
            focus.select(".line")
              .attr("d", line);
              
            focus.select(".axis--x")
              .call(d3.axisBottom(x));
          }
          
        }, [data, width, height]);
        
        return (
          <div className="chart-container">
            <svg ref={svgRef}></svg>
          </div>
        );
      }

5. **Create a heatmap visualization** - For displaying matrix or grid-based data:

   .. code-block:: jsx

      export function HeatmapChart({ 
        data, // Format: [{x, y, value}, ...]
        width = 700, 
        height = 500,
        colorScale = "viridis" // or "inferno", "plasma", etc.
      }) {
        const svgRef = useRef(null);
        
        useEffect(() => {
          if (!data || !svgRef.current) return;
          
          // Clear previous chart
          d3.select(svgRef.current).selectAll("*").remove();
          
          const margin = { top: 60, right: 40, bottom: 60, left: 60 };
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          
          // Create SVG and chart group
          const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
            
          const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
          
          // Get unique X and Y values
          const xValues = [...new Set(data.map(d => d.x))].sort();
          const yValues = [...new Set(data.map(d => d.y))].sort();
          
          // Cell dimensions
          const cellWidth = innerWidth / xValues.length;
          const cellHeight = innerHeight / yValues.length;
          
          // Scales
          const x = d3.scaleBand()
            .domain(xValues)
            .range([0, innerWidth]);
            
          const y = d3.scaleBand()
            .domain(yValues)
            .range([0, innerHeight]);
          
          // Color scale
          const colorValue = d3.extent(data, d => d.value);
          const color = d3.scaleSequential(d3[`interpolate${colorScale.charAt(0).toUpperCase() + colorScale.slice(1)}`])
            .domain([colorValue[0], colorValue[1]]);
          
          // Add cells
          g.selectAll(".cell")
            .data(data)
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", d => x(d.x))
            .attr("y", d => y(d.y))
            .attr("width", cellWidth)
            .attr("height", cellHeight)
            .attr("fill", d => color(d.value))
            .append("title") // Tooltip
            .text(d => `X: ${d.x}\nY: ${d.y}\nValue: ${d.value}`);
          
          // Add axes
          g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
          
          g.append("g")
            .call(d3.axisLeft(y));
          
          // Add color legend
          const legendWidth = 20;
          const legendHeight = innerHeight;
          
          const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - margin.right + 10},${margin.top})`);
          
          // Create gradient for legend
          const defs = svg.append("defs");
          const linearGradient = defs.append("linearGradient")
            .attr("id", "linear-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");
          
          // Set gradient stops
          linearGradient.selectAll("stop")
            .data(d3.range(0, 1.1, 0.1))
            .enter().append("stop")
            .attr("offset", d => d * 100 + "%")
            .attr("stop-color", d => color(d3.interpolate(colorValue[0], colorValue[1])(d)));
          
          // Add gradient rectangle
          legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#linear-gradient)");
          
          // Add legend axis
          const legendScale = d3.scaleLinear()
            .domain([colorValue[0], colorValue[1]])
            .range([legendHeight, 0]);
            
          legend.append("g")
            .attr("transform", `translate(${legendWidth},0)`)
            .call(d3.axisRight(legendScale).ticks(5));
          
          // Add title
          svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Heatmap Visualization");
            
        }, [data, width, height, colorScale]);
        
        return (
          <div className="chart-container">
            <svg ref={svgRef}></svg>
          </div>
        );
      }

Adding New Components
------------------

To add new reusable components to the application:

1. **Create the basic component structure** - Start with a skeleton component:

   .. code-block:: jsx

      // src/components/NewComponent.jsx
      import React from 'react';
      import PropTypes from 'prop-types';
      import './NewComponent.css'; // Component-specific styles
      
      export function NewComponent({ title, children }) {
        return (
          <div className="new-component">
            <div className="new-component-header">
              <h3>{title}</h3>
            </div>
            <div className="new-component-body">
              {children}
            </div>
          </div>
        );
      }
      
      NewComponent.propTypes = {
        title: PropTypes.string.isRequired,
        children: PropTypes.node
      };

2. **Add component styles** - Create a dedicated CSS file:

   .. code-block:: css

      /* src/components/NewComponent.css */
      .new-component {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin-bottom: 1rem;
        overflow: hidden;
      }
      
      .new-component-header {
        background-color: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        padding: 0.75rem 1rem;
      }
      
      .new-component-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
      }
      
      .new-component-body {
        padding: 1rem;
      }

3. **Add component functionality** - Implement interactive features:

   .. code-block:: jsx

      import React, { useState } from 'react';
      
      export function CollapsiblePanel({ title, children, initiallyExpanded = true }) {
        const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
        
        return (
          <div className="collapsible-panel">
            <div 
              className="panel-header"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <h3>{title}</h3>
              <button className="toggle-btn">
                {isExpanded ? '▼' : '►'}
              </button>
            </div>
            
            {isExpanded && (
              <div className="panel-body">
                {children}
              </div>
            )}
          </div>
        );
      }

4. **Create a compound component** - Build more complex, multi-part components:

   .. code-block:: jsx

      import React, { createContext, useContext, useState } from 'react';
      
      // Create context for tabs
      const TabContext = createContext();
      
      // Main tabs container
      export function TabContainer({ children, defaultTab }) {
        const [activeTab, setActiveTab] = useState(defaultTab || 0);
        
        return (
          <TabContext.Provider value={{ activeTab, setActiveTab }}>
            <div className="tab-container">
              {children}
            </div>
          </TabContext.Provider>
        );
      }
      
      // Tab headers
      export function TabList({ children }) {
        return (
          <div className="tab-list">
            {children}
          </div>
        );
      }
      
      // Individual tab header
      export function Tab({ label, index }) {
        const { activeTab, setActiveTab } = useContext(TabContext);
        
        return (
          <div
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {label}
          </div>
        );
      }
      
      // Tab content panels
      export function TabPanels({ children }) {
        const { activeTab } = useContext(TabContext);
        
        // Only render the active tab panel
        const activePanelContent = React.Children.toArray(children)[activeTab];
        
        return (
          <div className="tab-panels">
            {activePanelContent}
          </div>
        );
      }
      
      // Individual tab panel
      export function TabPanel({ children }) {
        return (
          <div className="tab-panel">
            {children}
          </div>
        );
      }
      
      // Usage example:
      /*
      <TabContainer defaultTab={0}>
        <TabList>
          <Tab label="Overview" index={0} />
          <Tab label="Details" index={1} />
          <Tab label="History" index={2} />
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <h3>Overview Content</h3>
            <p>Basic information here...</p>
          </TabPanel>
          
          <TabPanel>
            <h3>Details Content</h3>
            <p>More specific information...</p>
          </TabPanel>
          
          <TabPanel>
            <h3>History Content</h3>
            <p>Historical data charts...</p>
          </TabPanel>
        </TabPanels>
      </TabContainer>
      */

5. **Create a higher-order component** - Add reusable functionality:

   .. code-block:: jsx

      // HOC to add loading and error handling
      export function withLoadingState(WrappedComponent) {
        return function WithLoadingState(props) {
          const { isLoading, error, ...restProps } = props;
          
          if (isLoading) {
            return (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading data...</p>
              </div>
            );
          }
          
          if (error) {
            return (
              <div className="error-container">
                <div className="error-icon">[WARNING]</div>
                <h3>Error Loading Data</h3>
                <p>{error.message || "An unexpected error occurred"}</p>
                <button onClick={props.onRetry}>Retry</button>
              </div>
            );
          }
          
          return <WrappedComponent {...restProps} />;
        };
      }
      
      // Usage example:
      const ChartWithLoading = withLoadingState(CustomChart);
      
      function DataDisplay({ chartData }) {
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState(null);
        const [data, setData] = useState(null);
        
        const loadData = async () => {
          setIsLoading(true);
          setError(null);
          
          try {
            const result = await fetchData();
            setData(result);
          } catch (err) {
            setError(err);
          } finally {
            setIsLoading(false);
          }
        };
        
        useEffect(() => {
          loadData();
        }, []);
        
        return (
          <ChartWithLoading
            isLoading={isLoading}
            error={error}
            onRetry={loadData}
            data={data}
          />
        );
      }