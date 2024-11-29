import * as React from 'react';
import '../App.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { cardActionAreaClasses } from '@mui/material';

function TestPage() {
    const navigate = useNavigate();
    const Car = useGLTF('./bmw_m5tm/scene.gltf');

    return(

        <div className="Car">
            <Canvas className="cursor-pointer" frameloop="demand" camera={{ position: [-4, -30, 6], fov: 40, near: 0.1, far: 1000 }}>
        
              <OrbitControls autoRotate enableZoom={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} enablePan={false} />
              <primitive object={Car.scene} scale={3} />

            </Canvas>
        </div>
        
        
    );
}

export default TestPage;