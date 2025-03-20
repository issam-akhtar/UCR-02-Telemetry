import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import Model from "./Model";

const BatteryPack = () => {
  return (
    <>
    <Canvas camera={{ position: [0, 1, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} />
      <Model />
      <OrbitControls />
    </Canvas>
    </>
    
  );
};

export default BatteryPack;
