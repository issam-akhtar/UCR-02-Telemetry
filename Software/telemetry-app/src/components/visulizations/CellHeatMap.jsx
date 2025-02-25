import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Box } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';

const rows = 8;   // 8 groups
const cols = 16;  // 16 cells per group

// We'll label row i as "Cells {start}–{end}"
function getRowLabel(rowIndex) {
  const start = rowIndex * cols + 1;
  const end = start + cols - 1;
  return `Cells ${start}–${end}`;
}

// Column labels "C1..C16"
const colLabels = Array.from({ length: cols }, (_, i) => `C${i + 1}`);

const CellHeatmap = () => {
  const chartRef = useRef(null);
  const [cellData, setCellData] = useState(new Array(128).fill(0));

  // Single subscription to "cell"
  useRealTimeData('cell', (msg) => {
    const newData = [...cellData];
    for (let i = 1; i <= 128; i++) {
      const field = msg.payload.fields[`cell${i}`];
      if (field) {
        const raw = field.stringValue ?? field.numberValue;
        const val = parseFloat(raw) || 0;
        newData[i - 1] = val;
      }
    }
    setCellData(newData);
  });

  useEffect(() => {
    if (chartRef.current) {
      drawHeatmap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellData]);

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
      zsmooth: false,
      colorscale: [
        [0, 'red'],
        [0.3, 'orange'],
        [0.6, 'yellow'],
        [1, 'green'],
      ],
      zmin: 2.5,
      zmax: 4.2,
      hovertemplate: '%{y}, %{x}<br>Voltage: %{z} V<extra></extra>',
      showscale: true,
      colorbar: {
        thickness: 15,
        x: 1.05,       // place colorbar to the right
        y: 0.5,
        len: 0.8,
        titleside: 'right',
        title: 'Voltage (V)',
      },
    };

    const layout = {
      margin: { l: 60, r: 70, t: 40, b: 50 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: {
        side: 'top',
        tickfont: { size: 10 },
      },
      yaxis: {
        autorange: 'reversed',
        tickfont: { size: 10 },
      },
    };

    Plotly.react(chartRef.current, [trace], layout, { displayModeBar: false });
  };

  return <Box sx={{ width: '100%', height: '100%' }} ref={chartRef} />;
};

export default CellHeatmap;
