import React, { useEffect, useRef, useState, memo, useMemo, useCallback, useContext } from 'react';
import { Box, Typography, Grid, Chip, FormControlLabel, Switch, useTheme, Alert, Tooltip, Skeleton, alpha, LinearProgress } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import { useDebounce } from 'use-debounce';
import useResizeObserver from 'use-resize-observer';
import { Battery, BatteryCharging, BatteryWarning, AlertTriangle, Zap, ScanLine, Layers, Info } from 'lucide-react';
import { throttle } from 'lodash-es';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Constants - moved to the top for better readability and potential tree-shaking
const ROWS = 8;
const COLS = 16;
const TOTAL_CELLS = ROWS * COLS;
const STALE_DATA_TIMEOUT = 10000; // 10 seconds

// Voltage thresholds for color coding
const VOLTAGE_THRESHOLDS = {
  CRITICAL: 2.8,
  WARNING: 3.2,
  NORMAL: 3.5,
  GOOD: 3.8,
};

// Health threshold values
const HEALTH_THRESHOLDS = {
  EXCELLENT: 0.1,
  GOOD: 0.2,
  FAIR: 0.5,
  POOR: Infinity
};

// Cell worker code as a string for better code organization
const WORKER_CODE = `
  // Inside worker, use the pure functions without React dependencies
  
  // Voltage thresholds needed in worker
  const VOLTAGE_THRESHOLDS = {
    CRITICAL: 2.8,
    WARNING: 3.2,
    NORMAL: 3.5,
    GOOD: 3.8,
  };
  
  // Calculate statistics from cell data
  function calculateStats(data) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;
    let belowThresholdCount = 0;
    let criticalCount = 0;
    
    // First pass: calculate min, max, sum, count
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val > 0) {
        min = Math.min(min, val);
        max = Math.max(max, val);
        sum += val;
        count++;
        
        if (val < VOLTAGE_THRESHOLDS.WARNING) {
          belowThresholdCount++;
          
          if (val < VOLTAGE_THRESHOLDS.CRITICAL) {
            criticalCount++;
          }
        }
      }
    }
    
    const avg = count > 0 ? sum / count : 0;
    
    // Second pass: calculate standard deviation
    let stdDev = 0;
    if (count > 0) {
      let sumSqDiff = 0;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        if (val > 0) {
          sumSqDiff += Math.pow(val - avg, 2);
        }
      }
      stdDev = Math.sqrt(sumSqDiff / count);
    }
    
    // Arrange data by rows for more efficient rendering
    const rows = [];
    for (let r = 0; r < ${ROWS}; r++) {
      const rowStart = r * ${COLS};
      const rowData = data.slice(rowStart, rowStart + ${COLS});
      rows.push(rowData);
    }
    
    return {
      minVoltage: min === Infinity ? 0 : min,
      maxVoltage: max === -Infinity ? 0 : max,
      avgVoltage: avg,
      stdDeviation: stdDev,
      belowThreshold: belowThresholdCount,
      criticalCount,
      arrangedData: rows
    };
  }
  
  // Listen for messages from the main thread
  self.onmessage = function(e) {
    if (e.data.type === 'calculate') {
      const result = calculateStats(e.data.cellData);
      self.postMessage({ type: 'stats', stats: result });
    }
  };
`;

// Cache for color values to avoid recalculating
const colorCache = new Map();

// Optimized utility functions - pulled out of render for better performance
const getCellColor = (value, min, max, avg, isRelative, theme) => {
  if (value === 0) return theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)';
  
  // Create a cache key based on input parameters
  const cacheKey = `${value.toFixed(3)}-${min.toFixed(3)}-${max.toFixed(3)}-${avg.toFixed(3)}-${isRelative}-${theme.palette.mode}`;
  
  // Check if we have already calculated this color
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }
  
  let color;
  
  if (isRelative) {
    // Percentage difference from average
    const percentDiff = ((value - avg) / avg) * 100;
    
    if (percentDiff <= -3) color = alpha(theme.palette.error.main, 0.85);
    else if (percentDiff < 0) color = alpha(theme.palette.warning.main, 0.85);
    else if (percentDiff < 3) color = alpha(theme.palette.info.main, 0.85);
    else color = alpha(theme.palette.success.main, 0.85);
  } else {
    // Absolute voltage values
    if (value < VOLTAGE_THRESHOLDS.CRITICAL) color = alpha(theme.palette.error.main, 0.85);
    else if (value < VOLTAGE_THRESHOLDS.WARNING) color = alpha(theme.palette.warning.main, 0.85);
    else if (value < VOLTAGE_THRESHOLDS.NORMAL) color = alpha(theme.palette.info.main, 0.85);
    else color = alpha(theme.palette.success.main, 0.85);
  }
  
  // Store in cache for future use
  colorCache.set(cacheKey, color);
  
  return color;
};

const getHealthText = (deltaV) => {
  if (deltaV > HEALTH_THRESHOLDS.FAIR) return 'Poor Balance';
  if (deltaV > HEALTH_THRESHOLDS.GOOD) return 'Fair Balance';
  if (deltaV > HEALTH_THRESHOLDS.EXCELLENT) return 'Good Balance';
  return 'Excellent Balance';
};

// Optimized Cell component with memo to prevent unnecessary re-renders
const Cell = memo(({ value, row, col, min, max, avg, isRelative, showOutliers, stdDev, onCellClick, isSelected }) => {
  const theme = useTheme();
  
  // Move calculation outside of the render for better performance
  const details = useMemo(() => {
    if (value <= 0) return { 
      color: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)',
      isOutlier: false,
      percentDiff: 0,
      tooltipText: 'No data'
    };
    
    const color = getCellColor(value, min, max, avg, isRelative, theme);
    const percentDiff = ((value - avg) / avg * 100);
    const isOutlier = showOutliers && Math.abs(value - avg) > (2 * stdDev);
    const tooltipText = `Cell ${row*COLS + col + 1}: ${value.toFixed(3)}V (${percentDiff.toFixed(2)}% from avg)`;
    
    return { color, isOutlier, percentDiff, tooltipText };
  }, [value, row, col, min, max, avg, isRelative, showOutliers, stdDev, theme]);
  
  const handleClick = useCallback(() => {
    if (value > 0 && onCellClick) {
      onCellClick({
        row,
        col,
        cellNumber: row*COLS + col + 1,
        value,
        percentDiff: details.percentDiff,
        isOutlier: details.isOutlier,
        color: details.color
      });
    }
  }, [value, row, col, onCellClick, details]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }, [handleClick]);
  
  // Early return for empty cells to avoid unnecessary processing
  if (value <= 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: details.color,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          borderRadius: 1,
          opacity: 0.5
        }}
      />
    );
  }
  
  return (
    <Tooltip 
      title={details.tooltipText} 
      arrow
      placement="top"
      enterDelay={200}
      leaveDelay={0}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-label={details.tooltipText}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: details.color,
          border: isSelected
            ? `2px solid ${theme.palette.primary.main}`
            : details.isOutlier 
              ? `2px solid ${theme.palette.error.dark}` 
              : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          borderRadius: 1,
          transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
          cursor: 'pointer',
          boxShadow: isSelected 
            ? `0 0 12px ${theme.palette.primary.main}` 
            : details.isOutlier
              ? `0 0 8px ${theme.palette.error.main}40`
              : 'none',
          '&:hover': {
            opacity: 0.85,
            transform: 'scale(1.05)',
            zIndex: 1,
            boxShadow: `0 2px 8px ${details.color}90`
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            opacity: 0.85,
            transform: 'scale(1.05)',
            zIndex: 1
          }
        }}
      />
    </Tooltip>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo to avoid unnecessary re-renders
  // Only re-render if these props change
  return prevProps.value === nextProps.value &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isRelative === nextProps.isRelative &&
    prevProps.showOutliers === nextProps.showOutliers &&
    (prevProps.value === 0 || (
      prevProps.min === nextProps.min &&
      prevProps.max === nextProps.max &&
      prevProps.avg === nextProps.avg &&
      prevProps.stdDev === nextProps.stdDev
    ));
});

// CellRow component for optimized rendering
const CellRow = memo(({ 
  rowIndex, 
  rowData, 
  min, 
  max, 
  avg, 
  isRelative, 
  showOutliers, 
  stdDev, 
  onCellClick,
  selectedCell
}) => {
  return (
    <Box 
      sx={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 0.5,
        mb: 0.5,
        position: 'relative'
      }}
    >
      {rowData.map((value, colIndex) => (
        <Box key={`cell-${rowIndex}-${colIndex}`} sx={{ aspectRatio: '1/1' }}>
          <Cell 
            value={value} 
            row={rowIndex} 
            col={colIndex} 
            min={min} 
            max={max} 
            avg={avg}
            isRelative={isRelative}
            showOutliers={showOutliers}
            stdDev={stdDev}
            onCellClick={onCellClick}
            isSelected={selectedCell && 
              selectedCell.row === rowIndex && 
              selectedCell.col === colIndex}
          />
        </Box>
      ))}
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          position: 'absolute',
          left: -16,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          textAlign: 'center',
          fontWeight: 'medium',
          fontSize: '0.7rem'
        }}
      >
        {rowIndex + 1}
      </Typography>
    </Box>
  );
});

// Legend item component
const LegendItem = memo(({ color, label }) => {
  const theme = useTheme();
  
  return (
    <Typography 
      variant="body2" 
      color="text.secondary" 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        fontSize: '0.75rem'
      }}
    >
      <Box 
        component="span" 
        sx={{ 
          width: 12, 
          height: 12, 
          backgroundColor: color, 
          display: 'inline-block', 
          mr: 0.5, 
          borderRadius: 0.5,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
        }} 
      />
      {label}
    </Typography>
  );
});

// Cell detail panel component
const CellDetailPanel = memo(({ cellInfo }) => {
  const theme = useTheme();
  
  if (!cellInfo) return null;
  
  const { cellNumber, row, col, value, percentDiff, isOutlier } = cellInfo;
  
  return (
    <Box 
      sx={{ 
        p: 1, 
        mb: 1,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        borderRadius: 1,
        boxShadow: isOutlier ? `0 0 10px ${theme.palette.error.main}40` : 'none',
        border: isOutlier ? `1px solid ${theme.palette.error.main}` : `1px solid ${theme.palette.divider}`
      }}
    >
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">Cell</Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
            {cellNumber}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">Position</Typography>
          <Typography variant="body2" color="text.primary">
            R{row + 1}, C{col + 1}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">Voltage</Typography>
          <Typography 
            variant="body2" 
            color={value < VOLTAGE_THRESHOLDS.WARNING 
              ? 'warning.main' 
              : 'text.primary'
            }
            sx={{ fontWeight: value < VOLTAGE_THRESHOLDS.WARNING ? 'bold' : 'medium' }}
          >
            {value.toFixed(3)}V
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">Deviation</Typography>
          <Typography 
            variant="body2" 
            color={percentDiff < -2 
              ? 'error.main' 
              : percentDiff > 2 
                ? 'success.main' 
                : 'text.primary'
            }
            sx={{ fontWeight: Math.abs(percentDiff) > 2 ? 'bold' : 'medium' }}
          >
            {percentDiff.toFixed(2)}%
          </Typography>
        </Grid>
        
        {isOutlier && (
          <Grid item xs={12}>
            <Alert 
              severity="warning" 
              variant="outlined" 
              icon={<AlertTriangle size={16} />}
              sx={{ 
                mt: 0.5, 
                py: 0.25, 
                '& .MuiAlert-message': { fontSize: '0.75rem' }
              }}
            >
              Outlier cell (deviation &gt; 2σ from avg)
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
});

// Health status data calculation
const getHealthStatus = (stats, theme) => {
  if (!stats) return {
    status: 'unknown',
    message: 'No data available',
    icon: <Info size={16} color={theme.palette.text.secondary} />,
    color: theme.palette.text.secondary
  };
  
  if (stats.criticalCount > 0) {
    return {
      status: 'critical',
      message: `${stats.criticalCount} cells critically low`,
      icon: <BatteryWarning size={16} color={theme.palette.error.main} />,
      color: theme.palette.error.main
    };
  }
  
  if (stats.belowThreshold > 0) {
    return {
      status: 'warning',
      message: `${stats.belowThreshold} cells below threshold`,
      icon: <BatteryWarning size={16} color={theme.palette.warning.main} />,
      color: theme.palette.warning.main
    };
  }
  
  const deltaV = stats.maxVoltage - stats.minVoltage;
  
  if (deltaV > HEALTH_THRESHOLDS.FAIR) {
    return {
      status: 'imbalanced',
      message: 'Cell imbalance detected',
      icon: <AlertTriangle size={16} color={theme.palette.warning.light} />,
      color: theme.palette.warning.light
    };
  }
  
  return {
    status: 'good',
    message: 'All cells balanced',
    icon: <BatteryCharging size={16} color={theme.palette.success.main} />,
    color: theme.palette.success.main
  };
};

// Stats summary component
const StatsSummary = memo(({ stats }) => {
  const theme = useTheme();
  
  if (!stats || !stats.avgVoltage) return null;
  
  const deltaV = stats.maxVoltage - stats.minVoltage;
  
  return (
    <Box 
      sx={{ 
        py: 0.75,
        px: 1.5,
        mb: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, mb: 0.5 }}>
        <Tooltip title="Voltage range across all cells" arrow placement="top">
          <Zap size={16} color={theme.palette.primary.main} />
        </Tooltip>
        <Typography variant="body2" color="text.primary" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Range: </Typography>
          {stats.minVoltage.toFixed(2)}-{stats.maxVoltage.toFixed(2)}V
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, mb: 0.5 }}>
        <Tooltip title="Average cell voltage" arrow placement="top">
          <ScanLine size={16} color={theme.palette.primary.main} />
        </Tooltip>
        <Typography variant="body2" color="text.primary" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Avg: </Typography>
          {stats.avgVoltage.toFixed(3)}V
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, mb: 0.5 }}>
        <Tooltip title="Voltage difference between highest and lowest cell" arrow placement="top">
          <AlertTriangle 
            size={16} 
            color={deltaV > HEALTH_THRESHOLDS.FAIR 
              ? theme.palette.warning.main 
              : theme.palette.success.main
            } 
          />
        </Tooltip>
        <Typography 
          variant="body2" 
          color={deltaV > HEALTH_THRESHOLDS.FAIR ? 'warning.main' : 'text.primary'} 
          sx={{ ml: 0.5, fontSize: '0.75rem' }}
        >
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Δ: </Typography>
          {deltaV.toFixed(3)}V
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Tooltip title="Overall battery cell balance health" arrow placement="top">
          <Battery 
            size={16} 
            color={deltaV > HEALTH_THRESHOLDS.FAIR 
              ? theme.palette.warning.main 
              : deltaV > HEALTH_THRESHOLDS.GOOD 
                ? theme.palette.info.main 
                : theme.palette.success.main
            } 
          />
        </Tooltip>
        <Typography 
          variant="body2" 
          color={deltaV > HEALTH_THRESHOLDS.FAIR 
            ? 'warning.main' 
            : deltaV > HEALTH_THRESHOLDS.GOOD 
              ? 'info.main' 
              : 'success.main'
          }
          sx={{ ml: 0.5, fontSize: '0.75rem' }}
        >
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Health: </Typography>
          {getHealthText(deltaV)}
        </Typography>
      </Box>
    </Box>
  );
});

// Main component
const CellHeatmap = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: containerRef } = useResizeObserver();
  
  // Get performance settings from context
  const lowResMode = settings?.global?.lowResolutionCharts || false;
  const updateInterval = settings?.realTime?.updateInterval || 150;
  const animationDuration = settings?.global?.animationDuration || 0;
  const enableTransitions = settings?.global?.enableTransitions !== false;
  
  // Refs
  const lastTimestampRef = useRef(null);
  const staleTimerRef = useRef(null);
  const statsWorkerRef = useRef(null);
  const workerUrlRef = useRef(null);
  const colorCacheRef = useRef(new Map());
  const pendingUpdateRef = useRef(null);
  
  // State
  const [cellData, setCellData] = useState(new Array(TOTAL_CELLS).fill(0));
  const [arrangedData, setArrangedData] = useState(Array(ROWS).fill().map(() => Array(COLS).fill(0)));
  const [stats, setStats] = useState({
    minVoltage: 0,
    maxVoltage: 0,
    avgVoltage: 0,
    stdDeviation: 0,
    belowThreshold: 0,
    criticalCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showRelative, setShowRelative] = useState(false);
  const [showOutliers, setShowOutliers] = useState(true);
  const [error, setError] = useState(null);
  const [dataStale, setDataStale] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  
  // Debounce the data for smoother updates - adjusted based on updateInterval
  const [debouncedStats] = useDebounce(stats, Math.min(updateInterval, 100));
  
  // Initialize Web Worker for stats calculation
  useEffect(() => {
    let worker = null;
    let workerUrl = null;
    
    // Create the worker only if window is defined (client-side)
    if (typeof window !== 'undefined') {
      try {
        // Create a Blob from the worker code string
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl);
        
        worker.onmessage = (e) => {
          if (e.data.type === 'stats') {
            const newStats = e.data.stats;
            setStats(prevStats => ({
              ...prevStats,
              minVoltage: newStats.minVoltage,
              maxVoltage: newStats.maxVoltage,
              avgVoltage: newStats.avgVoltage,
              stdDeviation: newStats.stdDeviation,
              belowThreshold: newStats.belowThreshold,
              criticalCount: newStats.criticalCount
            }));
            
            // Only update arranged data if it actually changed
            if (newStats.arrangedData) {
              setArrangedData(newStats.arrangedData);
            }
            
            // Update loading state once we have data
            if (isLoading && newStats.avgVoltage > 0) {
              setIsLoading(false);
            }
          }
        };
        
        // Store refs
        statsWorkerRef.current = worker;
        workerUrlRef.current = workerUrl;
      } catch (err) {
        console.error('Failed to create web worker:', err);
        setError('Failed to initialize calculation worker');
        // Fallback to main thread calculation will be handled in useEffect for cellData
      }
    }
    
    // Cleanup function
    return () => {
      if (worker) {
        worker.terminate();
      }
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, []);
  
  // Handle cell selection
  const handleCellClick = useCallback((cellInfo) => {
    setSelectedCell(cellInfo);
  }, []);
  
  // Clear color cache when theme or display mode changes
  useEffect(() => {
    colorCache.clear();
  }, [theme.palette.mode, showRelative]);
  
  // Throttled data processor to prevent too many updates
  const processDataUpdate = useMemo(() => throttle((newData) => {
    setCellData(newData);
    
    // If worker is available, use it for calculations
    if (statsWorkerRef.current) {
      statsWorkerRef.current.postMessage({
        type: 'calculate',
        cellData: newData
      });
    } else {
      // Fallback to main thread calculation - simple version
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let count = 0;
      let belowThreshold = 0;
      let criticalCount = 0;
      
      // Calculate basic stats
      for (let i = 0; i < newData.length; i++) {
        const val = newData[i];
        if (val > 0) {
          min = Math.min(min, val);
          max = Math.max(max, val);
          sum += val;
          count++;
          
          if (val < VOLTAGE_THRESHOLDS.WARNING) {
            belowThreshold++;
            if (val < VOLTAGE_THRESHOLDS.CRITICAL) {
              criticalCount++;
            }
          }
        }
      }
      
      const avg = count > 0 ? sum / count : 0;
      
      // Calculate stdDev
      let stdDev = 0;
      if (count > 0) {
        let sumSqDiff = 0;
        for (let i = 0; i < newData.length; i++) {
          const val = newData[i];
          if (val > 0) {
            sumSqDiff += Math.pow(val - avg, 2);
          }
        }
        stdDev = Math.sqrt(sumSqDiff / count);
      }
      
      // Create arranged data
      const rows = [];
      for (let r = 0; r < ROWS; r++) {
        const rowStart = r * COLS;
        const rowData = newData.slice(rowStart, rowStart + COLS);
        rows.push(rowData);
      }
      
      setStats({
        minVoltage: min === Infinity ? 0 : min,
        maxVoltage: max === -Infinity ? 0 : max,
        avgVoltage: avg,
        stdDeviation: stdDev,
        belowThreshold,
        criticalCount
      });
      
      setArrangedData(rows);
      
      // Update loading state once we have data
      if (isLoading && avg > 0) {
        setIsLoading(false);
      }
    }
    
    // Update selected cell if it exists
    if (selectedCell) {
      const cellIndex = selectedCell.row * COLS + selectedCell.col;
      const newValue = newData[cellIndex];
      if (newValue > 0) {
        // Calculate new percentDiff based on current stats
        const avgVoltage = stats.avgVoltage;
        if (avgVoltage > 0) {
          const percentDiff = ((newValue - avgVoltage) / avgVoltage * 100);
          setSelectedCell(prev => ({
            ...prev,
            value: newValue,
            percentDiff
          }));
        }
      }
    }
  }, updateInterval), [stats.avgVoltage, selectedCell, isLoading, updateInterval]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      
      if (pendingUpdateRef.current) {
        pendingUpdateRef.current.cancel();
      }
      
      colorCache.clear();
    };
  }, []);
  
  // Handle real-time data updates with optimized processing
  useRealTimeData('cell', (msg) => {
    try {
      const fields = msg.payload.fields;
      
      // Clear any previous errors
      if (error) setError(null);
      
      // Use strict "less than" so that updates with the same timestamp still go through
      const newTimestamp = fields.timestamp?.numberValue || 0;
      if (lastTimestampRef.current !== null && newTimestamp < lastTimestampRef.current) {
        return; // Skip if the new timestamp is older
      }
      
      lastTimestampRef.current = newTimestamp;
      
      // Update timestamp and reset stale timer
      setDataStale(false);
      
      // Clear existing stale timer and create new one
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      staleTimerRef.current = setTimeout(() => {
        setDataStale(true);
      }, STALE_DATA_TIMEOUT);
      
      // Parse cell data
      const newData = new Array(TOTAL_CELLS).fill(0);
      
      for (let i = 1; i <= TOTAL_CELLS; i++) {
        const field = fields[`cell${i}`];
        if (field) {
          const raw = field.stringValue ?? field.numberValue;
          const val = parseFloat(raw) || 0;
          newData[i - 1] = val;
        }
      }
      
      // Use the throttled processor to handle updates
      processDataUpdate(newData);
      
    } catch (error) {
      console.error('Error processing cell data:', error);
      setError('Failed to process cell data');
    }
  });
  
  // Memoize column headers to prevent re-rendering
  const columnHeaders = useMemo(() => {
    return (
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          fontSize: '0.7rem',
          color: theme.palette.text.secondary,
          mb: 0.25,
          ml: 0.5
        }}
      >
        {Array.from({ length: COLS }, (_, i) => (
          <Box key={`col-${i}`} sx={{ textAlign: 'center', fontWeight: 'medium' }}>
            {i+1}
          </Box>
        ))}
      </Box>
    );
  }, [theme.palette.text.secondary]);
  
  // Calculate health status based on cell stats
  const healthStatus = useMemo(() => 
    getHealthStatus(debouncedStats, theme), 
  [debouncedStats, theme]);
  
  // Generate loading skeleton for grid - memoized for performance
  const renderLoadingSkeleton = useMemo(() => {
    return (
      <Box sx={{ mb: 2 }}>
        {Array.from({ length: ROWS }).map((_, rowIndex) => (
          <Box 
            key={`skeleton-row-${rowIndex}`} 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 0.5,
              mb: 0.5
            }}
          >
            {Array.from({ length: COLS }).map((_, colIndex) => (
              <Box key={`skeleton-cell-${rowIndex}-${colIndex}`} sx={{ aspectRatio: '1/1' }}>
                <Skeleton 
                  variant="rectangular" 
                  width="100%" 
                  height="100%" 
                  animation="wave"
                  sx={{ 
                    borderRadius: 0.5,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.05)' 
                      : 'rgba(0,0,0,0.04)'
                  }}
                />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  }, [theme.palette.mode]);
  
  // Calculate dynamic transition properties based on settings
  const transitionProps = useMemo(() => {
    if (!enableTransitions || animationDuration === 0) {
      return { transition: 'none' };
    }
    
    const duration = lowResMode ? Math.min(animationDuration, 150) : animationDuration;
    return { transition: `all ${duration}ms ease-out` };
  }, [enableTransitions, animationDuration, lowResMode]);
  
  // Fixed cell grid - memoized for better performance
  const cellGrid = useMemo(() => {
    if (isLoading) return renderLoadingSkeleton;
    
    return (
      <Box>
        {arrangedData.map((rowData, rowIndex) => (
          <CellRow
            key={`row-${rowIndex}`}
            rowIndex={rowIndex}
            rowData={rowData}
            min={stats.minVoltage}
            max={stats.maxVoltage}
            avg={stats.avgVoltage}
            isRelative={showRelative}
            showOutliers={showOutliers}
            stdDev={stats.stdDeviation}
            onCellClick={handleCellClick}
            selectedCell={selectedCell}
          />
        ))}
      </Box>
    );
  }, [
    isLoading, 
    renderLoadingSkeleton, 
    arrangedData, 
    stats.minVoltage, 
    stats.maxVoltage, 
    stats.avgVoltage, 
    stats.stdDeviation, 
    showRelative, 
    showOutliers, 
    handleCellClick, 
    selectedCell
  ]);
  
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100%', 
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        boxShadow: 1,
        ...transitionProps
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 1.5, 
        py: 1, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Battery cell voltage monitoring" arrow placement="right">
            <Battery 
              size={18} 
              color={theme.palette.primary.main} 
            />
          </Tooltip>
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '1rem'
            }}
          >
            Battery Cell Voltages
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isLoading ? (
            <Chip 
              label="Waiting for data..." 
              color="primary" 
              size="small"
              icon={<Info size={14} />}
            />
          ) : dataStale ? (
            <Chip 
              label="Data may be stale" 
              color="warning" 
              size="small"
              icon={<AlertTriangle size={14} />}
            />
          ) : (
            <Chip 
              label={healthStatus.message}
              color={healthStatus.status === 'good' ? 'success' : 'warning'}
              size="small"
              icon={healthStatus.icon}
            />
          )}
        </Box>
      </Box>
      
      {/* Error message if any */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            m: 1, 
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.75rem' }
          }}
        >
          {error}
        </Alert>
      )}
      
      {/* Main content */}
      <Box sx={{ 
        flex: 1, 
        p: 1, 
        position: 'relative',
        overflowY: 'auto',
        "&::-webkit-scrollbar": {
          width: 6,
          height: 6,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.mode === 'dark' 
            ? "rgba(255,255,255,0.2)" 
            : "rgba(0,0,0,0.2)",
          borderRadius: 1,
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: theme.palette.mode === 'dark' 
            ? "rgba(0,0,0,0.2)" 
            : "rgba(0,0,0,0.05)",
          borderRadius: 1,
        },
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Stats summary */}
        {!isLoading && stats.avgVoltage > 0 && (
          <StatsSummary stats={stats} />
        )}
        
        {/* Selected cell details */}
        {selectedCell && (
          <CellDetailPanel cellInfo={selectedCell} />
        )}
        
        {/* Display mode toggles */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 0.75
        }}>
          <Typography 
            variant="subtitle2" 
            color="text.primary"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.8rem',
            }}
          >
            <Tooltip title="Grid visualization of all battery cells" arrow placement="top">
              <Layers size={16} color={theme.palette.text.secondary} />
            </Tooltip>
            Cell Grid
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Toggle between relative (compared to average) and absolute voltage coloring" arrow placement="top">
              <FormControlLabel
                control={
                  <Switch 
                    checked={showRelative} 
                    onChange={e => setShowRelative(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Relative
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Tooltip>
            <Tooltip title="Highlight cells that deviate significantly from the average (>2σ)" arrow placement="top">
              <FormControlLabel
                control={
                  <Switch 
                    checked={showOutliers} 
                    onChange={e => setShowOutliers(e.target.checked)}
                    size="small"
                    color="secondary"
                  />
                }
                label={
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Outliers
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Tooltip>
          </Box>
        </Box>
        
        {/* Grid visualization */}
        <Box sx={{ position: 'relative', pl: 2 }}>
          {columnHeaders}
          {cellGrid}
        </Box>
        
        {/* Loading overlay */}
        {isLoading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(0,0,0,0.7)' 
              : 'rgba(255,255,255,0.7)',
            zIndex: 10,
            backdropFilter: 'blur(2px)'
          }}>
            <Typography 
              variant="h6" 
              color="text.primary"
              sx={{ mb: 2 }}
            >
              Waiting for cell data...
            </Typography>
            <LinearProgress 
              color="primary" 
              sx={{ width: '200px', borderRadius: 1 }}
            />
          </Box>
        )}
      </Box>
      
      {/* Footer with color legend */}
      <Box sx={{ 
        px: 1.5, 
        py: 0.75, 
        borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          <Tooltip title={showRelative ? "Cell voltage significantly below average" : "Critical voltage level (<2.8V)"} arrow placement="top">
            <Box component="span">
              <LegendItem 
                color={theme.palette.error.main} 
                label={showRelative ? 'Below avg' : 'Critical'}
              />
            </Box>
          </Tooltip>
          <Tooltip title={showRelative ? "Cell voltage slightly below average" : "Warning voltage level (<3.2V)"} arrow placement="top">
            <Box component="span">
              <LegendItem 
                color={theme.palette.warning.main} 
                label={showRelative ? 'Slightly below' : 'Warning'}
              />
            </Box>
          </Tooltip>
          <Tooltip title={showRelative ? "Cell voltage slightly above average" : "Normal voltage level (<3.5V)"} arrow placement="top">
            <Box component="span">
              <LegendItem 
                color={theme.palette.info.main} 
                label={showRelative ? 'Slightly above' : 'Normal'}
              />
            </Box>
          </Tooltip>
          <Tooltip title={showRelative ? "Cell voltage significantly above average" : "Good voltage level (≥3.5V)"} arrow placement="top">
            <Box component="span">
              <LegendItem 
                color={theme.palette.success.main} 
                label={showRelative ? 'Above avg' : 'Good'}
              />
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(CellHeatmap);