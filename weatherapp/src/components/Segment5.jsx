import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {useEffect} from "react";

const Model5 = () => {

    const { scene, nodes, materials } = useGLTF("/Segment5.glb");

    const cellMap = {

        "Cell 93": [ 
            "SR23-AC-P28A_Max-94",
            "SR23-AC-P28A_Max-105",
            "SR23-AC-P28A_Max-116",
            "SR23-AC-P28A_Max-127",
            "SR23-AC-P28A_Max-138",
            "SR23-AC-P28A_Max-149"
        ],

        "Cell 94": [ 
            "SR23-AC-P28A_Max-83",
            "SR23-AC-P28A_Max-926",
            "SR23-AC-P28A_Max-927",
            "SR23-AC-P28A_Max-928",
            "SR23-AC-P28A_Max-929",
            "SR23-AC-P28A_Max-930"
        ],

        "Cell 95": [ 
            "SR23-AC-P28A_Max-93",
            "SR23-AC-P28A_Max-104",
            "SR23-AC-P28A_Max-115",
            "SR23-AC-P28A_Max-126",
            "SR23-AC-P28A_Max-137",
            "SR23-AC-P28A_Max-148"
        ],

        "Cell 96": [ 
            "SR23-AC-P28A_Max-82",
            "SR23-AC-P28A_Max-921",
            "SR23-AC-P28A_Max-922",
            "SR23-AC-P28A_Max-923",
            "SR23-AC-P28A_Max-924",
            "SR23-AC-P28A_Max-925"
        ],

        "Cell 97": [ 
            "SR23-AC-P28A_Max-92",
            "SR23-AC-P28A_Max-103",
            "SR23-AC-P28A_Max-114",
            "SR23-AC-P28A_Max-125",
            "SR23-AC-P28A_Max-136",
            "SR23-AC-P28A_Max-147"
        ],

        "Cell 98": [ 
            "SR23-AC-P28A_Max-81",
            "SR23-AC-P28A_Max-916",
            "SR23-AC-P28A_Max-917",
            "SR23-AC-P28A_Max-918",
            "SR23-AC-P28A_Max-919",
            "SR23-AC-P28A_Max-920"
        ],

        "Cell 99": [ 
            "SR23-AC-P28A_Max-91",
            "SR23-AC-P28A_Max-102",
            "SR23-AC-P28A_Max-113",
            "SR23-AC-P28A_Max-124",
            "SR23-AC-P28A_Max-135",
            "SR23-AC-P28A_Max-146"
        ],

        "Cell 100": [ 
            "SR23-AC-P28A_Max-80",
            "SR23-AC-P28A_Max-911",
            "SR23-AC-P28A_Max-912",
            "SR23-AC-P28A_Max-913",
            "SR23-AC-P28A_Max-914",
            "SR23-AC-P28A_Max-915"
        ],

        "Cell 101": [ 
            "SR23-AC-P28A_Max-90",
            "SR23-AC-P28A_Max-101",
            "SR23-AC-P28A_Max-112",
            "SR23-AC-P28A_Max-123",
            "SR23-AC-P28A_Max-134",
            "SR23-AC-P28A_Max-145"
        ],

        "Cell 102": [ 
            "SR23-AC-P28A_Max-79",
            "SR23-AC-P28A_Max-906",
            "SR23-AC-P28A_Max-907",
            "SR23-AC-P28A_Max-908",
            "SR23-AC-P28A_Max-909",
            "SR23-AC-P28A_Max-910"
        ],

        "Cell 103": [ 
            "SR23-AC-P28A_Max-89",
            "SR23-AC-P28A_Max-100",
            "SR23-AC-P28A_Max-111",
            "SR23-AC-P28A_Max-122",
            "SR23-AC-P28A_Max-133",
            "SR23-AC-P28A_Max-144"
        ],

        "Cell 104": [ 
            "SR23-AC-P28A_Max-78",
            "SR23-AC-P28A_Max-901",
            "SR23-AC-P28A_Max-902",
            "SR23-AC-P28A_Max-903",
            "SR23-AC-P28A_Max-904",
            "SR23-AC-P28A_Max-905"
        ],

        "Cell 105": [ 
            "SR23-AC-P28A_Max-88",
            "SR23-AC-P28A_Max-99",
            "SR23-AC-P28A_Max-110",
            "SR23-AC-P28A_Max-121",
            "SR23-AC-P28A_Max-132",
            "SR23-AC-P28A_Max-143"
        ],

        "Cell 106": [ 
            "SR23-AC-P28A_Max-77",
            "SR23-AC-P28A_Max-896",
            "SR23-AC-P28A_Max-897",
            "SR23-AC-P28A_Max-898",
            "SR23-AC-P28A_Max-899",
            "SR23-AC-P28A_Max-900"
        ],

        "Cell 107": [ 
            "SR23-AC-P28A_Max-87",
            "SR23-AC-P28A_Max-98",
            "SR23-AC-P28A_Max-109",
            "SR23-AC-P28A_Max-120",
            "SR23-AC-P28A_Max-131",
            "SR23-AC-P28A_Max-142"
        ],

        "Cell 108": [ 
            "SR23-AC-P28A_Max-76",
            "SR23-AC-P28A_Max-891",
            "SR23-AC-P28A_Max-892",
            "SR23-AC-P28A_Max-893",
            "SR23-AC-P28A_Max-894",
            "SR23-AC-P28A_Max-895"
        ],

        "Cell 109": [ 
            "SR23-AC-P28A_Max-86",
            "SR23-AC-P28A_Max-97",
            "SR23-AC-P28A_Max-108",
            "SR23-AC-P28A_Max-119",
            "SR23-AC-P28A_Max-130",
            "SR23-AC-P28A_Max-141"
        ],

        "Cell 110": [ 
            "SR23-AC-P28A_Max-75",
            "SR23-AC-P28A_Max-886",
            "SR23-AC-P28A_Max-887",
            "SR23-AC-P28A_Max-888",
            "SR23-AC-P28A_Max-889",
            "SR23-AC-P28A_Max-890"
        ],

        "Cell 111": [ 
            "SR23-AC-P28A_Max-85",
            "SR23-AC-P28A_Max-96",
            "SR23-AC-P28A_Max-107",
            "SR23-AC-P28A_Max-118",
            "SR23-AC-P28A_Max-129",
            "SR23-AC-P28A_Max-140"
        ],

        "Cell 112": [ 
            "SR23-AC-P28A_Max-74",
            "SR23-AC-P28A_Max-881",
            "SR23-AC-P28A_Max-882",
            "SR23-AC-P28A_Max-883",
            "SR23-AC-P28A_Max-884",
            "SR23-AC-P28A_Max-885"
        ],

        "Cell 113": [ 
            "SR23-AC-P28A_Max-84",
            "SR23-AC-P28A_Max-95",
            "SR23-AC-P28A_Max-106",
            "SR23-AC-P28A_Max-117",
            "SR23-AC-P28A_Max-128",
            "SR23-AC-P28A_Max-139"
        ],

        "Cell 114": [ 
            "SR23-AC-P28A_Max-73",
            "SR23-AC-P28A_Max-876",
            "SR23-AC-P28A_Max-877",
            "SR23-AC-P28A_Max-878",
            "SR23-AC-P28A_Max-879",
            "SR23-AC-P28A_Max-880"
        ],

        "Cell 115": [ 
            "SR23-AC-P28A_Max-1",
            "SR23-AC-P28A_Max-2",
            "SR23-AC-P28A_Max-3",
            "SR23-AC-P28A_Max-4",
            "SR23-AC-P28A_Max-5",
            "SR23-AC-P28A_Max-6"
        ],

    };
    
/* SAMPLE CODE OF HOW TO EDIT ALL CELLS
    useEffect(() => {
        const prefix = "SR23-AC-P28A_Max-"; // The common prefix for target nodes

        Object.keys(nodes).forEach((nodeName) => {
            if (nodeName.startsWith(prefix)) {
                nodes[nodeName].traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material = child.material.clone();
                        child.material.color.setRGB(1, 0, 0); // Change to red
                        console.log(`Changed color of ${nodeName} to red`);
                    }
                });
            }
        });

}, [nodes]);

    return <primitive object={scene} />;
    
};

*/   
    
// SAMPLE CODE ON HOW TO EDIT ONE CELL (COLUMN OF 6)

useEffect(() => {
    const targetCell = "Cell 97";

    if (cellMap[targetCell]) {
      cellMap[targetCell].forEach((nodeName) => {
        const node = nodes[nodeName];
        if (node) {
          node.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.material.color.setRGB(1, 0, 0); // red
              console.log(`Changed ${nodeName} to red`);
            }
          });
        } else {
          console.warn(`Node not found: ${nodeName}`);
        }
      });
    }
  }, [nodes]);

  return <primitive object={scene} />;
};

const Segment5 = () => {
    return (
        <>
        <Canvas camera={{ position: [0.5, 0.1, 0] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 2, 2]} intensity={2} />
          <Model5 />
          <OrbitControls />
        </Canvas>
        </>
    );
};

export default Segment5;

