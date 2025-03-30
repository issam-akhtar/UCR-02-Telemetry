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
  useTheme,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import { Map, Navigation } from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import marker icons from leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Create a custom icon instead of using Default.mergeOptions
const vehicleMarkerIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

// Default position if no GPS data available
const DEFAULT_POSITION = { lat: 33.9749, lng: -117.3281 };

// Default map configuration values
const DEFAULT_ZOOM_LEVEL = 18; // Increased zoom for better detail
const DEFAULT_MAX_PATH_POINTS = 3000; // Increased for longer history

/**
 * Converts speed from m/s to km/h.
 */
const msToKmh = (speedMs) => speedMs * 3.6;

/**
 * Formats speed to fixed one decimal place and converts to imperial if needed.
 */
const formatSpeed = (speed, useImperial = false) => {
  const converted = useImperial ? speed * 0.621371 : speed;
  return converted.toFixed(1);
};

/**
 * Chooses a color based on speed thresholds.
 */
const getSpeedColor = (speed, theme) => {
  if (speed >= 100) return theme.palette.error.main;
  if (speed >= 60) return theme.palette.warning.main;
  if (speed >= 20) return theme.palette.info.main;
  return theme.palette.success.main;
};

/**
 * A reusable overlay box that positions content absolutely.
 */
const OverlayBox = memo(({ children, top, left, bottom, right }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: 'absolute',
        p: theme.spacing(0.5),
        zIndex: theme.zIndex.tooltip,
        backgroundColor: alpha(
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : theme.palette.background.default,
          theme.palette.mode === 'dark' ? 0.7 : 0.8
        ),
        backdropFilter: 'blur(4px)',
        borderRadius: theme.shape.borderRadius,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        boxShadow: theme.custom?.shadows?.sm,
        top,
        left,
        bottom,
        right,
        maxWidth: '80%',
      }}
    >
      {children}
    </Box>
  );
});

OverlayBox.propTypes = {
  children: PropTypes.node.isRequired,
  top: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  bottom: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  right: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

/**
 * A heading indicator rendered as an SVG.
 */
const HeadingIndicator = memo(({ heading}) => {
  const theme = useTheme();
  return (
    <svg
      width={130}
      height={50}
      viewBox="0 0 40 40"
      aria-labelledby="heading-indicator-title"
      role="img"
    >
      <title id="heading-indicator-title">
        Heading indicator showing {Math.round(heading)}°
      </title>
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke={theme.palette.divider}
        strokeWidth="1"
      />
      <line
        x1="20"
        y1="20"
        x2={20 + 16 * Math.sin((heading * Math.PI) / 180)}
        y2={20 - 16 * Math.cos((heading * Math.PI) / 180)}
        stroke={theme.palette.primary.main}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="20"
        y="10"
        textAnchor="middle"
        fill={theme.palette.text.secondary}
        fontSize="8"
      >
        N
      </text>
      <text
        x="30"
        y="20"
        textAnchor="middle"
        fill={theme.palette.text.secondary}
        fontSize="8"
      >
        E
      </text>
      <text
        x="20"
        y="33"
        textAnchor="middle"
        fill={theme.palette.text.secondary}
        fontSize="8"
      >
        S
      </text>
      <text
        x="10"
        y="20"
        textAnchor="middle"
        fill={theme.palette.text.secondary}
        fontSize="8"
      >
        W
      </text>
    </svg>
  );
});

HeadingIndicator.propTypes = {
  heading: PropTypes.number.isRequired,
  size: PropTypes.number,
};

/**
 * Info panel for displaying GPS and IMU data
 */
const DataInfoPanel = memo(({ gpsData, imuData, useImperial }) => {
  const theme = useTheme();
  
  // Function to format a value with its unit
  const formatValue = (value, unit = '', decimals = 2) => {
    if (value === undefined || value === null) return 'N/A';
    return typeof value === 'number' ? `${value.toFixed(decimals)} ${unit}` : `${value} ${unit}`;
  };
  
  // Format velocity in correct units
  const velocityUnit = useImperial ? 'm/s' : 'm/s';
  
  // Style for consistent value width
  const valueStyle = {
    fontWeight: 'medium',
    minWidth: '60px',
    textAlign: 'right',
    display: 'inline-block'
  };
  
  return (
    <Box 
      sx={{
        fontSize: '0.75rem',
        width: '130px',
        maxHeight: '300px',
        overflow: 'auto',
        p: 0.5
      }}
    >
      <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5, mb: 0.5 }}>
        <Typography 
          variant="subtitle2" 
          color="primary" 
          sx={{ fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}
        >
          Position Data
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">Lat:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {gpsData.gnss_lat.toFixed(6)}°
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">Lng:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {gpsData.gnss_long.toFixed(6)}°
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Alt:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(gpsData.gnss_height, 'm')}
          </Typography>
        </Box>
      </Box>
      
      <Box>
        <Typography 
          variant="subtitle2" 
          color="primary" 
          sx={{ fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}
        >
          Motion Data
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">N Vel:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(imuData.north_vel, velocityUnit)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">E Vel:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(imuData.east_vel, velocityUnit)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">Up Vel:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(imuData.up_vel, velocityUnit)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary">Roll:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(imuData.roll, '°')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Pitch:</Typography>
          <Typography variant="caption" sx={valueStyle}>
            {formatValue(imuData.pitch, '°')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

DataInfoPanel.propTypes = {
  gpsData: PropTypes.object.isRequired,
  imuData: PropTypes.object.isRequired,
  useImperial: PropTypes.bool.isRequired
};

/**
 * Main component rendering a live GPS map.
 * Optimized for real-time performance with no delay or throttling.
 */
const LiveGPSMap = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: resizeRef, width = 300, height = 300 } = useResizeObserver();
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const useImperial = settings?.dashboard?.useImperialUnits || false;
  // Set update interval to 0 for immediate updates with no throttling
  const updateInterval = 0;
  // Set change threshold to 0 to show all movements no matter how small
  const changeThreshold = 0;
  const mapZoomLevel = DEFAULT_ZOOM_LEVEL;
  const maxPathPoints = DEFAULT_MAX_PATH_POINTS;

  // Component state
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [path, setPath] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  
  // Add detailed state for GPS and IMU data
  const [gpsData, setGpsData] = useState({
    gnss_lat: 0,
    gnss_long: 0,
    gnss_height: 0,
    gnss_week: 0,
    gnss_seconds: 0
  });
  
  const [imuData, setImuData] = useState({
    north_vel: 0,
    east_vel: 0,
    up_vel: 0,
    roll: 0,
    pitch: 0,
    azimuth: 0,
    status: 0
  });

  // Refs for map elements and animation frame
  const mapContainerRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const popupRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastPositionRef = useRef(position);

  // Tile server configuration
  const tileServerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileServerAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Memoize formatted speed and unit based on settings
  const formattedSpeed = useMemo(() => formatSpeed(speed, useImperial), [speed, useImperial]);
  const speedUnit = useMemo(() => (useImperial ? 'mph' : 'km/h'), [useImperial]);

  // Disable animations for better real-time performance
  const animationsEnabled = false;
  const hardwareAcceleration = true;

  // Get primary color with higher intensity for trail
  const trailColor = useMemo(() => {
    try {
      const color = theme.palette.primary.main;
      return color;
    } catch (err) {
      return theme.palette.primary.main;
    }
  }, [theme.palette.primary.main]);

  // Create a custom popup style using CSS
  useEffect(() => {
    // Add custom CSS for the popup
    const style = document.createElement('style');
    style.textContent = `
      .custom-popup .leaflet-popup-content-wrapper {
        background-color: ${theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
        color: ${theme.palette.text.primary};
        border-radius: ${theme.shape.borderRadius}px;
        padding: 0;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(4px);
        border: 1px solid ${theme.palette.divider};
      }
      .custom-popup .leaflet-popup-content {
        margin: 10px 12px;
        line-height: 1.4;
        font-family: ${theme.typography.fontFamily};
        font-size: 12px;
      }
      .custom-popup .leaflet-popup-tip {
        background-color: ${theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
        border: 1px solid ${theme.palette.divider};
      }
      /* Optimize marker rendering with GPU acceleration */
      .leaflet-marker-icon {
        will-change: transform;
        visibility: visible !important;
      }
      .leaflet-marker-shadow {
        will-change: transform;
        visibility: visible !important;
      }
      /* Optimize polyline rendering */
      .leaflet-overlay-pane path {
        will-change: transform;
      }
      /* Add GPU acceleration to map elements */
      .leaflet-tile-container img {
        will-change: transform;
      }
      .leaflet-zoom-animated {
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);

  // Initialize Leaflet map instance only once with performance optimizations
  useEffect(() => {
    if (!mapContainerRef.current) return;
    // Prevent reinitializing if the container is already set up
    if (mapContainerRef.current._leaflet_id) return;

    const map = L.map(mapContainerRef.current, {
      center: [position.lat, position.lng],
      zoom: mapZoomLevel,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      // Optimize map rendering
      preferCanvas: true,
      // Disable animations for immediate updates
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      // Performance optimizations
      renderer: L.canvas({ padding: 0.5 }),
      // Lower latency settings
      inertia: false,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 120
    });

    map.on('dblclick', () => {
      if (map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.disable();
      } else {
        map.scrollWheelZoom.enable();
      }
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer(tileServerUrl, {
      attribution: tileServerAttribution,
      maxZoom: 19,
      minZoom: 5,
      // Optimize tile loading
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 4,
      // Increase tile size for fewer requests
      tileSize: 256
    }).addTo(map);

    try {
      markerRef.current = L.marker([position.lat, position.lng], {
        title: 'Vehicle Position',
        icon: vehicleMarkerIcon
      }).addTo(map);

      // Create a popup that will show on hover/click of the marker
      popupRef.current = L.popup({
        closeButton: false,
        className: 'custom-popup',
        offset: [0, -30],
        closeOnClick: false,
        autoClose: false
      });
      
      // Add mouseover and mouseout events to the marker
      markerRef.current.on('mouseover', function(e) {
        setShowInfoPanel(true);
      });
      
      markerRef.current.on('click', function(e) {
        setShowInfoPanel(!showInfoPanel);
      });

      polylineRef.current = L.polyline([], {
        color: trailColor,
        weight: 3, // Reduced for better performance
        opacity: 0.8,
        smoothFactor: 1, 
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      if (typeof L.polylineDecorator === 'function') {
        try {
          const arrowDecorator = L.polylineDecorator(polylineRef.current, {
            patterns: [
              {
                offset: '5%',
                repeat: '15%',
                symbol: L.Symbol.arrowHead({
                  pixelSize: 10, // Reduced size for better performance
                  polygon: false,
                  pathOptions: {
                    stroke: true,
                    color: trailColor,
                    weight: 2
                  }
                })
              }
            ]
          }).addTo(map);
        } catch (decoratorErr) {
          console.error('Error creating polyline decorator:', decoratorErr);
        }
      }
    } catch (err) {
      console.error('Error setting up map elements:', err);
      setError('Failed to initialize map elements');
    }

    setMapInstance(map);

    // Use passive event listeners for better scroll performance
    const mapContainer = mapContainerRef.current;
    if (mapContainer) {
      mapContainer.addEventListener('touchstart', () => {}, { passive: true });
      mapContainer.addEventListener('touchmove', () => {}, { passive: true });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (map && mapContainerRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(() => {
          map.invalidateSize();
        });
      }
    });
    
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      // Ensure mapContainerRef.current exists before unobserving
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
        // Remove passive event listeners
        mapContainerRef.current.removeEventListener('touchstart', () => {});
        mapContainerRef.current.removeEventListener('touchmove', () => {});
      }
      map.remove();
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimized map updates with no animations
  useEffect(() => {
    if (!mapInstance || !position) return;

    try {
      if (markerRef.current) {
        // Direct position update with no delay
        markerRef.current.setLatLng([position.lat, position.lng]);
      } else {
        markerRef.current = L.marker([position.lat, position.lng], {
          title: 'Vehicle Position',
          icon: vehicleMarkerIcon
        }).addTo(mapInstance);
      }

      // Use setView with animate: false instead of panTo for immediate updates
      mapInstance.setView([position.lat, position.lng], mapZoomLevel, {
        animate: false, 
        duration: 0,
        noMoveStart: true
      });

      if (polylineRef.current && path.length > 1) {
        polylineRef.current.setLatLngs(path);
      }
    } catch (err) {
      console.error('Error updating map elements:', err);
      setError('Failed to update map elements');
    }
  }, [mapInstance, position, path, mapZoomLevel]);

  // Optimized path update with no distance filtering
  const updatePath = useCallback(
    (lat, lng) => {
      // Always add the point to the path with no filtering
      setPath((prevPath) => {
        const newPath = [...prevPath, [lat, lng]];
        return newPath.length > maxPathPoints
          ? newPath.slice(newPath.length - maxPathPoints)
          : newPath;
      });
    },
    [maxPathPoints]
  );

  const { ref: gpsRef } = useRealTimeData(
    'ins_gps',
    (msg) => {
      // Process GPS data immediately, even when not in view
      try {
        const { fields } = msg;
        if (!fields) return;
        
        let lat = position.lat;
        let lng = position.lng;
        let height = gpsData.gnss_height;
        let week = gpsData.gnss_week;
        let seconds = gpsData.gnss_seconds;
        
        // Extract latitude
        if (fields.gnss_lat !== undefined && fields.gnss_lat !== null) {
          if (typeof fields.gnss_lat === 'number') {
            lat = fields.gnss_lat;
          } else if (fields.gnss_lat.numberValue !== undefined) {
            lat = Number(fields.gnss_lat.numberValue);
          } else {
            lat = parseFloat(fields.gnss_lat);
          }
        }
        
        // Extract longitude
        if (fields.gnss_long !== undefined && fields.gnss_long !== null) {
          if (typeof fields.gnss_long === 'number') {
            lng = fields.gnss_long;
          } else if (fields.gnss_long.numberValue !== undefined) {
            lng = Number(fields.gnss_long.numberValue);
          } else {
            lng = parseFloat(fields.gnss_long);
          }
        }
        
        // Extract height
        if (fields.gnss_height !== undefined && fields.gnss_height !== null) {
          if (typeof fields.gnss_height === 'number') {
            height = fields.gnss_height;
          } else if (fields.gnss_height.numberValue !== undefined) {
            height = Number(fields.gnss_height.numberValue);
          } else {
            height = parseFloat(fields.gnss_height);
          }
        }
        
        // Extract GNSS week
        if (fields.gnss_week !== undefined && fields.gnss_week !== null) {
          if (typeof fields.gnss_week === 'number') {
            week = fields.gnss_week;
          } else if (fields.gnss_week.numberValue !== undefined) {
            week = Number(fields.gnss_week.numberValue);
          } else {
            week = parseFloat(fields.gnss_week);
          }
        }
        
        // Extract GNSS seconds
        if (fields.gnss_seconds !== undefined && fields.gnss_seconds !== null) {
          if (typeof fields.gnss_seconds === 'number') {
            seconds = fields.gnss_seconds;
          } else if (fields.gnss_seconds.numberValue !== undefined) {
            seconds = Number(fields.gnss_seconds.numberValue);
          } else {
            seconds = parseFloat(fields.gnss_seconds);
          }
        }

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.log('Invalid GPS data:', { lat, lng, fields });
          return;
        }

        // Update GPS data state
        setGpsData({
          gnss_lat: lat,
          gnss_long: lng,
          gnss_height: height,
          gnss_week: week,
          gnss_seconds: seconds
        });

        // Always update position and path for every data point received
        // No filtering or thresholds applied - show every movement
        setPosition({ lat, lng });
        updatePath(lat, lng);

        setConnected(true);
        if (error) setError(null);
      } catch (err) {
        console.error('Error processing GPS data:', err);
        console.error('GPS message:', JSON.stringify(msg, null, 2));
        setError('Failed to process GPS data');
      }
    },
    // Set update interval to 0 for immediate processing with no delay
    { customInterval: 0 }
  );

  const { ref: imuRef } = useRealTimeData(
    'ins_imu',
    (msg) => {
      // Process IMU data immediately, even when not in view
      try {
        const fields = msg.payload?.fields || msg.fields || msg || {};
        
        let northVel = imuData.north_vel;
        let eastVel = imuData.east_vel;
        let upVel = imuData.up_vel;
        let roll = imuData.roll;
        let pitch = imuData.pitch;
        let azimuth = imuData.azimuth;
        let status = imuData.status;
        
        // Extract north velocity
        if (fields.north_vel !== undefined) {
          northVel = fields.north_vel?.numberValue || northVel;
        }
        
        // Extract east velocity
        if (fields.east_vel !== undefined) {
          eastVel = fields.east_vel?.numberValue || eastVel;
        }
        
        // Extract up velocity
        if (fields.up_vel !== undefined) {
          upVel = fields.up_vel?.numberValue || upVel;
        }
        
        // Extract roll
        if (fields.roll !== undefined) {
          roll = fields.roll?.numberValue || roll;
        }
        
        // Extract pitch
        if (fields.pitch !== undefined) {
          pitch = fields.pitch?.numberValue || pitch;
        }
        
        // Extract azimuth
        if (fields.azimuth !== undefined) {
          azimuth = fields.azimuth?.numberValue || azimuth;
        }
        
        // Extract status
        if (fields.status !== undefined) {
          status = fields.status?.numberValue || status;
        }
        
        // Update IMU data state
        setImuData({
          north_vel: northVel,
          east_vel: eastVel,
          up_vel: upVel,
          roll: roll,
          pitch: pitch,
          azimuth: azimuth,
          status: status
        });
        
        // Calculate speed and heading
        if (northVel !== undefined && eastVel !== undefined) {
          const groundSpeedMs = Math.sqrt(northVel ** 2 + eastVel ** 2);
          const groundSpeedKmh = groundSpeedMs * 3.6;
          setSpeed(groundSpeedKmh);
          
          // Update heading even with very small movements
          // No minimum threshold
          const headingRad = Math.atan2(eastVel, northVel);
          const headingDeg = (headingRad * (180 / Math.PI) + 360) % 360;
          setHeading(headingDeg);
        }
        
        setConnected(true);
        if (error) setError(null);
      } catch (err) {
        console.error('Error processing IMU data:', err);
        console.error('IMU message:', JSON.stringify(msg, null, 2));
        setError('Failed to process IMU data');
      }
    },
    // Set update interval to 0 for immediate processing with no delay
    { customInterval: 0 }
  );

  const setAllRefs = useCallback((node) => {
    resizeRef(node);
    inViewRef(node);
    if (gpsRef) gpsRef(node);
    if (imuRef) imuRef(node);
  }, [resizeRef, inViewRef, gpsRef, imuRef]);

  return (
    <Card
      elevation={0}
      ref={setAllRefs}
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transform: 'translateZ(0)', // Force hardware acceleration
        boxShadow: theme.custom?.shadows?.sm,
      }}
      role="region"
      aria-label="GPS Location Map"
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Map size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              GPS Location
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' }
        }}
      />
      <Divider />
      <CardContent
        sx={{
          flexGrow: 1,
          position: 'relative',
          p: 0,
          '&:last-child': { pb: 0 }
        }}
        aria-label="GPS Map"
      >
        {width === 0 || height === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Typography variant="body1">Loading...</Typography>
          </Box>
        ) : (
          <>
            <div
              ref={mapContainerRef}
              style={{ 
                height: '100%', 
                width: '100%', 
                zIndex: 1,
                willChange: 'transform', // Hint for browser optimization
              }}
              aria-label="Interactive GPS map showing vehicle location"
              role="application"
            />
            
            {/* Speed indicator overlay */}
            <OverlayBox top={theme.spacing(1)} left={theme.spacing(1)}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}
                aria-label={`Current speed: ${formattedSpeed} ${speedUnit}`}
              >
                <Navigation size={14} color={getSpeedColor(speed, theme)} aria-hidden="true" />
                <Typography variant="body2" sx={{ color: getSpeedColor(speed, theme), fontWeight: theme.typography.fontWeightMedium }}>
                  {formattedSpeed} {speedUnit}
                </Typography>
              </Box>
            </OverlayBox>
            
            {/* Coordinates overlay */}
            <OverlayBox bottom={theme.spacing(1)} left={theme.spacing(1)}>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}
                aria-label={`Current coordinates: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
              >
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </Typography>
            </OverlayBox>
            
            {/* Heading indicator overlay */}
            <OverlayBox bottom={theme.spacing(1)} right={theme.spacing(1)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                   aria-label={`Current heading: ${Math.round(heading)} degrees`}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem', mb: theme.spacing(0.5) }}>
                  Heading: {Math.round(heading)}°
                </Typography>
                <HeadingIndicator heading={heading} />
              </Box>
            </OverlayBox>
            
            {/* New Permanent Info Panel in top right */}
            {showInfoPanel && (
              <OverlayBox top={theme.spacing(1)} right={theme.spacing(1)}>
                <DataInfoPanel 
                  gpsData={gpsData}
                  imuData={imuData}
                  useImperial={useImperial}
                />
              </OverlayBox>
            )}
            
            {/* Error message overlay */}
            {error && (
              <OverlayBox top="50%" left="50%" sx={{ transform: 'translate(-50%, -50%)' }}>
                <Typography variant="caption" color="error">
                  {error}
                </Typography>
              </OverlayBox>
            )}
          </>
        )}
        {!connected && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha(theme.palette.background.default, 0.5),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: theme.zIndex.tooltip,
              backdropFilter: 'blur(2px)',
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default memo(LiveGPSMap);