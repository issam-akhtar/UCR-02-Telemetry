import React from "react";
import { Card, CardContent, Typography, Box, useTheme } from "@mui/material";
import { animated, useSpring } from "@react-spring/web";

const AnimatedCard = animated(Card);

export default function SummaryCard({
  title,
  currentValue,
  unit,
  color,
  details,
}) {
  const theme = useTheme();

  const [props] = useSpring(() => ({
    from: { transform: "scale(1)", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
    to: async (next) => {
      while (true) {
        await next({
          boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
          transform: "scale(1.005)",
        });
        await next({
          boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
          transform: "scale(1)",
        });
      }
    },
  }));

  return (
    <AnimatedCard
      style={props}
      sx={{
        minWidth: 275,
        background: theme.palette.background.paper,
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom color="textSecondary">
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
          <Typography
            variant="h4"
            sx={{ color: color || theme.palette.primary.main }}
          >
            {currentValue ?? "--"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {unit}
          </Typography>
        </Box>
        {details && (
          <Typography variant="body2" color="textSecondary">
            {details}
          </Typography>
        )}
        <Box
          sx={{
            height: 4,
            background: theme.palette.background.default,
            mt: 2,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: "70%",
              height: "100%",
              background: `linear-gradient(90deg, ${color}, ${
                theme.palette.accent?.main || color
              })`,
            }}
          />
        </Box>
      </CardContent>
    </AnimatedCard>
  );
}
