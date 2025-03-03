import React, { useContext, useState, useEffect } from 'react';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import {
  Modal,
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

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
    setLocalSettings((prev) => ({
      ...prev,
      realTime: {
        ...prev.realTime,
        [field]: value,
      },
    }));
  };

  const handleHistoricalChange = (field, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      historical: {
        ...prev.historical,
        [field]: value,
      },
    }));
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6">Chart Settings</Typography>
        <Stack spacing={2} mt={2}>
          <Typography>Real Time Settings</Typography>
          <TextField
            label="Real Time Window (ms)"
            type="number"
            value={localSettings.realTime.window}
            onChange={(e) => handleRealTimeChange('window', Number(e.target.value))}
            fullWidth
          />
          <TextField
            label="Update Interval (ms)"
            type="number"
            value={localSettings.realTime.updateInterval}
            onChange={(e) => handleRealTimeChange('updateInterval', Number(e.target.value))}
            fullWidth
          />
          <TextField
            label="Line Width"
            type="number"
            value={localSettings.realTime.lineWidth}
            onChange={(e) => handleRealTimeChange('lineWidth', Number(e.target.value))}
            fullWidth
          />
        </Stack>

        <Stack spacing={2} mt={2}>
          <Typography>Historical Settings</Typography>
          <TextField
            label="Downsample Threshold"
            type="number"
            value={localSettings.historical.downsampleThreshold}
            onChange={(e) =>
              handleHistoricalChange('downsampleThreshold', Number(e.target.value))
            }
            fullWidth
          />
          <TextField
            label="Downsample Factor"
            type="number"
            value={localSettings.historical.downsampleFactor}
            onChange={(e) =>
              handleHistoricalChange('downsampleFactor', Number(e.target.value))
            }
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={localSettings.historical.dataZoomEnabled}
                onChange={(e) => handleHistoricalChange('dataZoomEnabled', e.target.checked)}
              />
            }
            label="Data Zoom Enabled"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={localSettings.historical.brushEnabled}
                onChange={(e) => handleHistoricalChange('brushEnabled', e.target.checked)}
              />
            }
            label="Brush Enabled"
          />
          <TextField
            label="Historical Refresh Rate (ms)"
            type="number"
            value={localSettings.historical.refreshRate}
            onChange={(e) => handleHistoricalChange('refreshRate', Number(e.target.value))}
            fullWidth
          />
          <TextField
            label="Page Size"
            type="number"
            value={localSettings.historical.pageSize}
            onChange={(e) => handleHistoricalChange('pageSize', Number(e.target.value))}
            fullWidth
          />
          <TextField
            label="Max Axis Ticks"
            type="number"
            value={localSettings.historical.maxAxisTicks}
            onChange={(e) => handleHistoricalChange('maxAxisTicks', Number(e.target.value))}
            fullWidth
          />
        </Stack>

        <Stack direction="row" justifyContent="flex-end" mt={2}>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
          <Button onClick={onClose} variant="contained" color="red" sx={{ ml: 2 }}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default ChartSettingsModal;
