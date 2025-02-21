import * as React from 'react';
import { useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import UCR_Logo from '../images/UCR_Logo.png';

const pages = [
  { name: 'Suspension', path: '/suspensiondata' },
  { name: 'Cell Data', path: '/celldata' },
  { name: 'TCU Data', path: '/tcudata' },
  { name: 'GPS', path: '/gpsdata' }
];

function Header() {
  const navigate = useNavigate(); // React Router navigation hook

  const handleLogoClick = () => {
    navigate("/"); // Navigate to the home page
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: "#161A1D" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <img
            src={UCR_Logo} 
            alt="UofC Logo"
            className="UCRLogo"
            onClick={handleLogoClick} 
            style={{ cursor: "pointer",
                     width: "auto",
                     maxHeight: "50px",
                     maxWidth: "25%",
                     marginRight: "10px"
            }}
          />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
           Telemetry System
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: "flex-end" }}>
            {pages.map((page) => (
              <Button
                key={page.name}
                onClick={() => navigate(page.path)}
                sx={{ my: 2, color: 'white', display: 'block', fontSize: '1.0rem', fontWeight: 'bold' }}
              >
                {page.name}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header;
