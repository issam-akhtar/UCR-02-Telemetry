import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function InputWithIcon() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
      <LocationOnIcon sx={{ color: 'white', mr: 1, my: 0.5 }} />
      <TextField
        id="input-with-sx"
        label="Location"
        variant="standard"
        sx={{
          input: { color: 'white' }, // Changes input text color
          label: { color: 'white' }, // Changes label color
          '& label.Mui-focused': { color: 'white' }, // Keeps label white when focused
          '& .MuiInput-underline:before': { borderBottom: '2px solid white' }, // Default underline
          '& .MuiInput-underline:after': { borderBottom: '2px solid white' }, // Focused underline
          '& .MuiInput-underline:hover:before': { borderBottom: '2px solid white' }, // Hover underline
        }}
      />
    </Box>
  );
}
