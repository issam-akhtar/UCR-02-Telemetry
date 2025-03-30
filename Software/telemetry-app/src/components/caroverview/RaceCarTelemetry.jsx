// RaceCarTelemetry.jsx
import React, { useReducer, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { Box, Typography, alpha, useTheme, Dialog, DialogTitle, DialogContent } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
// Import overlay components and visual elements
import CompactSuspensionOverlay from './CompactSuspensionOverlay';
import CompactWheelSpeedOverlay from './CompactWheelSpeedOverlay';
import CompactChassisStrainOverlay from './CompactChassisStrainOverlay';
import CompactAeroOverlay from './CompactAeroOverlay';
import CompactVehicleDynamicsPanel from './CompactVehicleDynamicsPanel';
import WheelCard from './WheelCard';
import CarVisualizer from './CarVisualizer';
import OverlayWrapper from './OverlayWrapper';
import SteeringWheelOverlay from './SteeringWheelOverlay';
// Import factory helpers for creating overlay components
import { createSuspensionComponent, createWheelSpeedComponent, createStrainComponent, createAeroComponent } from './WheelComponentFactory';
// Import ChartSettingsContext for dashboard settings
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Configuration constants
const TIRE_SIZE_INCHES = 18.1;

// Actions are defined as constants for better optimizations
const ACTIONS = {
  UPDATE_DATA: 'UPDATE_DATA',
  UPDATE_STEERING: 'UPDATE_STEERING',
  UPDATE_STATUS_COLOR: 'UPDATE_STATUS_COLOR',
  SET_ACTIVE_TOOLTIP: 'SET_ACTIVE_TOOLTIP',
  TOGGLE_INFO_DIALOG: 'TOGGLE_INFO_DIALOG'
};

// Initial state for reducer - simplified structure
const initialState = {
  telemetryData: {
    suspension: { FL: 0, FR: 0, RL: 0, RR: 0 },
    wheelSpeed: { FL: 0, FR: 0, RL: 0, RR: 0 },
    strain: { FL: 0, FR: 0, RL: 0, RR: 0 },
    aero: {
      FL: { pressure: 0, temperature: 0 },
      FR: { pressure: 0, temperature: 0 },
      RL: { pressure: 0, temperature: 0 },
      RR: { pressure: 0, temperature: 0 }
    }
  },
  steeringAngle: 0,
  statusColor: '#4caf50',
  activeTooltip: null,
  infoDialogOpen: false
};

// Optimized reducer with simplified action types
function telemetryReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_DATA:
      return {
        ...state,
        telemetryData: {
          ...state.telemetryData,
          ...action.payload
        }
      };
    case ACTIONS.UPDATE_STEERING:
      return {
        ...state,
        steeringAngle: action.payload
      };
    case ACTIONS.UPDATE_STATUS_COLOR:
      return {
        ...state,
        statusColor: action.payload
      };
    case ACTIONS.SET_ACTIVE_TOOLTIP:
      return {
        ...state,
        activeTooltip: action.payload
      };
    case ACTIONS.TOGGLE_INFO_DIALOG:
      return {
        ...state,
        infoDialogOpen: action.payload !== undefined ? action.payload : !state.infoDialogOpen
      };
    default:
      return state;
  }
}

/**
 * Helper to calculate average strain from multiple gauges
 */
const calculateAverage = (fields) => {
  try {
    const gauges = ['gauge1', 'gauge2', 'gauge3', 'gauge4', 'gauge5', 'gauge6']
      .map(key => fields[key]?.numberValue || 0);
    return gauges.reduce((sum, value) => sum + value, 0) / gauges.length;
  } catch {
    return 0;
  }
};

/**
 * Maps a suspension value (0–100) to a color
 */
const getSuspensionStatusColor = (val) => {
  const value = Math.max(0, Math.min(val, 100));
  if (value < 10) return '#00ff00';   // Bright green
  if (value < 20) return '#7fff00';
  if (value < 30) return '#bfff00';
  if (value < 40) return '#ffff00';   // Yellow
  if (value < 50) return '#ffdf00';
  if (value < 60) return '#ffbf00';
  if (value < 70) return '#ff9f00';
  if (value < 80) return '#ff7f00';
  if (value < 90) return '#ff5f00';
  return '#ff0000';                  // Red
};

/**
 * High-Performance RaceCarTelemetry Component
 *
 * Optimized for rendering efficiency with batched updates and minimal re-renders.
 */
const RaceCarTelemetry = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: containerRef, width: containerWidth, height: containerHeight } = useResizeObserver();
  
  // Use reducer for state management
  const [state, dispatch] = useReducer(telemetryReducer, initialState);
  const { telemetryData, steeringAngle, statusColor, activeTooltip, infoDialogOpen } = state;
  
  // Store data processing state in refs to avoid re-renders
  const dataRef = useRef({
    lastUpdateTime: {},
    pendingUpdates: {},
    updateScheduled: false,
    updateTimer: null
  });
  
  // Store settings in ref to avoid dependency changes
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  // Animation settings
  const animationsEnabled = settings.global.animationDuration > 0 && settings.global.enableTransitions;
  const animationDuration = `${settings.global.animationDuration}ms`;
  const animationEasing = settings.realTime.enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease';
  
  // Determine if we're at a small screen size
  const isXs = containerWidth < theme.breakpoints.values.sm;
  
  // Calculate responsive scales based on container size
  const wheelCardScale = useMemo(() => {
    if (!containerWidth || !containerHeight) return 1;
    
    // Base scale factor
    let scale = Math.min(
      Math.max(0.6, containerWidth / 1000),
      Math.max(0.6, containerHeight / 600)
    );
    
    // Apply chart size adjustment
    if (settings.dashboard.chartSize === 'large') {
      scale *= 1.2;
    } else if (settings.dashboard.chartSize === 'small') {
      scale *= 0.8;
    }
    
    return scale;
  }, [containerWidth, containerHeight, settings.dashboard.chartSize]);
  
  // Calculate wheel positions based on screen size and layout
  const wheelPositions = useMemo(() => {
    // Get layout type
    const isGridLayout = settings.dashboard.chartLayout === 'grid';
    
    // Base offsets
    let horizontalOffset = isGridLayout ? 27 : 30;
    let verticalOffset = isGridLayout ? 18 : 25;
    
    // Adjust for xs screens
    if (isXs) {
      horizontalOffset = isGridLayout ? 30 : 33;
      verticalOffset = isGridLayout ? 20 : 22;
    }
    
    return {
      FL: { top: `${verticalOffset}%`, left: `${horizontalOffset}%`, transform: 'translate(-50%, -50%)' },
      FR: { top: `${verticalOffset}%`, right: `${horizontalOffset}%`, transform: 'translate(50%, -50%)' },
      RL: { bottom: `${verticalOffset}%`, left: `${horizontalOffset}%`, transform: 'translate(-50%, 50%)' },
      RR: { bottom: `${verticalOffset}%`, right: `${horizontalOffset}%`, transform: 'translate(50%, 50%)' }
    };
  }, [isXs, settings.dashboard.chartLayout]);

  // Schedule batched updates for better performance
  const scheduleUpdate = useCallback(() => {
    if (dataRef.current.updateScheduled) return;
    dataRef.current.updateScheduled = true;
    
    dataRef.current.updateTimer = requestAnimationFrame(() => {
      const updates = dataRef.current.pendingUpdates;
      
      // Process all data updates in a single dispatch
      if (updates.telemetryData) {
        dispatch({ 
          type: ACTIONS.UPDATE_DATA, 
          payload: updates.telemetryData 
        });
        updates.telemetryData = null;
      }
      
      // Process steering angle update
      if (updates.steeringAngle !== undefined) {
        dispatch({ 
          type: ACTIONS.UPDATE_STEERING, 
          payload: updates.steeringAngle 
        });
        updates.steeringAngle = undefined;
      }
      
      // Process status color update
      if (updates.statusColor !== undefined) {
        dispatch({ 
          type: ACTIONS.UPDATE_STATUS_COLOR, 
          payload: updates.statusColor 
        });
        updates.statusColor = undefined;
      }
      
      // Reset scheduled flag
      dataRef.current.updateScheduled = false;
    });
  }, []);
  
  // Helper function for throttling updates
  const shouldUpdateData = useCallback((dataType) => {
    const { dashboard } = settingsRef.current;
    if (!dashboard.updateInterval) return true;
    
    const now = Date.now();
    const lastUpdate = dataRef.current.lastUpdateTime[dataType] || 0;
    
    if (now - lastUpdate >= dashboard.updateInterval) {
      dataRef.current.lastUpdateTime[dataType] = now;
      return true;
    }
    return false;
  }, []);
  
  // Helper to check if a change is significant
  const isSignificantChange = useCallback((oldVal, newVal) => {
    const { dashboard } = settingsRef.current;
    if (oldVal === 0 && newVal !== 0) return true;
    if (oldVal !== 0 && newVal === 0) return true;
    
    const percentChange = Math.abs((newVal - oldVal) / (oldVal || 1) * 100);
    return percentChange >= dashboard.significantChangeThreshold;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dataRef.current.updateTimer) {
        cancelAnimationFrame(dataRef.current.updateTimer);
      }
    };
  }, []);
  
  // ---------------- Data Handlers ----------------
  
  // Suspension data handler
  const handleSuspensionData = useCallback((msg) => {
    if (!shouldUpdateData('suspension')) return;
    
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      let hasChanges = false;
      
      // Handle steering angle
      if (fields.steering_angle !== undefined) {
        const multiplier = 1.5;
        const newAngle = (fields.steering_angle?.numberValue || 0) * multiplier;
        
        if (isSignificantChange(state.steeringAngle, newAngle)) {
          dataRef.current.pendingUpdates.steeringAngle = newAngle;
          hasChanges = true;
        }
      }
      
      // Handle suspension values
      const positions = ['FL', 'FR', 'RL', 'RR'];
      const fieldMap = {
        FL: 'front_left_pot',
        FR: 'front_right_pot',
        RL: 'rear_left_pot',
        RR: 'rear_right_pot'
      };
      
      // Create telemetryData object if needed
      if (!dataRef.current.pendingUpdates.telemetryData) {
        dataRef.current.pendingUpdates.telemetryData = {};
      }
      
      // Create suspension object if needed
      if (!dataRef.current.pendingUpdates.telemetryData.suspension) {
        dataRef.current.pendingUpdates.telemetryData.suspension = {};
      }
      
      // Process each position
      positions.forEach(pos => {
        const field = fieldMap[pos];
        if (fields[field] !== undefined) {
          const newValue = fields[field]?.numberValue ?? 0;
          const currentValue = state.telemetryData.suspension[pos];
          
          if (isSignificantChange(currentValue, newValue)) {
            dataRef.current.pendingUpdates.telemetryData.suspension[pos] = newValue;
            hasChanges = true;
          }
        }
      });
      
      // Update status color based on suspension values
      if (hasChanges && dataRef.current.pendingUpdates.telemetryData.suspension) {
        const allValues = positions
          .map(pos => dataRef.current.pendingUpdates.telemetryData.suspension[pos] ?? state.telemetryData.suspension[pos])
          .filter(val => val !== undefined);
        
        if (allValues.length > 0) {
          const minValue = Math.min(...allValues);
          const newStatusColor = getSuspensionStatusColor(minValue);
          
          if (newStatusColor !== state.statusColor) {
            dataRef.current.pendingUpdates.statusColor = newStatusColor;
          }
        }
      }
      
      // Schedule update if needed
      if (hasChanges) {
        scheduleUpdate();
      }
    } catch (error) {
      console.error("Error processing suspension data:", error);
    }
  }, [state, shouldUpdateData, isSignificantChange, scheduleUpdate]);
  
  // Wheel speed data handler
  const handleWheelSpeedData = useCallback((msg) => {
    if (!shouldUpdateData('wheelSpeed')) return;
    
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      let hasChanges = false;
      
      // Create telemetryData object if needed
      if (!dataRef.current.pendingUpdates.telemetryData) {
        dataRef.current.pendingUpdates.telemetryData = {};
      }
      
      // Create wheelSpeed object if needed
      if (!dataRef.current.pendingUpdates.telemetryData.wheelSpeed) {
        dataRef.current.pendingUpdates.telemetryData.wheelSpeed = {};
      }
      
      // Process wheel speed values
      const positions = ['FL', 'FR', 'RL', 'RR'];
      const fieldMap = {
        FL: 'front_left',
        FR: 'front_right',
        RL: 'rear_left',
        RR: 'rear_right'
      };
      
      positions.forEach(pos => {
        const field = fieldMap[pos];
        if (fields[field] !== undefined) {
          const newValue = fields[field]?.numberValue ?? 0;
          const currentValue = state.telemetryData.wheelSpeed[pos];
          
          if (isSignificantChange(currentValue, newValue)) {
            dataRef.current.pendingUpdates.telemetryData.wheelSpeed[pos] = newValue;
            hasChanges = true;
          }
        }
      });
      
      // Schedule update if needed
      if (hasChanges) {
        scheduleUpdate();
      }
    } catch (error) {
      console.error("Error processing wheel speed data:", error);
    }
  }, [state, shouldUpdateData, isSignificantChange, scheduleUpdate]);
  
  // Strain gauge handler
  const handleStrainGauges = useCallback((msg, position) => {
    if (!shouldUpdateData(`strain_${position}`)) return;
    
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      const strain = calculateAverage(fields);
      
      const currentValue = state.telemetryData.strain[position];
      if (isSignificantChange(currentValue, strain)) {
        // Create objects if needed
        if (!dataRef.current.pendingUpdates.telemetryData) {
          dataRef.current.pendingUpdates.telemetryData = {};
        }
        
        if (!dataRef.current.pendingUpdates.telemetryData.strain) {
          dataRef.current.pendingUpdates.telemetryData.strain = {};
        }
        
        dataRef.current.pendingUpdates.telemetryData.strain[position] = strain;
        scheduleUpdate();
      }
    } catch (error) {
      console.error(`Error processing strain gauges for ${position}:`, error);
    }
  }, [state, shouldUpdateData, isSignificantChange, scheduleUpdate]);
  
  // Aero data handler
  const handleAeroData = useCallback((msg, isFront) => {
    if (!shouldUpdateData(`aero_${isFront ? 'front' : 'rear'}`)) return;
    
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      let hasChanges = false;
      
      // Create objects if needed
      if (!dataRef.current.pendingUpdates.telemetryData) {
        dataRef.current.pendingUpdates.telemetryData = {};
      }
      
      if (!dataRef.current.pendingUpdates.telemetryData.aero) {
        dataRef.current.pendingUpdates.telemetryData.aero = {};
      }
      
      // Process positions
      const positions = isFront ? ['FL', 'FR'] : ['RL', 'RR'];
      
      positions.forEach((pos, index) => {
        // Pressure field name
        const pressureField = `pressure${index * 2 + 1}`;
        if (fields[pressureField] !== undefined) {
          const newValue = fields[pressureField]?.numberValue ?? 0;
          const currentValue = state.telemetryData.aero[pos]?.pressure ?? 0;
          
          if (isSignificantChange(currentValue, newValue)) {
            if (!dataRef.current.pendingUpdates.telemetryData.aero[pos]) {
              dataRef.current.pendingUpdates.telemetryData.aero[pos] = {};
            }
            dataRef.current.pendingUpdates.telemetryData.aero[pos].pressure = newValue;
            hasChanges = true;
          }
        }
        
        // Temperature field name
        const tempField = `temperature${index * 2 + 1}`;
        if (fields[tempField] !== undefined) {
          const newValue = fields[tempField]?.numberValue ?? 0;
          const currentValue = state.telemetryData.aero[pos]?.temperature ?? 0;
          
          if (isSignificantChange(currentValue, newValue)) {
            if (!dataRef.current.pendingUpdates.telemetryData.aero[pos]) {
              dataRef.current.pendingUpdates.telemetryData.aero[pos] = {};
            }
            dataRef.current.pendingUpdates.telemetryData.aero[pos].temperature = newValue;
            hasChanges = true;
          }
        }
      });
      
      // Schedule update if needed
      if (hasChanges) {
        scheduleUpdate();
      }
    } catch (error) {
      console.error(`Error processing ${isFront ? 'front' : 'rear'} aero data:`, error);
    }
  }, [state, shouldUpdateData, isSignificantChange, scheduleUpdate]);
  
  // Create position-specific handlers using partial application
  const handleFrontStrainGauges1 = useCallback(msg => handleStrainGauges(msg, 'FL'), [handleStrainGauges]);
  const handleFrontStrainGauges2 = useCallback(msg => handleStrainGauges(msg, 'FR'), [handleStrainGauges]);
  const handleRearStrainGauges1 = useCallback(msg => handleStrainGauges(msg, 'RL'), [handleStrainGauges]);
  const handleRearStrainGauges2 = useCallback(msg => handleStrainGauges(msg, 'RR'), [handleStrainGauges]);
  const handleFrontAeroData = useCallback(msg => handleAeroData(msg, true), [handleAeroData]);
  const handleRearAeroData = useCallback(msg => handleAeroData(msg, false), [handleAeroData]);
  
  // Configure real-time data options
  const realTimeOptions = { 
    pauseOnHidden: false,
    updateInterval: settings.dashboard.updateInterval 
  };
  
  // Create data hook instances
  const suspensionData = useRealTimeData('front_analog', handleSuspensionData, realTimeOptions);
  const wheelSpeedData = useRealTimeData('front_frequency', handleWheelSpeedData, realTimeOptions);
  const frontStrainData1 = useRealTimeData('front_strain_gauges_1', handleFrontStrainGauges1, realTimeOptions);
  const frontStrainData2 = useRealTimeData('front_strain_gauges_2', handleFrontStrainGauges2, realTimeOptions);
  const rearStrainData1 = useRealTimeData('rear_strain_gauges_1', handleRearStrainGauges1, realTimeOptions);
  const rearStrainData2 = useRealTimeData('rear_strain_gauges_2', handleRearStrainGauges2, realTimeOptions);
  const frontAeroData = useRealTimeData('front_aero', handleFrontAeroData, realTimeOptions);
  const rearAeroData = useRealTimeData('rear_aero', handleRearAeroData, realTimeOptions);
  
  // Combine all refs to avoid multiple DOM mutations
  const combineRefs = useCallback(node => {
    // First assign to container ref for measuring
    containerRef(node);
    
    // Then assign to all data source refs
    const refs = [
      suspensionData.ref, wheelSpeedData.ref,
      frontStrainData1.ref, frontStrainData2.ref,
      rearStrainData1.ref, rearStrainData2.ref,
      frontAeroData.ref, rearAeroData.ref
    ];
    
    refs.forEach(ref => {
      if (ref && typeof ref === 'function') {
        ref(node);
      }
    });
  }, [
    containerRef, 
    suspensionData.ref, wheelSpeedData.ref,
    frontStrainData1.ref, frontStrainData2.ref,
    rearStrainData1.ref, rearStrainData2.ref,
    frontAeroData.ref, rearAeroData.ref
  ]);

  // Dialog and tooltip handlers
  const handleOpenInfo = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_INFO_DIALOG, payload: true });
  }, []);
  
  const handleCloseInfo = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_INFO_DIALOG, payload: false });
  }, []);
  
  const handleSetActiveTooltip = useCallback((tooltipId) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_TOOLTIP, payload: tooltipId });
  }, []);

  // Create info dialog component only when needed
  const infoDialog = useMemo(() => (
    <Dialog
      open={infoDialogOpen}
      onClose={handleCloseInfo}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 'bold'
      }}>
        Vehicle Telemetry Information
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Telemetry Overview
        </Typography>
        <Typography variant="body2" paragraph>
          This dashboard displays real-time telemetry data from all four wheels, including suspension travel, wheel speed, chassis strain, and aerodynamic measurements.
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Data Channels
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li><strong>Suspension:</strong> Travel distance (mm)</li>
            <li><strong>Wheel Speed:</strong> Rotation frequency (Hz) and speed ({settings.dashboard.useImperialUnits ? 'mph' : 'km/h'})</li>
            <li><strong>Strain:</strong> Chassis stress (μS)</li>
            <li><strong>Aero:</strong> Air pressure (PSI) and temperature ({settings.dashboard.showTempInF ? '°F' : '°C'})</li>
          </ul>
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Vehicle Dynamics
        </Typography>
        <Typography variant="body2" paragraph>
          The vehicle dynamics panel shows roll, pitch, vertical velocity, heading, and overall speed.
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Steering Controls
        </Typography>
        <Typography variant="body2" paragraph>
          The steering wheel visualization shows the current steering angle in real-time, with the wheel rotating to match driver input.
        </Typography>
      </DialogContent>
    </Dialog>
  ), [infoDialogOpen, handleCloseInfo, theme.palette.primary.main, settings.dashboard.useImperialUnits, settings.dashboard.showTempInF]);

  return (
    <Box
      ref={combineRefs}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'transparent'
      }}
    >
      {/* Main content area */}
      <Box sx={{
        position: 'relative',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Box sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Visualizer area */}
          <Box sx={{
            position: 'relative',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 1, sm: 2 }
          }}>
            <Box sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Box sx={{
                width: { xs: '90%', sm: '85%' },
                height: { xs: '90%', sm: '85%' },
                maxWidth: 700,
                maxHeight: 450,
                position: 'relative'
              }}>
                {/* Main car visualization */}
                <CarVisualizer
                  suspensionData={telemetryData.suspension}
                  steeringAngle={steeringAngle}
                  activeTooltip={activeTooltip}
                  setActiveTooltip={handleSetActiveTooltip}
                />
                
                {/* Render wheel cards */}
                {Object.entries(wheelPositions).map(([position, posStyle]) => (
                  <WheelCard
                    key={position}
                    position={position}
                    positionStyle={posStyle}
                    scale={wheelCardScale}
                    animationsEnabled={animationsEnabled}
                    animationDuration={animationDuration}
                    animationEasing={animationEasing}
                    enableHardwareAcceleration={settings.global.enableHardwareAcceleration}
                  >
                    <OverlayWrapper name={`${position} Suspension`} wheelCardScale={wheelCardScale}>
                      {createSuspensionComponent(
                        CompactSuspensionOverlay,
                        position,
                        telemetryData.suspension[position]
                      )}
                    </OverlayWrapper>
                    <OverlayWrapper name={`${position} Wheel Speed`} wheelCardScale={wheelCardScale}>
                      {createWheelSpeedComponent(
                        CompactWheelSpeedOverlay,
                        position,
                        telemetryData.wheelSpeed[position],
                        TIRE_SIZE_INCHES
                      )}
                    </OverlayWrapper>
                    <OverlayWrapper name={`${position} Strain`} wheelCardScale={wheelCardScale}>
                      {createStrainComponent(
                        CompactChassisStrainOverlay,
                        position,
                        telemetryData.strain[position]
                      )}
                    </OverlayWrapper>
                    <OverlayWrapper name={`${position} Aero`} wheelCardScale={wheelCardScale}>
                      {createAeroComponent(
                        CompactAeroOverlay,
                        position,
                        telemetryData.aero[position]
                      )}
                    </OverlayWrapper>
                  </WheelCard>
                ))}
              </Box>
            </Box>
          </Box>
          
          {/* Vehicle dynamics panel */}
          <Box sx={{
            position: 'relative',
            p: { xs: 0.5, sm: 1 },
            mt: 'auto',
            ...(animationsEnabled ? {
              transition: `all ${animationDuration} ${animationEasing}`,
              willChange: settings.global.enableHardwareAcceleration ? 'padding' : 'auto'
            } : {})
          }}>
            <CompactVehicleDynamicsPanel 
              tireSize={TIRE_SIZE_INCHES} 
              handleOpenInfo={handleOpenInfo}
              statusColor={statusColor}
            />
          </Box>
        </Box>
      </Box>
      
      {/* Info dialog - rendered conditionally for performance */}
      {infoDialogOpen && infoDialog}
    </Box>
  );
};

export default React.memo(RaceCarTelemetry);