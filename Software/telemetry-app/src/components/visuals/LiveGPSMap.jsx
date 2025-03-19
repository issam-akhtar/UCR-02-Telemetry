import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Divider, 
  Tooltip, 
  useTheme,
  Alert,
  IconButton,
  Skeleton,
  Chip,
  alpha
} from '@mui/material';
import { Map, Marker, Overlay, ZoomControl } from 'pigeon-maps';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { useDebounce } from 'use-debounce';
import { useThrottle } from '@react-hook/throttle';
import { useContext } from 'react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { 
  Navigation, 
  MapPin, 
  Radio, 
  Lock, 
  Unlock, 
  Compass, 
  AlertTriangle,
  Clock,
  Gauge,
  Ruler,
  Mountain,
  Maximize,
  Minimize,
  AlertCircle,
  Settings
} from 'lucide-react';

// Constants - Moved out for easier tuning
const MIN_DISTANCE_BETWEEN_POINTS = 5; // Increased minimum distance for Raspberry Pi
const MAX_PATH_POINTS = 200; // Reduced max path points to prevent memory issues
const MAP_RECENTER_THROTTLE = 1000; // 1 second map center throttle
const DATA_STALE_TIMEOUT = 5000;
const DEFAULT_POSITION = {
  lat: 33.9749,
  lng: -117.3281,
  zoom: 15 // Reduced default zoom for better performance
};
const PI_LOW_PERFORMANCE = true; // Set to true for Raspberry Pi optimization

// Utility functions - Moved outside of component for better performance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  // Haversine formula
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const formatSpeed = (speed) => {
  if (isNaN(speed)) return '0.0 km/h';
  return `${speed.toFixed(1)} km/h`;
};

const formatDistance = (meters) => {
  if (isNaN(meters)) return '0 m';
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

const formatTimeElapsed = (timestamp) => {
  if (!timestamp) return 'N/A';
  const elapsed = Math.floor((Date.now() - timestamp) / 1000);
  
  if (elapsed < 60) return `${elapsed}s ago`;
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s ago`;
  return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m ago`;
};

const getCardinalDirection = (heading) => {
  if (isNaN(heading)) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};

// Map provider based on theme - Low resolution for Pi
const getMapProvider = (isDarkMode) => (x, y, z, dpr) => {
  // Force low resolution for Raspberry Pi
  if (PI_LOW_PERFORMANCE) {
    return isDarkMode 
      ? `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}.png`
      : `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
  
  return isDarkMode 
    ? `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}${dpr >= 2 ? '@2x' : ''}.png`
    : `https://tile.openstreetmap.org/${z}/${x}/${y}${dpr >= 2 ? '@2x' : ''}.png`;
};

// Ring buffer implementation for path data
class PathRingBuffer {
  constructor(maxSize) {
    this.buffer = new Float64Array(maxSize * 2); // lat, lng pairs
    this.maxSize = maxSize;
    this.size = 0;
    this.writeIndex = 0;
  }

  add(lat, lng) {
    this.buffer[this.writeIndex * 2] = lat;
    this.buffer[this.writeIndex * 2 + 1] = lng;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  get() {
    // Convert to array of [lat, lng] pairs for rendering
    const result = [];
    const startIndex = this.size < this.maxSize ? 0 : this.writeIndex;
    
    for (let i = 0; i < this.size; i++) {
      const idx = (startIndex + i) % this.maxSize;
      result.push([
        this.buffer[idx * 2], 
        this.buffer[idx * 2 + 1]
      ]);
    }
    
    return result;
  }

  clear() {
    this.size = 0;
    this.writeIndex = 0;
  }
}

// Signal quality component
const SignalQuality = memo(({ connected, status }) => {
  const theme = useTheme();
  
  // Get color and text based on signal quality
  const getSignalQuality = useCallback((status) => {
    if (!connected) return { text: 'No signal', color: theme.palette.error.main };
    
    if (isNaN(status)) return { text: 'Unknown', color: theme.palette.warning.main };
    
    // Map status value to signal quality
    if (status >= 4) return { text: 'Excellent', color: theme.palette.success.main };
    if (status >= 2) return { text: 'Good', color: theme.palette.success.light };
    if (status >= 1) return { text: 'Fair', color: theme.palette.warning.main };
    return { text: 'Poor', color: theme.palette.warning.dark };
  }, [connected, theme.palette]);
  
  const signalQuality = getSignalQuality(status);
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      <Radio size={14} color={signalQuality.color} />
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ fontSize: '0.75rem' }}
      >
        {signalQuality.text}
      </Typography>
    </Box>
  );
});

// Vehicle telemetry panel
const TelemetryPanel = memo(({ gpsData, stats, minimized, onToggleMinimize }) => {
  const theme = useTheme();
  
  if (minimized) {
    return (
      <Card 
        sx={{ 
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0,0,0,0.7)' 
            : 'rgba(255,255,255,0.8)', 
          backdropFilter: 'blur(4px)',
          boxShadow: 2,
          transition: 'all 0.2s ease'
        }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.primary" sx={{ mr: 1 }}>
              {formatSpeed(gpsData.speed)}
            </Typography>
            <Tooltip title="Expand telemetry panel">
              <IconButton 
                size="small" 
                onClick={onToggleMinimize}
                aria-label="Expand telemetry panel"
              >
                <Maximize size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0,0,0,0.7)' 
          : 'rgba(255,255,255,0.8)', 
        backdropFilter: 'blur(4px)',
        boxShadow: 2,
        transition: 'all 0.2s ease'
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="text.primary" sx={{ fontSize: '0.8rem' }}>
            VEHICLE TELEMETRY
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Heading indicator */}
            <Box 
              component="div" 
              sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                border: `2px solid ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
              }}
              aria-label={`Heading: ${isNaN(gpsData.heading) ? '0' : gpsData.heading.toFixed(0)}° ${getCardinalDirection(gpsData.heading)}`}
            >
              <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
                <Box 
                  component="div" 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, left: '50%', 
                    transform: 'translateX(-50%)', 
                    fontSize: '0.6rem', 
                    lineHeight: 1,
                    color: theme.palette.text.primary
                  }}
                >N</Box>
                <Box 
                  component="div" 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 0, left: '50%', 
                    transform: 'translateX(-50%)', 
                    fontSize: '0.6rem', 
                    lineHeight: 1,
                    color: theme.palette.text.primary
                  }}
                >S</Box>
                <Box 
                  component="div" 
                  sx={{ 
                    position: 'absolute', 
                    left: 0, top: '50%', 
                    transform: 'translateY(-50%)', 
                    fontSize: '0.6rem', 
                    lineHeight: 1,
                    color: theme.palette.text.primary
                  }}
                >W</Box>
                <Box 
                  component="div" 
                  sx={{ 
                    position: 'absolute', 
                    right: 0, top: '50%', 
                    transform: 'translateY(-50%)', 
                    fontSize: '0.6rem', 
                    lineHeight: 1,
                    color: theme.palette.text.primary
                  }}
                >E</Box>
              </Box>
              <Box 
                component="div" 
                sx={{ 
                  width: '2px', 
                  height: '12px', 
                  backgroundColor: theme.palette.error.main,
                  transformOrigin: 'bottom',
                  transform: `rotate(${isNaN(gpsData.heading) ? 0 : gpsData.heading}deg)`,
                  transition: 'transform 0.3s ease-out'
                }} 
              />
            </Box>
            
            <Tooltip title="Minimize telemetry panel">
              <IconButton 
                size="small" 
                onClick={onToggleMinimize}
                aria-label="Minimize telemetry panel"
              >
                <Minimize size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider sx={{ my: 0.75 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.75rem'
            }}
          >
            <Gauge size={12} /> Speed:
          </Typography>
          <Typography 
            variant="body2" 
            align="right"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '0.75rem'
            }}
          >
            {formatSpeed(gpsData.speed)}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.75rem'
            }}
          >
            <Gauge size={12} /> Max Speed:
          </Typography>
          <Typography 
            variant="body2" 
            align="right"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '0.75rem'
            }}
          >
            {formatSpeed(stats.maxSpeed)}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.75rem'
            }}
          >
            <Compass size={12} /> Heading:
          </Typography>
          <Typography 
            variant="body2" 
            align="right"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '0.75rem'
            }}
          >
            {isNaN(gpsData.heading) ? '0' : gpsData.heading.toFixed(0)}° {getCardinalDirection(gpsData.heading)}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.75rem'
            }}
          >
            <Mountain size={12} /> Altitude:
          </Typography>
          <Typography 
            variant="body2" 
            align="right"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '0.75rem'
            }}
          >
            {isNaN(gpsData.height) ? '0.0' : gpsData.height.toFixed(1)} m
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.75rem'
            }}
          >
            <Ruler size={12} /> Distance:
          </Typography>
          <Typography 
            variant="body2" 
            align="right"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '0.75rem'
            }}
          >
            {formatDistance(stats.totalDistance)}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 0.75 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Clock size={12} color={theme.palette.text.secondary} />
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.65rem',
              flex: 1
            }}
          >
            Last update: {gpsData.timestamp ? formatTimeElapsed(gpsData.timestamp) : 'N/A'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
});

// Control panel component
const ControlPanel = memo(({ followVehicle, onToggleFollow, onOpenSettings }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0,0,0,0.7)' 
          : 'rgba(255,255,255,0.8)', 
        backdropFilter: 'blur(4px)',
        boxShadow: 2
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, display: 'flex', gap: 1 }}>
        <Tooltip title={followVehicle ? "Unlock camera" : "Lock camera to vehicle"}>
          <IconButton
            onClick={onToggleFollow}
            size="small"
            color={followVehicle ? "primary" : "default"}
            aria-label={followVehicle ? "Unlock camera" : "Lock camera to vehicle"}
          >
            {followVehicle ? <Lock size={16} /> : <Unlock size={16} />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Map Settings">
          <IconButton
            onClick={onOpenSettings}
            size="small"
            aria-label="Map Settings"
          >
            <Settings size={16} />
          </IconButton>
        </Tooltip>
      </CardContent>
    </Card>
  );
});

// Vehicle Marker component
const VehicleMarker = memo(({ heading, lat, lng }) => {
  const theme = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  
  return (
    <div>
      <div
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: theme.palette.secondary.main,
          borderRadius: '50%',
          border: '2px solid white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translate(-20px, -20px) rotate(${isNaN(heading) ? 0 : heading}deg)`,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
        onClick={() => setShowInfo(!showInfo)}
      >
        <div
          style={{
            width: '2px',
            height: '16px',
            backgroundColor: 'white'
          }}
        />
      </div>
      
      {showInfo && (
        <div 
          style={{
            position: 'absolute',
            bottom: '45px',
            left: '-70px',
            width: '140px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            transform: 'translateY(-5px)',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '3px', textAlign: 'center' }}>
            Vehicle Position
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '3px' }}>
            <div>Latitude:</div>
            <div style={{ textAlign: 'right' }}>{isNaN(lat) ? '0.000000' : lat.toFixed(6)}</div>
            <div>Longitude:</div>
            <div style={{ textAlign: 'right' }}>{isNaN(lng) ? '0.000000' : lng.toFixed(6)}</div>
          </div>
        </div>
      )}
    </div>
  );
});

// Optimized path overlay using WebGL or simplified canvas rendering
const PathOverlay = memo(({ pathCoords, width, height, mapState }) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const { settings } = useContext(ChartSettingsContext);
  
  // Ensure reasonable dimensions
  const safeWidth = width || 100;
  const safeHeight = height || 100;
  
  // Convert geo coordinates to pixel coordinates - optimized and memoized
  const geoToPixel = useCallback((lat, lng, mapState) => {
    if (!mapState || !mapState.center || mapState.width === undefined || isNaN(lat) || isNaN(lng)) {
      return [0, 0];
    }
    
    const { center, zoom, width, height } = mapState;
    const mapWidth = Math.pow(2, zoom) * 256;
    const mapHeight = mapWidth;
    
    const x = (lng + 180) * (mapWidth / 360);
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (mapHeight / 2) - (mapWidth * mercN / (2 * Math.PI));
    
    const centerPixelX = (center[1] + 180) * (mapWidth / 360);
    const centerLatRad = center[0] * Math.PI / 180;
    const centerMercN = Math.log(Math.tan((Math.PI / 4) + (centerLatRad / 2)));
    const centerPixelY = (mapHeight / 2) - (mapWidth * centerMercN / (2 * Math.PI));
    
    const pixelX = width / 2 + (x - centerPixelX) * 256 * Math.pow(2, zoom);
    const pixelY = height / 2 + (y - centerPixelY) * 256 * Math.pow(2, zoom);
    
    return [pixelX, pixelY];
  }, []);
  
  // Draw path on canvas - optimized for performance
  useEffect(() => {
    if (!canvasRef.current || !pathCoords || pathCoords.length < 2 || !safeWidth || !safeHeight || !mapState) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;
    
    // Apply size with device pixel ratio capped at 1 for Pi
    const dpr = PI_LOW_PERFORMANCE ? 1 : (window.devicePixelRatio || 1);
    canvas.width = safeWidth * dpr;
    canvas.height = safeHeight * dpr;
    canvas.style.width = `${safeWidth}px`;
    canvas.style.height = `${safeHeight}px`;
    
    // Scale for high-res displays
    ctx.scale(dpr, dpr);
    
    // Determine path quality based on settings and platform
    const isLowRes = PI_LOW_PERFORMANCE || (settings?.global?.lowResolutionCharts === true);
    const lineWidth = isLowRes ? 2 : 3;
    
    // Clear previous drawing
    ctx.clearRect(0, 0, safeWidth, safeHeight);
    
    // Skip rendering if path is empty
    if (pathCoords.length === 0) return;
    
    // Set path style
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = theme.palette.secondary.main;
    
    // Optimize path rendering - draw fewer points on Pi
    const stride = PI_LOW_PERFORMANCE ? 2 : 1;
    
    // Draw path with stride
    let firstPoint = true;
    for (let i = 0; i < pathCoords.length; i += stride) {
      if (!pathCoords[i] || !Array.isArray(pathCoords[i]) || pathCoords[i].length !== 2) continue;
      
      const [lat, lng] = pathCoords[i];
      if (isNaN(lat) || isNaN(lng)) continue;
      
      const [x, y] = geoToPixel(lat, lng, mapState);
      
      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }, [pathCoords, safeWidth, safeHeight, mapState, theme.palette.secondary.main, geoToPixel, settings?.global?.lowResolutionCharts]);
  
  return (
    <canvas 
      ref={canvasRef}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: 'none',
        zIndex: 900
      }}
    />
  );
});

// Loading overlay component
const LoadingOverlay = memo(({ visible }) => {
  const theme = useTheme();
  
  if (!visible) return null;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0,0,0,0.7)' 
          : 'rgba(255,255,255,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        gap: 2,
        backdropFilter: 'blur(2px)'
      }}
      aria-live="polite"
      aria-busy={visible}
    >
      <Radio size={40} stroke={1} />
      <Typography variant="h6" color="text.primary">
        Waiting for GPS data...
      </Typography>
    </Box>
  );
});

// Map Component - separated for memoization
const MapComponent = memo(({ 
  provider, 
  center, 
  zoom, 
  width, 
  height, 
  onBoundsChanged, 
  animate, 
  children 
}) => {
  return (
    <Map
      provider={provider}
      center={center}
      zoom={zoom}
      width={width}
      height={height}
      onBoundsChanged={onBoundsChanged}
      animate={animate}
      animateMaxScreens={1}
      twoFingerDrag={PI_LOW_PERFORMANCE ? true : false}
      metaWheelZoom={false}
      tileSize={256}
      attributionPrefix={""}
      dprs={PI_LOW_PERFORMANCE ? [1] : [1, 2]}
      style={{ maxHeight: '100%', overflow: 'hidden' }}
    >
      {children}
    </Map>
  );
});

// Main component
const LiveGPSMap = () => {
  const theme = useTheme();
  const { ref, width = 0, height = 0 } = useResizeObserver({
    box: 'border-box',
    // Fix: Don't use round as function, use roundingFn
    roundingFn: Math.round
  });
  const { settings, updateSettings } = useContext(ChartSettingsContext);
  
  // Core state
  const [gpsData, setGpsData] = useState({
    lat: DEFAULT_POSITION.lat,
    lng: DEFAULT_POSITION.lng,
    height: 0,
    timestamp: null,
    speed: 0,
    heading: 0,
    status: 0,
  });
  
  // Use ring buffer for efficient path storage
  const pathBufferRef = useRef(new PathRingBuffer(MAX_PATH_POINTS));
  const [pathVersion, setPathVersion] = useState(0); // Used to trigger re-renders
  
  const [connected, setConnected] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [mapState, setMapState] = useState({
    center: [DEFAULT_POSITION.lat, DEFAULT_POSITION.lng],
    zoom: DEFAULT_POSITION.zoom,
    width: 0,
    height: 0
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Throttle GPS data updates for smoother UI
  const [debouncedGpsData] = useDebounce(gpsData, 50);
  
  // Throttle map center updates
  const throttledCenter = useThrottle(
    [debouncedGpsData.lat, debouncedGpsData.lng], 
    MAP_RECENTER_THROTTLE
  )[0];
  
  // Stats state
  const [stats, setStats] = useState({
    maxSpeed: 0,
    totalDistance: 0,
    lastPointDistance: 0,
  });
  
  // Error state
  const [error, setError] = useState(null);
  const [dataStale, setDataStale] = useState(false);
  
  // Refs
  const lastGpsTimestampRef = useRef(null);
  const lastPositionRef = useRef(null);
  const recenterTimeoutRef = useRef(null);
  const staleTimerRef = useRef(null);
  const frameRateLimiterRef = useRef(null);
  const fpsInterval = useRef(1000 / 30); // 30 FPS limit for Pi
  const visibilityRef = useRef(document.visibilityState === 'visible');
  
  // Get path coordinates for rendering
  const pathCoords = useMemo(() => {
    return pathBufferRef.current.get();
  }, [pathVersion]);
  
  // Update map state with current dimensions, with safety checks
  useEffect(() => {
    if (width && height) {
      // Ensure reasonable dimensions - prevent infinite sizing issues
      const safeHeight = Math.min(height, window.innerHeight * 0.8);
      const safeWidth = Math.min(width, window.innerWidth);
      
      setMapState(prev => ({
        ...prev,
        width: safeWidth,
        height: safeHeight
      }));
    }
  }, [width, height]);
  
  // Handle visibility change - reduce updates when tab inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibilityRef.current = document.visibilityState === 'visible';
      
      // Adjust FPS interval based on visibility
      if (document.visibilityState === 'visible') {
        fpsInterval.current = 1000 / 30; // 30 FPS when visible
      } else {
        fpsInterval.current = 1000 / 5; // 5 FPS when hidden
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Handle toggle for vehicle following
  const handleToggleFollow = useCallback(() => {
    setFollowVehicle(prev => !prev);
  }, []);
  
  // Handle toggle for telemetry panel
  const handleToggleMinimize = useCallback(() => {
    setPanelMinimized(prev => !prev);
  }, []);
  
  // Handle map settings modal
  const handleOpenSettings = useCallback(() => {
    setSettingsModalOpen(true);
  }, []);
  
  // Effect for handling follow vehicle behavior with throttling
  useEffect(() => {
    if (followVehicle && connected) {
      // Center map on vehicle position with throttling
      if (recenterTimeoutRef.current) {
        clearTimeout(recenterTimeoutRef.current);
      }
      
      if (isNaN(throttledCenter[0]) || isNaN(throttledCenter[1])) return;
      
      // Only update if not NaN
      setMapState(prev => ({
        ...prev,
        center: throttledCenter
      }));
    }
  }, [followVehicle, connected, throttledCenter]);
  
  // Determine map provider based on theme
  const mapProvider = useMemo(() => 
    getMapProvider(theme.palette.mode === 'dark')
  , [theme.palette.mode]);
  
  // Determine update interval based on settings
  const updateInterval = useMemo(() => 
    settings?.realTime?.updateInterval || 100
  , [settings?.realTime?.updateInterval]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (recenterTimeoutRef.current) {
        clearTimeout(recenterTimeoutRef.current);
      }
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      if (frameRateLimiterRef.current) {
        cancelAnimationFrame(frameRateLimiterRef.current);
      }
    };
  }, []);
  
  // Handle map bounds changed (zoom or pan)
  const handleBoundsChanged = useCallback(({ center, zoom }) => {
    // Only update state if user is controlling the map (not following vehicle)
    if (!followVehicle) {
      setMapState(prev => ({
        ...prev,
        center,
        zoom
      }));
    } else {
      // Only update zoom if following vehicle
      setMapState(prev => ({
        ...prev,
        zoom
      }));
    }
  }, [followVehicle]);

  // Process GPS data more efficiently
  useRealTimeData('ins_gps', (msg) => {
    try {
      if (!msg || !msg.fields) {
        console.warn('Missing fields in ins_gps message');
        return;
      }
      
      // Get fields and validate
      const fields = msg.fields;
      
      // Parse timestamp
      const newTimestamp = fields.timestamp ? Number(fields.timestamp) : Date.now();
      
      // Skip if message is older than our last processed one
      if (lastGpsTimestampRef.current !== null && newTimestamp <= lastGpsTimestampRef.current) {
        return;
      }
      
      lastGpsTimestampRef.current = newTimestamp;
      
      // Reset stale timer
      setDataStale(false);
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      staleTimerRef.current = setTimeout(() => {
        setDataStale(true);
      }, DATA_STALE_TIMEOUT);
      
      // Parse coordinates from the correct fields (gnss_lat, gnss_long)
      const lat = fields.gnss_lat !== undefined ? Number(fields.gnss_lat) : NaN;
      const lng = fields.gnss_long !== undefined ? Number(fields.gnss_long) : NaN;
      const height = fields.gnss_height !== undefined ? Number(fields.gnss_height) : 0;
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        console.warn('Invalid GPS coordinates:', { lat, lng });
        return;
      }
      
      // Clear any previous errors
      if (error) setError(null);
      
      // Update GPS data
      setGpsData(prev => ({
        ...prev,
        lat,
        lng,
        height,
        timestamp: newTimestamp
      }));
      
      // Process path updates
      try {
        // Calculate distance from last point
        let lastPointDistance = 0;
        let shouldAddPoint = true;
        
        if (lastPositionRef.current) {
          lastPointDistance = calculateDistance(
            lastPositionRef.current[0], lastPositionRef.current[1],
            lat, lng
          );
          shouldAddPoint = lastPointDistance >= MIN_DISTANCE_BETWEEN_POINTS;
        }
        
        if (shouldAddPoint) {
          // Add point to ring buffer
          pathBufferRef.current.add(lat, lng);
          setPathVersion(v => v + 1); // Trigger re-render
          
          // Update last position
          lastPositionRef.current = [lat, lng];
          
          // Update distance stats
          setStats(prev => ({
            ...prev,
            totalDistance: prev.totalDistance + lastPointDistance,
            lastPointDistance
          }));
        }
      } catch (pathError) {
        console.error('Error processing path data:', pathError);
      }
      
      setConnected(true);
    } catch (error) {
      console.error('Error processing GPS data:', error);
      setError('Failed to process GPS data: ' + error.message);
    }
  }, [updateInterval, error]);

  // Process IMU data for speed and heading
  useRealTimeData('ins_imu', (msg) => {
    try {
      if (!msg || !msg.fields) {
        console.warn('Missing fields in ins_imu message');
        return;
      }
      
      // Get fields
      const fields = msg.fields;
      
      // Clear any previous errors
      if (error) setError(null);
      
      // Get velocity components and status
      const northVel = fields.north_vel !== undefined ? Number(fields.north_vel) : NaN;
      const eastVel = fields.east_vel !== undefined ? Number(fields.east_vel) : NaN;
      const status = fields.status !== undefined ? Number(fields.status) : NaN;
      
      // Skip invalid data
      if (isNaN(northVel) && isNaN(eastVel)) return;
      
      // Calculate heading (in degrees, 0 = North, 90 = East)
      let heading = 0;
      if (!isNaN(northVel) && !isNaN(eastVel)) {
        heading = Math.atan2(eastVel, northVel) * (180 / Math.PI);
        if (heading < 0) heading += 360;
      }
      
      // Calculate ground speed (ignoring vertical component)
      let speedKmh = 0;
      if (!isNaN(northVel) && !isNaN(eastVel)) {
        const groundSpeed = Math.sqrt(northVel * northVel + eastVel * eastVel);
        speedKmh = groundSpeed * 3.6;
      }
      
      // Update max speed if needed
      const maxSpeed = Math.max(speedKmh, stats.maxSpeed);
      
      // Update gpsData with IMU information
      setGpsData(prev => ({
        ...prev,
        speed: speedKmh,
        heading: heading,
        status
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        maxSpeed
      }));
    } catch (error) {
      console.error('Error processing IMU data:', error);
      setError('Failed to process IMU data: ' + error.message);
    }
  }, [updateInterval, error, stats.maxSpeed]);

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        boxShadow: 1,
        position: 'relative', // Ensure proper positioning context
        maxHeight: '100%' // Enforce containment
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Navigation 
            size={18} 
            color={theme.palette.primary.main} 
          />
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '1rem'
            }}
          >
            Live Vehicle Tracking
          </Typography>
        </Box>
        
        <SignalQuality connected={connected} status={gpsData.status} />
      </Box>
      
      {/* Error message if any */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            m: 1, 
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.8rem' }
          }}
          icon={<AlertCircle size={16} />}
        >
          {error}
        </Alert>
      )}
      
      {/* Data stale warning */}
      {dataStale && connected && (
        <Alert 
          severity="warning" 
          sx={{ 
            m: 1, 
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.8rem' }
          }}
          icon={<AlertTriangle size={16} />}
        >
          No GPS updates received in the last {DATA_STALE_TIMEOUT/1000} seconds
        </Alert>
      )}
      
      {/* Main content */}
      <Box 
        ref={ref}
        sx={{ 
          position: 'relative',
          flexGrow: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          maxHeight: 'calc(100% - 70px)' // Account for header and alerts
        }}
      >
        {width > 0 && height > 0 && (
          <MapComponent
            provider={mapProvider}
            center={mapState.center}
            zoom={mapState.zoom}
            width={width}
            height={height < 300 ? 300 : height} // Ensure minimum height
            onBoundsChanged={handleBoundsChanged}
            animate={!PI_LOW_PERFORMANCE && settings?.global?.enableTransitions !== false}
          >
            {/* Vehicle Marker */}
            <Marker 
              width={40}
              height={40}
              anchor={[debouncedGpsData.lat, debouncedGpsData.lng]}
              color={theme.palette.secondary.main}
            >
              <VehicleMarker 
                heading={debouncedGpsData.heading} 
                lat={debouncedGpsData.lat}
                lng={debouncedGpsData.lng}
              />
            </Marker>
            
            {/* Path Overlay */}
            <Overlay>
              {pathCoords.length > 1 && (
                <PathOverlay 
                  pathCoords={pathCoords} 
                  width={width} 
                  height={height}
                  mapState={mapState}
                />
              )}
            </Overlay>
            
            {/* Zoom Controls - Only if not in low performance mode */}
            {!PI_LOW_PERFORMANCE && <ZoomControl />}
          </MapComponent>
        )}
        
        {/* Info panel */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            maxWidth: { xs: '80%', sm: '300px' },
            zIndex: 1000,
          }}
        >
          <TelemetryPanel 
            gpsData={gpsData}
            stats={stats}
            minimized={panelMinimized}
            onToggleMinimize={handleToggleMinimize}
          />
        </Box>
        
        {/* Map and display options - bottom panel */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            zIndex: 1000,
          }}
        >
          <ControlPanel 
            followVehicle={followVehicle}
            onToggleFollow={handleToggleFollow}
            onOpenSettings={handleOpenSettings}
          />
        </Box>
        
        {/* Loading overlay */}
        <LoadingOverlay visible={!connected} />
      </Box>
      
      {/* Settings Modal */}
      {settingsModalOpen && (
        <Box position="absolute">
          {/* The actual settings modal will be imported and rendered by the Dashboard component */}
        </Box>
      )}
    </Box>
  );
};

export default memo(LiveGPSMap);