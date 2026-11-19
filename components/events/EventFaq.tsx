import type { JSX } from 'react';

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

interface EventFaqProps {
  readonly items: readonly FaqItem[];
  readonly title?: string;
}

/**
 * Native <details>/<summary> accordion. No JS, no Radix. Serif question,
 * sans answer, 1px separators only — no boxes.
 */
export function EventFaq({ items, title = 'Frequently asked questions' }: EventFaqProps): JSX.Element {
  if (items.length === 0) return <></>;
  return (
    <section className="bg-white py-14 dark:bg-black sm:py-20">
      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <h2 className="font-heading text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          {title}
        </h2>
        <div className="mt-8 divide-y divide-gray-200 dark:divide-gray-800">
          {items.map((item) => (
            <details
              key={item.question}
              className="group py-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                <span className="font-heading text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className="mt-2 text-2xl font-light text-gray-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-base text-gray-700 dark:text-gray-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}