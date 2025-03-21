import React, { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const cellMap = {

    "Cell 1": [ 
        "SR23-AC-P28A_Max-94",
        "SR23-AC-P28A_Max-105",
        "SR23-AC-P28A_Max-116",
        "SR23-AC-P28A_Max-127",
        "SR23-AC-P28A_Max-138",
        "SR23-AC-P28A_Max-149"
    ],

    "Cell 2": [ 
        "SR23-AC-P28A_Max-83",
        "SR23-AC-P28A_Max-926",
        "SR23-AC-P28A_Max-927",
        "SR23-AC-P28A_Max-928",
        "SR23-AC-P28A_Max-929",
        "SR23-AC-P28A_Max-930"
    ],

    "Cell 3": [ 
        "SR23-AC-P28A_Max-93",
        "SR23-AC-P28A_Max-104",
        "SR23-AC-P28A_Max-115",
        "SR23-AC-P28A_Max-126",
        "SR23-AC-P28A_Max-137",
        "SR23-AC-P28A_Max-148"
    ],

    "Cell 4": [ 
        "SR23-AC-P28A_Max-82",
        "SR23-AC-P28A_Max-921",
        "SR23-AC-P28A_Max-922",
        "SR23-AC-P28A_Max-923",
        "SR23-AC-P28A_Max-924",
        "SR23-AC-P28A_Max-925"
    ],

    "Cell 5": [ 
        "SR23-AC-P28A_Max-92",
        "SR23-AC-P28A_Max-103",
        "SR23-AC-P28A_Max-114",
        "SR23-AC-P28A_Max-125",
        "SR23-AC-P28A_Max-136",
        "SR23-AC-P28A_Max-147"
    ],

    "Cell 6": [ 
        "SR23-AC-P28A_Max-81",
        "SR23-AC-P28A_Max-916",
        "SR23-AC-P28A_Max-917",
        "SR23-AC-P28A_Max-918",
        "SR23-AC-P28A_Max-919",
        "SR23-AC-P28A_Max-920"
    ],

    "Cell 7": [ 
        "SR23-AC-P28A_Max-91",
        "SR23-AC-P28A_Max-102",
        "SR23-AC-P28A_Max-113",
        "SR23-AC-P28A_Max-124",
        "SR23-AC-P28A_Max-135",
        "SR23-AC-P28A_Max-146"
    ],

    "Cell 8": [ 
        "SR23-AC-P28A_Max-80",
        "SR23-AC-P28A_Max-911",
        "SR23-AC-P28A_Max-912",
        "SR23-AC-P28A_Max-913",
        "SR23-AC-P28A_Max-914",
        "SR23-AC-P28A_Max-915"
    ],

    "Cell 9": [ 
        "SR23-AC-P28A_Max-90",
        "SR23-AC-P28A_Max-101",
        "SR23-AC-P28A_Max-112",
        "SR23-AC-P28A_Max-123",
        "SR23-AC-P28A_Max-134",
        "SR23-AC-P28A_Max-145"
    ],

    "Cell 10": [ 
        "SR23-AC-P28A_Max-79",
        "SR23-AC-P28A_Max-906",
        "SR23-AC-P28A_Max-907",
        "SR23-AC-P28A_Max-908",
        "SR23-AC-P28A_Max-909",
        "SR23-AC-P28A_Max-910"
    ],

    "Cell 11": [ 
        "SR23-AC-P28A_Max-89",
        "SR23-AC-P28A_Max-100",
        "SR23-AC-P28A_Max-111",
        "SR23-AC-P28A_Max-122",
        "SR23-AC-P28A_Max-133",
        "SR23-AC-P28A_Max-144"
    ],

    "Cell 12": [ 
        "SR23-AC-P28A_Max-78",
        "SR23-AC-P28A_Max-901",
        "SR23-AC-P28A_Max-902",
        "SR23-AC-P28A_Max-903",
        "SR23-AC-P28A_Max-904",
        "SR23-AC-P28A_Max-905"
    ],

    "Cell 13": [ 
        "SR23-AC-P28A_Max-88",
        "SR23-AC-P28A_Max-99",
        "SR23-AC-P28A_Max-110",
        "SR23-AC-P28A_Max-121",
        "SR23-AC-P28A_Max-132",
        "SR23-AC-P28A_Max-143"
    ],

    "Cell 14": [ 
        "SR23-AC-P28A_Max-77",
        "SR23-AC-P28A_Max-896",
        "SR23-AC-P28A_Max-897",
        "SR23-AC-P28A_Max-898",
        "SR23-AC-P28A_Max-899",
        "SR23-AC-P28A_Max-900"
    ],

    "Cell 15": [ 
        "SR23-AC-P28A_Max-87",
        "SR23-AC-P28A_Max-98",
        "SR23-AC-P28A_Max-109",
        "SR23-AC-P28A_Max-120",
        "SR23-AC-P28A_Max-131",
        "SR23-AC-P28A_Max-142"
    ],

    "Cell 16": [ 
        "SR23-AC-P28A_Max-76",
        "SR23-AC-P28A_Max-891",
        "SR23-AC-P28A_Max-892",
        "SR23-AC-P28A_Max-893",
        "SR23-AC-P28A_Max-894",
        "SR23-AC-P28A_Max-895"
    ],

    "Cell 17": [ 
        "SR23-AC-P28A_Max-86",
        "SR23-AC-P28A_Max-97",
        "SR23-AC-P28A_Max-108",
        "SR23-AC-P28A_Max-119",
        "SR23-AC-P28A_Max-130",
        "SR23-AC-P28A_Max-141"
    ],

    "Cell 18": [ 
        "SR23-AC-P28A_Max-75",
        "SR23-AC-P28A_Max-886",
        "SR23-AC-P28A_Max-887",
        "SR23-AC-P28A_Max-888",
        "SR23-AC-P28A_Max-889",
        "SR23-AC-P28A_Max-890"
    ],

    "Cell 19": [ 
        "SR23-AC-P28A_Max-85",
        "SR23-AC-P28A_Max-96",
        "SR23-AC-P28A_Max-107",
        "SR23-AC-P28A_Max-118",
        "SR23-AC-P28A_Max-129",
        "SR23-AC-P28A_Max-140"
    ],

    "Cell 20": [ 
        "SR23-AC-P28A_Max-74",
        "SR23-AC-P28A_Max-881",
        "SR23-AC-P28A_Max-882",
        "SR23-AC-P28A_Max-883",
        "SR23-AC-P28A_Max-884",
        "SR23-AC-P28A_Max-885"
    ],

    "Cell 21": [ 
        "SR23-AC-P28A_Max-84",
        "SR23-AC-P28A_Max-95",
        "SR23-AC-P28A_Max-106",
        "SR23-AC-P28A_Max-117",
        "SR23-AC-P28A_Max-128",
        "SR23-AC-P28A_Max-139"
    ],

    "Cell 22": [ 
        "SR23-AC-P28A_Max-73",
        "SR23-AC-P28A_Max-876",
        "SR23-AC-P28A_Max-877",
        "SR23-AC-P28A_Max-878",
        "SR23-AC-P28A_Max-879",
        "SR23-AC-P28A_Max-880"
    ],

    "Cell 23": [ 
        "SR23-AC-P28A_Max-1",
        "SR23-AC-P28A_Max-2",
        "SR23-AC-P28A_Max-3",
        "SR23-AC-P28A_Max-4",
        "SR23-AC-P28A_Max-5",
        "SR23-AC-P28A_Max-6"
    ],
};

const valueToColor = (value) => {
    if (value >= 2.5 && value <= 2.7) {
      return new THREE.Color(1, 0, 0); // Red if 2.5V-2.7V
    } else if (value > 2.7 && value <= 3.1) {
      return new THREE.Color(1, 0.5, 0); // Orange if 2.8V-3.1V
    } else if (value > 3.1 && value <= 3.4) {
      return new THREE.Color(1, 1, 0); // Yellow if 3.2V-3.4V
    } else if (value > 3.4 && value <= 3.8) {
      return new THREE.Color(0, 1, 0); // Green if 3.5V-3.8V
    } else {
      return new THREE.Color(0.2, 0.2, 0.2); // Default gray if outside range
    }
  };

const Model = ({ cellValues }) => {
  const { scene, nodes } = useGLTF("/goodvoltagemodel.glb");

  useEffect(() => {
    Object.entries(cellMap).forEach(([cellName, nodeNames]) => {
      const value = cellValues[cellName];
      if (value == null) return;

      const color = valueToColor(value);

      nodeNames.forEach((nodeName) => {
        const node = nodes[nodeName];
        if (node) {
          node.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone(); // decouple shared materials
              child.material.color.copy(color);
            }
          });
        }
      });
    });
  }, [nodes, cellValues]);

  return <primitive object={scene} />;
};

const CellVoltageScene = () => {
    const [cellValues, setCellValues] = useState(
      Object.fromEntries(
        Array.from({ length: 23 }, (_, i) => [`Cell ${i + 1}`, 0.0]) //Change i = 23, 46, ... for the other segments
      )
    );

  // Example: simulate real-time updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCellValues((prev) => {
        const newValues = { ...prev };
        Object.keys(newValues).forEach((cell) => {
            newValues[cell] = +(2.5 + Math.random() * (3.8 - 2.5)).toFixed(2); //Random value to simulate the voltage
        });
        return newValues;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Canvas camera={{ position: [0.8, 0.2, 0], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} />
      <Model cellValues={cellValues} />
      <OrbitControls />
    </Canvas>
  );
};

export default CellVoltageScene;
