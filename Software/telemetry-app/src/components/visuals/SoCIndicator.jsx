import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography, Alert, useTheme } from '@mui/material';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull } from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';

// Constants & Thresholds
const SOC_THRESHOLDS = {
  CRITICAL: 10,
  LOW: 20,
  CAUTION: 35,
  NORMAL: 65,
  GOOD: 80,
  EXCELLENT: 95
};

// Theming Helpers
const useSoCColors = () => {
  const theme = useTheme();
  return {
    CRITICAL: theme.palette.error.main,
    LOW: theme.palette.warning.main,
    CAUTION: theme.palette.warning.light,
    NORMAL: theme.palette.info.main,
    GOOD: theme.palette.success.main,
    EXCELLENT: theme.palette.success.light,
    BACKGROUND: theme.palette.mode === 'dark'
      ? 'rgba(30, 30, 30, 0.9)'
      : 'rgba(245, 245, 245, 0.9)'
  };
};

const getSoCColor = (soc, colors) => {
  if (soc <= SOC_THRESHOLDS.CRITICAL) return colors.CRITICAL;
  if (soc <= SOC_THRESHOLDS.LOW) return colors.LOW;
  if (soc <= SOC_THRESHOLDS.CAUTION) return colors.CAUTION;
  if (soc <= SOC_THRESHOLDS.NORMAL) return colors.NORMAL;
  if (soc <= SOC_THRESHOLDS.GOOD) return colors.GOOD;
  return colors.EXCELLENT;
};

// Simple Battery Icon Component
const BatteryIcon = ({ soc, isCharging, size = 24, color }) => {
  if (isCharging) return <BatteryCharging size={size} color={color} />;
  if (soc <= SOC_THRESHOLDS.CRITICAL) return <BatteryWarning size={size} color={color} />;
  if (soc >= SOC_THRESHOLDS.EXCELLENT) return <BatteryFull size={size} color={color} />;
  return <Battery size={size} color={color} />;
};

// Main SoCIndicator Component
const SoCIndicator = () => {
  const theme = useTheme();
  const colors = useSoCColors();

  // Core battery state
  const [soc, setSoC] = useState(0);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    minSoC: 0,
    maxSoC: 0,
    isCharging: false,
    status: 'NORMAL',
    message: 'Initializing...'
  });
  const lastTimestampRef = useRef(null);

  // Simplified stats calculation without range indicator
  const updateStats = useCallback((newSoC, newCurrent) => {
    const clampedSoC = Math.min(100, Math.max(0, newSoC));
    const isCharging = newCurrent < 0;
    let status, message;

    if (clampedSoC <= SOC_THRESHOLDS.CRITICAL) {
      status = 'CRITICAL';
      message = isCharging ? 'Charging' : 'Critically low';
    } else if (clampedSoC <= SOC_THRESHOLDS.LOW) {
      status = 'LOW';
      message = isCharging ? 'Charging' : 'Charge soon';
    } else if (clampedSoC <= SOC_THRESHOLDS.CAUTION) {
      status = 'CAUTION';
      message = isCharging ? 'Charging' : 'Decreasing';
    } else if (clampedSoC <= SOC_THRESHOLDS.NORMAL) {
      status = 'NORMAL';
      message = isCharging ? 'Charging' : 'Normal';
    } else if (clampedSoC <= SOC_THRESHOLDS.GOOD) {
      status = 'GOOD';
      message = isCharging ? 'Charging' : 'Optimal';
    } else {
      status = 'EXCELLENT';
      message = isCharging ? 'Charging' : 'Fully charged';
    }

    setStats(prev => ({
      minSoC: prev.minSoC ? Math.min(prev.minSoC, clampedSoC) : clampedSoC,
      maxSoC: Math.max(prev.maxSoC || 0, clampedSoC),
      isCharging,
      status,
      message
    }));
    if (isLoading) setIsLoading(false);
  }, [isLoading]);

  // Real-time data subscription
  useRealTimeData('aculv_fd_1', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields) return;
      const newTimestamp = fields.timestamp?.numberValue || Date.now();
      if (lastTimestampRef.current && newTimestamp <= lastTimestampRef.current) return;
      lastTimestampRef.current = newTimestamp;

      if (error) setError(null);
      const newCurrent = fields.cell_current?.numberValue !== undefined 
        ? Number(fields.cell_current.numberValue)
        : current;
      const newSoC = fields.state_of_charge?.numberValue !== undefined 
        ? Number(fields.state_of_charge.numberValue)
        : soc;

      if (newCurrent !== current) setCurrent(newCurrent);
      if (newSoC !== soc) {
        setSoC(newSoC);
        updateStats(newSoC, newCurrent);
      }
    } catch (err) {
      console.error('Error processing SoC data:', err);
      setError('Failed to process data');
    }
  });

  const statusColor = getSoCColor(soc, colors);

  return (
    <Box
      sx={{
        width: '100%',
        padding: 2,
        backgroundColor: colors.BACKGROUND,
        borderRadius: 1,
        boxShadow: theme.shadows[1]
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BatteryIcon soc={soc} isCharging={stats.isCharging} size={24} color={statusColor} />
          <Typography variant="h6" sx={{ color: statusColor }}>
            {Math.round(soc * 10) / 10}% - {stats.message}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SoCIndicator;
