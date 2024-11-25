import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const BatteryCell = ({ position, temperature, setHoveredCell, index }) => {
  // Map temperature to a color gradient (cool: blue, warm: red)
  const getColor = (temp) => {
    if (temp < 30) return "#03fc52";
    if (temp < 45) return "yellow";
    if (temp < 60) return "orange";
    return "red";
  };

  return (
    <group position={position}>
      {/* Cell */}
      <mesh
        onPointerOver={() => setHoveredCell({ index, temperature })}
        onPointerOut={() => setHoveredCell(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={getColor(temperature)} />
      </mesh>
      {/* Outline */}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial attach="material" color="black" />
      </lineSegments>
    </group>
  );
};

const BatteryPack = ({ data, setHoveredCell }) => {
  return (
    <group position={[-2 * 1.2 + 0.6, 2 * 1.2 - 0.6, 0]}>
      {data.map((cell, index) => {
        const x = index % 4; // 4 columns
        const y = Math.floor(index / 4); // 4 rows
        return (
          <BatteryCell
            key={index}
            index={index}
            position={[x * 1.2, -y * 1.2, 0]} // Space cells apart for better visibility
            temperature={cell.temperature}
            setHoveredCell={setHoveredCell}
          />
        );
      })}
    </group>
  );
};

export default function BatteryViewer() {
  const [data, setData] = useState(
    Array(16)
      .fill(null)
      .map((_, index) => ({ id: index, temperature: 25 }))
  );

  const [hoveredCell, setHoveredCell] = useState(null);

  // Simulate real-world data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) =>
        prevData.map((cell) => ({
          ...cell,
          temperature: Math.max(20, Math.min(100, cell.temperature + (Math.random() - 0.5) * 10)),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Tooltip for Hovered Cell */}
      {hoveredCell && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "10px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            borderRadius: "5px",
          }}
        >
          <p>Cell {hoveredCell.index + 1}</p>
          <p>Temperature: {hoveredCell.temperature}°C</p>
        </div>
      )}

      <Canvas>
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Battery Pack */}
        <BatteryPack data={data} setHoveredCell={setHoveredCell} />

        {/* Camera Controls */}
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}
