import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ASSETS, FEATURES } from '../../config/assets';
import '../../styles/mixup.css';

const Scene3D = lazy(() => import('../three/Scene3D'));

/**
 * Mixed 2D + 3D layout: animated backdrop, glass panels, optional workflow footer.
 */
const MixupLayout = ({
  children,
  modelUrl = ASSETS.models.hero,
  show3d = FEATURES.use3d,
  workflow,
  className = '',
  panelClassName = '',
}) => {
  const reduced = FEATURES.prefersReducedMotion();

  return (
    <div className={`mixup-layout ${className}`}>
      {show3d && !reduced && (
        <Suspense fallback={<div className="mixup-layout__bg-fallback" />}>
          <Scene3D modelUrl={modelUrl} className="mixup-layout__canvas" interactive />
        </Suspense>
      )}
      <div className="mixup-layout__gradient" aria-hidden="true" />
      <div className="mixup-layout__grid" aria-hidden="true" />

      <motion.div
        className={`mixup-layout__panel ${panelClassName}`}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>

      {workflow && <div className="mixup-layout__workflow">{workflow}</div>}
    </div>
  );
};

export default MixupLayout;
