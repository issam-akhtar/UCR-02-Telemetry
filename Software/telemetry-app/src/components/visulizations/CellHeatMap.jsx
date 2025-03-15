import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Box } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';

const rows = 8;
const cols = 16;

const getRowLabel = (rowIndex) => {
  const start = rowIndex * cols + 1;
  const end = start + cols - 1;
  return `Cells ${start}–${end}`;
};

const colLabels = Array.from({ length: cols }, (_, i) => `C${i + 1}`);

const CellHeatmap = () => {
  const chartRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const [cellData, setCellData] = useState(new Array(128).fill(0));
  const [minVoltage, setMinVoltage] = useState(0);
  const [maxVoltage, setMaxVoltage] = useState(0);
  const [avgVoltage, setAvgVoltage] = useState(0);

  useRealTimeData('cell', (msg) => {
    const fields = msg.payload.fields;

    // Use strict “less than” so that updates with the same timestamp still go through
    const newTimestamp = fields.timestamp?.numberValue || 0;
    if (
      lastTimestampRef.current !== null &&
      newTimestamp < lastTimestampRef.current
    ) {
      return; // Skip only if the new timestamp is older
    }
    lastTimestampRef.current = newTimestamp;

    // Parse cell data
    const newData = new Array(128).fill(0);
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (let i = 1; i <= 128; i++) {
      const field = fields[`cell${i}`];
      if (field) {
        const raw = field.stringValue ?? field.numberValue;
        const val = parseFloat(raw) || 0;
        newData[i - 1] = val;
        if (val > 0) {
          min = Math.min(min, val);
          max = Math.max(max, val);
          sum += val;
          count++;
        }
      }
    }

    setCellData(newData);
    if (count > 0) {
      setMinVoltage(min);
      setMaxVoltage(max);
      setAvgVoltage(sum / count);
    } else {
      setMinVoltage(0);
      setMaxVoltage(0);
      setAvgVoltage(0);
    }
  });

  // Redraw the heatmap
  useEffect(() => {
    if (!chartRef.current) return;
    drawHeatmap();
  }, [cellData, minVoltage, maxVoltage, avgVoltage]);

  const drawHeatmap = () => {
    // Convert cellData into an 8×16 matrix
    const matrix = [];
    const rowLabels = [];
    for (let r = 0; r < rows; r++) {
      const rowStart = r * cols;
      matrix.push(cellData.slice(rowStart, rowStart + cols));
      rowLabels.push(getRowLabel(r));
    }

    const trace = {
      z: matrix,
      x: colLabels,
      y: rowLabels,
      type: 'heatmap',
      xgap: 2,
      ygap: 2,
      zsmooth: 'best',
      colorscale: [
        [0, '#d9534f'],
        [0.3, '#f0ad4e'],
        [0.6, '#5bc0de'],
        [1, '#5cb85c'],
      ],
      zmin: 2.5,
      zmax: 4.2,
      hovertemplate: '%{y}, %{x}<br>Voltage: %{z} V<extra></extra>',
      showscale: true,
      colorbar: {
        thickness: 15,
        x: 1.05,
        y: 0.5,
        len: 0.8,
        titleside: 'right',
        title: {
          text: 'Voltage (V)',
          font: { color: '#FFFFFF' }
        },
        tickfont: { color: '#FFFFFF' }
      },
    };

    const layout = {
      margin: { l: 100, r: 60, t: 40, b: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#FFFFFF' },
      xaxis: {
        side: 'top',
        tickfont: { size: 10, color: '#FFFFFF' },
        gridcolor: 'rgba(255,255,255,0.1)'
      },
      yaxis: {
        autorange: 'reversed',
        tickfont: { size: 10, color: '#FFFFFF' },
        gridcolor: 'rgba(255,255,255,0.1)'
      },
      annotations: [
        {
          x: 0,
          y: 1.12,
          xref: 'paper',
          yref: 'paper',
          text: `Min: ${minVoltage.toFixed(3)}V | Max: ${maxVoltage.toFixed(3)}V | Avg: ${avgVoltage.toFixed(3)}V`,
          showarrow: false,
          font: { size: 12, color: '#FFFFFF' }
        }
      ]
    };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: [
        'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
        'hoverClosestCartesian', 'hoverCompareCartesian'
      ],
      toImageButtonOptions: {
        format: 'png',
        filename: 'cell_voltage_heatmap',
      }
    };

    Plotly.react(chartRef.current, [trace], layout, config);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Box ref={chartRef} sx={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default CellHeatmap;
