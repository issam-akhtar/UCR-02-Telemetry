import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Data from '../testdata/faketest.csv';

const LineChart3 = () => {
  const [data, setData] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]); // Available numeric columns
  const [xKey, setXKey] = useState(null); // Column for x-axis
  const [yKey, setYKey] = useState(null); // Column for y-axis
  const [showLine, setShowLine] = useState(true); // State to control line visibility
  const chartRef = useRef(null);

  useEffect(() => {
    // Load the CSV file and dynamically determine the column names
    d3.csv(Data).then((csvData) => {
      if (csvData.length === 0) return;

      // Determine all numeric columns
      const sampleRow = csvData[0];
      const detectedNumericColumns = Object.keys(sampleRow).filter((key) =>
        !isNaN(parseFloat(sampleRow[key]))
      );

      if (detectedNumericColumns.length >= 2) {
        setXKey(detectedNumericColumns[0]);
        setYKey(detectedNumericColumns[1]);
        setNumericColumns(detectedNumericColumns);
      }

      // Format the data for use
      const formattedData = csvData.map((row) => {
        const formattedRow = {};
        Object.keys(row).forEach((key) => {
          formattedRow[key] = isNaN(row[key]) ? row[key] : +row[key];
        });
        return formattedRow;
      });
      setData(formattedData);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0 || !xKey || !yKey) return;

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

    // Set up scales based on xKey and yKey
    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d[xKey]))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d[yKey])])
      .range([height, 0]);

    // Define line
    const line = d3.line()
      .x((d) => x(d[xKey]))
      .y((d) => y(d[yKey]));

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(5));

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Conditionally add line path
    if (showLine) {
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr('d', line);
    }

    // Add labels based on selected columns
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(xKey);

    svg.append('text')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 10)
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(yKey);
  }, [data, showLine, xKey, yKey]); // Depend on showLine, xKey, yKey to re-render when toggled

  return (
    <div>
      <h2>CSV Data Visualization</h2>
      <div ref={chartRef}></div>
      <label>
        Select Y-axis:
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
        onClick={() => setShowLine(!showLine)}
        style={{
          cursor: 'pointer',
          marginTop: '10px',
          color: showLine ? 'steelblue' : 'gray',
          textDecoration: showLine ? 'none' : 'line-through',
        }}
      >
        <span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: showLine ? 'steelblue' : 'gray', marginRight: '5px' }}></span>
        {yKey} Line
      </div>
    </div>
  );
};

export default LineChart3;
