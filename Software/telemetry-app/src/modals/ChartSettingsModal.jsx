import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
  Divider,
  Slider,
  Tab,
  Tabs,
  Tooltip,
  IconButton,
  Paper,
  useTheme,
  Switch,
  alpha,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import HistoryIcon from '@mui/icons-material/History';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TuneIcon from '@mui/icons-material/Tune';

// Define settings tabs with icons for better UX
const TABS = {
  REALTIME: 0,
  HISTORICAL: 1,
  DASHBOARD: 2
};

// Helper component for form fields - memoized for performance
const SettingField = React.memo(({ label, tooltip, children }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Typography variant="subtitle2" component="label" sx={{ fontWeight: 'medium' }}>
        {label}
      </Typography>
      {tooltip && (
        <Tooltip title={tooltip} arrow placement="top">
          <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
            <InfoIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
    {children}
  </Box>
));

// Performance-optimized modal component with improved design
const ChartSettingsModal = ({ isOpen, onClose }) => {
  const theme = useTheme();
  
  // Get settings from context
  const { settings, setSettings, resetToDefaults: contextResetToDefaults } = useContext(ChartSettingsContext);
  
  // Memoize initial local settings to avoid re-renders
  const initialLocalSettings = useMemo(() => settings, [isOpen]);
  
  // Local settings state that will only be applied when saved
  const [localSettings, setLocalSettings] = useState(initialLocalSettings);
  
  // Track active tab
  const [activeTab, setActiveTab] = useState(TABS.REALTIME);
  
  // Reset local settings when modal opens (or settings change externally)
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  // Skip rendering if modal is closed for performance
  if (!isOpen) return null;

  // Change handlers with proper memoization
  const handleChange = useCallback((section, field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    // First reset to context defaults
    contextResetToDefaults();
    // Then update local state
    setLocalSettings(initialLocalSettings);
  }, [initialLocalSettings, contextResetToDefaults]);

  // Save changes and close modal
  const handleSave = useCallback(() => {
    setSettings(localSettings);
    onClose();
  }, [localSettings, onClose, setSettings]);

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose}
      keepMounted={false} // Unmount when closed for better performance
      aria-labelledby="chart-settings-title"
    >
      <Paper
        elevation={5}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: 550 },
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 0,
          outline: 'none',
          boxShadow: theme.shadows[10],
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: 4,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.3),
            }
          }
        }}
      >
        {/* Header with close button */}
        <Box 
          sx={{ 
            p: 2.5, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: alpha(theme.palette.divider, 0.8),
            position: 'sticky',
            top: 0,
            backgroundColor: theme.palette.background.paper,
            zIndex: 5,
            boxShadow: `0 4px 6px -4px ${alpha(theme.palette.common.black, 0.1)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TuneIcon color="primary" />
            <Typography variant="h6" id="chart-settings-title" fontWeight="medium">
              Telemetry Settings
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Reset to defaults">
              <IconButton onClick={handleReset} size="small" sx={{ mr: 1 }}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: alpha(theme.palette.divider, 0.5),
            position: 'sticky',
            top: 68,
            backgroundColor: theme.palette.background.paper,
            zIndex: 4,
            '& .MuiTab-root': {
              fontWeight: 'medium',
              textTransform: 'none',
              py: 1.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              }
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }
          }}
        >
          <Tab 
            icon={<SpeedIcon />}
            iconPosition="start"
            label="Real-Time" 
            aria-label="Real-Time Settings Tab"
          />
          <Tab 
            icon={<HistoryIcon />}
            iconPosition="start"
            label="Historical" 
            aria-label="Historical Settings Tab"
          />
          <Tab 
            icon={<DashboardIcon />}
            iconPosition="start"
            label="Dashboard" 
            aria-label="Dashboard Settings Tab"
          />
        </Tabs>

        {/* Tab content container */}
        <Box sx={{ p: 3, pt: 4 }}>
          {/* Real-Time Settings Tab */}
          {activeTab === TABS.REALTIME && (
            <Stack spacing={3}>
              <SettingField 
                label="Time Window" 
                tooltip="Amount of time (ms) to display in real-time charts"
              >
                <Slider
                  value={localSettings.realTime.window}
                  onChange={(_, value) => handleChange('realTime', 'window', value)}
                  min={1000}
                  max={60000}
                  step={1000}
                  marks={[
                    { value: 5000, label: '5s' },
                    { value: 30000, label: '30s' },
                    { value: 60000, label: '60s' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value / 1000}s`}
                  sx={{
                    '& .MuiSlider-thumb': {
                      transition: 'all 0.1s ease-in-out',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                      }
                    }
                  }}
                />
              </SettingField>
              
              <SettingField 
                label="Update Interval" 
                tooltip="How frequently (ms) the charts update with new data. Higher values improve performance."
              >
                <Slider
                  value={localSettings.realTime.updateInterval}
                  onChange={(_, value) => handleChange('realTime', 'updateInterval', value)}
                  min={10}
                  max={500}
                  step={10}
                  marks={[
                    { value: 50, label: '50ms' },
                    { value: 200, label: '200ms' },
                    { value: 500, label: '500ms' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}ms`}
                  sx={{
                    '& .MuiSlider-thumb': {
                      transition: 'all 0.1s ease-in-out',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                      }
                    }
                  }}
                />
              </SettingField>
              
              <SettingField 
                label="Line Width" 
                tooltip="Thickness of chart lines. Thinner lines may improve performance."
              >
                <Slider
                  value={localSettings.realTime.lineWidth}
                  onChange={(_, value) => handleChange('realTime', 'lineWidth', value)}
                  min={1}
                  max={5}
                  step={0.5}
                  marks={[
                    { value: 1, label: '1px' },
                    { value: 3, label: '3px' },
                    { value: 5, label: '5px' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}px`}
                  sx={{
                    '& .MuiSlider-thumb': {
                      transition: 'all 0.1s ease-in-out',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                      }
                    }
                  }}
                />
              </SettingField>
            </Stack>
          )}

          {/* Historical Settings Tab */}
          {activeTab === TABS.HISTORICAL && (
            <Stack spacing={3}>
              <SettingField 
                label="Downsample Threshold" 
                tooltip="Number of data points before downsampling is applied"
              >
                <TextField
                  type="number"
                  value={localSettings.historical.downsampleThreshold}
                  onChange={(e) => 
                    handleChange('historical', 'downsampleThreshold', Number(e.target.value))
                  }
                  fullWidth
                  inputProps={{ min: 100, max: 10000 }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                      },
                    },
                  }}
                />
              </SettingField>
              
              <SettingField 
                label="Downsample Factor" 
                tooltip="How aggressively to reduce data points (higher = more reduction)"
              >
                <Slider
                  value={localSettings.historical.downsampleFactor}
                  onChange={(_, value) => handleChange('historical', 'downsampleFactor', value)}
                  min={1}
                  max={10}
                  step={1}
                  marks={[
                    { value: 1, label: 'None' },
                    { value: 5, label: 'Medium' },
                    { value: 10, label: 'High' },
                  ]}
                  valueLabelDisplay="auto"
                  sx={{
                    '& .MuiSlider-thumb': {
                      transition: 'all 0.1s ease-in-out',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                      }
                    }
                  }}
                />
              </SettingField>
              
              <SettingField 
                label="Page Size" 
                tooltip="Number of data points to fetch per request (lower = better performance)"
              >
                <Slider
                  value={localSettings.historical.pageSize}
                  onChange={(_, value) => handleChange('historical', 'pageSize', value)}
                  min={100}
                  max={10000}
                  step={100}
                  marks={[
                    { value: 1000, label: '1K' },
                    { value: 5000, label: '5K' },
                    { value: 10000, label: '10K' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}`}
                  sx={{
                    '& .MuiSlider-thumb': {
                      transition: 'all 0.1s ease-in-out',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                      }
                    }
                  }}
                />
              </SettingField>
              
              <SettingField 
                label="Refresh Rate (ms)" 
                tooltip="How often to refresh historical data (0 = manual only)"
              >
                <TextField
                  type="number"
                  value={localSettings.historical.refreshRate}
                  onChange={(e) => 
                    handleChange('historical', 'refreshRate', Number(e.target.value))
                  }
                  fullWidth
                  inputProps={{ min: 0, step: 1000 }}
                  variant="outlined"
                  size="small"
                  helperText="0 = manual refresh only (best performance)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                      },
                    },
                  }}
                />
              </SettingField>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                mt: 1,
                p: 2.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
              }}>
                <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
                  Interactive Controls
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localSettings.historical.dataZoomEnabled}
                      onChange={(e) => 
                        handleChange('historical', 'dataZoomEnabled', e.target.checked)
                      }
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">Enable Data Zoom Controls</Typography>
                      <Tooltip title="Interactive zoom controls (may impact performance)" arrow>
                        <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                          <InfoIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localSettings.historical.brushEnabled}
                      onChange={(e) => 
                        handleChange('historical', 'brushEnabled', e.target.checked)
                      }
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">Enable Range Selection (Brush)</Typography>
                      <Tooltip title="Interactive range selection tools (may impact performance)" arrow>
                        <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                          <InfoIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          )}

          {/* Dashboard Settings Tab */}
          {activeTab === TABS.DASHBOARD && (
            <Stack spacing={3}>
              <Box sx={{ 
                p: 2.5, 
                borderRadius: 2, 
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                  Performance Settings
                </Typography>
                
                <SettingField 
                  label="Update Interval" 
                  tooltip="How frequently (ms) the dashboard components update. Higher values improve performance."
                >
                  <Slider
                    value={localSettings.dashboard.updateInterval}
                    onChange={(_, value) => handleChange('dashboard', 'updateInterval', value)}
                    min={100}
                    max={1000}
                    step={50}
                    marks={[
                      { value: 200, label: '200ms' },
                      { value: 500, label: '500ms' },
                      { value: 1000, label: '1s' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}ms`}
                    sx={{
                      '& .MuiSlider-thumb': {
                        transition: 'all 0.1s ease-in-out',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                        }
                      }
                    }}
                  />
                </SettingField>
                
                <SettingField 
                  label="Value Change Threshold" 
                  tooltip="Only update visuals when values change by this percentage (higher = better performance)"
                >
                  <Slider
                    value={localSettings.dashboard.significantChangeThreshold}
                    onChange={(_, value) => handleChange('dashboard', 'significantChangeThreshold', value)}
                    min={0}
                    max={5}
                    step={0.1}
                    marks={[
                      { value: 0, label: 'All' },
                      { value: 1, label: '1%' },
                      { value: 5, label: '5%' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => value === 0 ? 'All changes' : `${value}%`}
                    sx={{
                      '& .MuiSlider-thumb': {
                        transition: 'all 0.1s ease-in-out',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                        }
                      }
                    }}
                  />
                </SettingField>
              </Box>
              
              <Box sx={{ 
                p: 2.5, 
                borderRadius: 2, 
                backgroundColor: alpha(theme.palette.background.default, 0.5),
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`
              }}>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                  Units & Display Settings
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.dashboard.useImperialUnits}
                      onChange={(e) => 
                        handleChange('dashboard', 'useImperialUnits', e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Typography sx={{ ml: 1 }}>
                      Use Imperial Units (mph)
                    </Typography>
                  }
                  sx={{ mb: 2 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.dashboard.showTempInF}
                      onChange={(e) => 
                        handleChange('dashboard', 'showTempInF', e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Typography sx={{ ml: 1 }}>
                      Show Temperature in °F
                    </Typography>
                  }
                />
              </Box>
            </Stack>
          )}

          {/* Action buttons */}
          <Stack 
            direction="row" 
            justifyContent="flex-end" 
            spacing={2} 
            mt={4}
            sx={{
              position: 'sticky',
              bottom: 0,
              backgroundColor: theme.palette.background.paper,
              py: 2,
              borderTop: 1,
              borderColor: alpha(theme.palette.divider, 0.5),
              zIndex: 5
            }}
          >
            <Button 
              onClick={onClose} 
              variant="outlined" 
              color="inherit"
              sx={{
                px: 3,
                py: 1
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              color="primary"
              sx={{
                px: 3,
                py: 1,
                fontWeight: 'medium',
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Modal>
  );
};

export default React.memo(ChartSettingsModal);