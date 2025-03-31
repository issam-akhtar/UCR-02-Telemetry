import React, { memo } from 'react';

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

// Segment button component for better performance
const SegmentButton = memo(({ segment, isActive, onClick, statistics }) => {
  const hasWarnings = statistics?.warnings > 0;
  const hasCritical = statistics?.critical > 0;
  const healthPercentage = statistics?.total ? (statistics.healthy / statistics.total) * 100 : 0;
  
  return (
    <div
      onClick={() => onClick(segment.id)}
      style={{
        padding: "8px 12px",
        marginBottom: "6px",
        background: isActive ? THEME.background.subtle : THEME.background.paper,
        color: THEME.text.primary,
        borderRadius: "6px",
        border: `1px solid ${
          isActive 
            ? THEME.primary.main 
            : hasCritical 
              ? THEME.error 
              : hasWarnings 
                ? THEME.warning 
                : THEME.divider
        }`,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isActive ? `0 0 8px ${THEME.primary.dark}40` : "none",
      }}
    >
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "4px" 
      }}>
        <div style={{ fontWeight: "bold" }}>{segment.name}</div>
        <div style={{ 
          background: hasCritical 
            ? THEME.error 
            : hasWarnings 
              ? THEME.warning 
              : THEME.success,
          color: hasWarnings ? "#000" : "#fff",
          padding: "2px 6px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: "bold"
        }}>
          {hasCritical 
            ? "Critical" 
            : hasWarnings 
              ? "Warning" 
              : "Healthy"}
        </div>
      </div>
      
      <div style={{ fontSize: "11px", opacity: 0.7 }}>
        Cells {segment.min}-{segment.max}
      </div>
      
      <div style={{ 
        height: "4px", 
        background: "rgba(255,255,255,0.1)", 
        borderRadius: "2px",
        marginTop: "6px",
        overflow: "hidden"
      }}>
        <div style={{ 
          height: "100%", 
          width: `${healthPercentage}%`,
          background: hasCritical 
            ? THEME.error 
            : hasWarnings 
              ? THEME.warning 
              : THEME.primary.main,
          borderRadius: "2px",
        }}></div>
      </div>
    </div>
  );
});

// Main SegmentControls component - optimized with memo
const SegmentControls = memo(({ 
  segmentRanges, 
  activeSegment, 
  setActiveSegment,
  cellStatistics
}) => {
  const totalWarnings = Object.values(cellStatistics).reduce((sum, stats) => sum + (stats?.warnings || 0), 0);
  const totalCritical = Object.values(cellStatistics).reduce((sum, stats) => sum + (stats?.critical || 0), 0);
  
  return (
    <div
      style={{
        position: "absolute",
        top: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "16px",
        background: THEME.background.paper,
        borderRadius: "8px",
        color: THEME.text.primary,
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        border: `1px solid ${totalCritical > 0 ? THEME.error : totalWarnings > 0 ? THEME.warning : THEME.divider}`,
        zIndex: 30,
        width: "300px",
      }}
    >
      <div style={{ 
        fontWeight: "bold",
        fontSize: "15px",
        textAlign: "center",
        marginBottom: "12px",
        paddingBottom: "8px",
        borderBottom: `1px solid ${THEME.divider}`,
      }}>
        Battery Segments
      </div>
      
      <div style={{ 
        marginBottom: "12px",
        fontSize: "12px",
        opacity: 0.8,
        textAlign: "center" 
      }}>
        Select a segment to view different parts of the battery system
      </div>
      
      {segmentRanges.map(segment => (
        <SegmentButton
          key={segment.id}
          segment={segment}
          isActive={activeSegment === segment.id}
          onClick={setActiveSegment}
          statistics={cellStatistics[segment.id]}
        />
      ))}
      
      <div style={{ 
        marginTop: "10px",
        fontSize: "11px",
        opacity: 0.7,
        textAlign: "center",
        paddingTop: "8px",
        borderTop: `1px solid ${THEME.divider}`,
      }}>
        <span style={{ fontStyle: "italic" }}>
          Use mouse to rotate, zoom, and pan the 3D model
        </span>
      </div>
    </div>
  );
});

export default SegmentControls;