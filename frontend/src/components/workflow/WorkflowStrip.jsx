import React from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, MessageSquare, CheckSquare } from 'lucide-react';
import { ASSETS, FEATURES } from '../../config/assets';
import '../../styles/workflow.css';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/**
 * Animated onboarding workflow — swap step images in /public/assets/workflow/
 * @param {number} activeIndex - 0..steps.length-1
 * @param {'horizontal'|'vertical'} layout
 */
const WorkflowStrip = ({ activeIndex = 0, layout = 'horizontal', className = '' }) => {
  const steps = ASSETS.workflow.steps;
  const reduced = FEATURES.prefersReducedMotion();

  return (
    <motion.ol
      className={`workflow-strip workflow-strip--${layout} ${className}`}
      variants={reduced ? undefined : container}
      initial={reduced ? false : 'hidden'}
      animate="show"
      aria-label="How tom.ai works"
    >
      {steps.map((step, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;
        return (
          <motion.li
            key={step.id}
            className={`workflow-step ${active ? 'workflow-step--active' : ''} ${done ? 'workflow-step--done' : ''}`}
            variants={reduced ? undefined : item}
          >
            <div className="workflow-step__visual">
              <motion.div
                className="workflow-step__glow"
                animate={active && !reduced ? { scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div
                className="workflow-step__icon"
                aria-hidden="true"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {step.id === 'connect' && <LinkIcon size={16} />}
                {step.id === 'chat' && <MessageSquare size={16} />}
                {step.id === 'tasks' && <CheckSquare size={16} />}
              </div>
              <img
                className="workflow-step__img"
                src={step.image}
                alt=""
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <span className="workflow-step__label">{step.label}</span>
            {i < steps.length - 1 && <span className="workflow-step__connector" aria-hidden="true" />}
          </motion.li>
        );
      })}
    </motion.ol>
  );
};

export default WorkflowStrip;
