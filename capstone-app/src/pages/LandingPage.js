import * as React from 'react';
import '../App.css';
import ChartCard from '../components/ChartCard';
import HeatMapCard from '../components/HeatMapCard';

function LandingPage(){

    return (
        <div>
            <h1 className='LandingPage'> UCalgary Telemetry System</h1>

            <div className='Card-containter'>
            <ChartCard/>
            <HeatMapCard/>
            </div>
        </div>
    
    );
}

export default LandingPage;
