import { Fragment, type JSX } from 'react';

interface InfoItem {
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

interface AboutSectionProps {
  readonly description: string;
  readonly info: readonly InfoItem[];
  readonly hasSavannahPermit?: boolean;
  readonly organizerUrl?: string | null;
}

/**
 * 60/40 split: 60% prose description with a serif drop-cap, 40% info column.
 * No boxes or borders — typography and 1px horizontal rules do the work.
 */
export function AboutSection({
  description,
  info,
  hasSavannahPermit,
  organizerUrl,
}: AboutSectionProps): JSX.Element {
  return (
    <section className="bg-white py-14 dark:bg-black sm:py-20">
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 px-6 sm:px-10 md:grid-cols-5">
        <div className="md:col-span-3">
          <h2 className="font-heading text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            About this event
          </h2>
          <p className="mt-6 whitespace-pre-line font-heading text-lg leading-relaxed text-gray-800 first-letter:float-left first-letter:mr-3 first-letter:font-heading first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-red-600 sm:text-xl dark:text-gray-200">
            {description}
          </p>
        </div>
        <aside className="md:col-span-2">
          <dl>
            {info.map((item, idx) => (
              <Fragment key={item.label}>
                <dt
                  className={`text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 ${idx === 0 ? 'pt-2' : 'pt-8'}`}
                >
                  {item.label}
                </dt>
                <dd className="font-heading text-lg text-gray-900 dark:text-white">
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="nofollow noopener"
                      className="text-red-600 hover:underline dark:text-red-400"
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </Fragment>
            ))}
            {hasSavannahPermit && (
              <Fragment>
                <dt className="pt-8 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Permit
                </dt>
                <dd className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  Approved by City of Savannah
                </dd>
              </Fragment>
            )}
            {organizerUrl && (
              <Fragment>
                <dt className="pt-8 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Organizer website
                </dt>
                <dd className="font-heading text-lg text-gray-900 dark:text-white">
                  <a
                    href={organizerUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    className="break-all text-red-600 hover:underline dark:text-red-400"
                  >
                    {organizerUrl}
                  </a>
                </dd>
              </Fragment>
            )}
          </dl>
        </aside>
      </div>
    </section>
  );
}
