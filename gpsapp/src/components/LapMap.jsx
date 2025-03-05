import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API_URL = "https://api.openf1.org/v1/location?session_key=9161&driver_number=81&date>2023-09-16T13:00:00.000&date<2023-09-16T13:05:00.000";

// marker for start of car
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

const convertCartesianToLatLon = (x, y) => {
  const baseLat = 1.2914; // marina bay lat and lon
  const baseLon = 103.8642;

  const latOffset = y * 0.0000018; // scaling cause coordinates weird
  const lonOffset = x * 0.0000020; // scaling cause coordinates weird

  return [baseLat + latOffset, baseLon + lonOffset];
};

const LapMap = () => {
  const [gpsData, setGpsData] = useState([]);
  const [carPosition, setCarPosition] = useState([1.2914, 103.8642]); // car position default to marina bay
  const [startPosition, setStartPosition] = useState(null); // store the start position

  useEffect(() => {
    const fetchLapData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.length > 0) {
          // covert the points to lat and lon for leaflet
          const lapPoints = data.map(({ x, y }) => convertCartesianToLatLon(x, y));

          setGpsData(lapPoints); // store lap data (points)
          setCarPosition(lapPoints[lapPoints.length - 1]); // update latest car position
          setStartPosition(lapPoints[0]); // set car start position
        }
      } catch (error) {
        console.error("Error fetching GPS data:", error);
      }
    };

    fetchLapData();

  }, []);

  return (
    <MapContainer zoom={15} style={{ height: "500px", width: "100%" }} center={carPosition}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={gpsData} color="red" weight={3} /> {/* the lap */}
      <Marker position={carPosition} /> {/* latest car position */}
      {startPosition && <Marker position={startPosition} icon={startMarkerIcon} />} {/* start position marker */}
      {gpsData.length > 0 && <FitBoundsComponent gpsData={gpsData} />}
    </MapContainer>
  );
};

export default LapMap;
