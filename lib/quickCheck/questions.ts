export type RiskLevel = 'low' | 'medium' | 'high';

export type QuestionInputType = 'yesno' | 'ratio';

export interface QuickCheckQuestion {
  readonly id: string;
  readonly text: string;
  readonly detail: string;
  readonly inverted?: boolean;
  readonly summary: string;
  readonly inputType?: QuestionInputType;
}

export interface QuickCheckSection {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly description: string;
  readonly questions: readonly QuickCheckQuestion[];
}

export const QUICK_CHECK_SECTIONS: readonly QuickCheckSection[] = [
  {
    id: 'red-flags',
    title: 'Red Flags',
    icon: 'AlertTriangle',
    description: 'Fraud alerts — if any of these are true, it is likely a scam or poorly managed event.',
    questions: [
      {
        id: 'payment-method',
        text: 'Is Cash App, Venmo, Zelle, or Wire Transfer their ONLY payment method — with no option to pay in person?',
        detail: 'Most legitimate organizers accept CashApp or Venmo as one option, but also offer in-person payment, Square, Stripe, or invoicing. If peer-to-peer apps are the only way to pay, that is a red flag.',
        summary: 'P2P-only payment with no in-person alternative',
      },
      {
        id: 'high-pressure',
        text: 'Do they use FOMO tactics, demanding immediate payment to "hold your spot" before providing a contract?',
        detail: 'High pressure to pay before seeing paperwork is a major red flag.',
        summary: 'High-pressure sales tactics / pay-before-contract demand',
      },
      {
        id: 'ghost-identity',
        text: 'Does the event have an official website and/or social media page that is more than 30 days old?',
        detail: 'New or non-existent digital presence is suspicious for an established event.',
        summary: 'No established website or social media presence',
        inverted: true,
      },
      {
        id: 'no-contract',
        text: 'Are they willing to provide a written agreement or a W-9/COI (Certificate of Insurance) upon request?',
        detail: 'If they will not put anything in writing, you have zero legal protection. Always get it documented.',
        summary: 'Unwilling to provide written contract or insurance docs',
        inverted: true,
      },
    ],
  },
  {
    id: 'crowd-math',
    title: 'Crowd Math',
    icon: 'Users',
    description: 'Profitability check — planners often exaggerate attendance. Verify the numbers before buying inventory.',
    questions: [
      {
        id: 'ratio-check',
        text: 'How many food trucks are expected, and how many attendees are estimated?',
        detail: 'Organizer estimates are often over-inflated. Ask if they have past attendance records to back up their numbers.',
        summary: 'Truck-to-attendee ratio checked',
        inputType: 'ratio',
      },
      {
        id: 'exclusivity',
        text: 'Is there a verbal or written guarantee on the truck cap with no surprise last-minute vendors?',
        detail: 'Get it in writing that no additional trucks will be added.',
        summary: 'Truck cap guaranteed with no surprise additions',
      },
      {
        id: 'social-proof',
        text: 'Did you find real photos/videos from past years on Instagram or Facebook (not just the flyer)?',
        detail: 'Search the event name + year on social media. Look at "Tagged" photos for actual crowd sizes.',
        summary: 'Real past-year photos/videos found on social media',
      },
      {
        id: 'vendor-feedback',
        text: 'Did you contact a past vendor to ask if it was worth the fee?',
        detail: 'A quick "Was it worth the fee?" to a tagged vendor can save you thousands.',
        summary: 'Past vendor confirmed event was worth the fee',
      },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics & Fine Print',
    icon: 'ClipboardCheck',
    description: 'Hidden costs and day-of disasters. These details make or break your profitability.',
    questions: [
      {
        id: 'permit-timeline',
        text: 'Have you independently verified the event has all required city/county temporary permits (for public events)?',
        detail: 'Do not just take the organizer\'s word — ask for the permit number or check with the local municipality yourself. No permits = the event can be shut down on event day.',
        summary: 'Permits independently verified (not just organizer\'s claim)',
      },
      {
        id: 'power-waste',
        text: 'Is there dedicated electric access on-site?',
        detail: 'Without dedicated access, you will need to bring your own generator. Generator fuel costs add up fast — confirm power access before committing.',
        summary: 'Dedicated electric access confirmed (no generator needed)',
      },
      {
        id: 'trash-removal',
        text: 'Did the organizer confirm who handles trash and waste disposal?',
        detail: 'If it is on you, factor in the cost of bags, disposal fees, and cleanup time.',
        summary: 'Trash and waste disposal responsibilities confirmed',
      },
      {
        id: 'staff-vouchers',
        text: 'Does the fee cover "free" meals for volunteers or staff?',
        detail: 'If so, clarify the repayment schedule for those vouchers.',
        summary: 'Staff/volunteer meal voucher terms clarified',
      },
      {
        id: 'refund-policy',
        text: 'Is there a clear policy for weather cancellations or organizer overbooking?',
        detail: 'Get the refund terms in writing before paying.',
        summary: 'Clear weather cancellation and refund policy in writing',
      },
    ],
  },
  {
    id: 'gut-check',
    title: 'Gut Check',
    icon: 'MessageCircle',
    description: 'The final human verification step. Trust your instincts.',
    questions: [
      {
        id: 'direct-contact',
        text: 'Have you had a direct phone call (not just DM or email) with the organizer?',
        detail: 'A 5-minute phone call usually reveals if they are professional or a fly-by-night operation.',
        summary: 'Had a direct phone call with the organizer',
      },
      {
        id: 'distance-vs-fee',
        text: 'Is the event close enough (under an hour away) that the fee feels worth the risk?',
        detail: 'Long distance + high fee = high risk. Every other factor needs to be verified.',
        summary: 'Event distance vs. fee feels reasonable',
      },
    ],
  },
] as const;

export const TOTAL_QUESTIONS = QUICK_CHECK_SECTIONS.reduce((sum, s) => sum + s.questions.length, 0);

export function getAllQuestions(): readonly QuickCheckQuestion[] {
  return QUICK_CHECK_SECTIONS.flatMap((s) => s.questions);
}
