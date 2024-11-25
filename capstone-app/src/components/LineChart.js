import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineGraph = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/data.csv");
      const csvData = await response.text();

      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          console.log("Parsed Data:", results.data); // Debug parsed data
          const labels = [];
          const leftPotData = [];
          const rightPotData = [];

          results.data.forEach((row) => {
            labels.push(row.Time);
            leftPotData.push(row["Left Pot"]);
            rightPotData.push(row["Right Pot"]);
          });

          setChartData({
            labels,
            datasets: [
              {
                label: "Left Pot",
                data: leftPotData,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
                fill: false,
              },
              {
                label: "Right Pot",
                data: rightPotData,
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2,
                fill: false,
              },
            ],
          });
        },
      });
    };

    fetchData();
  }, []);

  return (
    <div>
      {chartData ? (
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "top",
              },
              title: {
                display: true,
                text: "Voltage Data Over Time",
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Time (s)",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Voltage (V)",
                },
              },
            },
          }}
        />
      ) : (
        <p>Loading chart...</p>
      )}
    </div>
  );
};

export default LineGraph;
