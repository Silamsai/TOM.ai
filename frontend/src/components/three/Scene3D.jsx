import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Float, ContactShadows } from '@react-three/drei';
import { FEATURES } from '../../config/assets';
import '../../styles/three.css';

/** Procedural fallback until you drop in a .glb */
function FallbackMesh() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.35;
      ref.current.rotation.x = Math.sin(Date.now() * 0.0008) * 0.15;
    }
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} castShadow>
        <torusKnotGeometry args={[0.55, 0.18, 128, 24]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.85} roughness={0.2} />
      </mesh>
    </Float>
  );
}

function LoadedModel({ url, scale = 1 }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });
  return (
    <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.4}>
      <primitive ref={ref} object={scene.clone()} scale={scale} />
    </Float>
  );
}

function ModelWithFallback({ url, scale }) {
  const [failed, setFailed] = useState(false);
  if (failed || !url) return <FallbackMesh />;
  return (
    <ErrorBoundary onError={() => setFailed(true)}>
      <Suspense fallback={<FallbackMesh />}>
        <LoadedModel url={url} scale={scale} />
      </Suspense>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Full-width 3D canvas layer (pointer-events none by default).
 * @param {string} modelUrl - path to .glb (optional)
 * @param {boolean} interactive - enable orbit (hero preview)
 * @param {string} className
 */
const Scene3D = ({
  modelUrl,
  scale = 1.2,
  interactive = false,
  className = '',
  cameraPosition = [0, 0.4, 3.2],
}) => {
  if (FEATURES.prefersReducedMotion()) {
    return <div className={`scene-3d scene-3d--static ${className}`} aria-hidden="true" />;
  }

  return (
    <div className={`scene-3d ${className}`} aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: cameraPosition, fov: 42 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.35} />
        <spotLight position={[4, 6, 4]} angle={0.35} penumbra={1} intensity={1.2} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={0.5} color="#a0a0ff" />
        <ModelWithFallback url={modelUrl} scale={scale} />
        <ContactShadows position={[0, -0.85, 0]} opacity={0.35} scale={8} blur={2.5} />
        <Environment preset="city" />
        {interactive && (
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.1} />
        )}
      </Canvas>
    </div>
  );
};

export default Scene3D;
