import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Data from '../testdata/faketest.csv';

const LineChart2 = () => {
  const [data, setData] = useState([]);
  const [showLine, setShowLine] = useState(true); // State to control line visibility
  const chartRef = useRef(null);

  useEffect(() => {
    // Load the CSV file
    d3.csv(Data).then((csvData) => {
      // Format the data
      const formattedData = csvData.map((row) => ({
        Index: +row.Index,
        Time: +row.Time,
        Channel: +row.Channel,
        Voltage: +row.Voltage,
        LeftPot: +row["Left Pot"],
        RightPot: +row["Right Pot"],
      }));
      setData(formattedData);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    // Set up smaller chart dimensions and margins
    const margin = { top: 10, right: 20, bottom: 30, left: 40 };
    const width = 400 - margin.left - margin.right; // Smaller width
    const height = 200 - margin.top - margin.bottom; // Smaller height

    // Clear previous chart
    d3.select(chartRef.current).select('svg').remove();

    // Append SVG element
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.Time))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.Voltage)])
      .range([height, 0]);

    // Define line
    const line = d3.line()
      .x((d) => x(d.Time))
      .y((d) => y(d.Voltage));

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

    // Add labels
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
      .text('Voltage');
  }, [data, showLine]); // Depend on showLine to re-render when toggled

  return (
    <div>
      <h2>CSV Data Visualization</h2>
      <div ref={chartRef}></div>
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
        Voltage Line
      </div>
    </div>
  );
};

export default LineChart2;
