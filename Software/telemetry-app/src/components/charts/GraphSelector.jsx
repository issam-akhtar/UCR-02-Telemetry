import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Button,
  Chip,
} from '@mui/material';
import { 
  Star, 
  StarBorder,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Cpu, Navigation, MapPin, Satellite, BatteryCharging,
  Battery, Thermometer, CircuitBoard, Gauge, Settings as LucideSettings, RotateCw,
  Zap, Wind, Activity, BarChartHorizontal, GaugeCircle, Hash, Radio,
  RefreshCw, Fan, HelpCircle, ThermometerSun, Milestone, Send,
  RefreshCcw, Flashlight, Repeat, LayoutDashboard, Vibrate, Download as LucideDownload
} from 'lucide-react';
import { useChartSelection } from '../../contexts/ChartSelectionContext';

// Icon mapping with yellow color for the icons
const iconMapping = {
  Cpu: <Cpu size={20} strokeWidth={1.5} color="#FFD700" />,
  BatteryCharging: <BatteryCharging size={20} strokeWidth={1.5} color="#FFD700" />,
  BarChart: <BarChartHorizontal size={20} strokeWidth={1.5} color="#FFD700" />,
  Thermostat: <ThermometerSun size={20} strokeWidth={1.5} color="#FFD700" />,
  DirectionsCar: <Navigation size={20} strokeWidth={1.5} color="#FFD700" />,
  Send: <Send size={20} strokeWidth={1.5} color="#FFD700" />,
  Autorenew: <RotateCw size={20} strokeWidth={1.5} color="#FFD700" />,
  FlashOn: <Flashlight size={20} strokeWidth={1.5} color="#FFD700" />,
  Repeat: <Repeat size={20} strokeWidth={1.5} color="#FFD700" />,
  Dashboard: <LayoutDashboard size={20} strokeWidth={1.5} color="#FFD700" />,
  LocationOn: <MapPin size={20} strokeWidth={1.5} color="#FFD700" />,
  Vibration: <Vibrate size={20} strokeWidth={1.5} color="#FFD700" />,
  Speed: <Zap size={20} strokeWidth={1.5} color="#FFD700" />,
  Air: <Wind size={20} strokeWidth={1.5} color="#FFD700" />,
  Settings: <LucideSettings size={20} strokeWidth={1.5} color="#FFD700" />,
  Download: <LucideDownload size={20} strokeWidth={1.5} color="#FFD700" />,
  Activity: <Activity size={20} strokeWidth={1.5} color="#FFD700" />,
  HelpCircle: <HelpCircle size={20} strokeWidth={1.5} color="#FFD700" />,
  Gauge: <Gauge size={20} strokeWidth={1.5} color="#FFD700" />,
  Thermometer: <Thermometer size={20} strokeWidth={1.5} color="#FFD700" />,
  Battery: <Battery size={20} strokeWidth={1.5} color="#FFD700" />,
  Circuit: <CircuitBoard size={20} strokeWidth={1.5} color="#FFD700" />,
  Satellite: <Satellite size={20} strokeWidth={1.5} color="#FFD700" />,
  MapPin: <MapPin size={20} strokeWidth={1.5} color="#FFD700" />,
};

// Chart option item component
const ChartOption = React.memo(({ 
  option, 
  isChecked, 
  isFavorite,
  onToggle, 
  onToggleFavorite,
  getIconForOption
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#333333',
      padding: 2,
      borderRadius: 3,
      mb: 1.5,
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#3A3A3A',
      }
    }}
  >
    <Box
      onClick={onToggle}
      sx={{
        width: 20,
        height: 20,
        border: '1px solid #FF3B30',
        borderRadius: 0.5,
        bgcolor: isChecked ? '#FF3B30' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 2,
        cursor: 'pointer',
        '&::after': isChecked ? {
          content: '""',
          display: 'block',
          width: 10,
          height: 6,
          borderLeft: '2px solid white',
          borderBottom: '2px solid white',
          transform: 'rotate(-45deg) translate(1px, -1px)',
        } : {}
      }}
    />
    
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
      {getIconForOption(option)}
    </Box>
    
    <Typography 
      variant="body1" 
      sx={{ 
        color: 'white',
        flexGrow: 1,
        fontWeight: 400,
      }}
    >
      {option.label}
    </Typography>
    
  </Box>
));

// Category component
const Category = React.memo(({
  category,
  options,
  selected,
  isFavorite,
  onToggle,
  onToggleFavorite,
  onSelectAll,
  onUnselectAll,
  getIconForOption
}) => {
  // Count selected items in this category
  const selectedCount = options.filter(opt => selected.includes(opt.value)).length;
  const totalCount = options.length;

  return (
    <Box sx={{ mb: 4 }}>
      {/* Category header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#FF3B30',
              fontWeight: 'bold',
              fontSize: '1.25rem' 
            }}
          >
            {category}
          </Typography>
          
          <Box
            sx={{
              backgroundColor: '#FF3B30',
              borderRadius: 1,
              px: 2,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              sx={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              {selectedCount}/{totalCount}
            </Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2 
        }}>
          <Button
            onClick={onSelectAll}
            fullWidth
            sx={{
              py: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.23)',
              color: 'white',
              borderRadius: 1,
              textTransform: 'none',
              bgcolor: '#333333',
              '&:hover': {
                backgroundColor: '#3A3A3A',
                border: '1px solid rgba(255, 255, 255, 0.23)',
              }
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              Select All
            </Typography>
          </Button>
          
          <Button
            onClick={onUnselectAll}
            fullWidth
            sx={{
              py: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.23)',
              color: '#FF9500',
              borderRadius: 1,
              textTransform: 'none',
              bgcolor: '#333333',
              '&:hover': {
                backgroundColor: '#3A3A3A',
                border: '1px solid rgba(255, 255, 255, 0.23)',
              }
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              Unselect All
            </Typography>
          </Button>
        </Box>
      </Box>

      {/* Options list */}
      <Box>
        {options.map((option) => (
          <ChartOption
            key={option.value}
            option={option}
            isChecked={selected.includes(option.value)}
            isFavorite={isFavorite(option.value)}
            onToggle={() => onToggle(option.value)}
            onToggleFavorite={(e) => onToggleFavorite(e, option.value)}
            getIconForOption={getIconForOption}
          />
        ))}
      </Box>
    </Box>
  );
});

const GraphSelector = ({ groupedOptions, viewType = 'realTime' }) => {
  const { 
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    historicalSelectedCharts,
    setHistoricalSelectedCharts,
    toggleFavorite,
    isFavorite
  } = useChartSelection();
  
  // Use the correct state based on viewType
  const selected = viewType === 'realTime' ? realTimeSelectedCharts : historicalSelectedCharts;
  const setSelected = viewType === 'realTime' ? setRealTimeSelectedCharts : setHistoricalSelectedCharts;
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Memoize handlers to prevent recreation on every render
  const handleToggle = useCallback((value) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, [setSelected]);
  
  const handleToggleFavorite = useCallback((event, value) => {
    // Stop propagation to prevent the checkbox from toggling
    event.stopPropagation();
    event.preventDefault();
    toggleFavorite(value, viewType);
  }, [toggleFavorite, viewType]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Get icon for option with fallback - memoized
  const getIconForOption = useCallback((option) => {
    const icon = option.icon;
    return iconMapping[icon] || iconMapping.HelpCircle;
  }, []);

  // Handler for selecting all items in a category
  const handleSelectAllInCategory = useCallback((options) => {
    const optionValues = options.map(opt => opt.value);
    setSelected(prev => {
      const newSelection = [...prev];
      optionValues.forEach(value => {
        if (!newSelection.includes(value)) {
          newSelection.push(value);
        }
      });
      return newSelection;
    });
  }, [setSelected]);

  // Handler for unselecting all items in a category
  const handleUnselectAllInCategory = useCallback((options) => {
    const optionValues = options.map(opt => opt.value);
    setSelected(prev => prev.filter(value => !optionValues.includes(value)));
  }, [setSelected]);

  // Calculate filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return [];
    
    return groupedOptions
      .flatMap((group) => group.options)
      .filter(
        (option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [searchQuery, groupedOptions]);

  // Get total selected count and total option count
  const totalSelected = useMemo(() => 
    selected.length
  , [selected]);

  const totalOptions = useMemo(() => 
    groupedOptions.reduce((sum, group) => sum + group.options.length, 0)
  , [groupedOptions]);

  // Get title based on view type
  const pageTitle = useMemo(() => {
    if (viewType === 'realTime') {
      return searchQuery ? 'Search Results' : 'Vehicle Control';
    } else {
      return searchQuery ? 'Search Results' : 'Historical Data';
    }
  }, [viewType, searchQuery]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1A1A1A',
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: 2,
          mb: 1
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              color: '#FF3B30',
              fontWeight: 'bold'
            }}
          >
            {pageTitle}
          </Typography>
          
          <Box
            sx={{
              backgroundColor: '#FF3B30',
              borderRadius: 1,
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {totalSelected}/{totalOptions}
            </Typography>
          </Box>
        </Box>

        {/* Search field */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#333333',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 2
          }}
        >
          <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)', mr: 1 }} />
          <InputBase
            placeholder="Search charts..."
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            sx={{
              color: 'white',
              '&::placeholder': {
                color: '#FFD700',
                opacity: 0.7
              },
              '& input': {
                color: 'white',
                '&::placeholder': {
                  color: '#FFD700',
                  opacity: 0.7
                }
              }
            }}
          />
          {searchQuery && (
            <IconButton
              size="small"
              onClick={handleClearSearch}
              sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content area with categories or search results */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: 2,
          pb: 2,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1A1A1A',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#1E88E5',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#1976D2',
          },
        }}
      >
        {searchQuery ? (
          // Search results
          <Box>
            {filteredOptions.length === 0 ? (
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  mt: 4
                }}
              >
                No charts found matching "{searchQuery}"
              </Typography>
            ) : (
              filteredOptions.map((option) => (
                <ChartOption
                  key={`search-${option.value}`}
                  option={option}
                  isChecked={selected.includes(option.value)}
                  isFavorite={isFavorite(option.value, viewType)}
                  onToggle={() => handleToggle(option.value)}
                  onToggleFavorite={(e) => handleToggleFavorite(e, option.value)}
                  getIconForOption={getIconForOption}
                />
              ))
            )}
          </Box>
        ) : (
          // Categories
          groupedOptions.map((group) => (
            <Category
              key={group.category}
              category={group.category}
              options={group.options}
              selected={selected}
              isFavorite={(value) => isFavorite(value, viewType)}
              onToggle={handleToggle}
              onToggleFavorite={handleToggleFavorite}
              onSelectAll={() => handleSelectAllInCategory(group.options)}
              onUnselectAll={() => handleUnselectAllInCategory(group.options)}
              getIconForOption={getIconForOption}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default React.memo(GraphSelector);