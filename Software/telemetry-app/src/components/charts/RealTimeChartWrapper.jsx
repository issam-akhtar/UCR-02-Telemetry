import React from 'react';
import RealTimeChart from './RealTimeChart';
import PropTypes from 'prop-types';

const RealTimeChartWrapper = ({
  chartType,
  title = 'Real-Time Data',
  width = 600,
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showLegend = true
}) => (
  <div 
    className={`realtime-chart ${className}`} 
    style={{ width, height, ...customStyles }}
  >
    <RealTimeChart
      chartType={chartType}
      config={{
        title,
        axisTitles,
        showLegend,
        dimensions: { width, height }
      }}
    />
  </div>
);

RealTimeChartWrapper.propTypes = {
  chartType: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showLegend: PropTypes.bool
};

export default RealTimeChartWrapper;
