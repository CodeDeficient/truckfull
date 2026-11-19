import React from 'react';

interface TacoProps {
  className?: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Taco icon in Lucide style
 * Designed on 24x24 grid with 2px stroke, round caps/joins
 */
export const Taco: React.FC<TacoProps> = ({
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
      {/* Taco shell - curved arc opening upward */}
      <path d="M3 16 C3 10, 7 6, 12 6 C17 6, 21 10, 21 16" />

      {/* Left shell edge curving inward */}
      <path d="M3 16 C4 18, 6 19, 8 19" />

      {/* Right shell edge curving inward */}
      <path d="M21 16 C20 18, 18 19, 16 19" />

      {/* Filling - lettuce/meat showing at top */}
      <path d="M6 12 C8 10, 10 11, 12 10 C14 11, 16 10, 18 12" />

      {/* Additional filling detail */}
      <path d="M7 14 C9 13, 11 14, 12 13 C13 14, 15 13, 17 14" />
    </svg>
  );
};
