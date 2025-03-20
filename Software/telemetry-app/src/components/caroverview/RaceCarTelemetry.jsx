// RaceCarTelemetry.jsx
import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { Box, Typography, Paper, alpha, useTheme, IconButton, Tooltip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { AlertCircle, Info } from 'lucide-react';
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
// Import factory helpers for creating overlay components
import { createSuspensionComponent, createWheelSpeedComponent, createStrainComponent, createAeroComponent } from './WheelComponentFactory';
// Import ChartSettingsContext for dashboard settings
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Only keep necessary configuration constants
const TIRE_SIZE_INCHES = 18.1;

/**
 * Helper to calculate average strain from multiple gauges.
 * Returns 0 if any error occurs.
 */
const calculateAverage = (fields) => {
  try {
    const gauges = ['gauge1', 'gauge2', 'gauge3', 'gauge4', 'gauge5', 'gauge6']
      .map(key => fields[key]?.numberValue || 0);
    return gauges.reduce((sum, value) => sum + value, 0) / gauges.length;
  } catch (error) {
    console.error("Error calculating strain average:", error);
    return 0;
  }
};

/**
 * getSuspensionStatusColor
 * Maps a suspension value (0–100) to a color using a more granular, continuous scale.
 */
const getSuspensionStatusColor = (val, theme) => {
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
 * RaceCarTelemetry Component
 *
 * Displays real-time telemetry data using a consistent theme, proper spacing, and responsive design.
 * It integrates a car visualization with overlay wheel cards and a dynamics panel.
 */
const RaceCarTelemetry = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: containerRef, width: containerWidth, height: containerHeight } = useResizeObserver();
  const lastUpdateTimeRef = useRef({});
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    settings.global.animationDuration > 0 && settings.global.enableTransitions,
  [settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    `${settings.global.animationDuration}ms`,
  [settings.global.animationDuration]);
  
  // Responsive layout based on MUI breakpoints instead of fixed width
  const isXs = useMemo(() => {
    // Use MUI's breakpoint values from theme
    return containerWidth < theme.breakpoints.values.sm;
  }, [containerWidth, theme.breakpoints.values.sm]);
  
  // Telemetry data defaults are set to 0.
  const [telemetryData, setTelemetryData] = useState({
    suspension: { FL: 0, FR: 0, RL: 0, RR: 0 },
    wheelSpeed: { FL: 0, FR: 0, RL: 0, RR: 0 },
    strain: { FL: 0, FR: 0, RL: 0, RR: 0 },
    aero: {
      FL: { pressure: 0, temperature: 0 },
      FR: { pressure: 0, temperature: 0 },
      RL: { pressure: 0, temperature: 0 },
      RR: { pressure: 0, temperature: 0 },
    },
  });
  
  // UI state
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [statusColor, setStatusColor] = useState(theme.palette.success.main);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  
  // Calculate responsive scales based on container size
  const wheelCardScale = useMemo(() => {
    if (!containerWidth || !containerHeight) return 1;
    const scaleFactor = Math.min(
      Math.max(0.6, containerWidth / 1000),
      Math.max(0.6, containerHeight / 600)
    );
    return scaleFactor;
  }, [containerWidth, containerHeight]);
  
  // Position wheel cards responsively based on MUI breakpoints
  const wheelPositions = useMemo(() => {
    const horizontalOffset = 27;
    const verticalOffset = 23;
    
    return {
      FL: { top: `${verticalOffset}%`, left: `${horizontalOffset}%`, transform: 'translate(-50%, -50%)' },
      FR: { top: `${verticalOffset}%`, right: `${horizontalOffset}%`, transform: 'translate(50%, -50%)' },
      RL: { bottom: `${verticalOffset}%`, left: `${horizontalOffset}%`, transform: 'translate(-50%, 50%)' },
      RR: { bottom: `${verticalOffset}%`, right: `${horizontalOffset}%`, transform: 'translate(50%, 50%)' },
    };
  }, [isXs]);

  // Check if an update should be processed based on throttling settings
  const shouldProcessUpdate = useCallback((dataType) => {
    if (settings.dashboard.updateInterval <= 0) return true;
    
    const now = Date.now();
    const lastUpdate = lastUpdateTimeRef.current[dataType] || 0;
    
    if (now - lastUpdate >= settings.dashboard.updateInterval) {
      lastUpdateTimeRef.current[dataType] = now;
      return true;
    }
    
    return false;
  }, [settings.dashboard.updateInterval]);

  // Helper to check if a change is significant enough to update
  const isSignificantChange = useCallback((oldVal, newVal) => {
    if (oldVal === 0 && newVal !== 0) return true;
    if (oldVal !== 0 && newVal === 0) return true;
    
    const percentChange = Math.abs((newVal - oldVal) / oldVal) * 100;
    return percentChange >= settings.dashboard.significantChangeThreshold;
  }, [settings.dashboard.significantChangeThreshold]);

  // ------------------ Data Handlers ------------------
  const handleSuspensionData = useCallback((msg) => {
    try {
      if (!shouldProcessUpdate('suspension')) return;
      
      const fields = msg.payload?.fields || msg.fields || msg || {};
      
      setTelemetryData(prev => {
        const newSuspension = {
          FL: fields.front_left_pot?.numberValue ?? prev.suspension.FL,
          FR: fields.front_right_pot?.numberValue ?? prev.suspension.FR,
          RL: fields.rear_left_pot?.numberValue ?? prev.suspension.RL,
          RR: fields.rear_right_pot?.numberValue ?? prev.suspension.RR,
        };
        
        // Only update if there's a significant change
        const hasSignificantChange = ['FL', 'FR', 'RL', 'RR'].some(
          pos => isSignificantChange(prev.suspension[pos], newSuspension[pos])
        );
        
        if (hasSignificantChange) {
          return {
            ...prev,
            suspension: newSuspension
          };
        }
        
        return prev;
      });
      
      const values = [
        fields.front_left_pot?.numberValue,
        fields.front_right_pot?.numberValue,
        fields.rear_left_pot?.numberValue,
        fields.rear_right_pot?.numberValue,
      ].filter(val => val !== undefined);
      
      if (values.length > 0) {
        const minValue = Math.min(...values);
        // Use a continuous color mapping for overall status
        const newStatusColor = getSuspensionStatusColor(minValue, theme);
        setStatusColor(newStatusColor);
      }
    } catch (error) {
      console.error("Error processing suspension data:", error);
    }
  }, [theme, shouldProcessUpdate, isSignificantChange]);

  const handleWheelSpeedData = useCallback((msg) => {
    try {
      if (!shouldProcessUpdate('wheelSpeed')) return;
      
      const fields = msg.payload?.fields || msg.fields || msg || {};
      
      setTelemetryData(prev => {
        const newWheelSpeed = {
          FL: fields.front_left?.numberValue ?? prev.wheelSpeed.FL,
          FR: fields.front_right?.numberValue ?? prev.wheelSpeed.FR,
          RL: fields.rear_left?.numberValue ?? prev.wheelSpeed.RL,
          RR: fields.rear_right?.numberValue ?? prev.wheelSpeed.RR,
        };
        
        // Only update if there's a significant change
        const hasSignificantChange = ['FL', 'FR', 'RL', 'RR'].some(
          pos => isSignificantChange(prev.wheelSpeed[pos], newWheelSpeed[pos])
        );
        
        if (hasSignificantChange) {
          return {
            ...prev,
            wheelSpeed: newWheelSpeed
          };
        }
        
        return prev;
      });
    } catch (error) {
      console.error("Error processing wheel speed data:", error);
    }
  }, [shouldProcessUpdate, isSignificantChange]);

  const handleStrainGauges = useCallback((msg, position) => {
    try {
      if (!shouldProcessUpdate(`strain_${position}`)) return;
      
      const fields = msg.payload?.fields || msg.fields || msg;
      if (!fields) return;
      
      setTelemetryData(prev => {
        const strain = calculateAverage(fields);
        
        // Only update if there's a significant change
        if (!isSignificantChange(prev.strain[position], strain)) {
          return prev;
        }
        
        return {
          ...prev,
          strain: {
            ...prev.strain,
            [position]: strain,
          },
        };
      });
    } catch (error) {
      console.error(`Error processing strain gauges for ${position}:`, error);
    }
  }, [shouldProcessUpdate, isSignificantChange]);

  const handleAeroData = useCallback((msg, frontPositions) => {
    try {
      if (!shouldProcessUpdate(`aero_${frontPositions ? 'front' : 'rear'}`)) return;
      
      const fields = msg.payload?.fields || msg.fields || msg;
      if (!fields) return;
      
      setTelemetryData(prev => {
        const newAero = { ...prev.aero };
        let hasSignificantChange = false;
        
        if (frontPositions) {
          const newPressure1 = fields.pressure1?.numberValue;
          const newTemp1 = fields.temperature1?.numberValue;
          const newPressure3 = fields.pressure3?.numberValue;
          const newTemp3 = fields.temperature3?.numberValue;
          
          if (newPressure1 !== undefined && 
              isSignificantChange(prev.aero.FL.pressure, newPressure1)) {
            newAero.FL.pressure = newPressure1;
            hasSignificantChange = true;
          }
          
          if (newTemp1 !== undefined && 
              isSignificantChange(prev.aero.FL.temperature, newTemp1)) {
            newAero.FL.temperature = newTemp1;
            hasSignificantChange = true;
          }
          
          if (newPressure3 !== undefined && 
              isSignificantChange(prev.aero.FR.pressure, newPressure3)) {
            newAero.FR.pressure = newPressure3;
            hasSignificantChange = true;
          }
          
          if (newTemp3 !== undefined && 
              isSignificantChange(prev.aero.FR.temperature, newTemp3)) {
            newAero.FR.temperature = newTemp3;
            hasSignificantChange = true;
          }
        } else {
          const newPressure1 = fields.pressure1?.numberValue;
          const newTemp1 = fields.temperature1?.numberValue;
          const newPressure3 = fields.pressure3?.numberValue;
          const newTemp3 = fields.temperature3?.numberValue;
          
          if (newPressure1 !== undefined && 
              isSignificantChange(prev.aero.RL.pressure, newPressure1)) {
            newAero.RL.pressure = newPressure1;
            hasSignificantChange = true;
          }
          
          if (newTemp1 !== undefined && 
              isSignificantChange(prev.aero.RL.temperature, newTemp1)) {
            newAero.RL.temperature = newTemp1;
            hasSignificantChange = true;
          }
          
          if (newPressure3 !== undefined && 
              isSignificantChange(prev.aero.RR.pressure, newPressure3)) {
            newAero.RR.pressure = newPressure3;
            hasSignificantChange = true;
          }
          
          if (newTemp3 !== undefined && 
              isSignificantChange(prev.aero.RR.temperature, newTemp3)) {
            newAero.RR.temperature = newTemp3;
            hasSignificantChange = true;
          }
        }
        
        return hasSignificantChange ? { ...prev, aero: newAero } : prev;
      });
    } catch (error) {
      console.error(`Error processing ${frontPositions ? 'front' : 'rear'} aero data:`, error);
    }
  }, [shouldProcessUpdate, isSignificantChange]);

  // Handler factories for each wheel position
  const handleFrontStrainGauges1 = useCallback((msg) => handleStrainGauges(msg, 'FL'), [handleStrainGauges]);
  const handleFrontStrainGauges2 = useCallback((msg) => handleStrainGauges(msg, 'FR'), [handleStrainGauges]);
  const handleRearStrainGauges1 = useCallback((msg) => handleStrainGauges(msg, 'RL'), [handleStrainGauges]);
  const handleRearStrainGauges2 = useCallback((msg) => handleStrainGauges(msg, 'RR'), [handleStrainGauges]);
  const handleFrontAeroData = useCallback((msg) => handleAeroData(msg, true), [handleAeroData]);
  const handleRearAeroData = useCallback((msg) => handleAeroData(msg, false), [handleAeroData]);

  // Use refs to ensure components are visible and active
  const { ref: telemetryRef } = useRealTimeData('front_analog', handleSuspensionData);
  const { ref: wheelSpeedRef } = useRealTimeData('front_frequency', handleWheelSpeedData);
  const { ref: strainGauge1Ref } = useRealTimeData('front_strain_gauges_1', handleFrontStrainGauges1);
  const { ref: strainGauge2Ref } = useRealTimeData('front_strain_gauges_2', handleFrontStrainGauges2);
  const { ref: strainGauge3Ref } = useRealTimeData('rear_strain_gauges1', handleRearStrainGauges1);
  const { ref: strainGauge4Ref } = useRealTimeData('rear_strain_gauges2', handleRearStrainGauges2);
  const { ref: frontAeroRef } = useRealTimeData('front_aero', handleFrontAeroData);
  const { ref: rearAeroRef } = useRealTimeData('rear_aero', handleRearAeroData);

  // Dialog handlers
  const handleOpenInfo = useCallback(() => {
    setInfoDialogOpen(true);
  }, []);

  // ------------------ Info Dialog ------------------
  const renderInfoDialog = () => (
    <Dialog
      open={infoDialogOpen}
      onClose={() => setInfoDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          fontWeight: 'bold',
        }}
      >
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
      </DialogContent>
    </Dialog>
  );

  // Create a combined ref function to attach multiple refs to the main container
  const attachRefs = useCallback(node => {
    // Assign the node to all the refs
    if (telemetryRef) telemetryRef(node);
    if (wheelSpeedRef) wheelSpeedRef(node);
    if (strainGauge1Ref) strainGauge1Ref(node);
    if (strainGauge2Ref) strainGauge2Ref(node);
    if (strainGauge3Ref) strainGauge3Ref(node);
    if (strainGauge4Ref) strainGauge4Ref(node);
    if (frontAeroRef) frontAeroRef(node);
    if (rearAeroRef) rearAeroRef(node);
  }, [
    telemetryRef, wheelSpeedRef, 
    strainGauge1Ref, strainGauge2Ref, 
    strainGauge3Ref, strainGauge4Ref, 
    frontAeroRef, rearAeroRef
  ]);

  // Combine containerRef with other refs
  const combineRefs = useCallback(node => {
    containerRef(node);
    attachRefs(node);
  }, [containerRef, attachRefs]);

  // ------------------ Main Render ------------------
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
        bgcolor: 'transparent',
      }}
    >

      {/* Main content - Visual View */}
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: { xs: 1, sm: 2 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: { xs: '90%', sm: '85%' },
                  height: { xs: '90%', sm: '85%' },
                  maxWidth: 700,
                  maxHeight: 450,
                  position: 'relative',
                }}
              >
                <CarVisualizer
                  suspensionData={telemetryData.suspension}
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              </Box>
              
              {/* Wheel Cards */}
              {Object.entries(wheelPositions).map(([position, posStyle]) => (
                <WheelCard
                  key={position}
                  position={position}
                  positionStyle={posStyle}
                  scale={wheelCardScale}
                  animationsEnabled={animationsEnabled}
                  animationDuration={animationDuration}
                  enableHardwareAcceleration={settings.global.enableHardwareAcceleration}
                >
                  <OverlayWrapper 
                    name="Suspension" 
                    wheelCardScale={wheelCardScale}
                  >
                    {createSuspensionComponent(
                      CompactSuspensionOverlay,
                      position,
                      telemetryData.suspension[position]
                    )}
                  </OverlayWrapper>
                  <OverlayWrapper 
                    name="Wheel Speed" 
                    wheelCardScale={wheelCardScale}
                  >
                    {createWheelSpeedComponent(
                      CompactWheelSpeedOverlay,
                      position,
                      telemetryData.wheelSpeed[position]
                    )}
                  </OverlayWrapper>
                  <OverlayWrapper 
                    name="Strain" 
                    wheelCardScale={wheelCardScale}
                  >
                    {createStrainComponent(
                      CompactChassisStrainOverlay,
                      position,
                      telemetryData.strain[position]
                    )}
                  </OverlayWrapper>
                  <OverlayWrapper 
                    name="Aero" 
                    wheelCardScale={wheelCardScale}
                  >
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
        
        {/* Vehicle Dynamics Panel */}
        <Box
          sx={{
            position: 'relative',
            p: { xs: 0.5, sm: 1 },
            mt: 'auto',
            transition: animationsEnabled ? `all ${animationDuration} ease` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'padding' : 'auto',
          }}
        >
          <CompactVehicleDynamicsPanel 
            tireSize={TIRE_SIZE_INCHES} 
            handleOpenInfo={handleOpenInfo}
            statusColor={statusColor}
          />
          
        </Box>
      </Box>
      
      {renderInfoDialog()}
    </Box>
  );
};

export default React.memo(RaceCarTelemetry);
