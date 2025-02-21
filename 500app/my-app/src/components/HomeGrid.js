import * as React from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import LineChart from './LineChart';
import CarComponent from './CarComponent';
import Speedometer from './Speedometer';
import BatteryLevel from './BatteryLevel';
import WeatherWidget from './WeatherWidget';


const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#1A2027',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: "white",
  height: "300px", // Fixed height
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%", // Ensures the items fill the container
  cursor: "pointer",
  position: "relative",
  transition: "background-color 0.3s ease",
  '&:hover': {
    backgroundColor: '#2a2f35',
  }
}));

export default function HomeGrid() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh', 
        padding: 2,
        color: 'white' 
      }}
    >
      <Grid 
        container 
        rowSpacing={5} 
        columnSpacing={{ xs: 1, sm: 2, md: 5 }} 
        sx={{ 
          width: "100%", 
          maxWidth: "1400px",
          justifyContent: "space-between" 
        }}
      >
        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-start" }}>
          <Item sx={{ width: "500px" }} onClick={() => handleNavigation('/TCUData')}>
          <Speedometer/>
          <BatteryLevel/>
          </Item>
        </Grid>
        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Item sx={{ width: "500px" }} onClick={() => handleNavigation('/')}>
          <LineChart/>
          </Item>
        </Grid>

        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-start", alignItems: 'center' }}>
          <Item sx={{ width: "500px", justifyContent: 'center', alignItems: 'center' }} onClick={() => handleNavigation('/')}>
          <WeatherWidget/>
          </Item>
        </Grid>
        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Item sx={{ width: "500px" }} onClick={() => handleNavigation('/')}>
            Chart 4
          </Item>
        </Grid>

        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-start" }}>
          <Item sx={{ width: "500px" }} onClick={() => handleNavigation('/')}>
            Page 1
          </Item>
        </Grid>
        <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Item sx={{ width: "500px" }} onClick={() => handleNavigation('/')}>
            Page 2
          </Item>
        </Grid>
      </Grid>

      <Box 
        sx={{
          position: "absolute",
          top: "150px", 
          left: "50%",
          transform: "translateX(-50%)", 
          zIndex: 10, 
        }}
      >
        <CarComponent/>
      </Box>
    </Box>
  );
}
