'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    q: 'Do I need a credit card for the free trial?',
    a: 'No. Start your 30-day trial without entering payment information.',
  },
  {
    q: 'What happens after the trial ends?',
    a: "You'll return to the Free plan automatically unless you choose to subscribe.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no contracts or cancellation fees.',
  },
  {
    q: 'What happens to my saved data if I cancel?',
    a: 'Your listings and account remain active. Pro-only features become unavailable until you resubscribe.',
  },
  {
    q: 'Will the price ever increase?',
    a: 'Possibly as TruckFull grows and new features are added. Founding members keep their rate locked for life.',
  },
  {
    q: 'What happens if I cancel as a founding member?',
    a: 'Your founding member rate remains attached to your account and can be resumed later.',
  },
];

export function PricingFAQ({ className = 'mt-8' }: { readonly className?: string }) {
  return (
    <div className={className}>
      <div className="glass-strong rounded-xl p-6 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-2">
          <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Frequently asked questions
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Everything you need to know about Pro.
        </p>

        <Accordion type="single" collapsible className="w-full text-left">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.q}
              value={item.q}
              className={item === FAQ_ITEMS.at(-1) ? 'border-0' : 'border-border/20'}
            >
              <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline hover:text-orange-400 transition-colors [&>svg]:text-orange-400/70">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pl-1">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6 pt-6 border-t border-border/20 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Still have questions?
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Pricing changes are rare but possible as we add more features. Founding members
            keep their rate locked for life regardless.
          </p>
          <a
            href="mailto:support@truckfull.food?subject=Pricing%20Question"
            className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
          >
            support@truckfull.food
          </a>
        </div>
      </div>
    </div>
  );
}
