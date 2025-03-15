import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import useRealTimeData from '../../hooks/useRealTimeData';
import 'leaflet/dist/leaflet.css';

// Helper component to recenter the map when the position updates.
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
};

const LiveGPSMap = () => {
  // State for current GPS position and trail path.
  const [gpsData, setGpsData] = useState({
    lat: 0,
    lng: 0,
    height: 0,
    timestamp: null,
  });
  const [pathCoords, setPathCoords] = useState([]);
  const [speed, setSpeed] = useState(0);

  // Refs to track last processed timestamp.
  const lastGpsTimestampRef = useRef(null);
  const lastImuTimestampRef = useRef(null);

  // Subscribe to INS_GPS data to update position.
  useRealTimeData('ins_gps', (msg) => {
    const fields = msg.payload.fields;
    if (!fields.gnss_lat || !fields.gnss_long) return;

    // Grab the new timestamp (if available)
    const newTimestamp = fields.timestamp?.numberValue || 0;

    // Skip out-of-order data (using strict "less than")
    if (lastGpsTimestampRef.current !== null && newTimestamp < lastGpsTimestampRef.current) {
      return;
    }
    lastGpsTimestampRef.current = newTimestamp;

    // Update GPS state.
    const lat = fields.gnss_lat.numberValue;
    const lng = fields.gnss_long.numberValue;
    const height = fields.gnss_height ? fields.gnss_height.numberValue : 0;

    setGpsData({ lat, lng, height, timestamp: newTimestamp });
    setPathCoords((prev) => [...prev, [lat, lng]]);
  });

  // Subscribe to INS_IMU data and derive speed.
  useRealTimeData('ins_imu', (msg) => {
    const fields = msg.payload.fields;
    if (!fields.north_vel || !fields.east_vel) return;

    // Grab the new timestamp.
    const newTimestamp = fields.timestamp?.numberValue || 0;

    // Skip out-of-order data.
    if (lastImuTimestampRef.current !== null && newTimestamp < lastImuTimestampRef.current) {
      return;
    }
    lastImuTimestampRef.current = newTimestamp;

    // Calculate resultant speed.
    const northVel = fields.north_vel.numberValue || 0;
    const eastVel = fields.east_vel.numberValue || 0;
    const calculatedSpeed = Math.sqrt(northVel ** 2 + eastVel ** 2);
    setSpeed(calculatedSpeed);
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Speed overlay */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '6px 10px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '1rem',
        }}
      >
        Speed: {speed.toFixed(2)} m/s
      </div>

      <MapContainer
        center={[gpsData.lat, gpsData.lng]}
        zoom={18}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[gpsData.lat, gpsData.lng]}>
          <Popup>
            <div>
              <p><strong>Latitude:</strong> {gpsData.lat.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {gpsData.lng.toFixed(6)}</p>
              <p><strong>Speed:</strong> {speed.toFixed(2)} m/s</p>
            </div>
          </Popup>
        </Marker>
        {pathCoords.length > 1 && <Polyline positions={pathCoords} color="red" />}
        <RecenterAutomatically lat={gpsData.lat} lng={gpsData.lng} />
      </MapContainer>
    </div>
  );
};

export default LiveGPSMap;
