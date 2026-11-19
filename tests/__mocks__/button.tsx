import React from 'react';

export const Button = ({ children, onClick, variant, size, className }: any) => (
  <button data-variant={variant} data-size={size} className={className} onClick={onClick}>
    {children}
  </button>
);

export default Button;
