import React, { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Three dots icon
import './Weather2.css';
import clearicon from '../assets/clear.png'
import cloudicon from '../assets/cloud.png'
import snowicon from '../assets/snow.png'
import drizzleicon from '../assets/drizzle.png'
import humidityicon from '../assets/humidity.png'
import rainicon from '../assets/rain.png'
import windicon from '../assets/wind.png'


const Weather = () => {
    const [showMore, setShowMore] = useState(false);
    
    const toggleMore = () => {
        setShowMore(!showMore);
    };

    return (
        <div className="weather-container">
            <div className="weather">
                <div className="menu-icon" onClick={toggleMore}>
                    <MoreVertIcon />
                </div>

                {/* Weather Information */}
                <div className="weather-info">
                    <img src={clearicon} alt="weather icon" className="weathericon" />
                    <div className="weather-details">
                        <p className="temperature">20°c</p>
                        <p className="location">Calgary</p>
                    </div>
                </div>

                {showMore && (
                    <>
                    <div className="weatherdata">

                        <div className="col">
                            <img src={windicon} alt="" />
                            <div>
                                <p> 10 Km/h</p>
                                <span>Wind Speed</span>
                            </div>
                        </div>

                        <div className="col">
                            <img src={humidityicon} alt="" />
                            <div>
                                <p>10%</p>
                                <span>Humidity</span>
                            </div>
                        </div>
                    </div>

                    <div className="search-bar">
                        <input type="text" placeholder="Search..." className="search-input" />
                        <SearchIcon className="searchicon" />
                    </div>

                    </>
                )}

            </div>
        </div>
    );
};

export default Weather;
