import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "/hu-1986.json";

const FitBoundsComponent = ({ gpsData }) => {
  const map = useMap();

  useEffect(() => {
    if (gpsData.length > 0) {
      const bounds = gpsData.map(([lat, lon]) => [lat, lon]); // make sure lat lon format for leaflet
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gpsData, map]);

  return null;
};

const JSONLap = () => {
  const [gpsData, setGpsData] = useState([]);

  useEffect(() => {
    const fetchJsonData = async () => {
      try {
        const response = await fetch(API_URL);
        const jsonData = await response.json();

        const track = jsonData.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);

        setGpsData(track);
      } catch (error) {
        console.error("Error loading GPS data:", error);
      }
    };

    fetchJsonData();
  }, []);

  return (
    <MapContainer zoom={15} style={{ height: "500px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={gpsData} color="red" weight={3} />
      {gpsData.length > 0 && <FitBoundsComponent gpsData={gpsData} />}
    </MapContainer>
  );
};

export default JSONLap;
