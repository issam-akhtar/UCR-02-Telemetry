import React from "react";
import {
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import { Link } from "react-router-dom";

export default function Sidebar({ mobileOpen, handleDrawerToggle }) {
  return (
    <Box sx={{ width: 240, bgcolor: "background.paper", minHeight: "100vh" }}>
      <List>
        <ListItemButton component={Link} to="/" sx={{ color: "text.primary" }}>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton
          component={Link}
          to="/explorer"
          sx={{ color: "text.primary" }}
        >
          <ListItemText primary="Data Explorer" />
        </ListItemButton>
      </List>
      <Divider sx={{ bgcolor: "divider" }} />
    </Box>
  );
}
