import React, { useEffect, useRef, useState } from 'react'
import SearchIcon from '@mui/icons-material/Search';
import './Weather.css'
import clearicon from '../assets/clear.png'
import cloudicon from '../assets/cloud.png'
import snowicon from '../assets/snow.png'
import drizzleicon from '../assets/drizzle.png'
import humidityicon from '../assets/humidity.png'
import rainicon from '../assets/rain.png'
import windicon from '../assets/wind.png'



const Weather = () => {

    const inputRef = useRef()

    const [weatherData, setWeatherData] = useState({
        temperature: "N/A",
        humidity: "N/A",
        windSpeed: "N/A",
        icon: clearicon,
    });

    const allIcons = {
        "0": "unknown",
        "1000": clearicon, //clear
        "1100": cloudicon, //mostly clear
        "1101": cloudicon, //party cloudy
        "1102": cloudicon, //mostly cloudy
        "1001": cloudicon, //cloudy
        "2100": cloudicon, //light fog
        "2000": cloudicon, //fog
        "4000": drizzleicon, //drizzle
        "4200": drizzleicon, //light rain
        "4001": rainicon, //rain
        "4201": rainicon, //heavy rain
        "5001": snowicon, //flurries
        "5100": snowicon, //light snow
        "5101": snowicon, //heavy snow
        "5000": snowicon, //snow
    }

    const search = async (city)=>{

        if(city == ""){
            alert("Please Enter a City Name");
            return;
        }

        try{
            const url = `https://api.tomorrow.io/v4/weather/realtime?location=${city}&apikey=${import.meta.env.VITE_APP_ID}`;

            const response = await fetch(url);
            const data = await response.json();

            if(!response.ok){
                alert(data.message);
                return;
            }

            console.log(data);

            const icon = allIcons[data.data.values.weatherCode] || clearicon;

            setWeatherData({
                temperature: data.data.values.temperature,
                humidity: data.data.values.humidity,
                windSpeed: data.data.values.windSpeed,
                location: data.location?.name ? data.location.name.split(",")[0] : city,
                icon: icon
            });

        } catch (error) {
            setWeatherData(false);
            console.error("Error fetching weather data:", error);
        }
    }

    useEffect((city)=>{
        search("Calgary"); //default city set to Calgary
    },[])

  return (
    <div className='weather'>

        <div className='search-bar'>
            <input ref={inputRef} type="text" placeholder='Search'/>
            <SearchIcon className='searchicon' onClick={()=>search(inputRef.current.value)}/>
        </div>

        {weatherData?<>
        
            <img src={weatherData.icon} alt="" className='weathericon' />
        <p className='temperature'>{weatherData.temperature}°c</p>
        <p className='location'>{weatherData.location}</p>

        <div className="weatherdata">

            <div className="col">
                <img src={windicon} alt="" />
                <div>
                    <p>{weatherData.windSpeed} Km/h</p>
                    <span>Wind Speed</span>
                </div>
            </div>

            <div className="col">
                <img src={humidityicon} alt="" />
                <div>
                    <p>{weatherData.humidity}%</p>
                    <span>Humidity</span>
                </div>
            </div>
        </div>

        </>:<>
        
        <div className="apierror">
        <p> API Request Failed </p>
        </div>

        </>}
    </div>
  )
}

export default Weather
