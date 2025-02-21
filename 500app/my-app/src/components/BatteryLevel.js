import * as React from 'react';
import { useState, useEffect } from 'react';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

const settings = {
  width: 250,
  height: 250,
};

export default function BatteryLevel() {
  const [batteryLevel, setBatteryLevel] = useState(20); // Default battery level

  // Placeholder function for fetching battery level from backend
  useEffect(() => {
    const fetchBatteryLevel = async () => {
      try {
        // Replace with actual API call in the future
        // Example: const response = await fetch('/api/battery');
        // const data = await response.json();
        const data = { level: Math.floor(Math.random() * 100) }; // Simulating API response

        setBatteryLevel(data.level);
      } catch (error) {
        console.error("Error fetching battery level:", error);
      }
    };

    fetchBatteryLevel(); // Call API once for now (can be updated to poll)
  }, []);

  return (
    <Gauge
      {...settings}
      value={batteryLevel} // Now dynamically updates from backend
      cornerRadius="50%"
      text={({value}) => `${value}%`}
      sx={(theme) => ({
        [`& .${gaugeClasses.valueText}`]: {
          fontSize: 40,
          color: "white",
        },
        [`& .${gaugeClasses.valueArc}`]: {
          fill: batteryLevel > 20 ? 'limegreen' : 'red', // Green if above 20%, red if low battery
        },
        [`& .${gaugeClasses.referenceArc}`]: {
          fill: theme.palette.text.disabled,
        },
        '& text': { fill: '#B1A7A6', fontSize: '2rem', fontWeight: 'bold' },
      })}
    />
  );
}
