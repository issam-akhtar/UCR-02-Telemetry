import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Paper, alpha, useTheme, Grid, IconButton, Tooltip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { AlertCircle, Info, Cpu, BarChart3 } from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';

// Import components
import CompactSuspensionOverlay from './CompactSuspensionOverlay';
import CompactWheelSpeedOverlay from './CompactWheelSpeedOverlay';
import CompactChassisStrainOverlay from './CompactChassisStrainOverlay';
import CompactAeroOverlay from './CompactAeroOverlay';
import CompactVehicleDynamicsPanel from './CompactVehicleDynamicsPanel';
import WheelCard from './WheelCard';
import CarVisualizer from './CarVisualizer';
import TireMetricDisplay from './TireMetricDisplay';
import OverlayWrapper from './OverlayWrapper';

// Import helper functions
import { 
  createSuspensionComponent,
  createWheelSpeedComponent, 
  createStrainComponent, 
  createAeroComponent 
} from './WheelComponentFactory';

// Icons for metrics
import { GiSpring, GiCarWheel } from 'react-icons/gi';
import { MdOutlineCompress } from 'react-icons/md';
import { FaThermometerHalf } from 'react-icons/fa';

// Constants
const TIRE_SIZE_INCHES = 18.1;
const SUSPENSION_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60
};

const WHEEL_SPEED_THRESHOLDS = {
  LOW: 10,
  HIGH: 20
};

const STRAIN_THRESHOLDS = {
  MODERATE: 40,
  HIGH: 80
};

const AERO_PRESSURE_THRESHOLDS = {
  LOW: 10,
  HIGH: 30
};

const AERO_TEMP_THRESHOLDS = {
  MEDIUM: 60,
  HIGH: 80
};

/**
 * Helper to calculate average strain from multiple gauges
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
 * Enhanced Race Car Telemetry Component
 *
 * A highly optimized and visually enhanced telemetry dashboard with:
 * - Larger car visualization with appropriate tire scaling
 * - Compact and enhanced wheel data cards
 * - Integrated vehicle dynamics display
 * - Responsive layout with no scrollbars
 */
const RaceCarTelemetry = () => {
  const theme = useTheme();
  
  // State for telemetry data with default values
  const [telemetryData, setTelemetryData] = useState({
    suspension: {
      FL: 0, // Default values
      FR: 0,
      RL: 0,
      RR: 0
    },
    wheelSpeed: {
      FL: 0,
      FR: 0,
      RL: 0,
      RR: 0
    },
    strain: {
      FL: 0,
      FR: 0,
      RL: 0,
      RR: 0
    },
    aero: {
      FL: { pressure: 0, temperature: 0 },
      FR: { pressure: 0, temperature: 0 },
      RL: { pressure: 0, temperature: 0 },
      RR: { pressure: 0, temperature: 0 }
    }
  });
  
  // State for dynamic UI elements
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState('SYSTEMS NOMINAL');
  const [statusColor, setStatusColor] = useState(theme.palette.success.main);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'data'
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  
  // Get color based on suspension value
  const getSuspensionColor = useCallback((value) => {
    if (value < SUSPENSION_THRESHOLDS.LOW) return theme.palette.error.main;
    if (value < SUSPENSION_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);
  
  // Get color based on wheel speed
  const getWheelSpeedColor = useCallback((value) => {
    if (value < WHEEL_SPEED_THRESHOLDS.LOW) return theme.palette.success.main;
    if (value > WHEEL_SPEED_THRESHOLDS.HIGH) return theme.palette.error.main;
    return theme.palette.warning.main;
  }, [theme]);
  
  // Get color based on strain value
  const getStrainColor = useCallback((value) => {
    if (value > STRAIN_THRESHOLDS.HIGH) return theme.palette.error.main;
    if (value > STRAIN_THRESHOLDS.MODERATE) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);
  
  // Get color based on aero pressure
  const getAeroPressureColor = useCallback((value) => {
    if (value < AERO_PRESSURE_THRESHOLDS.LOW) return theme.palette.error.main;
    if (value > AERO_PRESSURE_THRESHOLDS.HIGH) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);
  
  // Get color based on aero temperature
  const getAeroTempColor = useCallback((value) => {
    if (value > AERO_TEMP_THRESHOLDS.HIGH) return theme.palette.error.main;
    if (value > AERO_TEMP_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);
  
  // Handle suspension data updates
  const handleSuspensionData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields || {};
      
      setTelemetryData(prev => ({
        ...prev,
        suspension: {
          FL: fields.front_left_pot?.numberValue ?? prev.suspension.FL,
          FR: fields.front_right_pot?.numberValue ?? prev.suspension.FR,
          RL: fields.rear_left_pot?.numberValue ?? prev.suspension.RL,
          RR: fields.rear_right_pot?.numberValue ?? prev.suspension.RR
        }
      }));
      
      // Update vehicle status if any suspension value is critical
      const values = [
        fields.front_left_pot?.numberValue, 
        fields.front_right_pot?.numberValue,
        fields.rear_left_pot?.numberValue, 
        fields.rear_right_pot?.numberValue
      ].filter(val => val !== undefined);
      
      if (values.some(val => val < SUSPENSION_THRESHOLDS.LOW)) {
        setVehicleStatus('CHECK SUSPENSION');
        setStatusColor(theme.palette.error.main);
      } else if (values.some(val => val < SUSPENSION_THRESHOLDS.MEDIUM)) {
        setVehicleStatus('MONITOR SUSPENSION');
        setStatusColor(theme.palette.warning.main);
      } else if (values.length > 0 && vehicleStatus.includes('SUSPENSION')) {
        setVehicleStatus('SYSTEMS NOMINAL');
        setStatusColor(theme.palette.success.main);
      }
    } catch (error) {
      console.error("Error processing suspension data:", error);
    }
  }, [theme, vehicleStatus]);
  
  // Handler for wheel speed data
  const handleWheelSpeedData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields || {};
      
      setTelemetryData(prev => ({
        ...prev,
        wheelSpeed: {
          FL: fields.front_left?.numberValue ?? prev.wheelSpeed.FL,
          FR: fields.front_right?.numberValue ?? prev.wheelSpeed.FR,
          RL: fields.rear_left?.numberValue ?? prev.wheelSpeed.RL,
          RR: fields.rear_right?.numberValue ?? prev.wheelSpeed.RR
        }
      }));
    } catch (error) {
      console.error("Error processing wheel speed data:", error);
    }
  }, []);
  
  // Handlers for strain gauge data
  const handleStrainGauges = useCallback((msg, position) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      setTelemetryData(prev => ({
        ...prev,
        strain: {
          ...prev.strain,
          [position]: calculateAverage(fields)
        }
      }));
    } catch (error) {
      console.error(`Error processing strain gauges for ${position}:`, error);
    }
  }, []);
  
  // Handler for aero data
  const handleAeroData = useCallback((msg, frontPositions) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      setTelemetryData(prev => {
        const newAero = { ...prev.aero };
        
        if (frontPositions) {
          // Front aero data
          newAero.FL = { 
            pressure: fields.pressure1?.numberValue || prev.aero.FL.pressure, 
            temperature: fields.temperature1?.numberValue || prev.aero.FL.temperature 
          };
          newAero.FR = { 
            pressure: fields.pressure3?.numberValue || prev.aero.FR.pressure, 
            temperature: fields.temperature3?.numberValue || prev.aero.FR.temperature 
          };
        } else {
          // Rear aero data
          newAero.RL = { 
            pressure: fields.pressure1?.numberValue || prev.aero.RL.pressure, 
            temperature: fields.temperature1?.numberValue || prev.aero.RL.temperature 
          };
          newAero.RR = { 
            pressure: fields.pressure3?.numberValue || prev.aero.RR.pressure, 
            temperature: fields.temperature3?.numberValue || prev.aero.RR.temperature 
          };
        }
        
        return {
          ...prev,
          aero: newAero
        };
      });
    } catch (error) {
      console.error(`Error processing ${frontPositions ? 'front' : 'rear'} aero data:`, error);
    }
  }, []);
  
  // Optimized data handling - using function currying to reduce handler creation
  const handleFrontStrainGauges1 = useCallback((msg) => handleStrainGauges(msg, 'FL'), [handleStrainGauges]);
  const handleFrontStrainGauges2 = useCallback((msg) => handleStrainGauges(msg, 'FR'), [handleStrainGauges]);
  const handleRearStrainGauges1 = useCallback((msg) => handleStrainGauges(msg, 'RL'), [handleStrainGauges]);
  const handleRearStrainGauges2 = useCallback((msg) => handleStrainGauges(msg, 'RR'), [handleStrainGauges]);
  const handleFrontAeroData = useCallback((msg) => handleAeroData(msg, true), [handleAeroData]);
  const handleRearAeroData = useCallback((msg) => handleAeroData(msg, false), [handleAeroData]);
  
  // Subscribe to real-time data sources
  useRealTimeData('front_analog', handleSuspensionData);
  useRealTimeData('front_frequency', handleWheelSpeedData);
  useRealTimeData('front_strain_gauges_1', handleFrontStrainGauges1);
  useRealTimeData('front_strain_gauges_2', handleFrontStrainGauges2);
  useRealTimeData('rear_strain_gauges1', handleRearStrainGauges1);
  useRealTimeData('rear_strain_gauges2', handleRearStrainGauges2);
  useRealTimeData('front_aero', handleFrontAeroData);
  useRealTimeData('rear_aero', handleRearAeroData);
  
  // Optimized wheel positions for the visual layout - adjusted for better placement
  const wheelPositions = useMemo(() => ({
    FL: {
      top: '22%',
      left: '20%',
      transform: 'translate(-50%, -50%)'
    },
    FR: {
      top: '22%',
      right: '20%',
      transform: 'translate(50%, -50%)'
    },
    RL: {
      bottom: '22%',
      left: '20%',
      transform: 'translate(-50%, 50%)'
    },
    RR: {
      bottom: '22%',
      right: '20%',
      transform: 'translate(50%, 50%)'
    }
  }), []);
  
  // Calculate wheel speed in km/h
  const calculateSpeed = useCallback((freq) => {
    // Calculate speed based on tire size and frequency
    const wheelRadiusMeters = (TIRE_SIZE_INCHES * 0.0254) / 2;
    const circumference = 2 * Math.PI * wheelRadiusMeters;
    return freq * circumference * 3.6; // in km/h
  }, []);
  
  // Simulation of real-time data for demo purposes
  useEffect(() => {
    // Only use this in development or demo mode
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEMO_MODE === 'true') {
      const interval = setInterval(() => {
        // Simulate changing suspension values
        setTelemetryData(prev => {
          // Helper to update values with slight randomness
          const updateWithJitter = (value, jitterAmount = 5, min = 20, max = 90) => {
            return Math.max(min, Math.min(max, value + (Math.random() - 0.5) * jitterAmount));
          };
          
          // Create new state with jittered values
          return {
            suspension: {
              FL: updateWithJitter(prev.suspension.FL),
              FR: updateWithJitter(prev.suspension.FR),
              RL: updateWithJitter(prev.suspension.RL), 
              RR: updateWithJitter(prev.suspension.RR)
            },
            wheelSpeed: {
              FL: updateWithJitter(prev.wheelSpeed.FL, 1.5, 10, 25),
              FR: updateWithJitter(prev.wheelSpeed.FR, 1.5, 10, 25),
              RL: updateWithJitter(prev.wheelSpeed.RL, 1.5, 10, 25),
              RR: updateWithJitter(prev.wheelSpeed.RR, 1.5, 10, 25)
            },
            strain: {
              FL: updateWithJitter(prev.strain.FL, 3, 20, 60),
              FR: updateWithJitter(prev.strain.FR, 3, 20, 60),
              RL: updateWithJitter(prev.strain.RL, 3, 20, 60),
              RR: updateWithJitter(prev.strain.RR, 3, 20, 60)
            },
            aero: {
              FL: {
                pressure: updateWithJitter(prev.aero.FL.pressure, 2, 8, 35),
                temperature: updateWithJitter(prev.aero.FL.temperature, 4, 40, 90)
              },
              FR: {
                pressure: updateWithJitter(prev.aero.FR.pressure, 2, 8, 35),
                temperature: updateWithJitter(prev.aero.FR.temperature, 4, 40, 90)
              },
              RL: {
                pressure: updateWithJitter(prev.aero.RL.pressure, 2, 8, 35),
                temperature: updateWithJitter(prev.aero.RL.temperature, 4, 40, 90)
              },
              RR: {
                pressure: updateWithJitter(prev.aero.RR.pressure, 2, 8, 35),
                temperature: updateWithJitter(prev.aero.RR.temperature, 4, 40, 90)
              }
            }
          };
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);
  
  // Toggle data view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'visual' ? 'data' : 'visual');
  }, []);
  
  // Open info dialog
  const handleOpenInfo = useCallback(() => {
    setInfoDialogOpen(true);
  }, []);
  
  // Select/deselect wheel
  const toggleWheelSelection = useCallback((position) => {
    setSelectedWheel(prev => prev === position ? null : position);
  }, []);
  
  // Calculate overall vehicle health status
  useEffect(() => {
    // Check all suspension values
    const suspensionValues = Object.values(telemetryData.suspension);
    
    if (suspensionValues.some(val => val < SUSPENSION_THRESHOLDS.LOW)) {
      setVehicleStatus('CHECK SUSPENSION');
      setStatusColor(theme.palette.error.main);
    } else if (suspensionValues.some(val => val < SUSPENSION_THRESHOLDS.MEDIUM)) {
      setVehicleStatus('MONITOR SUSPENSION');
      setStatusColor(theme.palette.warning.main);
    } else {
      setVehicleStatus('SYSTEMS NOMINAL');
      setStatusColor(theme.palette.success.main);
    }
  }, [telemetryData.suspension, theme.palette.error.main, theme.palette.success.main, theme.palette.warning.main]);
  
  // Enhanced tire metrics display for selected wheel
  const renderWheelMetrics = useMemo(() => {
    if (!selectedWheel) return null;
    
    const position = selectedWheel;
    const positionNames = {
      FL: 'Front Left',
      FR: 'Front Right',
      RL: 'Rear Left',
      RR: 'Rear Right'
    };
    
    return (
      <Box sx={{ 
        mt: 2,
        p: 1.5,
        backgroundColor: alpha(theme.palette.background.paper, 0.15),
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 1.5, 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            '&:before': {
              content: '""',
              display: 'inline-block',
              width: 3,
              height: 16,
              marginRight: 1,
              backgroundColor: statusColor,
              borderRadius: 1
            }
          }}
        >
          {positionNames[position]} Wheel Metrics
        </Typography>
        
        <Grid container spacing={2}>
          {/* Suspension */}
          <Grid item xs={6} sm={3}>
            <TireMetricDisplay
              label="Suspension"
              value={telemetryData.suspension[position]}
              unit="mm"
              getStatusColor={getSuspensionColor}
              icon={GiSpring}
            />
          </Grid>
          
          {/* Wheel Speed */}
          <Grid item xs={6} sm={3}>
            <TireMetricDisplay
              label="Wheel Speed"
              value={telemetryData.wheelSpeed[position]}
              unit="Hz"
              secondaryValue={calculateSpeed(telemetryData.wheelSpeed[position])}
              secondaryUnit="km/h"
              getStatusColor={getWheelSpeedColor}
              icon={GiCarWheel}
            />
          </Grid>
          
          {/* Strain */}
          <Grid item xs={6} sm={3}>
            <TireMetricDisplay
              label="Strain"
              value={telemetryData.strain[position]}
              unit="μS"
              getStatusColor={getStrainColor}
              icon={MdOutlineCompress}
            />
          </Grid>
          
          {/* Aero */}
          <Grid item xs={6} sm={3}>
            <TireMetricDisplay
              label="Aero"
              value={telemetryData.aero[position].pressure}
              unit="PSI"
              secondaryValue={telemetryData.aero[position].temperature}
              secondaryUnit="°C"
              getStatusColor={getAeroPressureColor}
              icon={FaThermometerHalf}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }, [
    selectedWheel, 
    telemetryData, 
    statusColor, 
    getSuspensionColor, 
    getWheelSpeedColor, 
    getStrainColor, 
    getAeroPressureColor,
    calculateSpeed,
    theme
  ]);
  
  // Vehicle Information Dialog
  const renderInfoDialog = () => (
    <Dialog 
      open={infoDialogOpen} 
      onClose={() => setInfoDialogOpen(false)}
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
          This real-time telemetry dashboard displays critical information from all four wheels
          of the vehicle, including suspension travel, wheel speed, chassis strain, and aerodynamic data.
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Data Channels
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li><strong>Suspension:</strong> Travel distance in millimeters</li>
            <li><strong>Wheel Speed:</strong> Rotation frequency in Hz converted to km/h</li>
            <li><strong>Strain:</strong> Chassis stress at mounting points</li>
            <li><strong>Aero:</strong> Air pressure and temperature at each wheel</li>
          </ul>
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Vehicle Dynamics
        </Typography>
        <Typography variant="body2" paragraph>
          The vehicle dynamics panel at the bottom shows roll, pitch, vertical velocity, 
          heading direction, and overall vehicle speed.
        </Typography>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>Click on any wheel card to view detailed metrics</li>
            <li>Toggle between Visual and Data views using the view button</li>
            <li>Monitor the system status indicator for alerts</li>
          </ul>
        </Typography>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <Box 
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
      {/* Header with status and controls */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: { xs: 1, sm: 1.5 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          borderRadius: '8px 8px 0 0',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ 
              mr: 2,
              display: 'flex',
              alignItems: 'center', 
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 16,
                backgroundColor: statusColor,
                marginRight: 1,
                borderRadius: 4,
                transition: 'background-color 0.3s ease'
              }
            }}
          >
            Vehicle Telemetry
          </Typography>
          
          <Box
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha(statusColor, 0.1),
              color: statusColor,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: { xs: '0.65rem', sm: '0.7rem' },
              fontWeight: 'medium',
              transition: 'all 0.3s ease'
            }}
          >
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColor,
                mr: 1,
                animation: vehicleStatus === 'SYSTEMS NOMINAL'
                  ? 'none'
                  : 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 }
                }
              }}
            />
            {vehicleStatus}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={viewMode === 'visual' ? "Switch to Data View" : "Switch to Visual View"} arrow>
            <IconButton size="small" color="primary" onClick={toggleViewMode}>
              {viewMode === 'visual' ? <BarChart3 size={18} /> : <Cpu size={18} />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Telemetry Information" arrow>
            <IconButton size="small" color="primary" onClick={handleOpenInfo}>
              <Info size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Main content container - scaled to fit without scrolling */}
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Visual View with car diagram and wheel cards */}
        {viewMode === 'visual' && (
          <Box
            sx={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Car visualization container - takes up available space */}
            <Box
              sx={{
                position: 'relative',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2
              }}
            >
              {/* Background gradient - subtle radial effect, no borders */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at center, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0) 70%)',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Car visualization - enlarged for better visibility */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {/* Car Visualizer - increased size */}
                <Box 
                  sx={{ 
                    width: '80%', 
                    height: '80%', 
                    maxWidth: 800,
                    maxHeight: 500,
                    position: 'relative'
                  }}
                >
                  <CarVisualizer
                    suspensionData={telemetryData.suspension}
                    activeTooltip={activeTooltip}
                    setActiveTooltip={setActiveTooltip}
                  />
                </Box>
                
                {/* Wheel data cards positioned around the car */}
                {Object.entries(wheelPositions).map(([position, posStyle]) => (
                  <WheelCard
                    key={position}
                    position={position}
                    positionStyle={posStyle}
                    scale={0.7} // Smaller scale for compactness
                    onClick={() => toggleWheelSelection(position)}
                  >
                    <OverlayWrapper name="Suspension">
                      {createSuspensionComponent(
                        CompactSuspensionOverlay,
                        position,
                        telemetryData.suspension[position]
                      )}
                    </OverlayWrapper>
                    
                    <OverlayWrapper name="Wheel Speed">
                      {createWheelSpeedComponent(
                        CompactWheelSpeedOverlay,
                        position,
                        telemetryData.wheelSpeed[position]
                      )}
                    </OverlayWrapper>
                    
                    <OverlayWrapper name="Strain">
                      {createStrainComponent(
                        CompactChassisStrainOverlay,
                        position,
                        telemetryData.strain[position]
                      )}
                    </OverlayWrapper>
                    
                    <OverlayWrapper name="Aero">
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
            
            {/* Selected wheel metrics - displayed at bottom when wheel is selected */}
            {selectedWheel && renderWheelMetrics}
          </Box>
        )}
        
        {/* Data View with comprehensive metrics */}
        {viewMode === 'data' && (
          <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
            <Grid container spacing={2}>
              {/* Suspension Data */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontSize: '1rem' }}>
                    Suspension Data
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(telemetryData.suspension).map(([position, value]) => (
                      <Grid item xs={6} sm={3} key={`suspension-${position}`}>
                        <TireMetricDisplay
                          label={`${position} Suspension`}
                          value={value}
                          unit="mm"
                          getStatusColor={getSuspensionColor}
                          icon={GiSpring}
                          compact
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Wheel Speed Data */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontSize: '1rem' }}>
                    Wheel Speed Data
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(telemetryData.wheelSpeed).map(([position, value]) => (
                      <Grid item xs={6} sm={3} key={`wheel-speed-${position}`}>
                        <TireMetricDisplay
                          label={`${position} Speed`}
                          value={value}
                          unit="Hz"
                          secondaryValue={calculateSpeed(value)}
                          secondaryUnit="km/h"
                          getStatusColor={getWheelSpeedColor}
                          icon={GiCarWheel}
                          compact
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Strain Data */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontSize: '1rem' }}>
                    Chassis Strain Data
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(telemetryData.strain).map(([position, value]) => (
                      <Grid item xs={6} sm={3} key={`strain-${position}`}>
                        <TireMetricDisplay
                          label={`${position} Strain`}
                          value={value}
                          unit="μS"
                          getStatusColor={getStrainColor}
                          icon={MdOutlineCompress}
                          compact
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Aero Data */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontSize: '1rem' }}>
                    Aerodynamic Data
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(telemetryData.aero).map(([position, data]) => (
                      <Grid item xs={6} sm={3} key={`aero-${position}`}>
                        <TireMetricDisplay
                          label={`${position} Aero`}
                          value={data.pressure}
                          unit="PSI"
                          secondaryValue={data.temperature}
                          secondaryUnit="°C"
                          getStatusColor={getAeroPressureColor}
                          icon={FaThermometerHalf}
                          compact
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Bottom vehicle dynamics panel - moved to bottom with better positioning */}
        <Box
          sx={{
            position: 'relative',
            p: 1,
            mt: 'auto', // Push to bottom
            transition: 'all 0.3s ease'
          }}
        >
          <CompactVehicleDynamicsPanel tireSize={TIRE_SIZE_INCHES} />
          
          {/* Warning indicator for critical status */}
          {vehicleStatus !== 'SYSTEMS NOMINAL' && (
            <Box
              sx={{
                position: 'absolute',
                right: { xs: 8, sm: 16 },
                bottom: { xs: 8, sm: 16 },
                display: 'flex',
                alignItems: 'center',
                bgcolor: alpha(statusColor, 0.9),
                color: '#fff',
                px: 2,
                py: 1,
                borderRadius: 2,
                boxShadow: `0 2px 10px ${alpha(statusColor, 0.5)}`,
                zIndex: 10,
                animation: 'fadeInUp 0.5s ease-out',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <AlertCircle size={20} style={{ marginRight: 8 }} />
              <Typography variant="body2" fontWeight="medium">
                {vehicleStatus}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Info Dialog */}
      {renderInfoDialog()}
    </Box>
  );
};

export default React.memo(RaceCarTelemetry);