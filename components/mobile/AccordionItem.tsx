'use client';

import React, { useState, useCallback } from 'react';

const WHITESPACE_RUNS = /\s+/g;

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden ${className}`}
    >
      <button
        className="w-full p-4 text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex justify-between items-center"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title.replaceAll(WHITESPACE_RUNS, '-').toLowerCase()}`}
        id={`accordion-header-${title.replaceAll(WHITESPACE_RUNS, '-').toLowerCase()}`}
      >
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        <span
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600 dark:text-gray-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      <div
        id={`accordion-content-${title.replaceAll(WHITESPACE_RUNS, '-').toLowerCase()}`}
        role="region"
        aria-labelledby={`accordion-header-${title.replaceAll(WHITESPACE_RUNS, '-').toLowerCase()}`}
        hidden={!isOpen}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'opacity-100 max-h-[1000px] visible' : 'opacity-0 max-h-0 invisible'
        }`}
      >
        <div className="p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AccordionItem);
