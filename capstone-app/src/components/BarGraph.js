import Data from '../testdata/faketest.csv';
import Papa from 'papaparse';
import {useEffect, useState} from 'react';
import {Bar} from 'react-chartjs-2';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
)

function Graph() {
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
                console.log(result)
                setChartData({
                    labels: result.data.map((item, index) =>  [item[' "Time"']]).filter( String ),
                    datasets: [
                        {
                            label: "DATA FOR UCR",
                            data: result.data.map((item, index) => [item[' "Voltage"']]).filter( Number ),
                            borderColor: "black",
                            backgroundColor: "red",
                        }
                    ]
                });
                setChartOptions({
                    responsive: true,
                    plugins: {
                        legends: {
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: "UCR DATA"
                        }
                    }
                })
            })
        }) 
    }, [])

    console.log("Chart Data in Render:", chartData);

    return (
        <div>
            <h1> Home Page</h1>
            {
                chartData.datasets.length > 0 ? (
                    <div>
                        <Bar options={chartOptions} data={chartData}/>
                    </div>
                ) : (
                    <div>
                        Loading...
                        </div>
                )
            }
        </div>
    );
}

export default Graph;