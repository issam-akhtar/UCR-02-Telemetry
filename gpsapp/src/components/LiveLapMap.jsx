import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API_URL = "https://api.openf1.org/v1/location?session_key=9161&driver_number=2&date>2023-09-16T13:03:00.000&date<2023-09-16T13:05:00.000";

// marker for starting position
const startMarkerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [20, 30],
  iconAnchor: [10, 30],
  popupAnchor: [1, -25],
});

const FitBoundsComponent = ({ gpsData }) => {
  const map = useMap();

  useEffect(() => {
    if (gpsData.length > 0) {
      const bounds = gpsData.map(([lat, lon]) => [lat, lon]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gpsData, map]);

  return null;
};

//openf1 gives cartesian (location based on track) so we must convert
const convertCartesianToLatLon = (x, y) => {
  const baseLat = 1.2914; // set marina bay lat
  const baseLon = 103.8642; // set marina pay lon

  const latOffset = y * 0.0000018; // scaling cause data weird
  const lonOffset = x * 0.0000020; // ''

  return [baseLat + latOffset, baseLon + lonOffset];
};

const LiveLapMap = () => {
  const [gpsData, setGpsData] = useState([]); // store points already "driven"
  const [allLapPoints, setAllLapPoints] = useState([]); // store the entire lap data
  const [carPosition, setCarPosition] = useState([1.2914, 103.8642]); // moving car position
  const [startPosition, setStartPosition] = useState(null); // start position
  const [currentIndex, setCurrentIndex] = useState(0); // track the car's movement index

  useEffect(() => {
    const fetchLapData = async () => {     // replace with websocket connection
      try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.length > 0) {
          const lapPoints = data.map(({ x, y }) => convertCartesianToLatLon(x, y));
          
          setAllLapPoints(lapPoints); // store the entire lap path
          setStartPosition(lapPoints[0]); // mark the start position
          setCarPosition(lapPoints[0]); // start at the first point
        }
      } catch (error) {
        console.error("Error fetching GPS data:", error);
      }
    };

    fetchLapData();
  }, []);

  useEffect(() => {
    if (allLapPoints.length > 0 && currentIndex < allLapPoints.length) {
      const interval = setInterval(() => {
        setGpsData((prevData) => [...prevData, allLapPoints[currentIndex]]); // add next point to path
        setCarPosition(allLapPoints[currentIndex]); // move car marker
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, 50); // update every X ms

      return () => clearInterval(interval); // Cleanup interval
    }
  }, [allLapPoints, currentIndex]);

  return (
    <MapContainer zoom={15} style={{ height: "500px", width: "100%" }} center={carPosition}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={gpsData} color="red" weight={3} /> {/* show only completed part of the lap */}
      <Marker position={carPosition} /> {/* dynamic car marker */}
      {startPosition && <Marker position={startPosition} icon={startMarkerIcon} />} {/* static start marker */}
      {gpsData.length > 0 && <FitBoundsComponent gpsData={gpsData} />}
    </MapContainer>
  );
};

export default LiveLapMap;
