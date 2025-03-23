import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  ButtonGroup,
  Tooltip,
  Chip,
  Divider,
  Paper,
  MenuItem,
} from '@mui/material';
import { 
  Close, 
  ExpandMore, 
  Star, 
  StarBorder,
} from '@mui/icons-material';
import {
  Cpu, Navigation, MapPin, Satellite, BatteryCharging,
  Battery, Thermometer, CircuitBoard, Gauge, Settings as LucideSettings, RotateCw,
  Zap, Wind, Activity, BarChartHorizontal, GaugeCircle, Hash, Radio,
  RefreshCw, Fan, HelpCircle, ThermometerSun, Milestone, Send,
  RefreshCcw, Flashlight, Repeat, LayoutDashboard, Vibrate, Download as LucideDownload
} from 'lucide-react';
import { useChartSelection } from '../../contexts/ChartSelectionContext';

// Enhanced icon mapping
const iconMapping = {
  Cpu: <Cpu size={16} />,
  BatteryCharging: <BatteryCharging size={16} />,
  BarChart: <BarChartHorizontal size={16} />,
  Thermostat: <ThermometerSun size={16} />,
  DirectionsCar: <Navigation size={16} />,
  Send: <Send size={16} />,
  Autorenew: <RotateCw size={16} />,
  FlashOn: <Flashlight size={16} />,
  Repeat: <Repeat size={16} />,
  Dashboard: <LayoutDashboard size={16} />,
  LocationOn: <MapPin size={16} />,
  Vibration: <Vibrate size={16} />,
  Speed: <Zap size={16} />,
  Air: <Wind size={16} />,
  Settings: <LucideSettings size={16} />,
  Download: <LucideDownload size={16} />,
  Activity: <Activity size={16} />,
  HelpCircle: <HelpCircle size={16} />,
  Gauge: <Gauge size={16} />,
  Thermometer: <Thermometer size={16} />,
  Battery: <Battery size={16} />,
  Circuit: <CircuitBoard size={16} />,
  Satellite: <Satellite size={16} />,
};

const GraphSelector = ({ groupedOptions, viewType = 'realTime' }) => {
  const { 
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    historicalSelectedCharts,
    setHistoricalSelectedCharts,
    favorites,
    toggleFavorite,
    isFavorite,
    clearSelection,
    selectAll,
    unselectAll,
  } = useChartSelection();
  
  // Use the correct state based on viewType
  const selected = viewType === 'realTime' ? realTimeSelectedCharts : historicalSelectedCharts;
  const setSelected = viewType === 'realTime' ? setRealTimeSelectedCharts : setHistoricalSelectedCharts;
    
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Set first category as expanded by default
  useEffect(() => {
    if (groupedOptions?.length > 0) {
      setExpandedCategories({ [groupedOptions[0].category]: true });
    }
  }, [groupedOptions]);

  const handleToggle = (value) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSelectAllInCategory = (group) => {
    selectAll(group, viewType);
  };

  const handleUnselectAllInCategory = (group) => {
    unselectAll(group, viewType);
  };

  const handleClearSelection = () => {
    clearSelection(viewType);
  };
  
  const handleAccordionChange = (category) => (_, isExpanded) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: isExpanded
    }));
  };
  
  const handleToggleFavorite = (value) => {
    toggleFavorite(value, viewType);
  };

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
  
  
  // Calculate selection counts per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    
    groupedOptions.forEach(group => {
      const totalInCategory = group.options.length;
      const selectedInCategory = group.options.filter(opt => 
        selected.includes(opt.value)
      ).length;
      
      counts[group.category] = {
        total: totalInCategory,
        selected: selectedInCategory
      };
    });
    
    return counts;
  }, [groupedOptions, selected]);

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: 1,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Search Charts"
          size="small"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton
                    onClick={() => setSearchQuery('')}
                    sx={{ color: 'action.active', p: '3px' }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{ 
            bgcolor: 'action.hover', 
            borderRadius: '6px',
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            }
          }}
        />
      </Box>
      
      {/* Selection actions and stats */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleClearSelection}
          disabled={selected.length === 0}
        >
          Clear All
        </Button>
        
        <Chip 
          label={`${selected.length} selected`} 
          color="primary" 
          size="small"
          variant={selected.length > 0 ? "filled" : "outlined"}
        />
      </Box>
      
      
      {/* Search Results */}
      {searchQuery ? (
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Search Results
          </Typography>
          
          {filteredOptions.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
            >
              No charts found matching "{searchQuery}"
            </Typography>
          ) : (
            <FormGroup sx={{ flexDirection: 'column', gap: 0.5 }}>
              {filteredOptions.map((option) => {
                const isChecked = selected.includes(option.value);
                const isFav = isFavorite(option.value, viewType);
                
                return (
                  <FormControlLabel
                    key={`search-${option.value}`}
                    sx={{
                      m: 0,
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      bgcolor: isChecked ? 'primary.dark' : 'background.default',
                      color: isChecked ? 'primary.contrastText' : 'inherit',
                      '&:hover': {
                        bgcolor: isChecked ? 'primary.dark' : 'action.hover',
                      },
                    }}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={() => handleToggle(option.value)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {iconMapping[option.icon] || iconMapping.HelpCircle}
                          <Typography variant="body2" sx={{ ml: 0.5 }}>
                            {option.label}
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleFavorite(option.value);
                          }}
                          sx={{ 
                            ml: 1, 
                            p: 0.5,
                            color: isFav ? 'warning.main' : 'action.active'
                          }}
                        >
                          {isFav ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>
                      </Box>
                    }
                  />
                );
              })}
            </FormGroup>
          )}
        </Box>
      ) : (
        // Categories
        <Box>
          {groupedOptions.map((group) => {
            const categoryCount = categoryCounts[group.category];
            const isExpanded = expandedCategories[group.category] || false;
            
            return (
              <Accordion
                key={group.category}
                sx={{
                  mb: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  '&::before': { display: 'none' },
                }}
                expanded={isExpanded}
                onChange={handleAccordionChange(group.category)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    bgcolor: 'action.disabledBackground',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {group.category}
                    </Typography>
                    <Tooltip title={`${categoryCount.selected} of ${categoryCount.total} selected`}>
                      <Chip 
                        label={`${categoryCount.selected}/${categoryCount.total}`}
                        size="small"
                        color={categoryCount.selected > 0 ? "primary" : "default"}
                        variant={categoryCount.selected > 0 ? "filled" : "outlined"}
                        sx={{ ml: 1, minWidth: 45 }}
                      />
                    </Tooltip>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'background.default', p: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    <ButtonGroup variant="contained" size="small">
                      <Button 
                        onClick={() => handleSelectAllInCategory(group)}
                        disabled={categoryCount.selected === categoryCount.total}
                      >
                        Select All
                      </Button>
                      <Button 
                        onClick={() => handleUnselectAllInCategory(group)}
                        disabled={categoryCount.selected === 0}
                      >
                        Unselect All
                      </Button>
                    </ButtonGroup>
                  </Box>
                  <FormGroup sx={{ flexDirection: 'column', gap: 0.5 }}>
                    {group.options.map((option) => {
                      const isChecked = selected.includes(option.value);
                      const isFav = isFavorite(option.value, viewType);
                      
                      return (
                        <FormControlLabel
                          key={option.value}
                          sx={{
                            m: 0,
                            borderRadius: '4px',
                            transition: 'background-color 0.2s',
                            bgcolor: isChecked ? 'primary.dark' : 'background.default',
                            color: isChecked ? 'primary.contrastText' : 'inherit',
                            '&:hover': {
                              bgcolor: isChecked ? 'primary.dark' : 'action.hover',
                            },
                          }}
                          control={
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              onChange={() => handleToggle(option.value)}
                              color="primary"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {iconMapping[option.icon] || iconMapping.HelpCircle}
                                <Typography variant="body2" sx={{ ml: 0.5 }}>
                                  {option.label}
                                </Typography>
                              </Box>
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleToggleFavorite(option.value);
                                }}
                                sx={{ 
                                  ml: 1, 
                                  p: 0.5,
                                  color: isFav ? 'warning.main' : 'action.active'
                                }}
                              >
                                {isFav ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                              </IconButton>
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default React.memo(GraphSelector);