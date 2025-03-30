import React, { 
  useState, 
  useEffect, 
  useContext, 
  useCallback, 
  useMemo, 
  memo,
  useRef
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
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  MapPin,
  RefreshCw,
  Droplets,
  Sunrise,
  Sunset
} from 'lucide-react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import useRealTimeData from '../../hooks/useRealTimeData';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';

const WEATHER_CODES = {
  0: { icon: Sun, description: 'Clear sky', color: '#FFB300' },
  1: { icon: Sun, description: 'Mainly clear', color: '#FFB300' },
  2: { icon: Cloud, description: 'Partly cloudy', color: '#90CAF9' },
  3: { icon: Cloud, description: 'Overcast', color: '#78909C' },
  45: { icon: Cloud, description: 'Foggy', color: '#B0BEC5' },
  48: { icon: Cloud, description: 'Depositing rime fog', color: '#B0BEC5' },
  51: { icon: CloudRain, description: 'Light drizzle', color: '#64B5F6' },
  53: { icon: CloudRain, description: 'Moderate drizzle', color: '#42A5F5' },
  55: { icon: CloudRain, description: 'Dense drizzle', color: '#2196F3' },
  61: { icon: CloudRain, description: 'Slight rain', color: '#64B5F6' },
  63: { icon: CloudRain, description: 'Moderate rain', color: '#42A5F5' },
  65: { icon: CloudRain, description: 'Heavy rain', color: '#2196F3' },
  71: { icon: CloudSnow, description: 'Slight snow fall', color: '#E1F5FE' },
  73: { icon: CloudSnow, description: 'Moderate snow fall', color: '#B3E5FC' },
  75: { icon: CloudSnow, description: 'Heavy snow fall', color: '#81D4FA' },
  80: { icon: CloudRain, description: 'Slight rain showers', color: '#64B5F6' },
  81: { icon: CloudRain, description: 'Moderate rain showers', color: '#42A5F5' },
  82: { icon: CloudRain, description: 'Violent rain showers', color: '#2196F3' },
  85: { icon: CloudSnow, description: 'Slight snow showers', color: '#B3E5FC' },
  86: { icon: CloudSnow, description: 'Heavy snow showers', color: '#81D4FA' },
  95: { icon: CloudRain, description: 'Thunderstorm', color: '#1976D2' },
  96: { icon: CloudRain, description: 'Thunderstorm with light hail', color: '#1565C0' },
  99: { icon: CloudRain, description: 'Thunderstorm with heavy hail', color: '#0D47A1' }
};

const getWindDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const WeatherStat = memo(({ label, value, unit, icon: Icon, color }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
      <Box
        sx={{
          backgroundColor: alpha(color || theme.palette.primary.main, 0.1),
          borderRadius: '50%',
          p: theme.spacing(0.75),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon size={18} color={color || theme.palette.primary.main} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight="medium">
          {value} {unit}
        </Typography>
      </Box>
    </Box>
  );
});

WeatherStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string
};

const Weather = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const [weather, setWeather] = useState(null);
  const [coords, setCoords] = useState({ latitude: 51.0501, longitude: -114.0853 });
  const [loading, setLoading] = useState(true);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // Use refs to track values to avoid infinite loop issues
  const firstGpsUpdateRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const coordsRef = useRef(coords);
  const inViewFirstUpdateRef = useRef(false);

  // Update refs when values change
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const { ref: resizeRef, width = 300, height = 400 } = useResizeObserver({
    box: 'border-box'
  });

  const updateInterval = settings?.dashboard?.updateInterval;
  const showTempInF = settings?.dashboard?.showTempInF || false;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;

  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // GPS data handler with safeguards against infinite loops
  const handleGPSData = useCallback((data) => {
    if (!inView) return;
    
    try {
      if (data && data.fields) {
        const { gnss_lat, gnss_long } = data.fields;
        
        if (typeof gnss_lat === 'number' && typeof gnss_long === 'number') {
          // Only update coordinates if they've changed meaningfully
          const currentCoords = coordsRef.current;
          const coordsChanged = 
            !currentCoords || 
            Math.abs(gnss_lat - currentCoords.latitude) > 0.001 || 
            Math.abs(gnss_long - currentCoords.longitude) > 0.001;
          
          if (coordsChanged) {
            const newCoords = { latitude: gnss_lat, longitude: gnss_long };
            setCoords(newCoords);
            
            if (!firstGpsUpdateRef.current) {
              firstGpsUpdateRef.current = true;
              fetchWeather(newCoords);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing GPS data:', err);
    }
  }, [inView]); // Don't include coords in dependency array to avoid loops

  const { ref: gpsRef } = useRealTimeData(
    'ins_gps', 
    handleGPSData,
    { customInterval: updateInterval, threshold: 0.1 }
  );

  // Fetch weather data with rate limiting and without state-derived dependencies
  const fetchWeather = useCallback(async (coordsToUse = coordsRef.current) => {
    if (!inView) return;
    
    const now = Date.now();
    // Rate limit to once every 30 seconds
    if (now - lastFetchTimeRef.current < 30000 && lastFetchTimeRef.current !== 0) {
      return;
    }
    
    lastFetchTimeRef.current = now;
    
    try {
      setFetchingWeather(true);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coordsToUse.latitude}&longitude=${coordsToUse.longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await response.json();
      setWeather(data.current_weather);
      setLoading(false);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setLoading(false);
    } finally {
      setFetchingWeather(false);
    }
  }, [inView]); // Only depend on inView

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Delay GPS-triggered fetch by 2 seconds to allow for multiple GPS updates
  useEffect(() => {
    if (!inView || !firstGpsUpdateRef.current) return;
    
    const timeoutId = setTimeout(() => {
      fetchWeather();
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [fetchWeather, inView]);

  // Periodic refresh (every 2 minutes) and initial fetch 
  useEffect(() => {
    if (!inView) return;
    
    // Don't initiate duplicate fetches if already loading/fetching
    if (!weather && !loading && !fetchingWeather) {
      fetchWeather();
    }
    
    // Set up periodic refresh with a long interval
    const intervalId = setInterval(() => {
      if (inView && !fetchingWeather) fetchWeather();
    }, 120000); // 2 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchWeather, weather, loading, fetchingWeather, inView]);

  // Fetch when component becomes visible
  useEffect(() => {
    if (inView && !inViewFirstUpdateRef.current) {
      inViewFirstUpdateRef.current = true;
      fetchWeather();
    }
  }, [inView, fetchWeather]);

  // Format temperature with memoization to avoid recalculations
  const formatTemperature = useCallback((temp) => {
    if (temp === undefined || temp === null) return 'N/A';
    
    if (showTempInF) {
      return ((temp * 9) / 5 + 32).toFixed(1);
    }
    return temp.toFixed(1);
  }, [showTempInF]);

  const temperatureUnit = useMemo(() => (
    showTempInF ? '°F' : '°C'
  ), [showTempInF]);

  // Get weather info with memoization
  const weatherInfo = useMemo(() => {
    if (!weather) return { icon: Cloud, description: 'Unknown', color: theme.palette.primary.main };
    return WEATHER_CODES[weather.weathercode] || { icon: Cloud, description: 'Unknown', color: theme.palette.primary.main };
  }, [weather, theme.palette.primary.main]);

  // Combine refs
  const setRefs = useCallback(node => {
    resizeRef(node);
    inViewRef(node);
    if (gpsRef) gpsRef(node);
  }, [resizeRef, inViewRef, gpsRef]);

  // Format time helper
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render appropriate content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress size={40} color="primary" />
        </Box>
      );
    }

    if (!weather) {
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: theme.spacing(2),
            textAlign: 'center'
          }}
        >
          <Typography variant="body2">
            Loading...
          </Typography>
        </Box>
      );
    }

    const { icon: WeatherIcon, description, color } = weatherInfo;

    // Compact view for small containers
    if (height < 200) {
      return (
        <Box sx={{ p: theme.spacing(1) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1), mb: theme.spacing(1) }}>
            <WeatherIcon size={32} color={color} />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">{description}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatTemperature(weather.temperature)} {temperatureUnit}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {weather.windspeed} km/h {getWindDirection(weather.winddirection)}
            </Typography>
          </Box>
        </Box>
      );
    }

    // Standard view
    return (
      <Box sx={{ p: theme.spacing(2) }}>
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: theme.spacing(3)
          }}
        >
          <Box 
            sx={{ 
              backgroundColor: alpha(color, 0.15),
              borderRadius: '50%',
              p: theme.spacing(2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: theme.spacing(1),
              boxShadow: `0 4px 20px ${alpha(color, 0.2)}`
            }}
          >
            <WeatherIcon 
              size={64} 
              color={color} 
              aria-hidden="true" 
            />
          </Box>
          <Typography 
            variant="h4" 
            component="h2" 
            fontWeight="medium"
          >
            {formatTemperature(weather.temperature)}{temperatureUnit}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {description}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              mt: 0.5
            }}
          >
            <MapPin size={12} />
            {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </Typography>
        </Box>

        <Box 
          sx={{ 
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            borderRadius: theme.shape.borderRadius,
            p: theme.spacing(2),
            mb: theme.spacing(2),
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <WeatherStat
                label="Wind"
                value={weather.windspeed}
                unit={`km/h ${getWindDirection(weather.winddirection)}`}
                icon={Wind}
                color={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={6}>
              <WeatherStat
                label="Humidity"
                value="62"
                unit="%"
                icon={Droplets}
                color={theme.palette.primary.main}
              />
            </Grid>
            {width > 250 && (
              <>
                <Grid item xs={6} sx={{ mt: 1 }}>
                  <WeatherStat
                    label="Updated"
                    value={formatTime(weather.time)}
                    unit=""
                    icon={RefreshCw}
                    color={theme.palette.text.secondary}
                  />
                </Grid>
                <Grid item xs={6} sx={{ mt: 1 }}>
                  <WeatherStat
                    label="Feels Like"
                    value={formatTemperature(weather.temperature - 1)}
                    unit={temperatureUnit}
                    icon={Thermometer}
                    color={theme.palette.error.main}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {height > 350 && width > 250 && (
          <Box 
            sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              p: theme.spacing(1),
              borderRadius: theme.shape.borderRadius,
              backgroundColor: alpha(theme.palette.background.default, 0.3),
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Sunrise size={16} color={theme.palette.warning.light} />
              <Typography variant="caption" display="block" color="text.secondary">
                Sunrise
              </Typography>
              <Typography variant="body2">
                6:24 AM
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Sunset size={16} color={theme.palette.warning.dark} />
              <Typography variant="caption" display="block" color="text.secondary">
                Sunset
              </Typography>
              <Typography variant="body2">
                8:12 PM
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Card
      ref={setRefs}
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        boxShadow: theme.custom?.shadows?.md,
        transition: animationsEnabled ? 
          theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.short
          }) : 'none',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      role="region"
      aria-label="Weather Conditions"
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Cloud size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              color="text.primary"
              sx={{ fontWeight: theme.typography.fontWeightMedium, lineHeight: 1.2, m: 0.5 }}
            >
              Weather Conditions
            </Typography>
          </Box>
        }
        action={
          <Tooltip title="Refresh weather data" arrow enterDelay={200} leaveDelay={0}>
            <IconButton
              onClick={handleRefresh}
              size="small"
              color="primary"
              aria-label="Refresh weather data"
              disabled={fetchingWeather}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
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
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          '&:last-child': {
            pb: 0,
          }
        }}
      >
        {!inView ? (
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
          renderContent()
        )}
      </CardContent>
    </Card>
  );
};

export default memo(Weather);