import React from 'react';
import PropTypes from 'prop-types';
import HistoricalChart from './HistoricalChart';

const HistoricalChartWrapper = ({
  endpoint,
  title = 'Historical Data',
  width = '100%',
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showDataLabels = false,
}) => (
  <div
    className={`historical-chart ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      border: '1px solid #ccc',
      borderRadius: '4px',
      overflow: 'hidden',
      ...customStyles,
    }}
  >
    <HistoricalChart
      endpoint={endpoint}
      config={{
        title,
        axisTitles,
        showDataLabels,
        dimensions: { width, height },
      }}
    />
  </div>
);

HistoricalChartWrapper.propTypes = {
  endpoint: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showDataLabels: PropTypes.bool,
};

export default HistoricalChartWrapper;