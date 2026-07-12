/**
 * Central asset paths — update when you add your logos / 3D / motion files.
 * Files live under frontend/public/assets/
 */

const use3d = process.env.REACT_APP_USE_3D === 'true';

export const ASSETS = {
  logos: {
    primary: process.env.REACT_APP_LOGO_PRIMARY || '/images/logo.png',
    mark: '/assets/logos/logo-mark.svg',
    model3d: process.env.REACT_APP_LOGO_3D || '/assets/logos/logo-animated.glb',
    introVideo: '/assets/logos/logo-intro.webm',
  },
  models: {
    hero: process.env.REACT_APP_HERO_MODEL || '/assets/3d/hero-scene.glb',
    mascot: '/assets/3d/mascot.glb',
    chatAmbient: '/assets/3d/chat-ambient.glb',
  },
  motion: {
    workflow: '/assets/motion/workflow.json',
    particles: '/assets/motion/particles.json',
  },
  workflow: {
    steps: [
      { id: 'connect', label: 'Connect', image: '/assets/workflow/step-1-connect.png' },
      { id: 'chat', label: 'Chat', image: '/assets/workflow/step-2-chat.png' },
      { id: 'tasks', label: 'Tasks', image: '/assets/workflow/step-3-tasks.png' },
    ],
  },
  images: {
    hero2d: '/images/welcome_hero.png',
  },
};

export const FEATURES = {
  use3d,
  prefersReducedMotion: () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
