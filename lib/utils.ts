import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

// Guarantees a string return for JSX className, even if cn typing widens later
export const cx = (...inputs: ClassValue[]): string => String(cn(...inputs));
