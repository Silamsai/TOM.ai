import React, { useState } from 'react';

const InteractiveLogo = ({ width = 32, height = 32, style = {}, ...props }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <img
            src="/images/logo.png"
            alt="tom.ai"
            width={width}
            height={height}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: width > 40 ? '12px' : '6px',
                objectFit: 'contain',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.4s ease',
                transform: hovered ? 'scale(1.1) rotate(3deg)' : 'scale(1) rotate(0deg)',
                filter: hovered ? 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.45))' : 'none',
                cursor: 'pointer',
                display: 'inline-block',
                ...style
            }}
            onError={(e) => {
                if (!e.target.src.includes('logo.svg')) {
                    e.target.src = '/images/logo.svg';
                } else {
                    e.target.style.display = 'none';
                }
            }}
            {...props}
        />
    );
};

export default InteractiveLogo;
