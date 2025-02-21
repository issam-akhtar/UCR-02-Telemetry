import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register necessary components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = () => {
  const data = {
    labels: ['0', '1', '2', '3', '4', '5'],
    datasets: [
      {
        label: 'Cell 1',
        data: [3.2, 3.5, 3.6, 3.1, 4, 3.8],
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
      {
        label: 'Cell 2',
        data: [3.5, 3.2, 3.1, 3.7, 3.9, 3.2],
        fill: false,
        borderColor: 'rgba(192, 75, 75, 1)',
        tension: 0.1,
      },
      {
        label: 'Cell 3',
        data: [3.5, 3.1, 3.2, 3.8, 4, 3.3],
        fill: false,
        borderColor: 'rgba(75, 75, 192, 1)',
        tension: 0.1,
      },
      {
        label: 'Cell 4',
        data: [3.5, 3.6, 3.2, 3.9, 3.9, 3.7],
        fill: false,
        borderColor: 'rgba(75, 192, 75, 1)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Ensures it fills the container
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'white',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Voltage',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '100%' }}> {/* Ensures it fills parent */}
      <Line data={data} options={options} />
    </div>
  );
};

export default LineChart;
