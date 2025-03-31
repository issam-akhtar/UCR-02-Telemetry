import React, { useMemo, memo } from 'react';

// Theme colors from minimalRedWhiteGoldTheme
const THEME = {
  primary: {
    main: '#B22222',
    light: '#D42C2C',
    dark: '#8B1A1A',
  },
  secondary: {
    main: '#FFD700',
    light: '#FFDF33',
    dark: '#CCAC00',
  },
  background: {
    default: '#121212',
    paper: '#1E1E1E',
    subtle: '#2A2A2A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#FFD700',
  },
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFC107',
  divider: 'rgba(255, 255, 255, 0.12)',
};

// Helper function to get voltage status color
function getStatusColor(voltage) {
  if (!voltage || voltage <= 0.01) return "#555555";  // Gray
  if (voltage >= 2.5 && voltage <= 2.7) return THEME.error;  // Red
  if (voltage > 2.7 && voltage <= 3.1) return THEME.warning;  // Orange
  if (voltage > 3.1 && voltage <= 3.4) return THEME.warning;  // Yellow
  if (voltage > 3.4 && voltage <= 3.8) return THEME.primary.main;  // Primary
  if (voltage > 3.8 && voltage <= 4.0) return THEME.primary.light;  // Light primary
  if (voltage > 4.0) return THEME.primary.dark;  // Dark primary
  return "#555555";  // Gray
}

// Helper function to calculate voltage distribution
function calculateVoltageDistribution(cellVoltages) {
  const distribution = {
    critical: 0,
    warning: 0,
    caution: 0,
    normal: 0,
    highNormal: 0,
    overVoltage: 0,
    unknown: 0
  };
  
  Object.values(cellVoltages).forEach(voltage => {
    if (!voltage || voltage <= 0.01) distribution.unknown++;
    else if (voltage >= 2.5 && voltage <= 2.7) distribution.critical++;
    else if (voltage > 2.7 && voltage <= 3.1) distribution.warning++;
    else if (voltage > 3.1 && voltage <= 3.4) distribution.caution++;
    else if (voltage > 3.4 && voltage <= 3.8) distribution.normal++;
    else if (voltage > 3.8 && voltage <= 4.0) distribution.highNormal++;
    else if (voltage > 4.0) distribution.overVoltage++;
    else distribution.unknown++;
  });
  
  return distribution;
}

// Memoized health status bar for better performance
const HealthStatus = memo(({ status, count, color, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "3px",
        fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ 
            width: "10px", 
            height: "10px", 
            borderRadius: "2px",
            background: color,
            marginRight: "6px"
          }}></div>
          <span>{status}</span>
        </div>
        <div>
          <span style={{ fontWeight: "bold" }}>{count}</span>
          <span style={{ opacity: 0.7, marginLeft: "4px" }}>({percentage.toFixed(1)}%)</span>
        </div>
      </div>
      <div style={{ 
        height: "4px", 
        background: "rgba(255,255,255,0.1)", 
        borderRadius: "2px",
        overflow: "hidden" 
      }}>
        <div style={{ 
          height: "100%", 
          width: `${percentage}%`, 
          background: color,
          borderRadius: "2px",
          transition: "width 0.5s ease"
        }}></div>
      </div>
    </div>
  );
});

// Memoized metrics card for better performance
const MetricsCard = memo(({ title, value, unit, description, color = THEME.primary.main }) => (
  <div style={{
    background: THEME.background.subtle,
    borderRadius: "8px",
    padding: "12px",
    flex: 1,
    margin: "0 6px",
    border: `1px solid ${color}40`,
  }}>
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between",
      marginBottom: "8px" 
    }}>
      <div style={{ fontSize: "12px", opacity: 0.8 }}>{title}</div>
    </div>
    
    <div style={{ 
      fontSize: "20px", 
      fontWeight: "bold",
      color
    }}>
      {value}
      {unit && <span style={{ fontSize: "14px", marginLeft: "4px", opacity: 0.8 }}>{unit}</span>}
    </div>
    
    {description && (
      <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
        {description}
      </div>
    )}
  </div>
));

// Main SegmentHealthSummary component with performance optimizations
const SegmentHealthSummary = memo(({ activeSegmentName, statistics, cellVoltages }) => {
  // Calculate metrics for the active segment - memoized
  const { 
    voltageDistribution,
    minVoltage,
    maxVoltage,
    avgVoltage,
    voltageRange,
    healthScore,
    problemCells
  } = useMemo(() => {
    const distribution = calculateVoltageDistribution(cellVoltages);
    
    // Calculate min, max, avg voltages
    const voltages = Object.values(cellVoltages).filter(v => v > 0.01);
    const min = voltages.length ? Math.min(...voltages) : 0;
    const max = voltages.length ? Math.max(...voltages) : 0;
    const avg = voltages.length ? voltages.reduce((sum, v) => sum + v, 0) / voltages.length : 0;
    const range = max - min;
    
    // Calculate health score (0-100)
    const normalCells = distribution.normal + distribution.highNormal;
    const totalCells = Object.keys(cellVoltages).length;
    const healthPct = totalCells > 0 ? (normalCells / totalCells) * 100 : 0;
    
    // Apply penalty for critical and warning cells
    const criticalPenalty = distribution.critical * 5;
    const warningPenalty = distribution.warning * 2;
    const score = Math.max(0, Math.min(100, healthPct - criticalPenalty - warningPenalty));
    
    // Find cells with problems
    const problems = Object.entries(cellVoltages)
      .filter(([_, voltage]) => voltage < 3.1 && voltage > 0.01)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 5); // Get 5 most problematic cells
    
    return {
      voltageDistribution: distribution,
      minVoltage: min,
      maxVoltage: max,
      avgVoltage: avg,
      voltageRange: range,
      healthScore: score,
      problemCells: problems
    };
  }, [cellVoltages]);
  
  // Get health status color
  const healthScoreColor = healthScore >= 90 
    ? THEME.success
    : healthScore >= 70 
      ? THEME.primary.main
      : healthScore >= 50 
        ? THEME.warning
        : THEME.error;
  
  const totalCells = Object.keys(cellVoltages).length;
  
  // If no data, show a loading state
  if (!statistics || !Object.keys(statistics).length) {
    return (
      <div
        style={{
          position: "absolute",
          left: "10px",
          top: "80px",
          background: THEME.background.paper,
          borderRadius: "8px",
          padding: "16px",
          color: THEME.text.primary,
          width: "280px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${THEME.divider}`,
          zIndex: 30,
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "15px", opacity: 0.8 }}>Loading battery data...</div>
      </div>
    );
  }
  
  return (
    <div style={{
      position: "absolute",
      left: "10px",
      top: "80px",
      background: THEME.background.paper,
      borderRadius: "8px",
      padding: "16px",
      color: THEME.text.primary,
      width: "280px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      border: `1px solid ${THEME.divider}`,
      zIndex: 30
    }}>
      <div style={{ 
        fontWeight: "bold", 
        fontSize: "16px", 
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `1px solid ${THEME.divider}`,
        paddingBottom: "8px"
      }}>
        <span>{activeSegmentName || "Battery"} Health</span>
        <div style={{ 
          fontSize: "12px", 
          padding: "4px 8px", 
          borderRadius: "16px",
          background: healthScoreColor,
          color: "#FFFFFF",
        }}>
          {healthScore.toFixed(0)}%
        </div>
      </div>
      
      {/* Metrics row */}
      <div style={{ 
        display: "flex", 
        marginBottom: "16px"
      }}>
        <MetricsCard 
          title="Min Voltage"
          value={minVoltage.toFixed(2)}
          unit="V"
          color={getStatusColor(minVoltage)}
        />
        
        <MetricsCard 
          title="Avg Voltage"
          value={avgVoltage.toFixed(2)}
          unit="V"
          color={getStatusColor(avgVoltage)}
        />
        
        <MetricsCard 
          title="Max Voltage"
          value={maxVoltage.toFixed(2)}
          unit="V"
          color={getStatusColor(maxVoltage)}
        />
      </div>
      
      {/* Voltage Range row */}
      <div style={{ 
        display: "flex", 
        marginBottom: "16px" 
      }}>
        <MetricsCard 
          title="Voltage Range"
          value={voltageRange.toFixed(2)}
          unit="V"
          description={voltageRange > 0.3 ? "High variance detected" : "Good balance"}
          color={voltageRange > 0.3 ? THEME.warning : THEME.success}
        />
        
        <MetricsCard 
          title="Cell Count"
          value={totalCells}
          description={`${statistics?.healthy || 0} healthy cells`}
          color={THEME.secondary.main}
        />
      </div>
      
      <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: "bold" }}>
        Voltage Distribution
      </div>
      
      <HealthStatus 
        status="Normal"
        count={voltageDistribution.normal}
        color={THEME.primary.main}
        total={totalCells}
      />
      
      <HealthStatus 
        status="High Normal"
        count={voltageDistribution.highNormal}
        color={THEME.primary.light}
        total={totalCells}
      />
      
      <HealthStatus 
        status="Caution"
        count={voltageDistribution.caution}
        color={THEME.warning}
        total={totalCells}
      />
      
      <HealthStatus 
        status="Warning"
        count={voltageDistribution.warning}
        color={THEME.warning}
        total={totalCells}
      />
      
      <HealthStatus 
        status="Critical"
        count={voltageDistribution.critical}
        color={THEME.error}
        total={totalCells}
      />
      
      {voltageDistribution.overVoltage > 0 && (
        <HealthStatus 
          status="Over Voltage"
          count={voltageDistribution.overVoltage}
          color={THEME.primary.dark}
          total={totalCells}
        />
      )}
      
      {/* Problem cells section */}
      {problemCells.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ 
            fontSize: "13px", 
            fontWeight: "bold", 
            marginBottom: "8px",
            paddingTop: "8px",
            borderTop: `1px solid ${THEME.divider}`
          }}>
            Problem Cells
          </div>
          
          {problemCells.map(([cellName, voltage]) => (
            <div 
              key={cellName}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                marginBottom: "6px",
                background: THEME.background.subtle,
                borderRadius: "6px",
                border: `1px solid ${voltage <= 2.7 ? THEME.error : THEME.warning}40`,
              }}
            >
              <span>{cellName}</span>
              <span style={{ 
                fontWeight: "bold",
                color: voltage <= 2.7 ? THEME.error : THEME.warning
              }}>
                {voltage.toFixed(2)}V
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default SegmentHealthSummary;