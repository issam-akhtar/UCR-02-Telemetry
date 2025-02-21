import * as React from 'react'
import Car from '../images/car.png';

const CarComponent = ({ width = "250px", height = "auto", className = "", suspensionData = {} }) => {
  const wheelPositions = [
    { id: "back-right", left: "5%", top: "15%" }, // Back-Right Wheel
    { id: "back-left", left: "95%", top: "15%" }, // Back-Left Wheel
    { id: "front-right", left: "4%", top: "77%" }, // Front-Right Wheel
    { id: "front-left",left: "95%", top: "77%" }, // Front-Left Wheel
  ];

  const getColor = (weight) => {
    if (weight === "heavy") return "red";
    if (weight === "medium") return "yellow";
    return "green"; // Default to light suspension pot value
  };

  return (
    <div className={`car-container ${className}`} style={{ width, height, position: "relative" }}>
      <img
        src={Car}
        alt="Car Diagram"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      {wheelPositions.map((pos) => (
        <div
          key={pos.id}
          style={{
            position: "absolute",
            left: pos.left,
            top: pos.top,
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: getColor(suspensionData[pos.id]?.weight || "light"),
              borderRadius: "4px",
            }}
          />
          <span
            style={{
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            {suspensionData[pos.id]?.value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CarComponent;