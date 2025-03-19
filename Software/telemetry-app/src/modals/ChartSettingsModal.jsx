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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BatterySaverIcon from '@mui/icons-material/BatterySaver';
import SpeedIcon from '@mui/icons-material/Speed';
import HistoryIcon from '@mui/icons-material/History';
import MemoryIcon from '@mui/icons-material/Memory';
import TuneIcon from '@mui/icons-material/Tune';

// Define settings tabs with icons for better UX
const TABS = {
  REALTIME: 0,
  HISTORICAL: 1,
  PERFORMANCE: 2,
  DEVICES: 3
};

// Memoized Tab icons for better performance
const TabIcons = {
  REALTIME: <SpeedIcon fontSize="small" />,
  HISTORICAL: <HistoryIcon fontSize="small" />,
  PERFORMANCE: <TuneIcon fontSize="small" />,
  DEVICES: <MemoryIcon fontSize="small" />
};

// Helper component for form fields - memoized for performance
const SettingField = React.memo(({ label, tooltip, children }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Typography variant="subtitle2" component="label">
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

// Performance-optimized modal component
const ChartSettingsModal = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
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

  // Apply performance optimizations
  const handleApplyPerformanceMode = useCallback(() => {
    setLocalSettings(prev => ({
      ...prev,
      global: {
        ...prev.global,
        animationDuration: 0,
        enableTransitions: false,
        lowResolutionCharts: true,
        renderOptimizations: true,
        batchUpdates: true
      },
      realTime: {
        ...prev.realTime,
        updateInterval: 150,
        lineWidth: 1,
        maxDataPoints: 250
      },
      historical: {
        ...prev.historical,
        downsampleThreshold: 500,
        downsampleFactor: 5,
        pageSize: 1000,
        dataZoomEnabled: false,
        brushEnabled: false
      }
    }));
  }, []);

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
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 4,
          }
        }}
      >
        {/* Header with close button */}
        <Box 
          sx={{ 
            p: 2, 
            pb: 1, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            backgroundColor: 'background.paper',
            zIndex: 5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneIcon color="primary" />
            <Typography variant="h6" id="chart-settings-title">Chart Settings</Typography>
          </Box>
          <Box>
            <Tooltip title="Reset to defaults">
              <IconButton onClick={handleReset} size="small" sx={{ mr: 1 }}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Apply performance mode">
              <IconButton 
                onClick={handleApplyPerformanceMode} 
                size="small" 
                sx={{ mr: 1 }}
                color="secondary"
              >
                <BatterySaverIcon />
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
            mb: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            position: 'sticky',
            top: 56,
            backgroundColor: 'background.paper',
            zIndex: 4
          }}
        >
          <Tab 
            icon={isSmallScreen ? TabIcons.REALTIME : null}
            iconPosition="start"
            label={isSmallScreen ? "" : "Real-Time"} 
            aria-label="Real-Time Settings Tab"
          />
          <Tab 
            icon={isSmallScreen ? TabIcons.HISTORICAL : null}
            iconPosition="start"
            label={isSmallScreen ? "" : "Historical"} 
            aria-label="Historical Settings Tab"
          />
          <Tab 
            icon={isSmallScreen ? TabIcons.PERFORMANCE : null}
            iconPosition="start"
            label={isSmallScreen ? "" : "Performance"} 
            aria-label="Performance Settings Tab"
          />
          <Tab 
            icon={isSmallScreen ? TabIcons.DEVICES : null}
            iconPosition="start"
            label={isSmallScreen ? "" : "Devices"} 
            aria-label="Device Settings Tab"
          />
        </Tabs>

        {/* Tab content container */}
        <Box sx={{ px: 3, pb: 3 }}>
          {/* Real-Time Settings Tab */}
          {activeTab === TABS.REALTIME && (
            <Stack spacing={2}>
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
                />
              </SettingField>
              
              <SettingField 
                label="Max Data Points" 
                tooltip="Maximum number of data points to show. Lower values improve performance."
              >
                <Slider
                  value={localSettings.realTime.maxDataPoints || 500}
                  onChange={(_, value) => handleChange('realTime', 'maxDataPoints', value)}
                  min={50}
                  max={2000}
                  step={50}
                  marks={[
                    { value: 100, label: '100' },
                    { value: 500, label: '500' },
                    { value: 2000, label: '2000' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </SettingField>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localSettings.realTime.downsample || false}
                      onChange={(e) => 
                        handleChange('realTime', 'downsample', e.target.checked)
                      }
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">Enable Downsampling</Typography>
                      <Tooltip title="Reduces the number of points displayed to improve performance" arrow>
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
                      checked={localSettings.global?.batchUpdates ?? true}
                      onChange={(e) => 
                        handleChange('global', 'batchUpdates', e.target.checked)
                      }
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">Batch Chart Updates</Typography>
                      <Tooltip title="Groups multiple updates together for better performance" arrow>
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

          {/* Historical Settings Tab */}
          {activeTab === TABS.HISTORICAL && (
            <Stack spacing={2}>
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
                />
              </SettingField>
              
              <SettingField 
                label="Max Axis Ticks" 
                tooltip="Maximum number of tick marks to show on the axes"
              >
                <Slider
                  value={localSettings.historical.maxAxisTicks}
                  onChange={(_, value) => handleChange('historical', 'maxAxisTicks', value)}
                  min={2}
                  max={20}
                  step={1}
                  marks={[
                    { value: 4, label: '4' },
                    { value: 10, label: '10' },
                    { value: 20, label: '20' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </SettingField>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
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

          {/* Performance Tab */}
          {activeTab === TABS.PERFORMANCE && (
            <Stack spacing={2}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  mb: 1, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                  borderColor: theme.palette.divider 
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  These settings affect performance on resource-constrained devices like the Raspberry Pi.
                  Lower values improve performance but may reduce visual quality.
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<BatterySaverIcon />}
                  onClick={handleApplyPerformanceMode}
                  sx={{ mt: 1.5 }}
                  fullWidth
                >
                  Apply Performance Optimizations
                </Button>
              </Paper>
              
              <Divider />
              
              <SettingField 
                label="Animation Duration" 
                tooltip="Length of animations in ms (0 = disabled for best performance)"
              >
                <Slider
                  value={localSettings.global?.animationDuration || 300}
                  onChange={(_, value) => handleChange('global', 'animationDuration', value)}
                  min={0}
                  max={500}
                  step={50}
                  marks={[
                    { value: 0, label: 'Off' },
                    { value: 300, label: 'Normal' },
                    { value: 500, label: 'Slow' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => value === 0 ? 'Off' : `${value}ms`}
                />
              </SettingField>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={localSettings.global?.enableHardwareAcceleration ?? true}
                    onChange={(e) => 
                      handleChange('global', 'enableHardwareAcceleration', e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Enable Hardware Acceleration</Typography>
                    <Tooltip title="Uses GPU for rendering when available" arrow>
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
                    checked={localSettings.global?.enableTransitions ?? true}
                    onChange={(e) => 
                      handleChange('global', 'enableTransitions', e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Enable UI Transitions</Typography>
                    <Tooltip title="Smooth transitions between UI states (disable for better performance)" arrow>
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
                    checked={localSettings.global?.lowResolutionCharts ?? false}
                    onChange={(e) => 
                      handleChange('global', 'lowResolutionCharts', e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Use Low Resolution Charts</Typography>
                    <Tooltip title="Reduces chart quality for better performance" arrow>
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
                    checked={localSettings.global?.renderOptimizations ?? true}
                    onChange={(e) => 
                      handleChange('global', 'renderOptimizations', e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Enable Render Optimizations</Typography>
                    <Tooltip title="Apply advanced rendering optimizations for better performance" arrow>
                      <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                        <InfoIcon fontSize="small" color="action" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
            </Stack>
          )}
          
          {/* Device-specific Tab */}
          {activeTab === TABS.DEVICES && (
            <Stack spacing={2}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  mb: 1, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                  borderColor: theme.palette.divider 
                }}
              >
                <Typography variant="body2" color="text.secondary" paragraph>
                  These settings are automatically applied based on device detection, but you can override them manually.
                </Typography>
              </Paper>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(localStorage.getItem('forceRaspberryPiMode'))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        localStorage.setItem('forceRaspberryPiMode', 'true');
                      } else {
                        localStorage.removeItem('forceRaspberryPiMode');
                      }
                      // Force a re-render
                      setLocalSettings(prev => ({...prev}));
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Force Raspberry Pi Mode</Typography>
                    <Tooltip title="Applies aggressive performance optimizations for Raspberry Pi" arrow>
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
                    checked={localSettings.global?.prefersReducedMotion ?? false}
                    onChange={(e) => 
                      handleChange('global', 'prefersReducedMotion', e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Reduced Motion Mode</Typography>
                    <Tooltip title="Minimizes all animations and transitions" arrow>
                      <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                        <InfoIcon fontSize="small" color="action" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
              
            </Stack>
          )}

          {/* Action buttons */}
          <Stack 
            direction="row" 
            justifyContent="flex-end" 
            spacing={1} 
            mt={3}
            sx={{
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'background.paper',
              py: 2,
              borderTop: 1,
              borderColor: 'divider',
              zIndex: 5
            }}
          >
            <Button 
              onClick={onClose} 
              variant="outlined" 
              color="inherit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              color="primary"
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