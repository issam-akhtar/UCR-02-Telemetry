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

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const LineChart4 = () => {
  const data = {
    labels: ['1', '2', '3', '4', '5', '6'],
    datasets: [
      {
        label: 'Data Set 1',
        data: [65, 59, 80, 81, 56, 55],
        fill: false,
        borderColor: 'rgba(75,192,192,1)', // Line color
        tension: 0.1, // Curved line
      },

      {
        label: 'Data Set 2',
        data: [30, 40, 50, 60, 70, 90],
        fill: false,
        borderColor: 'rgba(192, 75, 75, 1)', // Red color for the second line
        tension: 0.1,
      },

      {
        label: 'Data Set 3',
        data: [90, 100, 105, 110, 115, 120],
        fill: false,
        borderColor: 'rgba(75, 75, 192, 1)', // Blue color for the third line
        tension: 0.1,
      },
      
      {
        label: 'Data Set 4',
        data: [40, 45, 55, 65, 60, 75],
        fill: false,
        borderColor: 'rgba(75, 192, 75, 1)', // Green color for the fourth line
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (Seconds)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Distance (mm)',
        },
      },
    },
  };

  return (
    <div style={{ width: '600px', margin: '0 auto' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default LineChart4;
