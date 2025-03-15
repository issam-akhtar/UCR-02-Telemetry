import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Box } from '@mui/material';

const PackGauge = ({ voltage, current }) => {
  const gaugeRef = useRef(null);
  const [voltageRange, setVoltageRange] = useState([0, 100]);
  const [currentRange, setCurrentRange] = useState([-150, 150]);
  const [power, setPower] = useState(0);

  // Calculate power
  useEffect(() => {
    setPower(voltage * current);
  }, [voltage, current]);

  // Dynamically adjust voltage range
  useEffect(() => {
    if (voltage > 0) {
      const upperVoltage = Math.max(100, Math.ceil((voltage * 1.3) / 10) * 10);
      setVoltageRange([0, upperVoltage]);
    }
  }, [voltage]);

  // Dynamically adjust current range
  useEffect(() => {
    const absMaxCurrent = Math.max(Math.abs(current) * 1.5, 50);
    setCurrentRange([-absMaxCurrent, absMaxCurrent]);
  }, [current]);

  useEffect(() => {
    if (!gaugeRef.current) return;

    const data = [
      {
        type: 'indicator',
        mode: 'gauge+number+delta',
        value: voltage,
        title: {
          text: 'Voltage',
          font: { size: 16, color: '#FFFFFF' },
          pad: { t: 40 }, // Extra top padding
        },
        number: { font: { size: 24, color: '#FFFFFF' }, suffix: ' V', valueformat: '.1f' },
        delta: {
          reference: 90,
          increasing: { color: '#5cb85c' },
          decreasing: { color: '#d9534f' },
          font: { size: 14, color: '#FFFFFF' },
        },
        gauge: {
          shape: 'angular',
          axis: {
            tickmode: 'linear',
            dtick: 100,
            range: voltageRange,
            tickfont: { size: 12, color: '#FFFFFF' },
            tickcolor: '#FFFFFF',
          },
          bar: { color: '#5bc0de', thickness: 0.6 },
          bgcolor: 'rgba(0,0,0,0.3)',
          bordercolor: 'rgba(255,255,255,0.2)',
          steps: [
            { range: [0, voltageRange[1] * 0.2], color: '#d9534f' },
            { range: [voltageRange[1] * 0.2, voltageRange[1] * 0.6], color: '#f0ad4e' },
            { range: [voltageRange[1] * 0.6, voltageRange[1]], color: '#5cb85c' },
          ],
          threshold: {
            line: { color: 'white', width: 2 },
            thickness: 0.8,
            value: voltage,
          },
        },
        domain: { x: [0, 0.48], y: [0, 1] },
      },
      {
        type: 'indicator',
        mode: 'gauge+number+delta',
        value: current,
        title: {
          text: 'Current',
          font: { size: 16, color: '#FFFFFF' },
          pad: { t: 40 }, // Extra top padding
        },
        number: { font: { size: 24, color: '#FFFFFF' }, suffix: ' A', valueformat: '.1f' },
        delta: {
          reference: 0,
          increasing: { color: current > 0 ? '#d9534f' : '#5cb85c' },
          decreasing: { color: current > 0 ? '#5cb85c' : '#d9534f' },
          font: { size: 14, color: '#FFFFFF' },
        },
        gauge: {
          shape: 'angular',
          axis: {
            range: currentRange,
            tickmode: 'auto',
            nticks: 7,
            tickfont: { size: 12, color: '#FFFFFF' },
            tickcolor: '#FFFFFF',
          },
          bar: { color: current > 0 ? '#d9534f' : '#5cb85c', thickness: 0.6 },
          bgcolor: 'rgba(0,0,0,0.3)',
          bordercolor: 'rgba(255,255,255,0.2)',
          steps: [
            { range: [currentRange[0], -10], color: 'rgba(92, 184, 92, 0.5)' },
            { range: [-10, 10], color: 'rgba(240, 173, 78, 0.3)' },
            { range: [10, currentRange[1]], color: 'rgba(217, 83, 79, 0.5)' },
          ],
          threshold: {
            line: { color: 'white', width: 2 },
            thickness: 0.8,
            value: current,
          },
        },
        domain: { x: [0.52, 1], y: [0, 1] },
      },
    ];

    const layout = {
      margin: { t: 60, b: 40, l: 40, r: 40 }, // More margin to prevent tick clipping
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#FFFFFF' },
      height: 240, // Slightly taller for more space
    };

    const config = {
      displayModeBar: false,
      responsive: true,
    };

    Plotly.react(gaugeRef.current, data, layout, config);
  }, [voltage, current, voltageRange, currentRange, power]);

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1 }}>
      <Box ref={gaugeRef} sx={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default PackGauge;
