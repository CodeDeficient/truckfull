import React from 'react';
import Link from '@/components/navigation/IntentLink';

interface AnimatedGradientButtonProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
}

export function AnimatedGradientButton({
  children,
  className = '',
  href,
  onClick,
  disabled,
}: AnimatedGradientButtonProps) {
  const baseClasses = `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg
    text-white font-semibold text-sm
    [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]`;

  const combinedClasses = `${baseClasses} ${className}`.trim();

  const gradientStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(90deg, #b91c1c, #dc2626, #ea580c, #fbbf24, #ea580c, #dc2626, #b91c1c)',
    backgroundSize: '200% 100%',
    animation: 'gradientShift 4s linear infinite',
    border: '1px solid rgba(251, 146, 60, 0.3)',
  };

  if (href) {
    return (
      <Link
        href={disabled ? '#' : href}
        className={combinedClasses}
        style={gradientStyle}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        aria-disabled={disabled ? true : undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={combinedClasses}
      style={gradientStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
