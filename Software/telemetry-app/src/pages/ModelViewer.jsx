import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, memo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Stats, useTexture, Loader, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import useRealTimeData from "../hooks/useRealTimeData";
import Segment1 from '../cellmappings/Segment1';
import Segment2 from '../cellmappings/Segment2';
import Segment3 from '../cellmappings/Segment3';
import Segment4 from '../cellmappings/Segment4';
import Segment5 from '../cellmappings/Segment5';

// Constants from theme.js (minimalRedWhiteGoldTheme)
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
    disabled: '#888888',
  },
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFC107',
  info: '#29B6F6',
  divider: 'rgba(255, 255, 255, 0.12)',
};

// Create a simple fallback while model loads
const LoadingFallback = memo(() => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={THEME.primary.dark} />
    </mesh>
  );
});

// Constants for performance optimization - using theme colors
const COLOR_RANGES = [
  { min: -Infinity, max: 0.01, color: new THREE.Color(0.2, 0.2, 0.2) }, // Gray for no data or zero
  { min: 2.5, max: 2.7, color: new THREE.Color(0.8, 0.2, 0.2) },     // Red for critical
  { min: 2.7, max: 3.1, color: new THREE.Color(1, 0.6, 0) },   // Orange for warning
  { min: 3.1, max: 3.4, color: new THREE.Color(1, 0.8, 0) },     // Yellow for caution
  { min: 3.4, max: 3.8, color: new THREE.Color(0.7, 0.13, 0.13) },  // Red (primary) for normal
  { min: 3.8, max: 4.0, color: new THREE.Color(0.83, 0.17, 0.17) },  // Light red for high normal
  { min: 4.0, max: Infinity, color: new THREE.Color(0.55, 0.1, 0.1) }  // Dark red for over voltage
];

// Material cache at module level for better performance
const materialCache = new Map();

// Context recovery component
const ContextRecovery = memo(({ onError }) => {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    // Handle context lost
    const handleContextLost = (event) => {
      console.warn("WebGL context lost. Attempting to recover...");
      event.preventDefault();
      if (onError) onError('WebGL context lost. Attempting to recover...');
    };

    // Handle context restored
    const handleContextRestored = () => {
      console.log("WebGL context restored!");
      if (onError) onError(null);
    };

    // Add event listeners
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onError]);

  return null;
});

// Camera controller to ensure model is visible
const CameraController = memo(() => {
  const { camera } = useThree();
  
  useEffect(() => {
    // Set initial camera position
    camera.position.set(0.8, 0.2, 1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  
  return null;
});

// Simple animation to ensure continuous rendering if needed
const AnimationLoop = memo(({ isPerformanceMode }) => {
  useFrame(() => {
    // Light animation or similar to keep render loop active
    if (!isPerformanceMode) {
      // No need to do anything in the frame loop, just keeping it active
    }
  });
  
  return null;
});

// Compute color based on voltage value with improved logging
const valueToColor = (value) => {
  // Default gray for invalid values
  if (!value || value <= 0.01) return COLOR_RANGES[0].color;
  
  // Find the appropriate color range
  for (let range of COLOR_RANGES) {
    if (value >= range.min && value <= range.max) {
      return range.color;
    }
  }
  
  // If no range matches (shouldn't happen), return gray
  console.warn(`No color range found for voltage: ${value}`);
  return COLOR_RANGES[0].color;
};

// Helper function to get or create material with optimized caching
const getMaterial = (color) => {
  const colorKey = color.getHexString();
  if (!materialCache.has(colorKey)) {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.8,
    });
    materialCache.set(colorKey, material);
  }
  return materialCache.get(colorKey);
};

// Clean up all materials
const disposeMaterials = () => {
  materialCache.forEach((material) => {
    if (material && material.dispose) {
      material.dispose();
    }
  });
  materialCache.clear();
};

// Helper function to get status text based on voltage
function getStatusText(voltage) {
  if (!voltage || voltage <= 0.01) return "Unknown";
  if (voltage >= 2.5 && voltage <= 2.7) return "Critical";
  if (voltage > 2.7 && voltage <= 3.1) return "Warning";
  if (voltage > 3.1 && voltage <= 3.4) return "Caution";
  if (voltage > 3.4 && voltage <= 3.8) return "Normal";
  if (voltage > 3.8 && voltage <= 4.0) return "High Normal";
  if (voltage > 4.0) return "Over Voltage";
  return "Unknown";
}

// Helper function to get status color for UI elements
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

// Segment button component for better performance
const SegmentButton = memo(({ segment, isActive, onSelect, statistics }) => {
  // Count active/warning cells in this segment
  const segmentStats = statistics || {};
  const warningCount = segmentStats.warnings || 0;
  const criticalCount = segmentStats.critical || 0;
  const hasWarnings = warningCount > 0 || criticalCount > 0;
  const healthyCount = segmentStats.healthy || 0;
  const totalCount = segmentStats.total || 0;
  const healthPercentage = totalCount ? (healthyCount / totalCount) * 100 : 100;
  
  // Fast click handler
  const handleClick = () => onSelect(segment.id);
  
  return (
    <div 
      onClick={handleClick} 
      style={{ 
        padding: "10px 12px", 
        background: isActive ? 'rgba(178, 34, 34, 0.3)' : 'rgba(30, 30, 30, 0.6)', 
        borderRadius: "4px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        margin: "5px 0",
        border: isActive ? `1px solid ${THEME.primary.main}` : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isActive ? '0 0 8px rgba(178, 34, 34, 0.5)' : 'none',
        transition: "all 0.2s"
      }}
    >
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "6px"
      }}>
        <div style={{ 
          fontWeight: "500", 
          color: isActive ? THEME.text.primary : 'rgba(255, 255, 255, 0.9)'
        }}>
          {segment.name}
        </div>
        <div style={{ 
          background: criticalCount > 0 ? THEME.error : warningCount > 0 ? THEME.warning : THEME.success,
          color: (warningCount > 0 && !criticalCount) ? "#000" : "#fff",
          padding: "2px 8px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: "500"
        }}>
          {criticalCount > 0 ? "Critical" : warningCount > 0 ? "Warning" : "Healthy"}
        </div>
      </div>
      
      <div style={{ fontSize: "11px", opacity: 0.7 }}>
        Cells {segment.min}-{segment.max}
      </div>
      
      <div style={{ 
        height: "3px", 
        background: "rgba(0, 0, 0, 0.3)", 
        marginTop: "6px",
        borderRadius: "2px",
        overflow: "hidden"
      }}>
        <div style={{ 
          width: `${healthPercentage}%`, 
          height: "100%", 
          background: criticalCount > 0 ? THEME.error : warningCount > 0 ? THEME.warning : THEME.primary.main,
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
});

// Segments Panel Component
const SegmentsPanel = memo(({ segmentRanges, activeSegment, onSelectSegment, cellStatistics }) => {
  return (
    <div style={{
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: "6px",
      padding: "12px",
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      width: "100%"
    }}>
      <div style={{ 
        fontSize: "14px", 
        fontWeight: "600", 
        color: THEME.text.primary,
        marginBottom: "10px",
        padding: "0 0 8px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center"
      }}>
        Battery Segments
      </div>
      
      <div style={{ 
        fontSize: "12px", 
        opacity: 0.7, 
        marginBottom: "10px", 
        textAlign: "center" 
      }}>
        Select a segment to view different parts of the battery system
      </div>
      
      {segmentRanges.map(segment => (
        <SegmentButton
          key={segment.id}
          segment={segment}
          isActive={activeSegment === segment.id}
          onSelect={onSelectSegment}
          statistics={cellStatistics[segment.id]}
        />
      ))}
      
      <div style={{ 
        fontSize: "11px", 
        opacity: 0.6, 
        textAlign: "center", 
        marginTop: "10px",
        fontStyle: "italic",
        padding: "8px 0 0 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        Use mouse to rotate, zoom, and pan the 3D model
      </div>
    </div>
  );
});

// Voltage Metrics Card
const VoltageMetricCard = memo(({ title, value, unit = "V" }) => {
  const statusColor = getStatusColor(value);
  
  return (
    <div style={{ 
      flex: 1, 
      padding: "10px", 
      background: "rgba(30, 30, 30, 0.6)", 
      borderRadius: "4px",
      margin: "0 4px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "5px" }}>
        {title}
      </div>
      <div style={{ 
        fontSize: "18px", 
        fontWeight: "600", 
        color: statusColor 
      }}>
        {typeof value === 'number' ? value.toFixed(2) : value} <span style={{ fontSize: "12px", opacity: 0.7 }}>{unit}</span>
      </div>
    </div>
  );
});

// Status Bar Component
const StatusBar = memo(({ label, value, max, color }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        marginBottom: "4px",
        fontSize: "12px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center" 
        }}>
          <div style={{ 
            width: "10px", 
            height: "10px", 
            borderRadius: "2px",
            backgroundColor: color,
            marginRight: "6px"
          }}></div>
          <span>{label}</span>
        </div>
        <div>
          {value} <span style={{ opacity: 0.7 }}>({percentage.toFixed(1)}%)</span>
        </div>
      </div>
      <div style={{ 
        height: "4px", 
        background: "rgba(0, 0, 0, 0.3)", 
        borderRadius: "2px" 
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: "100%", 
          backgroundColor: color,
          borderRadius: "2px",
          transition: "width 0.3s"
        }}></div>
      </div>
    </div>
  );
});

// Segment Health Summary Panel
const HealthSummaryPanel = memo(({ activeSegment, segmentRanges, cellValues, cellStatistics }) => {
  // Get active segment name
  const segmentName = useMemo(() => {
    const segment = segmentRanges.find(s => s.id === activeSegment);
    return segment ? segment.name : "Segment";
  }, [activeSegment, segmentRanges]);
  
  // Get segment statistics
  const stats = useMemo(() => {
    return cellStatistics[activeSegment] || { 
      healthy: 0, 
      warnings: 0, 
      critical: 0, 
      total: 0 
    };
  }, [activeSegment, cellStatistics]);
  
  // Calculate voltage metrics for the segment
  const { minVoltage, maxVoltage, avgVoltage, voltageRange } = useMemo(() => {
    const segmentRange = segmentRanges.find(s => s.id === activeSegment);
    if (!segmentRange) return { minVoltage: 0, maxVoltage: 0, avgVoltage: 0, voltageRange: 0 };
    
    // Get cells for this segment
    const segmentCells = {};
    
    for (const [cellName, voltage] of Object.entries(cellValues)) {
      const cellNumber = parseInt(cellName.replace("Cell ", ""));
      if (cellNumber >= segmentRange.min && cellNumber <= segmentRange.max) {
        segmentCells[cellName] = voltage;
      }
    }
    
    // Calculate voltage metrics
    const voltages = Object.values(segmentCells).filter(v => v > 0);
    
    if (voltages.length === 0) {
      return { minVoltage: 3.5, maxVoltage: 3.5, avgVoltage: 3.5, voltageRange: 0 };
    }
    
    const min = Math.min(...voltages);
    const max = Math.max(...voltages);
    const sum = voltages.reduce((acc, v) => acc + v, 0);
    const avg = sum / voltages.length;
    const range = max - min;
    
    return { minVoltage: min, maxVoltage: max, avgVoltage: avg, voltageRange: range };
  }, [activeSegment, segmentRanges, cellValues]);
  
  // Get health status and color
  const healthStatus = useMemo(() => {
    if (stats.critical > 0) return { text: "Critical Issues", color: THEME.error };
    if (stats.warnings > 0) return { text: "Warning", color: THEME.warning };
    return { text: "Healthy", color: THEME.success };
  }, [stats]);
  
  return (
    <div style={{
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: "6px",
      padding: "12px",
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      width: "100%"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "10px",
        padding: "0 0 8px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: THEME.text.primary }}>
          {segmentName} Health
        </div>
        <div style={{ 
          padding: "3px 8px", 
          borderRadius: "10px", 
          background: healthStatus.color,
          color: healthStatus.color === THEME.warning ? "#000" : "#fff",
          fontSize: "12px",
          fontWeight: "500"
        }}>
          {healthStatus.text}
        </div>
      </div>
      
      {/* Voltage Metrics */}
      <div style={{ 
        display: "flex", 
        marginBottom: "15px",
        justifyContent: "space-between"
      }}>
        <VoltageMetricCard title="Min Voltage" value={minVoltage} />
        <VoltageMetricCard title="Avg Voltage" value={avgVoltage} />
        <VoltageMetricCard title="Max Voltage" value={maxVoltage} />
      </div>
      
      {/* Secondary Metrics */}
      <div style={{ 
        display: "flex", 
        marginBottom: "15px" 
      }}>
        <VoltageMetricCard 
          title="Voltage Range" 
          value={voltageRange} 
        />
        <VoltageMetricCard 
          title="Cell Count" 
          value={stats.total} 
          unit="" 
        />
      </div>
      
      {/* Cell Distribution Title */}
      <div style={{ 
        fontSize: "13px", 
        fontWeight: "600", 
        marginBottom: "10px",
        color: THEME.text.primary
      }}>
        Voltage Distribution
      </div>
      
      {/* Distribution Bars */}
      <StatusBar 
        label="Normal" 
        value={stats.healthy || 0} 
        max={stats.total || 1} 
        color={THEME.primary.main} 
      />
      
      <StatusBar 
        label="Warning" 
        value={stats.warnings || 0} 
        max={stats.total || 1} 
        color={THEME.warning} 
      />
      
      <StatusBar 
        label="Critical" 
        value={stats.critical || 0} 
        max={stats.total || 1} 
        color={THEME.error} 
      />
    </div>
  );
});

// Control button component
const ControlButton = memo(({ label, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "8px",
        padding: "8px 12px",
        background: 'rgba(30, 30, 30, 0.95)',
        border: `1px solid ${isActive ? THEME.primary.main : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: "4px",
        cursor: "pointer",
        boxShadow: isActive ? `0 0 8px rgba(178, 34, 34, 0.5)` : 'none',
        transition: "all 0.2s"
      }}
    >
      <div style={{
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: isActive ? THEME.primary.main : 'rgba(255, 255, 255, 0.2)',
        marginRight: "10px",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}></div>
      <div style={{ color: THEME.text.primary }}>{label}</div>
    </div>
  );
});

// Controls Panel
const ControlsPanel = memo(({ isPerformanceMode, togglePerformanceMode, debugMode, toggleDebugMode }) => {
  return (
    <div style={{
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: "6px",
      padding: "12px",
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
    }}>
      <div style={{ 
        fontSize: "14px", 
        fontWeight: "600", 
        color: THEME.text.primary,
        marginBottom: "10px",
        padding: "0 0 8px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center"
      }}>
        Display Controls
      </div>
      
      <ControlButton 
        label="Performance Mode" 
        isActive={isPerformanceMode} 
        onClick={togglePerformanceMode} 
      />
      
      <ControlButton 
        label="Debug Mode" 
        isActive={debugMode} 
        onClick={toggleDebugMode} 
      />
    </div>
  );
});

// Cell info card for hover state
const CellInfoCard = memo(({ cell, segmentRanges }) => {
  if (!cell) return null;
  
  const statusColor = getStatusColor(cell.voltage);
  const statusText = getStatusText(cell.voltage);
  
  // Find which segment this cell belongs to
  const segment = useMemo(() => {
    if (!cell.name) return null;
    const cellNumber = parseInt(cell.name.replace("Cell ", ""));
    return segmentRanges.find(s => 
      cellNumber >= s.min && cellNumber <= s.max
    );
  }, [cell.name, segmentRanges]);
  
  return (
    <div style={{
      position: "absolute",
      top: "60px",
      left: "10px",
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: "6px",
      padding: "12px",
      border: `1px solid ${statusColor}`,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      pointerEvents: "none",
      zIndex: 1000,
      maxWidth: "240px"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "10px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        paddingBottom: "8px"
      }}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: THEME.text.primary }}>
          {cell.name}
        </div>
        <div style={{ 
          padding: "3px 8px", 
          borderRadius: "10px", 
          background: statusColor,
          color: statusColor === THEME.warning ? "#000" : "#fff",
          fontSize: "11px",
          fontWeight: "500"
        }}>
          {statusText}
        </div>
      </div>
      
      <div style={{ marginBottom: "6px", fontSize: "13px" }}>
        <span style={{ opacity: 0.7 }}>Voltage:</span> 
        <span style={{ 
          fontWeight: "600", 
          marginLeft: "6px",
          color: statusColor
        }}>
          {cell.voltage !== undefined ? cell.voltage.toFixed(3) : "N/A"} V
        </span>
      </div>
      
      {segment && (
        <div style={{ marginBottom: "6px", fontSize: "13px" }}>
          <span style={{ opacity: 0.7 }}>Segment:</span>
          <span style={{ fontWeight: "600", marginLeft: "6px" }}>
            {segment.name}
          </span>
        </div>
      )}
      
      <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "8px" }}>
        Normal range: 3.4V - 3.8V
      </div>
    </div>
  );
});

// Debug panel component
const DebugPanel = memo(({ debugMode, activeSegment, segmentRanges, cellValues }) => {
  if (!debugMode) return null;
  
  // Get cells for active segment
  const activeCells = useMemo(() => {
    const segment = segmentRanges.find(s => s.id === activeSegment);
    if (!segment) return [];
    
    return Object.entries(cellValues)
      .filter(([cellName, voltage]) => {
        const cellNumber = parseInt(cellName.replace("Cell ", ""));
        return cellNumber >= segment.min && cellNumber <= segment.max && voltage > 0;
      })
      .sort(([cellNameA], [cellNameB]) => {
        const cellNumberA = parseInt(cellNameA.replace("Cell ", ""));
        const cellNumberB = parseInt(cellNameB.replace("Cell ", ""));
        return cellNumberA - cellNumberB;
      });
  }, [activeSegment, segmentRanges, cellValues]);
  
  const segmentName = segmentRanges.find(s => s.id === activeSegment)?.name || "Segment";
  
  return (
    <div style={{
      position: "absolute",
      bottom: "100px",
      left: "10px",
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: "6px",
      padding: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      zIndex: 10,
      maxHeight: "300px",
      overflow: "auto",
      maxWidth: "270px"
    }}>
      <div style={{ 
        fontSize: "14px", 
        fontWeight: "600", 
        color: THEME.text.primary,
        marginBottom: "10px",
        padding: "0 0 8px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {segmentName} Cell Voltages
      </div>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {activeCells.map(([cellName, voltage]) => (
          <div 
            key={cellName} 
            style={{
              padding: "3px 6px",
              background: getStatusColor(voltage),
              color: (voltage > 3.1 && voltage < 4.0) || voltage <= 0.01 ? "#000" : "#fff",
              borderRadius: "3px",
              fontSize: "11px",
              width: "75px",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span>{cellName.replace("Cell ", "")}</span>
            <span style={{ fontWeight: "bold" }}>{voltage.toFixed(2)}V</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Segment component - optimized to prevent unnecessary rerenders
const SegmentComponent = memo(({ activeSegment, cellValues, setHoveredCell }) => {
  // Get the right component based on active segment
  const SegmentModel = useMemo(() => {
    switch (activeSegment) {
      case 1: return Segment1;
      case 2: return Segment2;
      case 3: return Segment3;
      case 4: return Segment4;
      case 5: return Segment5;
      default: return Segment1;
    }
  }, [activeSegment]);
  
  return <SegmentModel 
    cellValues={cellValues} 
    setHoveredCell={setHoveredCell} 
  />;
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  if (prevProps.activeSegment !== nextProps.activeSegment) {
    return false; // Different segment, should rerender
  }
  
  // Only rerender if cell values actually changed
  if (prevProps.cellValues !== nextProps.cellValues) {
    const prevKeys = Object.keys(prevProps.cellValues);
    const nextKeys = Object.keys(nextProps.cellValues);
    
    // If different number of cells, rerender
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    // Check if any values changed
    for (const key of prevKeys) {
      if (prevProps.cellValues[key] !== nextProps.cellValues[key]) {
        return false; // Value changed, should rerender
      }
    }
  }
  
  return true; // No changes, prevent rerender
});

// Main ModelViewer component
const ModelViewer = () => {
  // Create a combined cell map from all segments - memoized to prevent recalculation
  const combinedCellMap = useMemo(() => {
    return {
      ...Segment1.cellMap,
      ...Segment2.cellMap,
      ...Segment3.cellMap,
      ...Segment4.cellMap,
      ...Segment5.cellMap
    };
  }, []);

  // Initialize cell values with the combined cell names from all segments
  const [cellValues, setCellValues] = useState(() => {
    const initialValues = {};
    Object.keys(combinedCellMap).forEach((cell) => {
      initialValues[cell] = 3.5; // Default value for visualization
    });
    return initialValues;
  });

  // State to track which segment is currently being viewed
  const [activeSegment, setActiveSegment] = useState(1); // Default to Segment 1
  
  // Define cell ranges for each segment - memoized to prevent recalculation
  const segmentRanges = useMemo(() => [
    { id: 1, name: "Segment 1", min: 1, max: 23 },
    { id: 2, name: "Segment 2", min: 24, max: 46 },
    { id: 3, name: "Segment 3", min: 47, max: 69 },
    { id: 4, name: "Segment 4", min: 70, max: 92 },
    { id: 5, name: "Segment 5", min: 93, max: 115 }
  ], []);
  
  // Calculate statistics for each segment's health - memoized based on cellValues
  const cellStatistics = useMemo(() => {
    const stats = {};
    
    segmentRanges.forEach(segment => {
      // Optimized filtering by precomputing cell number range
      const minCell = segment.min;
      const maxCell = segment.max;
      
      let warnings = 0;
      let critical = 0;
      let healthy = 0;
      let total = 0;
      
      // More efficient iteration through cell values
      Object.entries(cellValues).forEach(([cellName, value]) => {
        const cellNumber = parseInt(cellName.replace("Cell ", ""));
        if (cellNumber >= minCell && cellNumber <= maxCell) {
          total++;
          if (value <= 2.7) critical++;
          else if (value < 3.1) warnings++;
          else healthy++;
        }
      });
      
      stats[segment.id] = { warnings, critical, healthy, total };
    });
    
    return stats;
  }, [cellValues, segmentRanges]);
  
  // Get filtered cell values for the active segment - memoized based on active segment
  const activeSegmentCellValues = useMemo(() => {
    const range = segmentRanges.find(r => r.id === activeSegment);
    if (!range) return {};
    
    const filtered = {};
    
    // More efficient filtering
    Object.entries(cellValues).forEach(([cellName, value]) => {
      const cellNumber = parseInt(cellName.replace("Cell ", ""));
      if (cellNumber >= range.min && cellNumber <= range.max) {
        filtered[cellName] = value;
      }
    });
    
    return filtered;
  }, [cellValues, activeSegment, segmentRanges]);

  const [hoveredCell, setHoveredCell] = useState(null);
  const [error, setError] = useState(null);
  const [isPerformanceMode, setIsPerformanceMode] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  
  // Reference to store pending updates
  const pendingUpdatesRef = useRef({});
  const updateTimeoutRef = useRef(null);

  // Map WebSocket cell numbers to model cells - memoized to prevent recalculation
  const cellMapping = useMemo(() => {
    const mapping = {};
    for (let i = 1; i <= 115; i++) {
      mapping[`cell${i}`] = `Cell ${i}`;
    }
    return mapping;
  }, []);

  // Throttled update function to prevent excessive renders
  const scheduleCellUpdate = useCallback((newValues) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...newValues };
    
    if (debugMode) {
      console.log("Scheduling update for cells:", Object.keys(newValues).length);
    }
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      const updates = { ...pendingUpdatesRef.current };
      
      setCellValues(current => {
        const merged = { ...current, ...updates };
        return merged;
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
      pendingUpdatesRef.current = {};
      updateTimeoutRef.current = null;
    }, isPerformanceMode ? 300 : 150);
  }, [isPerformanceMode, debugMode]);

  // Cell data handler
  const handleCellData = useCallback((data) => {
    if (!data || !data.fields) return;
    
    try {
      const fields = data.fields;
      const newValues = {};
      let updated = false;
      
      Object.entries(fields).forEach(([key, value]) => {
        if (!key.startsWith('cell') || key === 'type') return;
        
        const modelCellName = cellMapping[key];
        if (!modelCellName) return;
        
        let voltage;
        if (value.stringValue) {
          voltage = parseFloat(value.stringValue);
        } else if (value.numberValue) {
          voltage = value.numberValue;
        } else {
          return;
        }
        
        if (isNaN(voltage)) return;
        
        if (cellValues[modelCellName] !== voltage) {
          newValues[modelCellName] = voltage;
          updated = true;
        }
      });
      
      if (updated) {
        scheduleCellUpdate(newValues);
      }
    } catch (err) {
      console.error("Error processing cell data:", err);
    }
  }, [cellValues, cellMapping, scheduleCellUpdate]);

  // Subscribe to real-time cell data
  const { isConnected } = useRealTimeData(
    "cell",
    handleCellData,
    {
      pauseOnHidden: true,
      resubscribeOnResume: true
    }
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      disposeMaterials();
    };
  }, []);

  // Fast segment selection handler - no extra processing
  const handleSelectSegment = useCallback((segmentId) => {
    setActiveSegment(segmentId);
  }, []);

  // Toggle performance mode
  const togglePerformanceMode = useCallback(() => {
    setIsPerformanceMode(prev => !prev);
  }, []);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);

  // Error notification component
  const ErrorNotification = useMemo(() => {
    if (!error) return null;
    
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          padding: "20px",
          background: "rgba(255, 82, 82, 0.9)",
          color: THEME.text.primary,
          borderRadius: "6px",
          fontSize: "16px",
          zIndex: 2000,
          textAlign: "center",
          maxWidth: "80%",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0" }}>WebGL Error</h3>
        <p style={{ margin: "0 0 16px 0" }}>{error}</p>
        <p style={{ margin: "0 0 20px 0" }}>Try refreshing the page or enabling performance mode.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            background: THEME.primary.main,
            color: THEME.text.primary,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }, [error]);

  // Preload segment models for better switching performance
  useEffect(() => {
    // Preload the next segment in the background
    const nextSegment = activeSegment % 5 + 1;
    const modelPath = `/3D/Segment${nextSegment}.glb`;
    useGLTF.preload(modelPath);
  }, [activeSegment]);

  return (
    <div style={{ 
      display: "flex",
      flexDirection: "column",
      height: "100vh", 
      width: "100%",
      background: THEME.background.default,
      color: THEME.text.primary,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Error Notification */}
      {ErrorNotification}
      
      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Left Sidebar - Health Summary */}
        <div style={{ 
          width: "300px", 
          padding: "15px", 
          borderRight: `1px solid ${THEME.divider}`,
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          overflowY: "auto"
        }}>
          <HealthSummaryPanel 
            activeSegment={activeSegment}
            segmentRanges={segmentRanges}
            cellValues={cellValues}
            cellStatistics={cellStatistics}
          />
          
          <ControlsPanel 
            isPerformanceMode={isPerformanceMode}
            togglePerformanceMode={togglePerformanceMode}
            debugMode={debugMode}
            toggleDebugMode={toggleDebugMode}
          />
        </div>
        
        {/* 3D Model View - Center */}
        <div style={{ 
          flex: 1, 
          position: "relative" 
        }}>
          {/* 3D Canvas */}
          <Canvas
            dpr={[1, isPerformanceMode ? 1.5 : 2]} 
            camera={{ 
              position: [0, 0, 2], 
              fov: 45, 
              near: 0.1, 
              far: 1000 
            }}
            gl={{
              powerPreference: "high-performance",
              antialias: !isPerformanceMode,
              alpha: false,
              stencil: false,
              depth: true,
              preserveDrawingBuffer: false,
            }}
            style={{
              touchAction: "none",
              background: "#0A1015",
            }}
            frameloop={isPerformanceMode ? "demand" : "always"}
          >
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.7} color="#FFFFFF" />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} color={THEME.primary.main} />
            <pointLight position={[0, 2, 0]} intensity={0.5} color={THEME.primary.light} />
            
            {/* Context recovery component */}
            <ContextRecovery onError={setError} />
            
            {/* Camera controller */}
            <CameraController />
            
            {/* Animation loop to ensure rendering */}
            <AnimationLoop isPerformanceMode={isPerformanceMode} />
            
            {/* Model with suspense fallback */}
            <Suspense fallback={<LoadingFallback />}>
              <SegmentComponent 
                activeSegment={activeSegment}
                cellValues={activeSegmentCellValues}
                setHoveredCell={setHoveredCell}
              />
            </Suspense>
            
            {/* Camera and controls */}
            <PerspectiveCamera 
              makeDefault 
              position={[0.8, 0.2, 1]} 
              fov={50}
            />
            <OrbitControls
              enableDamping={!isPerformanceMode}
              dampingFactor={0.1}
              rotateSpeed={0.7}
              minDistance={0.5}
              maxDistance={5}
              target={[0, 0, 0]}
              enablePan={true}
            />
            
            {/* Stats for development */}
            {process.env.NODE_ENV === 'development' && !isPerformanceMode && <Stats />}
          </Canvas>
          
          {/* Cell info card */}
          <CellInfoCard cell={hoveredCell} segmentRanges={segmentRanges} />
          
          {/* Debug panel */}
          <DebugPanel 
            debugMode={debugMode}
            activeSegment={activeSegment}
            segmentRanges={segmentRanges}
            cellValues={activeSegmentCellValues}
          />
          
          {/* Model loader */}
          <Loader 
            containerStyles={{
              background: 'rgba(30, 30, 30, 0.95)',
              borderRadius: '6px',
              padding: '15px 20px',
              border: `1px solid ${THEME.divider}`,
            }}
            innerStyles={{
              backgroundColor: THEME.background.subtle,
            }}
            barStyles={{
              backgroundColor: THEME.primary.main,
            }}
            dataStyles={{
              color: THEME.text.primary,
              fontSize: '14px',
              marginTop: '10px',
              fontFamily: '"Inter", sans-serif',
            }}
            dataInterpolation={(p) => `Loading 3D Model... ${p.toFixed(0)}%`}
          />
        </div>
        
        {/* Right Sidebar - Segments */}
        <div style={{ 
          width: "300px", 
          padding: "15px", 
          borderLeft: `1px solid ${THEME.divider}`,
          overflowY: "auto"
        }}>
          <SegmentsPanel 
            segmentRanges={segmentRanges}
            activeSegment={activeSegment}
            onSelectSegment={handleSelectSegment}
            cellStatistics={cellStatistics}
          />
        </div>
      </div>
    </div>
  );
};

// Preload all segment models
useGLTF.preload("/3D/Segment1.glb");
useGLTF.preload("/3D/Segment2.glb");
useGLTF.preload("/3D/Segment3.glb");
useGLTF.preload("/3D/Segment4.glb");
useGLTF.preload("/3D/Segment5.glb");

export default ModelViewer;