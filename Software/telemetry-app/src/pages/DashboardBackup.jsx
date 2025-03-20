import React, { memo, useState, useContext, useCallback, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
  Tooltip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Fade,
} from '@mui/material';
import {
  Zap,
  Battery,
  Thermometer,
  Map,
  Gauge,
  Menu as MenuIcon,
  RefreshCw,
  Settings as SettingsIcon,
  LayoutDashboard,
} from 'lucide-react';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';

// Import components
import CellHeatmap from '../components/visuals/CellHeatmap';
import SpeedometerGauge from '../components/visuals/SpeedometerGauge';
import SoCIndicator from '../components/visuals/SoCIndicator';
import LiveGPSMap from '../components/visuals/LiveGPSMap';
import PedalsGauge from '../components/visuals/PedalsGauge';
import MotorControllerTempGauge from '../components/visuals/MotorControllerTempGauge';
import ChartSettingsModal from '../modals/ChartSettingsModal';

// Component for section titles with optional icon and extra content
const SectionTitle = memo(({ children, icon: Icon, extraContent }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '8px 12px',
        borderBottom: '1px solid rgba(70, 80, 90, 0.3)',
        backgroundColor: 'rgba(20, 25, 30, 0.4)',
        borderTopLeftRadius: theme.shape.borderRadius,
        borderTopRightRadius: theme.shape.borderRadius,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon && <Icon size={16} aria-hidden="true" />}
        <Typography
          component="h3"
          sx={{
            color: '#e0e0e0',
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {children}
        </Typography>
      </Box>
      {extraContent && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {extraContent}
        </Box>
      )}
    </Box>
  );
});

SectionTitle.propTypes = {
  children: PropTypes.node.isRequired,
  icon: PropTypes.elementType,
  extraContent: PropTypes.node,
};

// Dashboard section component with consistent styling
const DashboardSection = memo(({
  title,
  children,
  minHeight,
  extraContent,
  icon,
  accentColor = '#3f88c5',
  fullHeight = true
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 36, 40, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        height: fullHeight ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '3px',
          background: accentColor,
        },
        minHeight,
        transform: 'translateZ(0)', // Hardware acceleration
      }}
      elevation={0}
    >
      <SectionTitle icon={icon} extraContent={extraContent}>
        {title}
      </SectionTitle>
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          p: { xs: 0, sm: 0, md: 0 }
        }}
      >
        {children}
      </Box>
    </Paper>
  );
});

DashboardSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  minHeight: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  extraContent: PropTypes.node,
  icon: PropTypes.elementType,
  accentColor: PropTypes.string,
  fullHeight: PropTypes.bool,
};

// Status indicator component
const StatusIndicator = memo(({ status, color, label }) => (
  <Box
    component="span"
    sx={{
      color: color,
      fontSize: '0.7rem',
      fontWeight: 500,
      backgroundColor: `${color}15`,
      padding: '2px 8px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      border: `1px solid ${color}30`,
    }}
    aria-label={`Status: ${label}`}
  >
    <Box
      component="span"
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
      }}
      aria-hidden="true"
    />
    {label}
  </Box>
));

StatusIndicator.propTypes = {
  status: PropTypes.string,
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

// Main Dashboard component
const Dashboard = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));
  const { settings, updateSettings } = useContext(ChartSettingsContext);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // Visibility tracking for performance using intersection observer
  const sectionRefs = useRef({
    batteryState: useRef(null),
    packStatus: useRef(null),
    speedometer: useRef(null),
    cellHeatmap: useRef(null),
    pedalInput: useRef(null),
    motorTemp: useRef(null),
    gpsMap: useRef(null),
  });
  
  // Component visibility state based on settings
  const compactMode = settings?.dashboard?.compactMode || false;
  const showBatteryStatus = settings?.dashboard?.showBatteryStatus !== false;
  const showSpeedGauge = settings?.dashboard?.showSpeedGauge !== false;
  const showTempGauge = settings?.dashboard?.showTempGauge !== false;
  const showGpsMap = settings?.dashboard?.showGpsMap !== false;
  const showCellHeatmap = settings?.dashboard?.showCellHeatmap !== false;
  const showPedalGauge = settings?.dashboard?.showPedalGauge !== false;
  
  // Menu handlers
  const handleMenuOpen = useCallback((event) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);
  
  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);
  
  // Settings modal handlers
  const handleOpenSettings = useCallback(() => {
    setSettingsModalOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);
  
  const handleCloseSettings = useCallback(() => {
    setSettingsModalOpen(false);
  }, []);
  
  // Toggle compact mode
  const toggleCompactMode = useCallback(() => {
    updateSettings('dashboard', 'compactMode', !compactMode);
    handleMenuClose();
  }, [compactMode, updateSettings, handleMenuClose]);
  
  // Refresh handler
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  
  // Accent colors
  const primaryAccent = theme.palette.primary.main;
  const secondaryAccent = theme.palette.secondary.main;
  const tertiaryAccent = theme.palette.info.main;
  const batteryAccent = theme.palette.success.main;
  
  // Simplified status indicators
  const systemsNominalStatus = useMemo(() => (
    <StatusIndicator status="active" color={secondaryAccent} label="SYSTEMS NOMINAL" />
  ), [secondaryAccent]);
  
  const realTimeStatus = useMemo(() => (
    <StatusIndicator status="active" color={primaryAccent} label="REAL-TIME" />
  ), [primaryAccent]);
  
  // Set up intersection observer to track visible sections
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.dataset.sectionId;
        if (sectionId) {
          // Could be used to update visibility tracking if needed
        }
      });
    }, observerOptions);
    
    // Observe all section refs
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref.current) {
        sectionObserver.observe(ref.current);
      }
    });
    
    return () => {
      sectionObserver.disconnect();
    };
  }, []);
  
  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 'auto', md: '100vh' },
        backgroundColor: theme.palette.mode === 'dark' ? '#161a1d' : '#f5f5f5',
        backgroundImage: theme.palette.mode === 'dark' 
          ? 'linear-gradient(rgba(20, 25, 30, 0.7), rgba(20, 25, 30, 0.7))'
          : 'linear-gradient(rgba(245, 245, 245, 0.7), rgba(245, 245, 245, 0.7))',
        backgroundSize: 'cover',
        overflowY: 'auto',
        overflowX: 'hidden',
        p: compactMode ? { xs: 1, sm: 1.5, md: 2 } : { xs: 1.5, sm: 2, md: 2.5 },
        scrollBehavior: 'smooth',
      }}
      role="main"
      aria-label="Vehicle Telemetry Dashboard"
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: compactMode ? 1.5 : 2,
        pb: compactMode ? 1 : 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              fontSize: { xs: '1.25rem', sm: '1.35rem', md: '1.5rem' },
              '&::before': {
                content: '""',
                width: 4,
                height: 24,
                backgroundColor: primaryAccent,
                marginRight: 1.5,
                borderRadius: 1,
              }
            }}
          >
            Vehicle Telemetry Dashboard
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ 
              color: theme.palette.text.secondary, 
              ml: 2.5, 
              mt: 0.5, 
              fontSize: '0.85rem' 
            }}
          >
            Real-time monitoring and visualization
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Refresh button */}
          <Tooltip title="Refresh all data" arrow>
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              sx={{ color: theme.palette.text.secondary }}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          
          {/* Settings button */}
          <Tooltip title="Dashboard settings" arrow>
            <IconButton 
              size="small" 
              onClick={handleOpenSettings}
              sx={{ color: theme.palette.text.secondary }}
              aria-label="Open dashboard settings"
            >
              <SettingsIcon size={18} />
            </IconButton>
          </Tooltip>
          
          {/* Menu button */}
          <Tooltip title="Dashboard menu" arrow>
            <IconButton 
              size="small" 
              onClick={handleMenuOpen}
              sx={{ color: theme.palette.text.secondary }}
              aria-label="Open dashboard menu"
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : 'false'}
              aria-controls={menuOpen ? 'dashboard-menu' : undefined}
            >
              <MenuIcon size={18} />
            </IconButton>
          </Tooltip>
          
          {/* Menu */}
          <Menu
            id="dashboard-menu"
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            TransitionComponent={Fade}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            MenuListProps={{
              'aria-labelledby': 'dashboard-menu-button',
              dense: true,
            }}
          >
            <MenuItem onClick={toggleCompactMode}>
              <LayoutDashboard size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              {compactMode ? 'Standard Mode' : 'Compact Mode'}
            </MenuItem>
            <MenuItem onClick={handleOpenSettings}>
              <SettingsIcon size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Dashboard Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleRefresh}>
              <RefreshCw size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Refresh Data
            </MenuItem>
          </Menu>
          
          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.palette.divider, height: 24 }} />
          
          {systemsNominalStatus}
        </Box>
      </Box>

      {/* Settings Modal */}
      <ChartSettingsModal isOpen={settingsModalOpen} onClose={handleCloseSettings} />

      {/* Responsive Layout */}
      {isSmallScreen ? (
        // Mobile/Tablet Layout: Single-column with key components first
        <Grid container spacing={compactMode ? 1 : 2}>
          {/* Speed Section */}
          {showSpeedGauge && (
            <Grid item xs={12}>
              <DashboardSection
                title="Vehicle Speed"
                minHeight={{ xs: 350, sm: 400 }}
                icon={Gauge}
                accentColor={primaryAccent}
                extraContent={realTimeStatus}
                data-section-id="speedometer"
                ref={sectionRefs.current.speedometer}
              >
                <SpeedometerGauge />
              </DashboardSection>
            </Grid>
          )}
          
          {/* Battery Section */}
          {showBatteryStatus && (
            <Grid item xs={12} container spacing={compactMode ? 1 : 2}>
              <Grid item xs={12} sm={6}>
                <DashboardSection
                  title="Battery State of Charge"
                  minHeight={{ xs: 200, sm: 220 }}
                  icon={Battery}
                  accentColor={batteryAccent}
                  data-section-id="batteryState"
                  ref={sectionRefs.current.batteryState}
                >
                  <SoCIndicator />
                </DashboardSection>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DashboardSection
                  title="Battery Cell Temperature"
                  minHeight={{ xs: 200, sm: 220 }}
                  icon={Thermometer}
                  accentColor={tertiaryAccent}
                  data-section-id="cellHeatmap"
                  ref={sectionRefs.current.cellHeatmap}
                >
                  <CellHeatmap />
                </DashboardSection>
              </Grid>
            </Grid>
          )}
          
          {/* Pedals and Temperature Section */}
          <Grid item xs={12} container spacing={compactMode ? 1 : 2}>
            {showPedalGauge && (
              <Grid item xs={12} sm={6}>
                <DashboardSection
                  title="Pedal Input"
                  minHeight={{ xs: 220, sm: 240 }}
                  icon={Gauge}
                  accentColor={tertiaryAccent}
                  data-section-id="pedalInput"
                  ref={sectionRefs.current.pedalInput}
                >
                  <PedalsGauge />
                </DashboardSection>
              </Grid>
            )}
            {showTempGauge && (
              <Grid item xs={12} sm={6}>
                <DashboardSection
                  title="Motor Temperature"
                  minHeight={{ xs: 220, sm: 240 }}
                  icon={Thermometer}
                  accentColor={tertiaryAccent}
                  data-section-id="motorTemp"
                  ref={sectionRefs.current.motorTemp}
                >
                  <MotorControllerTempGauge />
                </DashboardSection>
              </Grid>
            )}
          </Grid>
          
          {/* GPS Map Section */}
          {showGpsMap && (
            <Grid item xs={12}>
              <DashboardSection
                title="GPS Location"
                minHeight={{ xs: 300, sm: 320 }}
                icon={Map}
                accentColor={primaryAccent}
                extraContent={
                  <StatusIndicator status="active" color={secondaryAccent} label="TRACKING" />
                }
                data-section-id="gpsMap"
                ref={sectionRefs.current.gpsMap}
              >
                <LiveGPSMap />
              </DashboardSection>
            </Grid>
          )}
        </Grid>
      ) : (
        // Desktop Layout: Multi-column responsive layout with better spacing
        <Grid container spacing={compactMode ? 1 : 2}>
          {/* Left Column */}
          <Grid item xs={12} md={4} lg={3} xl={2.5} sx={{ height: 'calc(100vh - 120px)' }}>
            <Grid container spacing={compactMode ? 1 : 2} height="100%">
              {showBatteryStatus && (
                <Grid item xs={12}>
                  <DashboardSection
                    title="Battery State of Charge"
                    minHeight={{ md: 240, lg: 260, xl: 280 }}
                    icon={Battery}
                    accentColor={batteryAccent}
                    data-section-id="batteryState"
                    ref={sectionRefs.current.batteryState}
                  >
                    <SoCIndicator />
                  </DashboardSection>
                </Grid>
              )}
              {showCellHeatmap && (
                <Grid item xs={12} sx={{ flexGrow: 1 }}>
                  <DashboardSection
                    title="Battery Cell Temperature"
                    minHeight={{ md: 300, lg: 320 }}
                    fullHeight
                    icon={Thermometer}
                    accentColor={tertiaryAccent}
                    data-section-id="cellHeatmap"
                    ref={sectionRefs.current.cellHeatmap}
                  >
                    <CellHeatmap />
                  </DashboardSection>
                </Grid>
              )}
            </Grid>
          </Grid>
          
          {/* Middle Column */}
          <Grid item xs={12} md={5} lg={6} xl={7} sx={{ height: 'calc(100vh - 120px)' }}>
            <Grid container spacing={compactMode ? 1 : 2} sx={{ height: '100%' }}>
              {/* Vehicle Overview Section */}
              {showSpeedGauge && (
                <Grid item xs={12} sx={{ height: { md: '60%', lg: '65%' }, minHeight: '400px' }}>
                  <DashboardSection
                    title="Vehicle Telemetry Overview"
                    fullHeight
                    icon={Gauge}
                    accentColor={primaryAccent}
                    extraContent={systemsNominalStatus}
                    data-section-id="speedometer"
                    ref={sectionRefs.current.speedometer}
                  >
                    <SpeedometerGauge />
                  </DashboardSection>
                </Grid>
              )}
              
              {/* Speed and Pedals Row */}
              <Grid item xs={12} sx={{ height: { md: '40%', lg: '35%' }, minHeight: '250px' }}>
                <Grid container spacing={compactMode ? 1 : 2} sx={{ height: '100%' }}>
                  {showPedalGauge && (
                    <Grid item xs={12} sm={6} sx={{ height: '100%' }}>
                      <DashboardSection
                        title="Pedal Input"
                        fullHeight
                        icon={Gauge}
                        accentColor={tertiaryAccent}
                        data-section-id="pedalInput"
                        ref={sectionRefs.current.pedalInput}
                      >
                        <PedalsGauge />
                      </DashboardSection>
                    </Grid>
                  )}
                  {showTempGauge && (
                    <Grid item xs={12} sm={6} sx={{ height: '100%' }}>
                      <DashboardSection
                        title="Motor Temperature"
                        fullHeight
                        icon={Thermometer}
                        accentColor={tertiaryAccent}
                        data-section-id="motorTemp"
                        ref={sectionRefs.current.motorTemp}
                      >
                        <MotorControllerTempGauge />
                      </DashboardSection>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Right Column */}
          <Grid item xs={12} md={3} lg={3} xl={2.5} sx={{ height: 'calc(100vh - 120px)' }}>
            {showGpsMap && (
              <Grid container spacing={compactMode ? 1 : 2} height="100%">
                <Grid item xs={12} sx={{ flexGrow: 1 }}>
                  <DashboardSection
                    title="GPS Location"
                    minHeight={{ md: 320, lg: 340 }}
                    fullHeight
                    icon={Map}
                    accentColor={primaryAccent}
                    extraContent={<StatusIndicator status="active" color={secondaryAccent} label="TRACKING" />}
                    data-section-id="gpsMap"
                    ref={sectionRefs.current.gpsMap}
                  >
                    <LiveGPSMap />
                  </DashboardSection>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default memo(Dashboard);