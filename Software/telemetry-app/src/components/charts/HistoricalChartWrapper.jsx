import React from 'react';
import PropTypes from 'prop-types';
import HistoricalChart from './HistoricalChart';

const HistoricalChartWrapper = ({
  endpoint,
  title = 'Historical Data',
  width = 600,
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showDataLabels = false
}) => (
  <div 
    className={`historical-chart ${className}`}
    style={{ width, height, ...customStyles }}
  >
    <HistoricalChart
      endpoint={endpoint}
      config={{
        title,
        axisTitles,
        showDataLabels,
        dimensions: { width, height }
      }}
    />
  </div>
);

HistoricalChartWrapper.propTypes = {
  endpoint: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showDataLabels: PropTypes.bool
};

export default HistoricalChartWrapper;
