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
const DEFAULT_ZOOM_LEVEL = 17;
const DEFAULT_MAX_PATH_POINTS = 500;

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
const HeadingIndicator = memo(({ heading, size = 40 }) => {
  const theme = useTheme();
  return (
    <svg
      width={size}
      height={size}
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
 * Main component rendering a live GPS map.
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
  const updateInterval = settings?.dashboard?.updateInterval || 300;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
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

  // Refs for map elements and animation frame
  const mapContainerRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const popupRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Tile server configuration
  const tileServerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileServerAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Memoize formatted speed and unit based on settings
  const formattedSpeed = useMemo(() => formatSpeed(speed, useImperial), [speed, useImperial]);
  const speedUnit = useMemo(() => (useImperial ? 'mph' : 'km/h'), [useImperial]);

  // Animation settings from context
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Get primary color with higher intensity for trail
  const trailColor = useMemo(() => {
    try {
      const color = theme.palette.primary.main;
      return color;
    } catch (err) {
      return theme.palette.primary.main;
    }
  }, [theme.palette.primary.main]);

  // Initialize Leaflet map instance only once
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
    }).addTo(map);

    try {
      markerRef.current = L.marker([position.lat, position.lng], {
        title: 'Vehicle Position',
        icon: vehicleMarkerIcon
      }).addTo(map);

      popupRef.current = L.popup({
        closeButton: false,
        className: 'custom-popup',
        offset: [0, -10],
      });

      polylineRef.current = L.polyline([], {
        color: trailColor,
        weight: 5,
        opacity: 0.9,
        smoothFactor: 1,
        dashArray: '10, 5',
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
                  pixelSize: 12,
                  polygon: false,
                  pathOptions: {
                    stroke: true,
                    color: trailColor,
                    weight: 3
                  }
                })
              }
            ]
          }).addTo(map);
        } catch (decoratorErr) {
          console.error('Error creating polyline decorator:', decoratorErr);
        }
      } else {
        console.log('L.polylineDecorator not available, using standard polyline');
      }
    } catch (err) {
      console.error('Error setting up map elements:', err);
      setError('Failed to initialize map elements');
    }

    setMapInstance(map);

    const resizeObserver = new ResizeObserver(() => {
      if (map && mapContainerRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(() => {
          map.invalidateSize();
        });
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      // Ensure mapContainerRef.current exists before unobserving
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
      }
      map.remove();
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePopupContent = useCallback(() => {
    if (!popupRef.current || !markerRef.current) return;
    const popupContent = `
      <div style="text-align: center;">
        <div style="font-weight: bold;">${formattedSpeed} ${speedUnit}</div>
        <div>${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}</div>
      </div>
    `;
    popupRef.current.setContent(popupContent);
    if (markerRef.current && !markerRef.current.isPopupOpen()) {
      markerRef.current.bindPopup(popupRef.current);
    }
  }, [formattedSpeed, speedUnit, position.lat, position.lng]);

  useEffect(() => {
    if (!mapInstance || !position) return;

    try {
      if (markerRef.current) {
        markerRef.current.setLatLng([position.lat, position.lng]);
        updatePopupContent();
      } else {
        markerRef.current = L.marker([position.lat, position.lng], {
          title: 'Vehicle Position',
          icon: vehicleMarkerIcon
        }).addTo(mapInstance);
        updatePopupContent();
      }

      mapInstance.panTo([position.lat, position.lng], {
        animate: animationsEnabled,
        duration: animationsEnabled ? (settings?.global?.animationDuration || 0.5) : 0,
      });

      if (polylineRef.current && path.length > 1) {
        polylineRef.current.setLatLngs(path);
      }
    } catch (err) {
      console.error('Error updating map elements:', err);
      setError('Failed to update map elements');
    }
  }, [mapInstance, position, path, updatePopupContent, settings?.global, animationsEnabled]);

  const updatePath = useCallback(
    (lat, lng) => {
      if (!inView) return;
      setPath((prevPath) => {
        if (prevPath.length > 0) {
          const lastPoint = prevPath[prevPath.length - 1];
          const distance = Math.sqrt(
            Math.pow(lastPoint[0] - lat, 2) + Math.pow(lastPoint[1] - lng, 2)
          );
          if (distance < 0.00005) return prevPath;
        }
        const newPath = [...prevPath, [lat, lng]];
        return newPath.length > maxPathPoints
          ? newPath.slice(newPath.length - maxPathPoints)
          : newPath;
      });
    },
    [maxPathPoints, inView]
  );

  const { ref: gpsRef } = useRealTimeData(
    'ins_gps',
    (msg) => {
      if (!inView) return;
      try {
        const { fields } = msg;
        if (!fields) return;
        
        let lat = position.lat;
        let lng = position.lng;
        
        if (fields.gnss_lat !== undefined && fields.gnss_lat !== null) {
          if (typeof fields.gnss_lat === 'number') {
            lat = fields.gnss_lat;
          } else if (fields.gnss_lat.numberValue !== undefined) {
            lat = Number(fields.gnss_lat.numberValue);
          } else {
            lat = parseFloat(fields.gnss_lat);
          }
        }
        
        if (fields.gnss_long !== undefined && fields.gnss_long !== null) {
          if (typeof fields.gnss_long === 'number') {
            lng = fields.gnss_long;
          } else if (fields.gnss_long.numberValue !== undefined) {
            lng = Number(fields.gnss_long.numberValue);
          } else {
            lng = parseFloat(fields.gnss_long);
          }
        }

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.log('Invalid GPS data:', { lat, lng, fields });
          return;
        }

        const prevLat = position.lat;
        const prevLng = position.lng;
        const distChange = Math.sqrt(
          Math.pow(lat - prevLat, 2) + Math.pow(lng - prevLng, 2)
        );

        if (distChange > changeThreshold / 10000) {
          setPosition({ lat, lng });
          updatePath(lat, lng);
        }

        setConnected(true);
        if (error) setError(null);
      } catch (err) {
        console.error('Error processing GPS data:', err);
        console.error('GPS message:', JSON.stringify(msg, null, 2));
        setError('Failed to process GPS data');
      }
    },
    { customInterval: updateInterval }
  );

  const { ref: imuRef } = useRealTimeData(
    'ins_imu',
    (msg) => {
      if (!inView) return;
      try {
        const fields = msg.payload?.fields || msg.fields || msg || {};
        
        if (fields.north_vel !== undefined && fields.east_vel !== undefined) {
          const northVel = fields.north_vel?.numberValue || 0;
          const eastVel = fields.east_vel?.numberValue || 0;
          
          const groundSpeedMs = Math.sqrt(northVel ** 2 + eastVel ** 2);
          const groundSpeedKmh = groundSpeedMs * 3.6;
          setSpeed(groundSpeedKmh);
          
          if (Math.abs(northVel) > 0.01 || Math.abs(eastVel) > 0.01) {
            const headingRad = Math.atan2(eastVel, northVel);
            const headingDeg = (headingRad * (180 / Math.PI) + 360) % 360;
            setHeading(headingDeg);
          }
        }
        
        setConnected(true);
        if (error) setError(null);
      } catch (err) {
        console.error('Error processing IMU data:', err);
        console.error('IMU message:', JSON.stringify(msg, null, 2));
        setError('Failed to process IMU data');
      }
    },
    { customInterval: updateInterval }
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
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none',
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
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              aria-label="Interactive GPS map showing vehicle location"
              role="application"
            />
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
            <OverlayBox bottom={theme.spacing(1)} left={theme.spacing(1)}>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}
                aria-label={`Current coordinates: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
              >
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </Typography>
            </OverlayBox>
            <OverlayBox bottom={theme.spacing(1)} right={theme.spacing(1)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                   aria-label={`Current heading: ${Math.round(heading)} degrees`}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem', mb: theme.spacing(0.5) }}>
                  Heading: {Math.round(heading)}°
                </Typography>
                <HeadingIndicator heading={heading} />
              </Box>
            </OverlayBox>
            {error && (
              <OverlayBox top={theme.spacing(1)} right={theme.spacing(1)}>
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
      <style jsx global>{`
        .leaflet-marker-icon {
          visibility: visible !important;
        }
        .leaflet-marker-shadow {
          visibility: visible !important;
        }
      `}</style>
    </Card>
  );
};

export default memo(LiveGPSMap);
