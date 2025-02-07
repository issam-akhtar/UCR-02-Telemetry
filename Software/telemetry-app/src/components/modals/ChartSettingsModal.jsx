import React, { useContext, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Grid,
  Box,
} from "@mui/material";
import { ChartSettingsContext } from "../../context/ChartSettingsContext";

export default function ChartSettingsModal({ open, onClose }) {
  const {
    realTimeWindow,
    setRealTimeWindow,
    realTimeUpdateInterval,
    setRealTimeUpdateInterval,
    historicalRefreshRate,
    setHistoricalRefreshRate,
    pageSize,
    setPageSize,
    maxAxisTicks,
    setMaxAxisTicks,
  } = useContext(ChartSettingsContext);

  const [localWindow, setLocalWindow] = useState(realTimeWindow);
  const [localUpdateInterval, setLocalUpdateInterval] = useState(
    realTimeUpdateInterval
  );
  const [localHistoricalRefresh, setLocalHistoricalRefresh] = useState(
    historicalRefreshRate
  );
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [localMaxAxisTicks, setLocalMaxAxisTicks] = useState(maxAxisTicks);

  useEffect(() => {
    setLocalWindow(realTimeWindow);
    setLocalUpdateInterval(realTimeUpdateInterval);
    setLocalHistoricalRefresh(historicalRefreshRate);
    setLocalPageSize(pageSize);
    setLocalMaxAxisTicks(maxAxisTicks);
  }, [
    realTimeWindow,
    realTimeUpdateInterval,
    historicalRefreshRate,
    pageSize,
    maxAxisTicks,
  ]);

  const handleSave = () => {
    setRealTimeWindow(Number(localWindow));
    setRealTimeUpdateInterval(Number(localUpdateInterval));
    setHistoricalRefreshRate(Number(localHistoricalRefresh));
    setPageSize(Number(localPageSize));
    setMaxAxisTicks(Number(localMaxAxisTicks));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "#161A1D",
          color: "#ecf3e8",
          padding: 2,
          maxWidth: "650px",
        },
      }}
    >
      <DialogTitle sx={{ color: "#ecf3e8", fontWeight: "bold" }}>
        Chart Settings
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            General Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Real-Time Window Size (data points)"
                type="number"
                fullWidth
                size="small"
                value={localWindow}
                onChange={(e) => setLocalWindow(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Real-Time Update Interval (ms)"
                type="number"
                fullWidth
                size="small"
                value={localUpdateInterval}
                onChange={(e) => setLocalUpdateInterval(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Max Axis Ticks"
                type="number"
                fullWidth
                size="small"
                value={localMaxAxisTicks}
                onChange={(e) => setLocalMaxAxisTicks(e.target.value)}
                helperText="Max ticks displayed on axes"
              />
            </Grid>
          </Grid>
        </Box>

        <Box mb={2}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Historical Data Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Historical Refresh Rate (ms)"
                type="number"
                fullWidth
                size="small"
                value={localHistoricalRefresh}
                onChange={(e) => setLocalHistoricalRefresh(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Historical Page Size"
                type="number"
                fullWidth
                size="small"
                value={localPageSize}
                onChange={(e) => setLocalPageSize(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: "#F5F3F4" }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: "#BA181B",
            color: "#F5F3F4",
            "&:hover": { backgroundColor: "#a31616" },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
