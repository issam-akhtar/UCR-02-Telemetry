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
  Button,
  ButtonGroup
} from '@mui/material';
import { Close, ExpandMore } from '@mui/icons-material';
import {
  Cpu, Navigation, MapPin, Satellite, BatteryCharging,
  Battery, Thermometer, CircuitBoard, Gauge, Settings, RotateCw,
  Zap, Wind, Activity, BarChartHorizontal, GaugeCircle, Hash, Radio,
  RefreshCw, Fan, HelpCircle, ThermometerSun, Milestone, Send,
  RefreshCcw, Flashlight, Repeat, LayoutDashboard, Vibrate, Download
} from 'lucide-react';

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
  Settings: <Settings size={16} />,
  Download: <Download size={16} />,
  Activity: <Activity size={16} />,
  HelpCircle: <HelpCircle size={16} />,
};

const GraphSelector = ({ groupedOptions, selected, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = (value) => {
    onChange((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSelectAll = (group) => {
    const groupValues = group.options.map(opt => opt.value);
    const newSelected = Array.from(new Set([...selected, ...groupValues]));
    onChange(newSelected);
  };

  const handleUnselectAll = (group) => {
    const groupValues = group.options.map(opt => opt.value);
    onChange((prev) => prev.filter((val) => !groupValues.includes(val)));
  };

  const handleClearSelection = () => {
    onChange([]);
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
    <Box
      sx={{
        width: '100%',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: 1,
      }}
    >
      <Box sx={{ mb: 1 }}>
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
          sx={{ bgcolor: 'action.hover', borderRadius: '6px' }}
        />
      </Box>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
        <Button variant="contained" size="small" onClick={handleClearSelection}>
          Clear Selection
        </Button>
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
              {filteredOptions.map((option) => {
                const isChecked = selected.includes(option.value);
                return (
                  <FormControlLabel
                    key={option.value}
                    sx={{
                      transition: 'background-color 0.2s',
                      bgcolor: isChecked ? 'primary.dark' : 'background.default',
                      color: isChecked ? 'primary.contrastText' : 'inherit',
                      py: 0.5,
                      px: 1,
                      borderRadius: '4px',
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
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {iconMapping[option.icon] || iconMapping.HelpCircle}
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          {option.label}
                        </Typography>
                      </Box>
                    }
                  />
                );
              })}
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
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&::before': { display: 'none' },
              }}
              defaultExpanded={index === 0}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ bgcolor: 'action.disabledBackground' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {group.category}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <ButtonGroup variant="contained" size="small">
                    <Button onClick={() => handleSelectAll(group)}>Select All</Button>
                    <Button onClick={() => handleUnselectAll(group)}>Unselect All</Button>
                  </ButtonGroup>
                </Box>
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
                          transition: 'background-color 0.2s',
                          bgcolor: isChecked ? 'primary.dark' : 'background.default',
                          color: isChecked ? 'primary.contrastText' : 'inherit',
                          '&:hover': {
                            bgcolor: isChecked ? 'primary.dark' : 'action.hover',
                          },
                          '.MuiFormControlLabel-label': { fontSize: '0.85rem' },
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
                            <Typography variant="body2" sx={{ ml: 0.5 }}>
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
