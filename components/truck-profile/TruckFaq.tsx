import Link from '@/components/navigation/IntentLink';

import type { TruckFaqEntry } from '@/lib/truck-profile/faq';
import type { CuisineTheme } from '@/lib/truck-profile/theme';

interface TruckFaqProps {
  readonly name: string;
  readonly entries: readonly TruckFaqEntry[];
  readonly theme: CuisineTheme;
}

export default function TruckFaq({ name, entries, theme }: TruckFaqProps) {
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="truck-faq-heading" className="mx-auto max-w-5xl px-8 py-8 md:px-14">
      <h2
        id="truck-faq-heading"
        className="text-2xl font-semibold leading-none"
        style={{ color: theme.cream }}
      >
        About {name}
      </h2>
      <div className="mt-4 divide-y" style={{ borderColor: `${theme.glow}22` }}>
        {entries.map((entry) => (
          <details
            key={entry.id}
            className="group border-t py-4 first:border-t-0"
            style={{ borderColor: `${theme.glow}22` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-white/90">
              <h3>{entry.question}</h3>
              <span
                aria-hidden="true"
                className="shrink-0 text-lg transition-transform group-open:rotate-45"
                style={{ color: theme.glow }}
              >
                +
              </span>
            </summary>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{entry.answer}</p>
            {entry.links.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {entry.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:underline"
                      style={{ color: theme.glow }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
