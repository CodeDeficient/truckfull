import React from 'react';

interface BurgerProps {
  className?: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const Burger: React.FC<BurgerProps> = ({
  className,
  size = 24,
  color = 'currentColor',
  style,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Top bun */}
      <path d="M4 10 Q4 6, 12 6 Q20 6, 20 10" stroke={color} fill="none" />

      {/* Sesame seeds on top bun */}
      <circle cx="8" cy="8" r="0.4" fill={color} opacity="0.6" />
      <circle cx="11" cy="7.5" r="0.4" fill={color} opacity="0.6" />
      <circle cx="14" cy="8.2" r="0.4" fill={color} opacity="0.6" />
      <circle cx="16" cy="8" r="0.4" fill={color} opacity="0.6" />

      {/* Lettuce layer - wavy */}
      <path
        d="M4 10 Q6 11, 8 10 Q10 9, 12 10 Q14 11, 16 10 Q18 9, 20 10"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />

      {/* Cheese slice */}
      <path
        d="M4 12 L20 12 L19 13.5 L5 13.5 Z"
        stroke={color}
        strokeWidth="1.5"
        fill={color}
        opacity="0.4"
      />

      {/* Patty - thick ellipse */}
      <ellipse cx="12" cy="15" rx="8" ry="1.5" stroke={color} fill={color} opacity="0.6" />

      {/* Bottom bun */}
      <path d="M4 17 L20 17 Q20 19, 19 20 L5 20 Q4 19, 4 17" stroke={color} fill="none" />
    </svg>
  );
};
