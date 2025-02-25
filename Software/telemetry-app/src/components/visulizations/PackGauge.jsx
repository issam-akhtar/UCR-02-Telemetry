import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/system';

const GaugeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'transparent',
}));

const GaugeTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
}));

/**
 * Displays two Plotly "indicator" gauges side by side:
 * 1) Voltage
 * 2) Current
 * Both have single-color arcs, no threshold steps, and
 * dynamic axis ranges (±10 from current values).
 */
const PackGauge = ({ voltage, current }) => {
  const gaugeRef = useRef(null);

  // We dynamically expand/shrink the axis range so the gauge
  // always shows the entire measured value comfortably.
  const [voltageRange, setVoltageRange] = useState([voltage - 10, voltage + 10]);
  const [currentRange, setCurrentRange] = useState([current - 10, current + 10]);

  // Expand voltage axis if out of bounds
  useEffect(() => {
    if (voltage < voltageRange[0] || voltage > voltageRange[1]) {
      setVoltageRange([voltage - 10, voltage + 10]);
    }
  }, [voltage, voltageRange]);

  // Expand current axis if out of bounds
  useEffect(() => {
    if (current < currentRange[0] || current > currentRange[1]) {
      setCurrentRange([current - 10, current + 10]);
    }
  }, [current, currentRange]);

  useEffect(() => {
    if (!gaugeRef.current) return;

    // We create two "indicator" traces, each with mode: "gauge+number"
    const data = [
      {
        type: 'indicator',
        mode: 'gauge+number',
        value: voltage,
        title: { text: 'Voltage (V)', font: { size: 14 } },
        number: {
          font: { size: 20 },
          suffix: ' V',
          valueformat: '.1f',
        },
        gauge: {
          shape: 'angular',
          axis: {
            range: voltageRange,
            tickmode: 'auto',
            nticks: 5,
            tickfont: { size: 10 },
          },
          bar: { color: '#007BFF' }, // single color for the voltage gauge
        },
        domain: { x: [0, 0.45], y: [0, 1] },
      },
      {
        type: 'indicator',
        mode: 'gauge+number',
        value: current,
        title: { text: 'Current (A)', font: { size: 14 } },
        number: {
          font: { size: 20 },
          suffix: ' A',
          valueformat: '.1f',
        },
        gauge: {
          shape: 'angular',
          axis: {
            range: currentRange,
            tickmode: 'auto',
            nticks: 5,
            tickfont: { size: 10 },
          },
          bar: { color: '#00CC00' }, // single color for the current gauge
        },
        domain: { x: [0.55, 1], y: [0, 1] },
      },
    ];

    const layout = {
      margin: { t: 20, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    };

    Plotly.react(gaugeRef.current, data, layout, { staticPlot: false });
  }, [voltage, current, voltageRange, currentRange]);

  return (
    <GaugeContainer>
      {/* Title for the combined gauge card */}
      <GaugeTitle>Voltage / Current</GaugeTitle>

      <Paper
        elevation={3}
        sx={{
          width: '400px',
          height: '250px',
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div ref={gaugeRef} style={{ width: '100%', height: '100%' }} />
      </Paper>
    </GaugeContainer>
  );
};

export default PackGauge;
