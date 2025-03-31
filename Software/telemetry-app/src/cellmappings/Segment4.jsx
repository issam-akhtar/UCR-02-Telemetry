import React, { useEffect, useState, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Color ranges for voltage visualization
const COLOR_RANGES = [
  { min: -Infinity, max: 0.01, color: new THREE.Color(0.2, 0.2, 0.2) }, // Gray for no data or zero
  { min: 2.5, max: 2.7, color: new THREE.Color(1, 0, 0) },     // Red for critical
  { min: 2.7, max: 3.1, color: new THREE.Color(1, 0.5, 0) },   // Orange for warning
  { min: 3.1, max: 3.4, color: new THREE.Color(1, 1, 0) },     // Yellow for caution
  { min: 3.4, max: 3.8, color: new THREE.Color(0, 1, 0) },     // Green for normal
  { min: 3.8, max: 4.0, color: new THREE.Color(0, 0.7, 1) },   // Blue for high normal
  { min: 4.0, max: Infinity, color: new THREE.Color(0.5, 0, 1) } // Purple for over voltage
];


// Compute color based on voltage value
const valueToColor = (value) => {
  // Default gray for invalid values
  if (!value || value <= 0.01) return COLOR_RANGES[0].color;
  
  // Find the appropriate color range
  for (let range of COLOR_RANGES) {
    if (value >= range.min && value <= range.max) {
      return range.color;
    }
  }
  
  // If no range matches (shouldn't happen), return gray
  console.warn(`No color range found for voltage: ${value}`);
  return COLOR_RANGES[0].color;
};

// Cell map - exported statically for use in other components
// This is for Segment 4 (Cells 70-92)
export const cellMap = {
  "Cell 70": [
      "SR23-AC-P28A_Max-94",
      "Mesh_317",
      "Mesh_317_1",
      "SR23-AC-P28A_Max-105",
      "Mesh_351",
      "Mesh_351_1",
      "SR23-AC-P28A_Max-116",
      "Mesh_360",
      "Mesh_360_1",
      "SR23-AC-P28A_Max-127",
      "Mesh_384",
      "Mesh_384_1",
      "SR23-AC-P28A_Max-138",
      "Mesh_369",
      "Mesh_369_1",
      "SR23-AC-P28A_Max-149",
      "Mesh_373",
      "Mesh_373_1",
  ],
  "Cell 71": [
      "SR23-AC-P28A_Max-83",
      "Mesh_326",
      "Mesh_326_1",
      "SR23-AC-P28A_Max-926",
      "Mesh_106",
      "Mesh_106_1",
      "SR23-AC-P28A_Max-927",
      "Mesh_100",
      "Mesh_100_1",
      "SR23-AC-P28A_Max-928",
      "Mesh_98",
      "Mesh_98_1",
      "SR23-AC-P28A_Max-929",
      "Mesh_102",
      "Mesh_102_1",
      "SR23-AC-P28A_Max-930",
      "Mesh_103",
      "Mesh_103_1",
  ],
  "Cell 72": [
      "SR23-AC-P28A_Max-93",
      "Mesh_337",
      "Mesh_337_1",
      "SR23-AC-P28A_Max-104",
      "Mesh_353",
      "Mesh_353_1",
      "SR23-AC-P28A_Max-115",
      "Mesh_354",
      "Mesh_354_1",
      "SR23-AC-P28A_Max-126",
      "Mesh_362",
      "Mesh_362_1",
      "SR23-AC-P28A_Max-137",
      "Mesh_382",
      "Mesh_382_1",
      "SR23-AC-P28A_Max-148",
      "Mesh_374",
      "Mesh_374_1",
  ],
  "Cell 73": [
      "SR23-AC-P28A_Max-82",
      "Mesh_313",
      "Mesh_313_1",
      "SR23-AC-P28A_Max-921",
      "Mesh_111",
      "Mesh_111_1",
      "SR23-AC-P28A_Max-922",
      "Mesh_95",
      "Mesh_95_1",
      "SR23-AC-P28A_Max-923",
      "Mesh_110",
      "Mesh_110_1",
      "SR23-AC-P28A_Max-924",
      "Mesh_92",
      "Mesh_92_1",
      "SR23-AC-P28A_Max-925",
      "Mesh_101",
      "Mesh_101_1",
  ],
  "Cell 74": [
      "SR23-AC-P28A_Max-92",
      "Mesh_338",
      "Mesh_338_1",
      "SR23-AC-P28A_Max-103",
      "Mesh_355",
      "Mesh_355_1",
      "SR23-AC-P28A_Max-114",
      "Mesh_352",
      "Mesh_352_1",
      "SR23-AC-P28A_Max-125",
      "Mesh_367",
      "Mesh_367_1",
      "SR23-AC-P28A_Max-136",
      "Mesh_390",
      "Mesh_390_1",
      "SR23-AC-P28A_Max-147",
      "Mesh_394",
      "Mesh_394_1",
  ],
  "Cell 75": [
      "SR23-AC-P28A_Max-81",
      "Mesh_320",
      "Mesh_320_1",
      "SR23-AC-P28A_Max-916",
      "Mesh_90",
      "Mesh_90_1",
      "SR23-AC-P28A_Max-917",
      "Mesh_99",
      "Mesh_99_1",
      "SR23-AC-P28A_Max-918",
      "Mesh_89",
      "Mesh_89_1",
      "SR23-AC-P28A_Max-919",
      "Mesh_104",
      "Mesh_104_1",
      "SR23-AC-P28A_Max-920",
      "Mesh_94",
      "Mesh_94_1",
  ],
  "Cell 76": [
      "SR23-AC-P28A_Max-91",
      "Mesh_336",
      "Mesh_336_1",
      "SR23-AC-P28A_Max-102",
      "Mesh_357",
      "Mesh_357_1",
      "SR23-AC-P28A_Max-113",
      "Mesh_349",
      "Mesh_349_1",
      "SR23-AC-P28A_Max-124",
      "Mesh_368",
      "Mesh_368_1",
      "SR23-AC-P28A_Max-135",
      "Mesh_380",
      "Mesh_380_1",
      "SR23-AC-P28A_Max-146",
      "Mesh_393",
      "Mesh_393_1",
  ],
  "Cell 77": [
      "SR23-AC-P28A_Max-80",
      "Mesh_323",
      "Mesh_323_1",
      "SR23-AC-P28A_Max-911",
      "Mesh_85",
      "Mesh_85_1",
      "SR23-AC-P28A_Max-912",
      "Mesh_86",
      "Mesh_86_1",
      "SR23-AC-P28A_Max-913",
      "Mesh_87",
      "Mesh_87_1",
      "SR23-AC-P28A_Max-914",
      "Mesh_88",
      "Mesh_88_1",
      "SR23-AC-P28A_Max-915",
      "Mesh_69",
      "Mesh_69_1",
  ],
  "Cell 78": [
      "SR23-AC-P28A_Max-90",
      "Mesh_335",
      "Mesh_335_1",
      "SR23-AC-P28A_Max-101",
      "Mesh_359",
      "Mesh_359_1",
      "SR23-AC-P28A_Max-112",
      "Mesh_365",
      "Mesh_365_1",
      "SR23-AC-P28A_Max-123",
      "Mesh_375",
      "Mesh_375_1",
      "SR23-AC-P28A_Max-134",
      "Mesh_378",
      "Mesh_378_1",
      "SR23-AC-P28A_Max-145",
      "Mesh_371",
      "Mesh_371_1",
  ],
  "Cell 79": [
      "SR23-AC-P28A_Max-79",
      "Mesh_330",
      "Mesh_330_1",
      "SR23-AC-P28A_Max-906",
      "Mesh_71",
      "Mesh_71_1",
      "SR23-AC-P28A_Max-907",
      "Mesh_80",
      "Mesh_80_1",
      "SR23-AC-P28A_Max-908",
      "Mesh_83",
      "Mesh_83_1",
      "SR23-AC-P28A_Max-909",
      "Mesh_84",
      "Mesh_84_1",
      "SR23-AC-P28A_Max-910",
      "Mesh_65",
      "Mesh_65_1",
  ],
  "Cell 80": [
      "SR23-AC-P28A_Max-89",
      "Mesh_333",
      "Mesh_333_1",
      "SR23-AC-P28A_Max-100",
      "Mesh_364",
      "Mesh_364_1",
      "SR23-AC-P28A_Max-111",
      "Mesh_344",
      "Mesh_344_1",
      "SR23-AC-P28A_Max-122",
      "Mesh_372",
      "Mesh_372_1",
      "SR23-AC-P28A_Max-133",
      "Mesh_386",
      "Mesh_386_1",
      "SR23-AC-P28A_Max-144",
      "Mesh_392",
      "Mesh_392_1",
  ],
  "Cell 81": [
      "SR23-AC-P28A_Max-78",
      "Mesh_316",
      "Mesh_316_1",
      "SR23-AC-P28A_Max-901",
      "Mesh_64",
      "Mesh_64_1",
      "SR23-AC-P28A_Max-902",
      "Mesh_81",
      "Mesh_81_1",
      "SR23-AC-P28A_Max-903",
      "Mesh_67",
      "Mesh_67_1",
      "SR23-AC-P28A_Max-904",
      "Mesh_73",
      "Mesh_73_1",
      "SR23-AC-P28A_Max-905",
      "Mesh_74",
      "Mesh_74_1",
  ],
  "Cell 82": [
      "SR23-AC-P28A_Max-88",
      "Mesh_331",
      "Mesh_331_1",
      "SR23-AC-P28A_Max-99",
      "Mesh_341",
      "Mesh_341_1",
      "SR23-AC-P28A_Max-110",
      "Mesh_358",
      "Mesh_358_1",
      "SR23-AC-P28A_Max-121",
      "Mesh_345",
      "Mesh_345_1",
      "SR23-AC-P28A_Max-132",
      "Mesh_381",
      "Mesh_381_1",
      "SR23-AC-P28A_Max-143",
      "Mesh_370",
      "Mesh_370_1",
  ],
  "Cell 83": [
      "SR23-AC-P28A_Max-77",
      "Mesh_322",
      "Mesh_322_1",
      "SR23-AC-P28A_Max-896",
      "Mesh_77",
      "Mesh_77_1",
      "SR23-AC-P28A_Max-897",
      "Mesh_72",
      "Mesh_72_1",
      "SR23-AC-P28A_Max-898",
      "Mesh_68",
      "Mesh_68_1",
      "SR23-AC-P28A_Max-899",
      "Mesh_78",
      "Mesh_78_1",
      "SR23-AC-P28A_Max-900",
      "Mesh_63",
      "Mesh_63_1",
  ],
  "Cell 84": [
      "SR23-AC-P28A_Max-87",
      "Mesh_334",
      "Mesh_334_1",
      "SR23-AC-P28A_Max-98",
      "Mesh_343",
      "Mesh_343_1",
      "SR23-AC-P28A_Max-109",
      "Mesh_350",
      "Mesh_350_1",
      "SR23-AC-P28A_Max-120",
      "Mesh_361",
      "Mesh_361_1",
      "SR23-AC-P28A_Max-131",
      "Mesh_389",
      "Mesh_389_1",
      "SR23-AC-P28A_Max-142",
      "Mesh_391",
      "Mesh_391_1",
  ],
  "Cell 85": [
      "SR23-AC-P28A_Max-76",
      "Mesh_82",
      "Mesh_82_1",
      "SR23-AC-P28A_Max-891",
      "Mesh_66",
      "Mesh_66_1",
      "SR23-AC-P28A_Max-892",
      "Mesh_75",
      "Mesh_75_1",
      "SR23-AC-P28A_Max-893",
      "Mesh_70",
      "Mesh_70_1",
      "SR23-AC-P28A_Max-894",
      "Mesh_76",
      "Mesh_76_1",
      "SR23-AC-P28A_Max-895",
      "Mesh_325",
      "Mesh_325_1",
  ],
  "Cell 86": [
      "SR23-AC-P28A_Max-86",
      "Mesh_329",
      "Mesh_329_1",
      "SR23-AC-P28A_Max-97",
      "Mesh_342",
      "Mesh_342_1",
      "SR23-AC-P28A_Max-108",
      "Mesh_347",
      "Mesh_347_1",
      "SR23-AC-P28A_Max-119",
      "Mesh_366",
      "Mesh_366_1",
      "SR23-AC-P28A_Max-130",
      "Mesh_377",
      "Mesh_377_1",
      "SR23-AC-P28A_Max-141",
      "Mesh_385",
      "Mesh_385_1",
  ],
  "Cell 87": [
      "SR23-AC-P28A_Max-75",
      "Mesh_332",
      "Mesh_332_1",
      "SR23-AC-P28A_Max-886",
      "Mesh_400",
      "Mesh_400_1",
      "SR23-AC-P28A_Max-887",
      "Mesh_402",
      "Mesh_402_1",
      "SR23-AC-P28A_Max-888",
      "Mesh_403",
      "Mesh_403_1",
      "SR23-AC-P28A_Max-889",
      "Mesh_405",
      "Mesh_405_1",
      "SR23-AC-P28A_Max-890",
      "Mesh_79",
      "Mesh_79_1",
  ],
  "Cell 88": [
      "SR23-AC-P28A_Max-85",
      "Mesh_319",
      "Mesh_319_1",
      "SR23-AC-P28A_Max-96",
      "Mesh_340",
      "Mesh_340_1",
      "SR23-AC-P28A_Max-107",
      "Mesh_356",
      "Mesh_356_1",
      "SR23-AC-P28A_Max-118",
      "Mesh_363",
      "Mesh_363_1",
      "SR23-AC-P28A_Max-129",
      "Mesh_388",
      "Mesh_388_1",
      "SR23-AC-P28A_Max-140",
      "Mesh_387",
      "Mesh_387_1",
  ],
  "Cell 89": [
      "SR23-AC-P28A_Max-74",
      "Mesh_327",
      "Mesh_327_1",
      "SR23-AC-P28A_Max-881",
      "Mesh_404",
      "Mesh_404_1",
      "SR23-AC-P28A_Max-882",
      "Mesh_401",
      "Mesh_401_1",
      "SR23-AC-P28A_Max-883",
      "Mesh_398",
      "Mesh_398_1",
      "SR23-AC-P28A_Max-884",
      "Mesh_407",
      "Mesh_407_1",
      "SR23-AC-P28A_Max-885",
      "Mesh_399",
      "Mesh_399_1",
  ],
  "Cell 90": [
      "SR23-AC-P28A_Max-84",
      "Mesh_328",
      "Mesh_328_1",
      "SR23-AC-P28A_Max-95",
      "Mesh_339",
      "Mesh_339_1",
      "SR23-AC-P28A_Max-106",
      "Mesh_346",
      "Mesh_346_1",
      "SR23-AC-P28A_Max-117",
      "Mesh_348",
      "Mesh_348_1",
      "SR23-AC-P28A_Max-128",
      "Mesh_379",
      "Mesh_379_1",
      "SR23-AC-P28A_Max-139",
      "Mesh_383",
      "Mesh_383_1",
  ],
  "Cell 91": [
      "SR23-AC-P28A_Max-73",
      "Mesh_204",
      "Mesh_204_1",
      "SR23-AC-P28A_Max-876",
      "Mesh_395",
      "Mesh_395_1",
      "SR23-AC-P28A_Max-877",
      "Mesh_396",
      "Mesh_396_1",
      "SR23-AC-P28A_Max-878",
      "Mesh_397",
      "Mesh_397_1",
      "SR23-AC-P28A_Max-879",
      "Mesh_376",
      "Mesh_376_1",
      "SR23-AC-P28A_Max-880",
      "Mesh_406",
      "Mesh_406_1",
  ],
  "Cell 92": [
      "SR23-AC-P28A_Max-1",
      "Mesh_206",
      "Mesh_206_1",
      "SR23-AC-P28A_Max-2",
      "Mesh_315",
      "Mesh_315_1",
      "SR23-AC-P28A_Max-3",
      "Mesh_314",
      "Mesh_314_1",
      "SR23-AC-P28A_Max-4",
      "Mesh_321",
      "Mesh_321_1",
      "SR23-AC-P28A_Max-5",
      "Mesh_318",
      "Mesh_318_1",
      "SR23-AC-P28A_Max-6",
      "Mesh_324",
      "Mesh_324_1",
  ]
};

// Material cache for better performance
const materialCache = new Map();

const getMaterial = (color) => {
  const colorKey = color.getHexString();
  if (!materialCache.has(colorKey)) {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.8,
    });
    materialCache.set(colorKey, material);
  }
  return materialCache.get(colorKey);
};

// Enhanced Model Component that handles both highlighting and voltage-based coloring
const Model4 = ({ highlightCell = null, cellValues = {}, setHoveredCell }) => {
  // Add fallback and error handling
  const { scene = null, nodes = {} } = useGLTF("/3D/Segment4.glb");
  const nodeCache = useRef(new Map());
  const previousValues = useRef({});

  // Create a mapping from mesh name to cell name for efficient lookups
  const meshToCellMap = {};
  Object.entries(cellMap).forEach(([cellName, meshNames]) => {
    meshNames.forEach((mesh) => {
      meshToCellMap[mesh] = cellName;
    });
  });

  useEffect(() => {
    if (!scene || !nodes) return;

    // Cache nodes for quick access
    Object.entries(cellMap).forEach(([cellName, meshNames]) => {
      meshNames.forEach((nodeName) => {
        if (nodes[nodeName]) {
          nodeCache.current.set(nodeName, nodes[nodeName]);
        }
      });
    });

    // First reset all cell colors to a neutral state
    try {
      scene.traverse((child) => {
        if (child?.isMesh && child?.material) {
          // Store original material for restoration
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material.clone();
          }
          
          // Set mesh userdata for cell identification
          if (child.name && meshToCellMap[child.name]) {
            child.userData.cellName = meshToCellMap[child.name];
          }
          
          // Reset to default gray color
          child.material = getMaterial(new THREE.Color(0.4, 0.4, 0.4));
        }
      });
    } catch (err) {
      console.warn("Error resetting cell colors:", err);
    }

    // Apply voltage-based colors if cellValues are provided
    if (Object.keys(cellValues).length > 0) {
      // Process each cell with voltage data
      Object.entries(cellValues).forEach(([cellName, voltage]) => {
        // Skip empty values
        if (!voltage || voltage <= 0.01) return;
        
        const nodesToUpdate = cellMap[cellName] || [];
        // Get color based on voltage
        const color = valueToColor(voltage);
        const material = getMaterial(color);
        
        // Update materials for all meshes in this cell
        nodesToUpdate.forEach(nodeName => {
          // Get node from cache or directly
          let node = nodeCache.current.get(nodeName) || nodes[nodeName];
          
          if (node) {
            node.traverse(child => {
              if (child.isMesh && child.material) {
                child.material = material;
              }
            });
          }
        });
      });
    }
    // If we have a specific cell to highlight, override its color
    else if (highlightCell && highlightCell in cellMap) {
      try {
        const cellNodes = cellMap[highlightCell] || [];
        cellNodes.forEach((nodeName) => {
          const node = nodes[nodeName] || nodeCache.current.get(nodeName);
          if (node) {
            node.traverse((child) => {
              if (child?.isMesh && child?.material) {
                child.material = getMaterial(new THREE.Color(1, 0, 0)); // Highlight in red
              }
            });
          }
        });
      } catch (error) {
        console.warn(`Error highlighting cell ${highlightCell}:`, error);
      }
    }

    // Clean up function with proper error handling
    return () => {
      try {
        // Clear material cache on component unmount
        materialCache.forEach((material) => {
          if (material && material.dispose) {
            material.dispose();
          }
        });
        materialCache.clear();
        
        if (scene) {
          // Restore original materials
          scene.traverse((child) => {
            if (child?.isMesh) {
              if (child.userData.originalMaterial) {
                child.material = child.userData.originalMaterial;
              }
            }
          });
        }
      } catch (error) {
        console.warn('Error cleaning up materials:', error);
      }
    };
  }, [nodes, scene, highlightCell, cellValues]);

  // Only render if scene is available
  return scene ? (
    <primitive 
      object={scene} 
      onPointerOver={(event) => {
        event.stopPropagation();
        // Get the cell name either from userData or from the lookup map
        const cellName = event.object.userData.cellName || meshToCellMap[event.object.name];
        
        if (cellName && cellValues[cellName]) {
          setHoveredCell({
            name: cellName,
            voltage: cellValues[cellName]
          });
        }
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        // Get the cell name either from userData or from the lookup map
        const cellName = event.object.userData.cellName || meshToCellMap[event.object.name];
        
        if (cellName && cellValues[cellName]) {
          setHoveredCell({
            name: cellName,
            voltage: cellValues[cellName]
          });
        }
      }}
      onPointerOut={() => {
        setHoveredCell(null);
      }}
    />
  ) : null;
};

// Enhanced Segment4 component supporting both highlighting and voltage-based coloring
const Segment4 = ({ highlightCell = null, cellValues = {}, setHoveredCell }) => {
  return <Model4 
    highlightCell={highlightCell} 
    cellValues={cellValues} 
    setHoveredCell={setHoveredCell}
  />;
};

// Attach the cellMap to the component for external access
Segment4.cellMap = cellMap;

export default Segment4;