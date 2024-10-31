import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Line } from 'react-chartjs-2';
import Data from '../testdata/faketest.csv';
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

function LineChart() {
  const [chartData, setChartData] = useState({
      datasets: []
  });
  const [chartOptions, setChartOptions] = useState({})
  
  useEffect(() => {
    Papa.parse(Data, {
      download: true,
      header: true,
      dynamicTyping: true,
      delimiter: "",
      complete: ((result) => {
        console.log(result); // Log parsed data to verify
        setChartData({

          labels: result.data.map((item, index) => [item[' "Time"']]).filter( String ),
          
          datasets: [
            {
              label: "test",
              data: result.data.map((item, index) => [item[' "Channel"']]).filter( Number ),
              fill: false,
              borderColor: 'red',
              tension: 0.1,
            },
            
          ],
        });

        setChartOptions({
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
              display: true,
            },
            title: {
              display: true,
              text: "Channel Data"
            }
          },

          scales: {
            x: {
              title: {
                display: true,
                text: 'Time (seconds)',
              },
            },

            y: {
              title: {
                display: true,
                text: 'Channel',
              },
            },
          },

        })
      })
    })
  }, [])

  console.log("Chart Data in Render:", chartData);


  return (
    <div>
    {
        chartData.datasets.length > 0 ? (
          <div style={{ width: '600px', margin: '0 auto' }}>
            <Line options={chartOptions} data={chartData}/>
          </div>
        ) : (
            <div>
                Loading...
                </div>
        )
    }
    </div>
  );
};

export default LineChart;
