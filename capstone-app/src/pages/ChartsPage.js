import * as React from 'react';
import LineChart from '../components/LineChart.js';
import LineChart2 from '../components/LineChart2.js';
import LineChart3 from '../components/LineChart3.js';
import LineChart4 from '../components/LineChart4.js';

function ChartsPage() {  

  return (
    <div className="ChartsPage">

    <div className = "Charts">

    <div className="LineChart1">
      <h2>Chart.js Import</h2>
          <LineChart /> 
      </div> {/* LineChart1 Div */}
    
      <div className="LineChart2">
      <h2>d3.js</h2>
          <LineChart2 />
      </div> {/* LineChart2 Div */}

      <div className="LineChart3">
      <h2>Suspension Pots</h2>
          <LineChart3 />
      </div> {/* LineChart3 Div */}

      <div className="LineChart4">
      <h2>Throttle </h2>
          <LineChart4 />
      </div> {/* LineChart4 Div */}
      
    </div> {/* Charts Div */}

    </div> // App Div

  );
}

export default ChartsPage;
