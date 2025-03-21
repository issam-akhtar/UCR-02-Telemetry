import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from 'three';
import {useEffect} from "react";

const Model = () => {
  const { scene, nodes } = useGLTF("/batterypack.glb");

  const applyBlendedVertexColors = (
    moduleWall,
    bottomLeftColor,
    bottomMiddleColor,
    bottomRightColor,
    topLeftColor,
    topMiddleColor,
    topRightColor
  ) => {
    if (!moduleWall || moduleWall.children.length === 0) return;

    const meshChild = moduleWall.children.find((child) => child.isMesh);
    if (!meshChild || !meshChild.geometry) return;

    console.log("MeshChild Found:", meshChild);

    // Clone geometry to modify
    const geometry = meshChild.geometry.clone();
    const position = geometry.attributes.position.array;
    const vertexCount = position.length / 3;

    console.log("Original Geometry:", meshChild.geometry);
    console.log("Position Attribute:", meshChild.geometry.attributes.position);

    // Find min/max **Z** and **Y** positions dynamically
    let minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < vertexCount; i++) {
      const z = position[i * 3 + 2]; // Z-axis
      const y = position[i * 3 + 1]; // Y-axis

      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    console.log(`Model Z Range: minZ=${minZ}, maxZ=${maxZ}`);
    console.log(`Model Y Range: minY=${minY}, maxY=${maxY}`);

    // Normalize function to map values between 0 and 1
    const normalize = (value, min, max) => (value - min) / (max - min);

    // Create a new color buffer
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const z = position[i * 3 + 2]; // Use Z for horizontal blend
      const y = position[i * 3 + 1]; // Use Y for vertical blend

      // Normalize values between 0 and 1
      const zFactor = normalize(z, minZ, maxZ);
      const yFactor = normalize(y, minY, maxY);

      // Convert colors into THREE.Color objects
      const bottomLeft = new THREE.Color(...bottomLeftColor);
      const bottomMiddle = new THREE.Color(...bottomMiddleColor);
      const bottomRight = new THREE.Color(...bottomRightColor);
      const topLeft = new THREE.Color(...topLeftColor);
      const topMiddle = new THREE.Color(...topMiddleColor);
      const topRight = new THREE.Color(...topRightColor);

      // Interpolate between left, middle, and right colors (Z axis)
      const bottomColor = bottomLeft.clone().lerp(bottomRight, zFactor);
      const topColor = topLeft.clone().lerp(topRight, zFactor);

      // Interpolate between bottom and top colors (Y axis)
      const finalColor = bottomColor.clone().lerp(topColor, yFactor);

      // Assign final blended color per vertex
      colors[i * 3] = finalColor.r; // R
      colors[i * 3 + 1] = finalColor.g; // G
      colors[i * 3 + 2] = finalColor.b; // B
    }

    console.log("Assigned Colors (First 10):", colors.slice(0, 30));

    // Attach the color attribute to the geometry
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;

    // Apply a material that supports vertex colors
    meshChild.geometry = geometry;
    meshChild.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide, // Ensure both sides render correctly
    });

    meshChild.material.needsUpdate = true;
  };

  useEffect(() => {
    applyBlendedVertexColors(
      nodes["UCR01-AC-ModuleWall_C_0375-1"],
      [1, 1, 0], // Bottom-left (Yellow)
      [0, 1, 0], // Bottom-middle (Green)
      [1, 0.5, 0], // Bottom-right (Orange)
      [0, 1, 0], // Top-left (Green)
      [1, 0, 0], // Top-middle (Red)
      [1, 0, 0]  // Top-right (Red)
    );

    applyBlendedVertexColors(
      nodes["UCR01-AC-ModuleWall_C_0375-2"],
      [1, 0, 0], // Bottom-left (Red)
      [1, 1, 0], // Bottom-middle (Yellow)
      [0, 1, 0], // Bottom-right (Green)
      [0, 1, 0], // Top-left (Green)
      [1, 1, 0], // Top-middle (Yellow)
      [1, 1, 0]  // Top-right (Orange)
    );
  }, [nodes]);

  return <primitive object={scene} />;
};

const BatteryPack = () => {
  return (
    <>
    <Canvas camera={{ position: [0.5, 0.2, 0] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} />
      <Model />
      <OrbitControls />
    </Canvas>
    </>
    
  );
};

export default BatteryPack;
