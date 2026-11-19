import { useEffect, useRef, useCallback } from 'react';

export function useModalLifecycle(closeModal: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const onOpen = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setTimeout(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }
    }, 100);
  }, []);

  const onClose = useCallback(() => {
    previousFocusRef.current?.focus();
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModal]);

  return { dialogRef, onOpen, onClose };
}
