import React, { useContext } from "react";
import { AppBar, Toolbar, IconButton, Typography, Box } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import SettingsIcon from "@mui/icons-material/Settings";
import { ThemeContext } from "../../App";
import UCRLogo from "../../assets/UCR_Logo.png";

export default function Navbar({ onMenuClick, onSettingsClick }) {
  const { toggleTheme, isDarkMode } = useContext(ThemeContext);

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          edge="start"
          color="inherit"
          onClick={onMenuClick}
          sx={{ display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <img src={UCRLogo} alt="UCR Logo" style={{ height: 40 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            FSAE Telemetry
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={toggleTheme} color="inherit">
            {isDarkMode ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
          <IconButton onClick={onSettingsClick} color="inherit">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
