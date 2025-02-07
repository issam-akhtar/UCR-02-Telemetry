import React from "react";
import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.paper",
        py: 3,
        mt: "auto",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="textSecondary" align="center">
        © {new Date().getFullYear()} FSAE Telemetry Team. All rights reserved.
        <br />
        <Typography variant="caption" component="span">
          Built with React and Go | Version 1.0.0
        </Typography>
      </Typography>
    </Box>
  );
}
