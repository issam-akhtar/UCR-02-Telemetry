import React, { useContext, useState, useEffect } from 'react';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';

const ChartSettingsModal = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useContext(ChartSettingsContext);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  const handleRealTimeChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      realTime: {
        ...prev.realTime,
        [field]: value,
      }
    }));
  };

  const handleHistoricalChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      historical: {
        ...prev.historical,
        [field]: value,
      }
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chart Settings</h2>
        </div>
        <div className="modal-body">
          <h3>Real Time Settings</h3>
          <div className="form-group">
            <label>
              Real Time Window (ms):
              <span className="tooltip" title="Duration of the visible data window in milliseconds."> ℹ️</span>
              <input
                type="number"
                value={localSettings.realTime.window}
                onChange={(e) => handleRealTimeChange('window', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Update Interval (ms):
              <span className="tooltip" title="The minimum interval between updates in milliseconds."> ℹ️</span>
              <input
                type="number"
                value={localSettings.realTime.updateInterval}
                onChange={(e) => handleRealTimeChange('updateInterval', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Line Width:
              <span className="tooltip" title="Thickness of the chart lines."> ℹ️</span>
              <input
                type="number"
                value={localSettings.realTime.lineWidth}
                onChange={(e) => handleRealTimeChange('lineWidth', Number(e.target.value))}
              />
            </label>
          </div>

          <h3>Historical Settings</h3>
          <div className="form-group">
            <label>
              Downsample Threshold:
              <span className="tooltip" title="The number of data points after which downsampling is applied."> ℹ️</span>
              <input
                type="number"
                value={localSettings.historical.downsampleThreshold}
                onChange={(e) => handleHistoricalChange('downsampleThreshold', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Downsample Factor:
              <span className="tooltip" title="The factor by which data is downsampled."> ℹ️</span>
              <input
                type="number"
                value={localSettings.historical.downsampleFactor}
                onChange={(e) => handleHistoricalChange('downsampleFactor', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Data Zoom Enabled:
              <span className="tooltip" title="Enable or disable zooming on the chart."> ℹ️</span>
              <input
                type="checkbox"
                checked={localSettings.historical.dataZoomEnabled}
                onChange={(e) => handleHistoricalChange('dataZoomEnabled', e.target.checked)}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Brush Enabled:
              <span className="tooltip" title="Enable or disable brushing for data selection."> ℹ️</span>
              <input
                type="checkbox"
                checked={localSettings.historical.brushEnabled}
                onChange={(e) => handleHistoricalChange('brushEnabled', e.target.checked)}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Historical Refresh Rate (ms):
              <span className="tooltip" title="The auto-refresh rate in milliseconds (set 0 to disable)."> ℹ️</span>
              <input
                type="number"
                value={localSettings.historical.refreshRate}
                onChange={(e) => handleHistoricalChange('refreshRate', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Page Size:
              <span className="tooltip" title="The number of records to fetch per API request."> ℹ️</span>
              <input
                type="number"
                value={localSettings.historical.pageSize}
                onChange={(e) => handleHistoricalChange('pageSize', Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Max Axis Ticks:
              <span className="tooltip" title="Maximum number of ticks to display on the axis."> ℹ️</span>
              <input
                type="number"
                value={localSettings.historical.maxAxisTicks}
                onChange={(e) => handleHistoricalChange('maxAxisTicks', Number(e.target.value))}
              />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ChartSettingsModal;
