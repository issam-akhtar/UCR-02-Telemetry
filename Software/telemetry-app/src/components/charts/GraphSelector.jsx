import React, { useState } from 'react';
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
} from '@mui/material';
import { Close, ExpandMore } from '@mui/icons-material';
import { 
  Cpu, Navigation, MapPin, Satellite, 
  BatteryCharging, Battery, Thermometer, CircuitBoard,
  Gauge, Settings, RotateCw, Zap,
  Wind, Activity, BarChartHorizontal, GaugeCircle, 
  Hash, Radio, RefreshCw, Fan, HelpCircle,
  ThermometerSun, Milestone, Send, RefreshCcw, Flashlight, Repeat, LayoutDashboard, Vibrate, Download
} from 'lucide-react';

const iconMapping = {
  Cpu: <Cpu size={16} />,
  BatteryCharging: <BatteryCharging size={16} />,
  BarChart: <BarChartHorizontal size={16} />,
  // For Thermostat, use ThermometerSun
  Thermostat: <ThermometerSun size={16} />,
  // For DirectionsCar, use Navigation
  DirectionsCar: <Navigation size={16} />,
  Send: <Send size={16} />,
  // For Autorenew, use RotateCw
  Autorenew: <RotateCw size={16} />,
  // For FlashOn, use Flashlight
  FlashOn: <Flashlight size={16} />,
  Repeat: <Repeat size={16} />,
  // For Dashboard, use LayoutDashboard
  Dashboard: <LayoutDashboard size={16} />,
  // For LocationOn, use MapPin
  LocationOn: <MapPin size={16} />,
  // For Vibration, use Vibrate
  Vibration: <Vibrate size={16} />,
  // For Speed, use Zap
  Speed: <Zap size={16} />,
  // For Air, use Wind (already defined)
  Air: <Wind size={16} />,
  Settings: <Settings size={16} />,
  Download: <Download size={16} />,
  // Fallback and additional mappings
  Activity: <Activity size={16} />,
  HelpCircle: <HelpCircle size={16} />,
};

const GraphSelector = ({ groupedOptions, selected, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = (value) => {
    onChange((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const filteredOptions = searchQuery
    ? groupedOptions
        .flatMap((group) => group.options)
        .filter(
          (option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            option.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  return (
    <Box sx={{ borderRadius: 1, backgroundColor: 'background.paper' }}>
      <Box sx={{ mb: 1 }}>
        <TextField
          label="Search Charts"
          size="small"
          variant="filled"
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
            input: { pr: 2 },
          }}
        />
      </Box>

      {searchQuery ? (
        <Box>
          {filteredOptions.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
            >
              No charts found matching this query
            </Typography>
          ) : (
            <FormGroup sx={{ flexDirection: 'column', gap: 1 }}>
              {filteredOptions.map((option) => (
                <FormControlLabel
                  key={option.value}
                  labelPlacement="start"
                  sx={{
                    transition: 'background-color 0.2s',
                    bgcolor: selected.includes(option.value)
                      ? 'action.selected'
                      : 'background.default',
                    py: 0.5,
                    px: 1,
                    borderRadius: '4px',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  control={
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onChange={() => handleToggle(option.value)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      {iconMapping[option.icon] || iconMapping.HelpCircle}
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {option.label}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          )}
        </Box>
      ) : (
        <Box>
          {groupedOptions.map((group, index) => (
            <Accordion
              key={group.category}
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&::before': { display: 'none' },
              }}
              defaultExpanded={index === 0}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ backgroundColor: 'action.disabledBackground' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {group.category}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'background.default' }}>
                <FormGroup sx={{ flexDirection: 'column' }}>
                  {group.options.map((option) => {
                    const isChecked = selected.includes(option.value);
                    return (
                      <FormControlLabel
                        key={option.value}
                        sx={{
                          m: 0,
                          mb: 0.5,
                          borderRadius: '4px',
                          bgcolor: isChecked ? 'action.selected' : 'background.default',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          '.MuiFormControlLabel-label': {
                            fontSize: '0.85rem',
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {iconMapping[option.icon] || iconMapping.HelpCircle}
                            <Typography
                              variant="body2"
                              sx={{ ml: 0.5, fontSize: '0.85rem' }}
                            >
                              {option.label}
                            </Typography>
                          </Box>
                        }
                      />
                    );
                  })}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GraphSelector;
