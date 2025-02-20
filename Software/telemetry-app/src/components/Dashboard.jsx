import React from 'react';
import RealTimeChartWrapper from './charts/RealTimeChartWrapper';
import HistoricalChartWrapper from './charts/HistoricalChartWrapper';

const Dashboard = () => {
  return (
    <div>
      <h1>Telemetry Dashboard</h1>
      <div className="dashboard-grid">
        {/* TCU Charts */}
        <RealTimeChartWrapper
          chartType="tcu"
          title="TCU Real-Time Data"
          width={800}
          height={400}
          axisTitles={{ x: 'Time', y: 'Value' }}
        />

        <HistoricalChartWrapper
          endpoint="/tcuData"
          title="Historical TCU Data"
          width={800}
          height={400}
          axisTitles={{ x: 'Timestamp', y: 'Value' }}
          visualizationType="line"
        />

        {/* Pack Current Charts */}
        <RealTimeChartWrapper
          chartType="pack_current"
          title="Pack Current Real-Time"
          width={800}
          height={400}
          axisTitles={{ x: 'Time', y: 'Current (A)' }}
        />

        <HistoricalChartWrapper
          endpoint="/packCurrentData"
          title="Historical Pack Current"
          width={800}
          height={400}
          axisTitles={{ x: 'Timestamp', y: 'Current (A)' }}
          visualizationType="area"
        />
      </div>
    </div>
  );
};

export default Dashboard;