import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useContext,
  useCallback,
  useMemo
} from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  useTheme,
  Tooltip,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import {
  Battery,
  BatteryWarning,
  TriangleAlert,
  Zap,
  ScanLine,
  Layers,
  Info,
  X
} from 'lucide-react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Constants (moved outside component to prevent recreation)
const ROWS = 8;
const COLS = 16;
const TOTAL_CELLS = ROWS * COLS;

// Thresholds used for color-coding and status determination
const VOLTAGE_THRESHOLDS = {
  CRITICAL: 2.8,
  WARNING: 3.2,
  NORMAL: 3.5,
  GOOD: 3.8
};

const HEALTH_THRESHOLDS = {
  EXCELLENT: 0.1,
  GOOD: 0.2,
  FAIR: 0.5,
  POOR: Infinity
};

// Utility functions (moved outside component to prevent recreation)
const getCellColor = (value, min, max, avg, isRelative, theme) => {
  if (value === 0) {
    return theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.3)'
      : 'rgba(0, 0, 0, 0.08)';
  }

  if (isRelative) {
    const percentDiff = ((value - avg) / avg) * 100;
    if (percentDiff <= -3) return alpha(theme.palette.error.main, 0.85);
    if (percentDiff < 0) return alpha(theme.palette.warning.main, 0.85);
    if (percentDiff < 3) return alpha(theme.palette.info.main, 0.85);
    return alpha(theme.palette.success.main, 0.85);
  } else {
    if (value < VOLTAGE_THRESHOLDS.CRITICAL) return alpha(theme.palette.error.main, 0.85);
    if (value < VOLTAGE_THRESHOLDS.WARNING) return alpha(theme.palette.warning.main, 0.85);
    if (value < VOLTAGE_THRESHOLDS.NORMAL) return alpha(theme.palette.info.main, 0.85);
    return alpha(theme.palette.success.main, 0.85);
  }
};

const getHealthText = (deltaV) => {
  if (deltaV > HEALTH_THRESHOLDS.FAIR) return 'Poor';
  if (deltaV > HEALTH_THRESHOLDS.GOOD) return 'Fair';
  if (deltaV > HEALTH_THRESHOLDS.EXCELLENT) return 'Good';
  return 'Excellent';
};

const calculateStats = (data) => {
  const { CRITICAL, WARNING } = VOLTAGE_THRESHOLDS;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  let belowThresholdCount = 0;
  let criticalCount = 0;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val > 0) {
      min = Math.min(min, val);
      max = Math.max(max, val);
      sum += val;
      sumSq += val * val;
      count++;

      if (val < WARNING) {
        belowThresholdCount++;
        if (val < CRITICAL) criticalCount++;
      }
    }
  }

  if (count === 0) {
    return {
      minVoltage: 0,
      maxVoltage: 0,
      avgVoltage: 0,
      stdDeviation: 0,
      belowThreshold: 0,
      criticalCount: 0
    };
  }

  const avg = sum / count;
  const variance = sumSq / count - avg * avg;
  const stdDev = variance > 0 ? Math.sqrt(variance) : 0;

  return {
    minVoltage: min,
    maxVoltage: max,
    avgVoltage: avg,
    stdDeviation: stdDev,
    belowThreshold: belowThresholdCount,
    criticalCount: criticalCount
  };
};

// Individual cell component - memoized for performance
const Cell = memo(
  ({ value, row, col, min, max, avg, isRelative, showOutliers, stdDev, onCellClick, isSelected }) => {
    const theme = useTheme();
    const color = getCellColor(value, min, max, avg, isRelative, theme);
    const isOutlier = showOutliers && value > 0 && Math.abs(value - avg) > 2 * stdDev;
    const percentDiff = value > 0 ? ((value - avg) / avg) * 100 : 0;

    const tooltipText = value > 0
      ? `Cell ${row * COLS + col + 1}: ${value.toFixed(3)}V (${percentDiff.toFixed(2)}% from avg)`
      : 'No data';

    const handleClick = useCallback(() => {
      if (value > 0 && onCellClick) {
        onCellClick({
          row,
          col,
          cellNumber: row * COLS + col + 1,
          value,
          percentDiff,
          isOutlier,
          color
        });
      }
    }, [value, row, col, percentDiff, isOutlier, color, onCellClick]);

    const handleKeyDown = useCallback(
      (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
          e.preventDefault();
        }
      },
      [handleClick]
    );

    return (
      <Tooltip title={tooltipText} arrow placement="top" enterDelay={200}>
        <Box
          role="button"
          tabIndex={value > 0 ? 0 : -1}
          aria-label={tooltipText}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            border: isSelected
              ? `2px solid ${theme.palette.primary.main}`
              : isOutlier
                ? `2px solid ${theme.palette.error.dark}`
                : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: theme.shape.borderRadius * 0.5,
            boxSizing: 'border-box',
            transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
            opacity: value > 0 ? 1 : 0.5,
            cursor: value > 0 ? 'pointer' : 'default',
            boxShadow: isSelected
              ? `0 0 8px ${theme.palette.primary.main}`
              : isOutlier
                ? `0 0 6px ${alpha(theme.palette.error.main, 0.4)}`
                : 'none',
            '&:hover': value > 0 && {
              opacity: 0.85,
              transform: 'scale(1.05)',
              zIndex: 1,
              boxShadow: `0 2px 8px ${alpha(color, 0.9)}`
            },
            '&:focus-visible': value > 0 && {
              outline: `2px solid ${theme.palette.primary.main}`,
              opacity: 0.85,
              transform: 'scale(1.05)',
              zIndex: 1
            }
          }}
        />
      </Tooltip>
    );
  },
  // Deep equality check to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.isRelative === nextProps.isRelative &&
      prevProps.showOutliers === nextProps.showOutliers &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.avg === nextProps.avg &&
      prevProps.stdDev === nextProps.stdDev
    );
  }
);

Cell.propTypes = {
  value: PropTypes.number.isRequired,
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  avg: PropTypes.number,
  isRelative: PropTypes.bool,
  showOutliers: PropTypes.bool,
  stdDev: PropTypes.number,
  onCellClick: PropTypes.func,
  isSelected: PropTypes.bool
};

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
          width: theme.spacing(1.5),
          height: theme.spacing(1.5),
          backgroundColor: color,
          display: 'inline-block',
          mr: theme.spacing(0.5),
          borderRadius: theme.shape.borderRadius * 0.25,
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
        }}
        aria-hidden="true"
      />
      {label}
    </Typography>
  );
});

LegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};

// Cell details panel
const CellDetailPanel = memo(({ cellInfo }) => {
  const theme = useTheme();

  if (!cellInfo) return null;

  const { cellNumber, row, col, value, percentDiff } = cellInfo;

  return (
    <Box
      sx={{
        p: theme.spacing(1),
        mb: theme.spacing(1),
        borderColor: theme.palette.divider,
        backgroundColor: alpha(theme.palette.background.default, 0.4),
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`
      }}
      role="region"
      aria-label={`Details for Cell ${cellNumber}`}
    >
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">
            Cell
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
            {cellNumber}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">
            Position
          </Typography>
          <Typography variant="body2" color="text.primary">
            R{row + 1}, C{col + 1}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">
            Voltage
          </Typography>
          <Typography
            variant="body2"
            color={value < VOLTAGE_THRESHOLDS.WARNING ? 'warning.main' : 'text.primary'}
            sx={{ fontWeight: value < VOLTAGE_THRESHOLDS.WARNING ? 600 : 500 }}
          >
            {value.toFixed(3)}V
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">
            Deviation
          </Typography>
          <Typography
            variant="body2"
            color={percentDiff < -2 ? 'error.main' : percentDiff > 2 ? 'success.main' : 'text.primary'}
            sx={{ fontWeight: Math.abs(percentDiff) > 2 ? 600 : 500 }}
          >
            {percentDiff.toFixed(2)}%
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
});

CellDetailPanel.propTypes = {
  cellInfo: PropTypes.shape({
    cellNumber: PropTypes.number,
    row: PropTypes.number,
    col: PropTypes.number,
    value: PropTypes.number,
    percentDiff: PropTypes.number,
    isOutlier: PropTypes.bool,
    color: PropTypes.string
  })
};

// Statistics summary component
const StatsSummary = memo(({ stats }) => {
  const theme = useTheme();
  const deltaV = stats.maxVoltage - stats.minVoltage;

  if (!stats.avgVoltage) return null;

  return (
    <Box
      sx={{
        py: theme.spacing(0.75),
        px: theme.spacing(1.5),
        mb: theme.spacing(1),
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.05),
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`
      }}
      role="region"
      aria-label="Battery cell statistics"
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, auto)' },
          gap: { xs: theme.spacing(1), sm: theme.spacing(2) },
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Voltage Range */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Voltage range across all cells" arrow placement="top">
            <Zap size={16} color={theme.palette.primary.main} aria-hidden="true" />
          </Tooltip>
          <Typography variant="body2" color="text.primary" sx={{ ml: theme.spacing(0.5), fontSize: '0.75rem' }}>
            {stats.minVoltage.toFixed(2)}-{stats.maxVoltage.toFixed(2)}V
          </Typography>
        </Box>

        {/* Average Voltage */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Average cell voltage" arrow placement="top">
            <ScanLine size={16} color={theme.palette.primary.main} aria-hidden="true" />
          </Tooltip>
          <Typography variant="body2" color="text.primary" sx={{ ml: theme.spacing(0.5), fontSize: '0.75rem' }}>
            {stats.avgVoltage.toFixed(3)}V
          </Typography>
        </Box>

        {/* Delta Voltage */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Voltage difference between highest and lowest cell" arrow placement="top">
            <TriangleAlert
              size={16}
              color={deltaV > HEALTH_THRESHOLDS.FAIR ? theme.palette.warning.main : theme.palette.success.main}
              aria-hidden="true"
            />
          </Tooltip>
          <Typography
            variant="body2"
            color={deltaV > HEALTH_THRESHOLDS.FAIR ? 'warning.main' : 'text.primary'}
            sx={{ ml: theme.spacing(0.5), fontSize: '0.75rem' }}
          >
            {deltaV.toFixed(3)}V
          </Typography>
        </Box>

        {/* Overall Health */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Overall battery cell balance health" arrow placement="top">
            <Battery
              size={16}
              color={deltaV > HEALTH_THRESHOLDS.FAIR ? theme.palette.warning.main : deltaV > HEALTH_THRESHOLDS.GOOD ? theme.palette.info.main : theme.palette.success.main}
              aria-hidden="true"
            />
          </Tooltip>
          <Typography
            variant="body2"
            color={deltaV > HEALTH_THRESHOLDS.FAIR ? 'warning.main' : deltaV > HEALTH_THRESHOLDS.GOOD ? 'info.main' : 'success.main'}
            sx={{ ml: theme.spacing(0.5), fontSize: '0.75rem' }}
          >
            {getHealthText(deltaV)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

StatsSummary.propTypes = {
  stats: PropTypes.shape({
    minVoltage: PropTypes.number.isRequired,
    maxVoltage: PropTypes.number.isRequired,
    avgVoltage: PropTypes.number.isRequired,
    stdDeviation: PropTypes.number.isRequired,
    belowThreshold: PropTypes.number.isRequired,
    criticalCount: PropTypes.number.isRequired
  }).isRequired
};

// Main component
const CellHeatmap = ({ className }) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Intersection Observer for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // State using individual hooks for better control and performance
  const [cellData, setCellData] = useState(new Array(TOTAL_CELLS).fill(0));
  const [selectedCell, setSelectedCell] = useState(null);
  const [showRelative, setShowRelative] = useState(false);
  const [showOutliers, setShowOutliers] = useState(true);
  
  // Refs for optimization
  const isComponentMounted = useRef(true);
  const lastTimestampRef = useRef(null);
  const statsRef = useRef(calculateStats(cellData));
  const cellDataRef = useRef(cellData);
  
  // Settings from context
  const updateInterval = settings?.dashboard?.updateInterval || 300;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  
  // Component lifecycle management
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    cellDataRef.current = cellData;
  }, [cellData]);

  // Calculate statistics from cellData - memoized for performance
  const stats = useMemo(() => {
    const calculatedStats = calculateStats(cellData);
    statsRef.current = calculatedStats; // Update stats ref
    return calculatedStats;
  }, [cellData]);

  // Arrange data into rows for grid rendering - memoized
  const arrangedData = useMemo(() => {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      rows.push(cellData.slice(r * COLS, r * COLS + COLS));
    }
    return rows;
  }, [cellData]);

  // Event handlers
  const handleCellClick = useCallback((cellInfo) => {
    setSelectedCell(prev => {
      // If same cell is clicked, deselect it
      if (prev && prev.row === cellInfo.row && prev.col === cellInfo.col) {
        return null;
      }
      return cellInfo;
    });
  }, []);

  const handleRelativeToggle = useCallback(() => {
    setShowRelative(prev => !prev);
  }, []);

  const handleOutliersToggle = useCallback(() => {
    setShowOutliers(prev => !prev);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
  }, []);

  const handleCloseDetailKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      clearSelection();
      e.preventDefault();
    }
  }, [clearSelection]);

  // Process incoming data with batched updates for performance
  const handleDataMessage = useCallback((msg) => {
    if (!inView || !isComponentMounted.current) return;

    try {
      const fields = msg.payload?.fields;
      if (!fields) return;

      // Get timestamp
      const newTimestamp = fields.timestamp?.numberValue || 0;
      if (lastTimestampRef.current === newTimestamp) return;
      lastTimestampRef.current = newTimestamp;

      // Parse new cell data
      const newData = new Array(TOTAL_CELLS).fill(0);
      let hasChanges = false;
      
      for (let i = 1; i <= TOTAL_CELLS; i++) {
        const field = fields[`cell${i}`];
        if (field) {
          const raw = field.stringValue ?? field.numberValue;
          const parsedValue = parseFloat(raw) || 0;
          newData[i - 1] = parsedValue;
          
          // Check if value differs significantly from current value
          const threshold = changeThreshold / 100;
          if (Math.abs(parsedValue - cellDataRef.current[i - 1]) > threshold) {
            hasChanges = true;
          }
        }
      }

      // Only update state if there were significant changes
      if (hasChanges && isComponentMounted.current) {
        setCellData(newData);
        
        // If a cell is selected, update its details
        if (selectedCell) {
          const cellIndex = selectedCell.row * COLS + selectedCell.col;
          const newValue = newData[cellIndex];
          
          if (newValue > 0) {
            // Calculate new percentage difference using latest stats
            const avgVoltage = statsRef.current.avgVoltage;
            const newPercentDiff = ((newValue - avgVoltage) / avgVoltage) * 100;
            
            setSelectedCell(prev => ({
              ...prev,
              value: newValue,
              percentDiff: newPercentDiff
            }));
          }
        }
      }
    } catch (err) {
      console.error('Error processing cell data:', err);
    }
  }, [inView, changeThreshold, selectedCell]);

  // Subscribe to real-time data
  const { ref: dataRef } = useRealTimeData(
    'cell',
    handleDataMessage,
    { customInterval: updateInterval }
  );

  // Combine refs
  const setRefs = useCallback((node) => {
    if (node) {
      inViewRef(node);
      if (dataRef && typeof dataRef === 'function') dataRef(node);
    }
  }, [inViewRef, dataRef]);

  // Legend - memoized to prevent recreation
  const renderLegend = useMemo(() => (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: theme.spacing(1), sm: theme.spacing(2) },
        justifyContent: 'center'
      }}
    >
      <Tooltip
        title={showRelative ? 'Cell voltage significantly below average' : 'Critical voltage level (<2.8V)'}
        arrow
        placement="top"
      >
        <Box component="span">
          <LegendItem
            color={theme.palette.error.main}
            label={showRelative ? 'Below avg' : 'Critical'}
          />
        </Box>
      </Tooltip>
      <Tooltip
        title={showRelative ? 'Cell voltage slightly below average' : 'Warning voltage level (<3.2V)'}
        arrow
        placement="top"
      >
        <Box component="span">
          <LegendItem
            color={theme.palette.warning.main}
            label={showRelative ? 'Slightly below' : 'Warning'}
          />
        </Box>
      </Tooltip>
      <Tooltip
        title={showRelative ? 'Cell voltage slightly above average' : 'Normal voltage level (<3.5V)'}
        arrow
        placement="top"
      >
        <Box component="span">
          <LegendItem
            color={theme.palette.info.main}
            label={showRelative ? 'Slightly above' : 'Normal'}
          />
        </Box>
      </Tooltip>
      <Tooltip
        title={showRelative ? 'Cell voltage significantly above average' : 'Good voltage level (≥3.5V)'}
        arrow
        placement="top"
      >
        <Box component="span">
          <LegendItem
            color={theme.palette.success.main}
            label={showRelative ? 'Above avg' : 'Good'}
          />
        </Box>
      </Tooltip>
    </Box>
  ), [theme, showRelative]);

  // Grid content - memoized to prevent recreation
  const renderGridContent = useMemo(() => {
    if (!inView) {
      return (
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: theme.palette.text.secondary
          }}
        >
          <Typography variant="body2">
            Loading...
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {/* Stats summary */}
        {stats.avgVoltage > 0 && <StatsSummary stats={stats} />}

        {/* Cell details panel */}
        {selectedCell && (
          <Box sx={{ position: 'relative' }}>
            <CellDetailPanel cellInfo={selectedCell} />
            <Tooltip title="Close details" arrow>
              <X
                size={14}
                onClick={clearSelection}
                onKeyDown={handleCloseDetailKeyDown}
                style={{
                  position: 'absolute',
                  top: theme.spacing(1),
                  right: theme.spacing(1),
                  cursor: 'pointer',
                  color: theme.palette.text.secondary
                }}
                role="button"
                tabIndex={0}
                aria-label="Close cell details"
              />
            </Tooltip>
          </Box>
        )}

        {/* Controls for display mode - IMPROVED TOGGLE BUTTONS */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: theme.spacing(0.75)
          }}
        >
          <Typography
            variant="subtitle2"
            color="text.primary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(0.5),
              fontSize: '0.8rem'
            }}
          >
            <Tooltip title="Grid visualization of all battery cells" arrow placement="top">
              <Layers size={16} color={theme.palette.text.secondary} aria-hidden="true" />
            </Tooltip>
            Grid
          </Typography>
          <Box sx={{ display: 'flex', gap: theme.spacing(3), alignItems: 'center' }}>
            {/* Relative mode toggle */}
            <Tooltip
              title="Toggle between relative (compared to average) and absolute voltage coloring"
              arrow
              placement="top"
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing(0.75),
                  borderRadius: theme.shape.borderRadius,
                  padding: theme.spacing(0.5, 1),
                  bgcolor: showRelative ? alpha(theme.palette.warning.main, 0.15) : 'transparent',
                  border: `1px solid ${showRelative ? theme.palette.warning.main : alpha(theme.palette.divider, 0.5)}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={handleRelativeToggle}
                role="checkbox"
                aria-checked={showRelative}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRelativeToggle();
                  }
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: showRelative ? 600 : 400,
                    color: showRelative ? theme.palette.warning.main : theme.palette.text.secondary
                  }}
                >
                  Relative
                </Typography>
                <Box
                  sx={{
                    width: theme.spacing(3.5),
                    height: theme.spacing(1.75),
                    borderRadius: theme.spacing(1),
                    bgcolor: showRelative ? theme.palette.warning.main : alpha(theme.palette.text.disabled, 0.3),
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      width: theme.spacing(1.5),
                      height: theme.spacing(1.5),
                      borderRadius: '50%',
                      top: '50%',
                      left: showRelative ? '60%' : '10%',
                      transform: 'translateY(-50%)',
                      bgcolor: theme.palette.common.white,
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
            
            {/* Outliers toggle */}
            <Tooltip
              title="Highlight cells that deviate significantly from the average (>2σ)"
              arrow
              placement="top"
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing(0.75),
                  borderRadius: theme.shape.borderRadius,
                  padding: theme.spacing(0.5, 1),
                  bgcolor: showOutliers ? alpha(theme.palette.error.main, 0.15) : 'transparent',
                  border: `1px solid ${showOutliers ? theme.palette.error.main : alpha(theme.palette.divider, 0.5)}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={handleOutliersToggle}
                role="checkbox"
                aria-checked={showOutliers}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOutliersToggle();
                  }
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: showOutliers ? 600 : 400,
                    color: showOutliers ? theme.palette.error.main : theme.palette.text.secondary
                  }}
                >
                  Outliers
                </Typography>
                <Box
                  sx={{
                    width: theme.spacing(3.5),
                    height: theme.spacing(1.75),
                    borderRadius: theme.spacing(1),
                    bgcolor: showOutliers ? theme.palette.error.main : alpha(theme.palette.text.disabled, 0.3),
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      width: theme.spacing(1.5),
                      height: theme.spacing(1.5),
                      borderRadius: '50%',
                      top: '50%',
                      left: showOutliers ? '60%' : '10%',
                      transform: 'translateY(-50%)',
                      bgcolor: theme.palette.common.white,
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* Grid visualization */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            position: 'relative',
            mb: theme.spacing(1),
          }}
          role="grid"
          aria-label="Battery Cell Grid"
        >
          {/* Header with column numbers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `${theme.spacing(3)} repeat(${COLS}, 1fr)`,
              mb: theme.spacing(0.5),
              fontSize: '0.7rem',
              color: theme.palette.text.secondary,
            }}
          >
            {/* Empty corner cell */}
            <Box />

            {/* Column headers */}
            {Array.from({ length: COLS }, (_, i) => (
              <Box
                key={`col-${i}`}
                sx={{ textAlign: 'center', fontWeight: 500, pl: theme.spacing(1.2) }}
                aria-hidden="true"
              >
                {i + 1}
              </Box>
            ))}
          </Box>

          {/* Main grid */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              width: '100%',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Grid using CSS Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                width: '100%',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                gap: theme.spacing(1.2),
              }}
            >
              {arrangedData.map((rowData, rowIndex) => (
                <Box
                  key={`row-${rowIndex}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${theme.spacing(3)} repeat(${COLS}, 1fr)`,
                    gap: theme.spacing(1.2),
                    minHeight: 0,
                  }}
                >
                  {/* Row label */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                    aria-hidden="true"
                  >
                    {rowIndex + 1}
                  </Box>

                  {/* Cells in row */}
                  {rowData.map((value, colIndex) => (
                    <Box
                      key={`cell-${rowIndex}-${colIndex}`}
                      sx={{
                        aspectRatio: '1/1',
                        width: '100%',
                        minWidth: 0,
                        minHeight: 0,
                      }}
                    >
                      <Cell
                        value={value}
                        row={rowIndex}
                        col={colIndex}
                        min={stats.minVoltage}
                        max={stats.maxVoltage}
                        avg={stats.avgVoltage}
                        isRelative={showRelative}
                        showOutliers={showOutliers}
                        stdDev={stats.stdDeviation}
                        onCellClick={handleCellClick}
                        isSelected={
                          selectedCell &&
                          selectedCell.row === rowIndex &&
                          selectedCell.col === colIndex
                        }
                      />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </>
    );
  }, [
    inView, stats, theme, arrangedData, showRelative, showOutliers, selectedCell,
    handleCellClick, clearSelection, handleRelativeToggle, handleOutliersToggle,
    handleCloseDetailKeyDown
  ]);

  return (
    <Card
      ref={setRefs}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: theme.custom?.shadows?.md || '0 2px 8px rgba(0,0,0,0.15)',
        transition: animationsEnabled ? 'box-shadow 0.3s ease' : 'none',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      className={className}
      role="region"
      aria-label="Battery Cell Heatmap"
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Battery size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              Cell Voltages
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          '& .MuiCardHeader-action': {
            m: 0
          }
        }}
      />
      <Divider />
      <CardContent
        sx={{
          flex: '1 1 auto',
          p: theme.spacing(1.5),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible'
        }}
      >
        {renderGridContent}
      </CardContent>
      <Divider />
      {/* Footer legend */}
      <Box
        sx={{
          p: theme.spacing(1.5),
          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.05)
        }}
        role="presentation"
        aria-label="Color Legend"
      >
        {renderLegend}
      </Box>
    </Card>
  );
};

CellHeatmap.propTypes = {
  className: PropTypes.string
};

export default memo(CellHeatmap);