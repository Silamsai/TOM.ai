import React, { Suspense, lazy, useState } from 'react';
import { ASSETS, FEATURES } from '../../config/assets';
import '../../styles/three.css';

const Scene3D = lazy(() => import('./Scene3D'));

/**
 * Logo slot: your 2D PNG/SVG and/or 3D .glb.
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} use3d - try 3D model when REACT_APP_USE_3D=true
 * @param {string} src - override 2D image path
 * @param {string} modelSrc - override .glb path
 */
const AnimatedLogo = ({
  size = 'md',
  use3d = FEATURES.use3d,
  src = ASSETS.logos.primary,
  modelSrc = ASSETS.logos.model3d,
  alt = 'tom.ai',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const sizes = { sm: 32, md: 48, lg: 80 };
  const px = sizes[size] || sizes.md;

  const show3d = use3d && !FEATURES.prefersReducedMotion();

  if (show3d) {
    return (
      <div className={`animated-logo animated-logo--${size} ${className}`}>
        <Suspense fallback={
          <img src={src} alt={alt} width={px} height={px} className="animated-logo__img" onError={() => setImgError(true)} />
        }>
          <Scene3D modelUrl={modelSrc} scale={size === 'lg' ? 1.4 : 0.9} className="animated-logo__canvas" />
        </Suspense>
      </div>
    );
  }

  if (imgError) {
    return (
      <span className={`animated-logo__fallback ${className}`} style={{ width: px, height: px }}>
        🤖
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={`animated-logo__img animated-logo--${size} ${className}`}
      style={{ borderRadius: size === 'lg' ? 16 : 8, objectFit: 'contain' }}
      onError={() => setImgError(true)}
    />
  );
};

export default AnimatedLogo;
