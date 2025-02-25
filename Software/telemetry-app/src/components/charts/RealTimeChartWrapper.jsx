import React from 'react';
import PropTypes from 'prop-types';
import RealTimeChart from './RealTimeChart';

/**
 * A simple wrapper around RealTimeChart that sets dimensions, title, etc.
 */
const RealTimeChartWrapper = ({
  chartType,
  title = 'Real-Time Data',
  width = '100%',
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showLegend = true,
  isPaused = false,
}) => {
  // Convert width/height if numeric
  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    border: '1px solid #ccc',
    borderRadius: '4px',
    overflow: 'hidden',
    ...customStyles,
  };

  return (
    <div className={`realtime-chart ${className}`} style={containerStyle}>
      <RealTimeChart
        chartType={chartType}
        config={{
          title,
          axisTitles,
          showLegend,
          dimensions: { width, height },
        }}
        isPaused={isPaused}
      />
    </div>
  );
};

RealTimeChartWrapper.propTypes = {
  chartType: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showLegend: PropTypes.bool,
  isPaused: PropTypes.bool,
};

export default RealTimeChartWrapper;
