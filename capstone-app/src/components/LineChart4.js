import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Data1 from '../testdata/faketest.csv';
import Data2 from '../testdata/faketest2.csv';

const LineChart4 = () => {
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]); // Available numeric columns for Y-axis
  const [xKey1, setXKey1] = useState(null); // Column for x-axis of data1
  const [xKey2, setXKey2] = useState(null); // Column for x-axis of data2
  const [yKey, setYKey] = useState(null); // Single column for y-axis for both datasets
  const [showLine1, setShowLine1] = useState(true); // Control visibility of first line
  const [showLine2, setShowLine2] = useState(true); // Control visibility of second line
  const chartRef = useRef(null);

  // Load first CSV file
  useEffect(() => {
    d3.csv(Data1).then((csvData) => {
      if (csvData.length === 0) return;

      const detectedNumericColumns = Object.keys(csvData[0]).filter((key) =>
        !isNaN(parseFloat(csvData[0][key]))
      );

      if (detectedNumericColumns.length >= 2) {
        setXKey1(detectedNumericColumns[0]);
        setNumericColumns(detectedNumericColumns);
        if (!yKey) setYKey(detectedNumericColumns[1]);
      }

      const formattedData = csvData.map((row) => {
        const formattedRow = {};
        Object.keys(row).forEach((key) => {
          formattedRow[key] = isNaN(row[key]) ? row[key] : +row[key];
        });
        return formattedRow;
      });
      setData1(formattedData);
    });
  }, [yKey]);

  // Load second CSV file
  useEffect(() => {
    d3.csv(Data2).then((csvData) => {
      if (csvData.length === 0) return;

      const detectedNumericColumns = Object.keys(csvData[0]).filter((key) =>
        !isNaN(parseFloat(csvData[0][key]))
      );

      if (detectedNumericColumns.length >= 2) {
        setXKey2(detectedNumericColumns[0]);
        setNumericColumns((cols) =>
          Array.from(new Set([...cols, ...detectedNumericColumns]))
        );
      }

      const formattedData = csvData.map((row) => {
        const formattedRow = {};
        Object.keys(row).forEach((key) => {
          formattedRow[key] = isNaN(row[key]) ? row[key] : +row[key];
        });
        return formattedRow;
      });
      setData2(formattedData);
    });
  }, []);

  useEffect(() => {
    if (data1.length === 0 || data2.length === 0 || !xKey1 || !xKey2 || !yKey) return;

    // Set up chart dimensions and margins
    const margin = { top: 10, right: 20, bottom: 30, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(chartRef.current).select('svg').remove();

    // Append SVG element
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales based on xKey1, xKey2, and yKey
    const x = d3.scaleLinear()
      .domain([
        Math.min(d3.min(data1, (d) => d[xKey1]), d3.min(data2, (d) => d[xKey2])),
        Math.max(d3.max(data1, (d) => d[xKey1]), d3.max(data2, (d) => d[xKey2]))
      ])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([
        0,
        Math.max(d3.max(data1, (d) => d[yKey]), d3.max(data2, (d) => d[yKey]))
      ])
      .range([height, 0]);

    // Define lines for both data sets
    const line1 = d3.line()
      .x((d) => x(d[xKey1]))
      .y((d) => y(d[yKey]));

    const line2 = d3.line()
      .x((d) => x(d[xKey2]))
      .y((d) => y(d[yKey]));

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(5));

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Conditionally add line paths
    if (showLine1) {
      svg.append('path')
        .datum(data1)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr('d', line1);
    }

    if (showLine2) {
      svg.append('path')
        .datum(data2)
        .attr('fill', 'none')
        .attr('stroke', 'orange')
        .attr('stroke-width', 1.5)
        .attr('d', line2);
    }

    // Add labels based on selected columns
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Time');

    svg.append('text')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 10)
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(yKey);
  }, [data1, data2, showLine1, showLine2, xKey1, xKey2, yKey]);

  return (
    <div>
      <h2>CSV Data Visualization</h2>
      <div ref={chartRef}></div>
      <label>
        Select Y-axis for Both Datasets:
        <select
          value={yKey}
          onChange={(e) => setYKey(e.target.value)}
        >
          {numericColumns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </label>
      <div
        onClick={() => setShowLine1(!showLine1)}
        style={{
          cursor: 'pointer',
          marginTop: '10px',
          color: showLine1 ? 'steelblue' : 'gray',
          textDecoration: showLine1 ? 'none' : 'line-through',
        }}
      >
        <span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: showLine1 ? 'steelblue' : 'gray', marginRight: '5px' }}></span>
        Data1 Line ({yKey})
      </div>
      <div
        onClick={() => setShowLine2(!showLine2)}
        style={{
          cursor: 'pointer',
          marginTop: '10px',
          color: showLine2 ? 'orange' : 'gray',
          textDecoration: showLine2 ? 'none' : 'line-through',
        }}
      >
        <span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: showLine2 ? 'orange' : 'gray', marginRight: '5px' }}></span>
        Data2 Line ({yKey})
      </div>
    </div>
  );
};

export default LineChart4;
