import React, {
  useEffect,
  useRef,
  useState,
  memo,
  useMemo,
  useCallback,
  useContext
} from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  useTheme,
  Tooltip,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import {
  Battery,
  BatteryCharging,
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

// Constants for grid dimensions and thresholds for maintainability
const ROWS = 8;
const COLS = 16;
const TOTAL_CELLS = ROWS * COLS;
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

/**
 * Returns a CSS color based on the cell value and display mode.
 */
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
    const { CRITICAL, WARNING, NORMAL } = VOLTAGE_THRESHOLDS;
    if (value < CRITICAL) return alpha(theme.palette.error.main, 0.85);
    if (value < WARNING) return alpha(theme.palette.warning.main, 0.85);
    if (value < NORMAL) return alpha(theme.palette.info.main, 0.85);
    return alpha(theme.palette.success.main, 0.85);
  }
};

/**
 * Provides a text description for cell health based on voltage difference.
 */
const getHealthText = (deltaV) => {
  if (deltaV > HEALTH_THRESHOLDS.FAIR) return 'Poor';
  if (deltaV > HEALTH_THRESHOLDS.GOOD) return 'Fair';
  if (deltaV > HEALTH_THRESHOLDS.EXCELLENT) return 'Good';
  return 'Excellent';
};

/**
 * Efficiently calculates statistics for cell data.
 */
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

/**
 * Individual cell component - memoized to prevent unnecessary re-renders
 */
const Cell = memo(
  ({
    value,
    row,
    col,
    min,
    max,
    avg,
    isRelative,
    showOutliers,
    stdDev,
    onCellClick,
    isSelected
  }) => {
    const theme = useTheme();
    const color = getCellColor(value, min, max, avg, isRelative, theme);
    const isOutlier =
      showOutliers && value > 0 && Math.abs(value - avg) > 2 * stdDev;
    const percentDiff = value > 0 ? ((value - avg) / avg) * 100 : 0;

    // Tooltip text provides clear, concise information.
    const tooltipText = value > 0
      ? `Cell ${row * COLS + col + 1}: ${value.toFixed(3)}V (${percentDiff.toFixed(2)}% from avg)`
      : 'No data';

    // Memoized click handler to prevent re-creation on every render.
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

    // Enables keyboard navigation (Enter/Space to trigger click).
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
      <Tooltip title={tooltipText} arrow placement="top" enterDelay={200} leaveDelay={0}>
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
              ? `${theme.custom?.borderWidth?.medium || 2}px solid ${theme.palette.primary.main}`
              : isOutlier
                ? `${theme.custom?.borderWidth?.medium || 2}px solid ${theme.palette.error.dark}`
                : `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.05)'}`,
            borderRadius: theme.shape.borderRadius * 0.5,
            boxSizing: 'border-box', // Ensure borders are included in dimensions
            transition: theme.transitions.create(['transform', 'opacity', 'box-shadow'], {
              duration: theme.transitions.duration.shorter
            }),
            opacity: value > 0 ? 1 : 0.5,
            cursor: value > 0 ? 'pointer' : 'default',
            boxShadow: isSelected
              ? `0 0 ${theme.spacing(1.5)} ${theme.palette.primary.main}`
              : isOutlier
                ? `0 0 ${theme.spacing(1)} ${alpha(theme.palette.error.main, 0.4)}`
                : 'none',
            '&:hover': value > 0 && {
              opacity: 0.85,
              transform: 'scale(1.05)',
              zIndex: 1,
              boxShadow: `0 2px 8px ${alpha(color, 0.9)}`
            },
            '&:focus-visible': value > 0 && {
              outline: `${theme.custom?.borderWidth?.medium || 2}px solid ${theme.palette.primary.main}`,
              opacity: 0.85,
              transform: 'scale(1.05)',
              zIndex: 1
            },
            transform: 'translateZ(0)' // GPU acceleration for smoother transitions
          }}
        />
      </Tooltip>
    );
  },
  // Custom comparison function for deep prop comparison to avoid unnecessary rerenders
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

/**
 * Legend item component that shows a color box with a label.
 */
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
          border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.1)'}`
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

/**
 * Displays details for a selected cell.
 */
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
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.default, 0.6)
            : alpha(theme.palette.background.default, 0.3),
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.custom?.shadows?.subtle || 'none',
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`
      }}
      role="region"
      aria-label={`Details for Cell ${cellNumber}`}
    >
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <Typography variant="caption" color="text.secondary">
            Cell
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: theme.typography.fontWeightMedium }}>
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
            sx={{ fontWeight: value < VOLTAGE_THRESHOLDS.WARNING ? theme.typography.fontWeightBold : theme.typography.fontWeightMedium }}
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
            sx={{ fontWeight: Math.abs(percentDiff) > 2 ? theme.typography.fontWeightBold : theme.typography.fontWeightMedium }}
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

/**
 * Displays summary statistics for the cell data.
 */
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
        backgroundColor: alpha(
          theme.palette.background.paper,
          theme.palette.mode === 'dark' ? 0.2 : 0.05
        ),
        borderRadius: theme.shape.borderRadius,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`
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

/**
 * Main component that visualizes the battery cell heatmap.
 * Optimized for React-Grid-Layout integration and responsive design.
 */
const CellHeatmap = ({ className }) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: containerRef, width, height } = useResizeObserver();
  const lastTimestampRef = useRef(null);
  const [cellData, setCellData] = useState(new Array(TOTAL_CELLS).fill(0));
  const [selectedCell, setSelectedCell] = useState(null);
  const [showRelative, setShowRelative] = useState(false);
  const [showOutliers, setShowOutliers] = useState(true);

  // Intersection Observer for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Hardware acceleration setting
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Animations setting
  const animationsEnabled = settings?.global?.enableTransitions !== false;

  // Arrange cellData into rows for grid rendering.
  const arrangedData = useMemo(() => {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      rows.push(cellData.slice(r * COLS, r * COLS + COLS));
    }
    return rows;
  }, [cellData]);

  // Compute statistics from cellData.
  const stats = useMemo(() => calculateStats(cellData), [cellData]);

  const handleCellClick = useCallback((cellInfo) => {
    // Toggle selection: deselect if the same cell is clicked.
    setSelectedCell((prev) => (prev && prev.row === cellInfo.row && prev.col === cellInfo.col ? null : cellInfo));
  }, []);

  const handleRelativeToggle = useCallback((e) => {
    setShowRelative(e.target.checked);
  }, []);

  const handleOutliersToggle = useCallback((e) => {
    setShowOutliers(e.target.checked);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
  }, []);

  // Real-time data updates using visibility detection.
  const { ref: visibilityRef } = useRealTimeData(
    'cell',
    (msg) => {
      // Skip updates if component is not in view
      if (!inView) return;

      try {
        const fields = msg.payload?.fields;
        if (!fields) return;

        const newTimestamp = fields.timestamp?.numberValue || 0;
        lastTimestampRef.current = newTimestamp;

        // Parse new cell data.
        const newData = new Array(TOTAL_CELLS).fill(0);
        for (let i = 1; i <= TOTAL_CELLS; i++) {
          const field = fields[`cell${i}`];
          if (field) {
            const raw = field.stringValue ?? field.numberValue;
            newData[i - 1] = parseFloat(raw) || 0;
          }
        }

        // Update state only if significant changes are detected.
        setCellData((prevData) => {
          let shouldUpdate = false;
          for (let i = 0; i < TOTAL_CELLS; i++) {
            const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
            if (Math.abs(newData[i] - prevData[i]) > changeThreshold / 100) {
              shouldUpdate = true;
              break;
            }
          }
          return shouldUpdate ? newData : prevData;
        });

        // If a cell is selected, update its details.
        if (selectedCell) {
          const cellIndex = selectedCell.row * COLS + selectedCell.col;
          const newValue = newData[cellIndex];
          if (newValue > 0) {
            const avgFromStats = stats.avgVoltage;
            setSelectedCell(prev => ({
              ...prev,
              value: newValue,
              percentDiff: ((newValue - avgFromStats) / avgFromStats) * 100
            }));
          }
        }
      } catch (err) {
        console.error('Error processing cell data:', err);
      }
    },
    {
      // Use settings from context for update interval
      customInterval: settings?.dashboard?.updateInterval,
      threshold: 0.1 // Update only when the component is in view
    }
  );

  // Combine refs
  const setRefs = useCallback(
    (node) => {
      if (containerRef) containerRef(node);
      if (visibilityRef) visibilityRef(node);
      if (inViewRef) inViewRef(node);
    },
    [containerRef, visibilityRef, inViewRef]
  );

  // Handler for closing the cell detail panel via keyboard.
  const handleCloseDetailKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      clearSelection();
      e.preventDefault();
    }
  }, [clearSelection]);

  return (
    <Card
      ref={setRefs}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: theme.custom?.shadows?.medium || theme.shadows[3],
        '&:hover': {
          boxShadow: theme.custom?.shadows?.strong || theme.shadows[5]
        },
        transition: theme.transitions.create(['box-shadow'], {
          duration: theme.transitions.duration.short
        }),
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
              color="text.primary"
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
            m: 0,
            alignSelf: 'center'
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
          overflow: 'visible' // Allow all content to be visible
        }}
      >
        {!inView ? (
          // Simple loading message when not in view
          <Box 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              textAlign: 'center',
              color: theme.palette.text.secondary
            }}
          >
            <Typography variant="body2">
              Loading...
            </Typography>
          </Box>
        ) : (
          <>
            {stats.avgVoltage > 0 && <StatsSummary stats={stats} />}

            {/* Display cell details with close button */}
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

            {/* Toggle controls for display mode */}
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
              <Box sx={{ display: 'flex', gap: theme.spacing(2), alignItems: 'center' }}>
                <Tooltip
                  title="Toggle between relative (compared to average) and absolute voltage coloring"
                  arrow
                  placement="top"
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showRelative}
                        onChange={handleRelativeToggle}
                        size="small"
                        sx={{
                          width: 44,
                          height: 24,
                          padding: 0,
                          '& .MuiSwitch-switchBase': {
                            padding: 0,
                            margin: '2px',
                            transitionDuration: '300ms',
                            '&.Mui-checked': {
                              transform: 'translateX(20px)',
                              color: '#fff',
                              '& + .MuiSwitch-track': {
                                backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.5) : theme.palette.primary.main,
                                opacity: 1,
                                border: 0,
                              },
                            },
                          },
                          '& .MuiSwitch-thumb': {
                            boxSizing: 'border-box',
                            width: 20,
                            height: 20,
                            backgroundColor: '#fff',
                          },
                          '& .MuiSwitch-track': {
                            borderRadius: 26 / 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
                            opacity: 1,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary'} sx={{ fontSize: '0.85rem' }}>
                        Relative
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Tooltip>
                <Tooltip
                  title="Highlight cells that deviate significantly from the average (>2σ)"
                  arrow
                  placement="top"
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showOutliers}
                        onChange={handleOutliersToggle}
                        size="small"
                        sx={{
                          width: 44,
                          height: 24,
                          padding: 0,
                          '& .MuiSwitch-switchBase': {
                            padding: 0,
                            margin: '2px',
                            transitionDuration: '300ms',
                            '&.Mui-checked': {
                              transform: 'translateX(20px)',
                              color: '#fff',
                              '& + .MuiSwitch-track': {
                                backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.5) : theme.palette.secondary.main,
                                opacity: 1,
                                border: 0,
                              },
                            },
                          },
                          '& .MuiSwitch-thumb': {
                            boxSizing: 'border-box',
                            width: 20,
                            height: 20,
                            backgroundColor: '#fff',
                          },
                          '& .MuiSwitch-track': {
                            borderRadius: 26 / 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
                            opacity: 1,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary'} sx={{ fontSize: '0.85rem' }}>
                        Outliers
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Tooltip>
              </Box>
            </Box>

            {/* Grid visualization with CSS Grid */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                position: 'relative',
                overflow: 'visible',
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
                {/* Empty cell for top-left corner */}
                <Box />

                {/* Column headers */}
                {Array.from({ length: COLS }, (_, i) => (
                  <Box
                    key={`col-${i}`}
                    sx={{
                      textAlign: 'center',
                      fontWeight: theme.typography.fontWeightMedium,
                      pl: theme.spacing(1.2),
                    }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </Box>
                ))}
              </Box>

              {/* Main grid container */}
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
                {/* Grid with cells using CSS Grid */}
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
                          fontWeight: theme.typography.fontWeightMedium,
                        }}
                        aria-hidden="true"
                      >
                        {rowIndex + 1}
                      </Box>

                      {/* Cells in the row */}
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
        )}
      </CardContent>
      <Divider />
      {/* Footer legend for color coding */}
      <Box
        sx={{
          p: theme.spacing(1.5),
          borderTop: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
          backgroundColor: alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.2 : 0.05
          )
        }}
        role="presentation"
        aria-label="Color Legend"
      >
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
      </Box>
    </Card>
  );
};

CellHeatmap.propTypes = {
  className: PropTypes.string
};

export default memo(CellHeatmap);